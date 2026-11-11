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
    api<Program | Routine>(`/catalog/${kind}/${id}`)
      .then((value) => {
        if (active) {
          setRecord(value);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kind, id, retry]);
  useEffect(() => {
    let active = true;
    if (account)
      void api<{ program_id?: string; routine_id?: string; training_programs?: { id: string } }[]>(
        `/catalog/my-${kind}`,
      )
        .then((rows) => {
          if (active)
            setSaved(
              rows.some(
                (row) => (kind === "programs" ? row.training_programs?.id : row.routine_id) === id,
              ),
            );
        })
        .catch(() => {
          /* Saving remains available and the API is idempotent. */
        });
    return () => {
      active = false;
    };
  }, [account, kind, id]);
  async function save() {
    setSaving(true);
    setSaveError("");
    try {
      await api(`/catalog/${kind}/${id}/save`, { method: "POST", json: {} });
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  if (loading)
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-5 py-20 text-center [&>p]:max-w-lg [&>p]:leading-7 [&>p]:text-muted [&>h2]:text-3xl"
        role="status"
      >
        Loading your plan…
      </div>
    );
  if (error || !record)
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-5 py-20 text-center [&>p]:max-w-lg [&>p]:leading-7 [&>p]:text-muted [&>h2]:text-3xl">
        <h1>Plan unavailable</h1>
        <p role="alert">{error || "This plan is no longer published."}</p>
        <button
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 bg-panel! text-ink!  hover:bg-surface! "
          onClick={() => {
            setLoading(true);
            setRetry((v) => v + 1);
          }}
        >
          Try again
        </button>
        <Link
          className="inline-flex items-center gap-2 font-semibold text-ink underline-offset-4 hover:underline"
          href="/programs"
        >
          Back to training library
        </Link>
      </div>
    );
  const program = kind === "programs" ? (record as Program) : null;
  const routine = kind === "routines" ? (record as Routine) : null;
  const days = [...(program?.training_program_days ?? [])].sort(
    (a, b) => a.day_number - b.day_number,
  );
  return (
    <>
      <Link
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
        href="/programs"
      >
        ← Training library
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12 [&_h1]:my-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {program ? "Program · a weekly training structure" : "Routine · one reusable session"}
          </p>
          <h1>{record.name}</h1>
          <p className="mt-5 mb-10 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
            {record.description}
          </p>
          <div className="mt-2 mb-5 flex flex-wrap gap-2 [&_span]:rounded-sm [&_span]:bg-white/5 [&_span]:px-3 [&_span]:py-1.5 [&_span]:text-xs [&_span]:text-muted">
            <span>{pretty(record.level)}</span>
            <span>{trainingLabels[record.goal]}</span>
            <span>{trainingLabels[record.equipment]}</span>
            <span>
              {program
                ? `${program.days_per_week} days / week · ${program.duration_weeks} weeks`
                : `~${routine?.estimated_minutes} minutes`}
            </span>
          </div>
          {program ? (
            <section className="mt-8 [&>p]:mt-3 [&>p]:mb-6 [&>p]:text-muted">
              <h2>Your week at a glance</h2>
              <p>
                Day numbers are a sequence, not fixed weekdays. Repeat this schedule for{" "}
                {program.duration_weeks} weeks.
              </p>
              {days.map((day) => (
                <article
                  className={`rounded-3xl bg-panel mb-3 grid sm:grid-cols-[4rem_minmax(0,1fr)] gap-3 p-5 [&>a]:col-start-2 [&_p]:mt-2 [&_p]:text-muted [&_details]:mt-4 [&_summary]:cursor-pointer [&_summary]:font-medium ${day.routine_id ? "" : "bg-surface!"}`}
                  key={day.id}
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    Day {day.day_number}
                  </span>
                  <div>
                    <h3>
                      {day.routine_id
                        ? (day.training_routines?.name ?? day.label)
                        : "Rest & recovery"}
                    </h3>
                    <p>
                      {day.routine_id
                        ? `Reusable routine${day.training_routines ? ` · ~${day.training_routines.estimated_minutes} min` : ""}`
                        : "No scheduled workout. Leave space to recover."}
                    </p>
                    {day.training_routines && (
                      <details>
                        <summary>Preview exercises</summary>
                        <ExerciseList routine={day.training_routines} />
                      </details>
                    )}
                  </div>
                  {day.routine_id && (
                    <Link
                      className="inline-flex items-center gap-2 font-semibold text-ink underline-offset-4 hover:underline"
                      href={`/routines/${day.routine_id}`}
                    >
                      View routine →
                    </Link>
                  )}
                </article>
              ))}
            </section>
          ) : (
            <section className="mt-8 [&>p]:mt-3 [&>p]:mb-6 [&>p]:text-muted">
              <h2>The session</h2>
              <p>
                Targets for each exercise. Record what you actually complete when you start a
                workout in the mobile app.
              </p>
              <ExerciseList routine={routine!} />
            </section>
          )}
        </div>
        <aside className="rounded-3xl bg-panel self-start p-6 lg:sticky lg:top-25 [&_h2]:my-4 [&_p]:my-4 [&_p]:text-muted [&>small]:mt-5 [&>small]:block [&>small]:text-xs [&>small]:text-muted">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Make it yours
          </span>
          <h2>{program ? "Save the whole program" : "Save this routine"}</h2>
          <p>
            {program
              ? "Adds the program and a personal copy of each distinct routine to your mobile Train library."
              : "Adds a reusable session to your mobile Train library."}
          </p>
          <p>
            Saving does not start a workout. Open Train in the mobile app, choose a routine, and
            start when you’re ready.
          </p>
          {sessionLoading ? (
            <p role="status">Checking your account…</p>
          ) : !account ? (
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 mt-3 w-full"
              href={`/login?next=${encodeURIComponent(`/${kind}/${id}`)}`}
            >
              Sign in to save
            </Link>
          ) : (
            <button
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 mt-3 w-full"
              disabled={saving || saved}
              onClick={() => void save()}
            >
              {saving
                ? "Saving…"
                : saved
                  ? "✓ Saved to your library"
                  : program
                    ? "Save program & routines"
                    : "Save routine"}
            </button>
          )}
          {saved && account && (
            <p
              className="mb-5 flex flex-wrap items-start gap-3 rounded-2xl bg-surface p-4 text-sm leading-7 text-ink bg-white/10! text-ink!"
              role="status"
            >
              Ready in the mobile app’s Train tab. Sign in there with the same account.
            </p>
          )}
          {saveError && (
            <p
              className="mb-5 flex flex-wrap items-start gap-3 rounded-2xl bg-surface p-4 text-sm leading-7 text-ink  bg-surface! text-ink!"
              role="alert"
            >
              {saveError}
            </p>
          )}
          <small>
            By {record.author || "FitSync"}. Saving creates a personal copy. Later catalog edits do
            not automatically update your saved sessions.
          </small>
        </aside>
      </div>
    </>
  );
}
function ExerciseList({ routine }: { routine: Routine }) {
  const items = [...(routine.training_routine_exercises ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  return (
    <ol className="my-5 list-none [&_li]:flex [&_li]:gap-4  [&_li]:py-5 [&_h3]:text-lg [&_p]:my-2 [&_p]:text-sm [&_p]:text-muted [&_small]:block [&_small]:text-xs [&_small]:text-muted [&_a]:hover:underline">
      {items.map((item) => (
        <li key={item.id}>
          <div>
            <h3>
              {item.exercises ? (
                <Link href={`/exercises/${item.exercises.id}`}>{item.exercises.name}</Link>
              ) : (
                "Exercise unavailable"
              )}
            </h3>
            <p>
              {item.sets} sets ·{" "}
              {item.min_reps === item.max_reps
                ? item.max_reps
                : `${item.min_reps}–${item.max_reps}`}{" "}
              {item.exercises?.tracking_type === "duration" ? "seconds" : "reps"} ·{" "}
              {item.rest_seconds}s rest
            </p>
            {item.notes && <small>{item.notes}</small>}
          </div>
        </li>
      ))}
    </ol>
  );
}
