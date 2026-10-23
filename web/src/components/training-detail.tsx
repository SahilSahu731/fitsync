"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, pretty } from "@/lib/api";
import { type Program, type Routine, trainingLabels } from "@/lib/training";
import { useSession } from "./session";

export function TrainingDetail({ kind, id }: { kind: "programs" | "routines"; id: string }) {
  const { account, loading: sessionLoading } = useSession();
  const [record, setRecord] = useState<Program | Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    let active = true;
    api<Program | Routine>(`/catalog/${kind}/${id}`).then(value => { if (active) { setRecord(value); setError(""); } }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind, id, retry]);
  useEffect(() => {
    let active = true;
    if (account) void api<{ program_id?: string; routine_id?: string; training_programs?: { id: string } }[]>(`/catalog/my-${kind}`).then(rows => { if (active) setSaved(rows.some(row => (kind === "programs" ? row.training_programs?.id : row.routine_id) === id)); }).catch(() => { /* Saving remains available and the API is idempotent. */ });
    return () => { active = false; };
  }, [account, kind, id]);
  async function save() {
    setSaving(true); setSaveError("");
    try { await api(`/catalog/${kind}/${id}/save`, { method: "POST", json: {} }); setSaved(true); }
    catch (e) { setSaveError(e instanceof Error ? e.message : "Could not save. Please try again."); }
    finally { setSaving(false); }
  }
  if (loading) return <div className="empty-state" role="status">Loading your plan…</div>;
  if (error || !record) return <div className="empty-state"><h1>Plan unavailable</h1><p role="alert">{error || "This plan is no longer published."}</p><button className="button secondary" onClick={() => { setLoading(true); setRetry(v => v + 1); }}>Try again</button><Link className="text-link" href="/programs">Back to training library</Link></div>;
  const program = kind === "programs" ? record as Program : null;
  const routine = kind === "routines" ? record as Routine : null;
  const days = [...(program?.training_program_days ?? [])].sort((a, b) => a.day_number - b.day_number);
  return <><Link className="back-link" href="/programs">← Training library</Link><div className="training-detail-grid"><div><p className="eyebrow">{program ? "Program · a weekly training structure" : "Routine · one reusable session"}</p><h1>{record.name}</h1><p className="lead">{record.description}</p><div className="training-facts"><span>{pretty(record.level)}</span><span>{trainingLabels[record.goal]}</span><span>{trainingLabels[record.equipment]}</span><span>{program ? `${program.days_per_week} days / week · ${program.duration_weeks} weeks` : `~${routine?.estimated_minutes} minutes`}</span></div>
    {program ? <section className="training-schedule"><h2>Your week at a glance</h2><p>Day numbers are a sequence, not fixed weekdays. Repeat this schedule for {program.duration_weeks} weeks.</p>{days.map(day => <article className={`panel schedule-day ${day.routine_id ? "" : "rest-day"}`} key={day.id}><span className="eyebrow">Day {day.day_number}</span><div><h3>{day.routine_id ? day.training_routines?.name ?? day.label : "Rest & recovery"}</h3><p>{day.routine_id ? `Reusable routine${day.training_routines ? ` · ~${day.training_routines.estimated_minutes} min` : ""}` : "No scheduled workout. Leave space to recover."}</p>{day.training_routines && <details><summary>Preview exercises</summary><ExerciseList routine={day.training_routines} /></details>}</div>{day.routine_id && <Link className="text-link" href={`/routines/${day.routine_id}`}>View routine →</Link>}</article>)}</section> : <section className="training-schedule"><h2>The session</h2><p>Targets for each exercise. Record what you actually complete when you start a workout in the mobile app.</p><ExerciseList routine={routine!} /></section>}
    </div><aside className="panel training-save"><span className="eyebrow">Make it yours</span><h2>{program ? "Save the whole program" : "Save this routine"}</h2><p>{program ? "Adds the program and a personal copy of each distinct routine to your mobile Train library." : "Adds a reusable session to your mobile Train library."}</p><p>Saving does not start a workout. Open Train in the mobile app, choose a routine, and start when you’re ready.</p>{sessionLoading ? <p role="status">Checking your account…</p> : !account ? <Link className="button wide" href={`/login?next=${encodeURIComponent(`/${kind}/${id}`)}`}>Sign in to save</Link> : <button className="button wide" disabled={saving || saved} onClick={() => void save()}>{saving ? "Saving…" : saved ? "✓ Saved to your library" : program ? "Save program & routines" : "Save routine"}</button>}{saved && account && <p className="notice success" role="status">Ready in the mobile app’s Train tab. Sign in there with the same account.</p>}{saveError && <p className="notice error" role="alert">{saveError}</p>}<small>By {record.author || "FitSync"}. Saving creates a personal copy. Later catalog edits do not automatically update your saved sessions.</small></aside></div></>;
}
function ExerciseList({ routine }: { routine: Routine }) {
  const items = [...(routine.training_routine_exercises ?? [])].sort((a, b) => a.position - b.position);
  return <ol className="training-exercises">{items.map((item, index) => <li key={item.id}><span className="exercise-number">{String(index + 1).padStart(2, "0")}</span><div><h3>{item.exercises ? <Link href={`/exercises/${item.exercises.id}`}>{item.exercises.name}</Link> : "Exercise unavailable"}</h3><p>{item.sets} sets · {item.min_reps === item.max_reps ? item.max_reps : `${item.min_reps}–${item.max_reps}`} {item.exercises?.tracking_type === "duration" ? "seconds" : "reps"} · {item.rest_seconds}s rest</p>{item.notes && <small>{item.notes}</small>}</div></li>)}</ol>;
}
