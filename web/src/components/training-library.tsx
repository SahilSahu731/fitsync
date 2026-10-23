"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, pretty } from "@/lib/api";
import { type Program, type Routine, type Category, trainingLabels } from "@/lib/training";
import { useSession } from "./session";

export function TrainingLibrary() {
  const [mode, setMode] = useState<"programs" | "routines">("programs");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const [equipment, setEquipment] = useState("");
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState("");
  const [category, setCategory] = useState("");
  const { admin } = useSession();
  useEffect(() => {
    let active = true;
    Promise.all([api<Program[]>("/catalog/programs"), api<Routine[]>("/catalog/routines"), api<Category[]>("/catalog/categories")])
      .then(([p, r, c]) => { if (active) { setPrograms(p); setRoutines(r); setCategories(c); setError(""); } })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);
  const rows = (mode === "programs" ? programs : routines).filter(row =>
    `${row.name} ${row.description}`.toLowerCase().includes(search.toLowerCase()) && (!level || row.level === level) && (!equipment || row.equipment === equipment) && (!goal || row.goal === goal) &&
    (mode !== "programs" || !days || (row as Program).days_per_week === Number(days)) &&
    (mode !== "routines" || !category || row.training_routine_categories?.slug === category));
  function reset() { setSearch(""); setLevel(""); setEquipment(""); setGoal(""); setDays(""); setCategory(""); }
  function filter(label: string, value: string, change: (v: string) => void, options: string[]) { return <label className="field"><span>{label}</span><select value={value} onChange={e => change(e.target.value)}><option value="">Any {label.toLowerCase()}</option>{options.map(v => <option key={v} value={v}>{trainingLabels[v] ?? pretty(v)}</option>)}</select></label>; }
  return <>
    <section className="training-hero"><div><p className="eyebrow">Your training library</p><h1>A plan for today.<br />A rhythm for the weeks ahead.</h1><p className="lead">Choose a whole program when you want a weekly structure, or save one routine for a session you can repeat.</p></div><div className="training-example panel"><span className="eyebrow">How it fits together</span><h2>Upper / Lower <small>Program</small></h2><p>4 training days each week</p><div className="week-mini" aria-label="Example schedule"><span>Day 1<b>Upper</b></span><span>Day 2<b>Lower</b></span><span>Day 3<b>Rest</b></span><span>Day 4<b>Upper</b></span><span>Day 5<b>Lower</b></span><span>Day 6<b>Rest</b></span><span>Day 7<b>Rest</b></span></div><small>Upper Body is a routine. Completing it today is a workout. This is an illustration, not a saved plan.</small></div></section>
    <div className="training-definitions">{[["Routine", "One reusable session", "Exercises, sets, rep targets, and rest. Example: Upper Body."], ["Program", "Your weekly structure", "Routines and rest days arranged over a number of weeks."], ["Workout", "What you actually do", "Start a routine in the mobile app, log your sets, then finish the session."]].map(([name, title, detail]) => <div key={name}><span className="eyebrow">{name}</span><h3>{title}</h3><p>{detail}</p></div>)}</div>
    <section className="training-browser" aria-label="Browse training"><div className="training-switch" aria-label="Training type">{(["programs", "routines"] as const).map(v => <button key={v} aria-pressed={mode === v} className={mode === v ? "selected" : ""} onClick={() => setMode(v)}>{v === "programs" ? "Programs · plan your week" : "Routines · plan a session"}</button>)}</div>
      <div className="page-heading"><div><h2>{mode === "programs" ? "Find a program you can stick with" : "Find your next session"}</h2><p>{mode === "programs" ? "Compare training days, equipment, and experience before choosing." : "Browse by training style, then preview the exercises before saving."}</p></div></div>
      <div className="training-filters"><label className="field"><span>Search</span><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${mode}`} /></label>{filter("Level", level, setLevel, ["beginner", "intermediate", "advanced"])}{filter("Equipment", equipment, setEquipment, ["gym", "dumbbells", "bodyweight", "bands", "mixed"])}{filter("Goal", goal, setGoal, ["general", "muscle", "strength", "endurance", "fat_loss"])}{mode === "programs" ? filter("Days per week", days, setDays, ["1", "2", "3", "4", "5", "6", "7"]) : <label className="field"><span>Category</span><select value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></label>}</div>
      <div className="training-results"><span role="status">{loading ? "Loading library…" : `${rows.length} ${mode}`}</span><button className="text-link" onClick={reset}>Clear filters</button></div>
      {error ? <div className="notice error" role="alert">Couldn’t load the training library. {error}<button className="text-link" onClick={() => { setLoading(true); setRetry(v => v + 1); }}>Try again</button></div> : !loading && !rows.length ? <div className="empty-state"><h2>{(mode === "programs" ? programs : routines).length ? "No matches yet" : `The ${mode} library is being prepared`}</h2><p>{(mode === "programs" ? programs : routines).length ? "Try fewer filters or a different search." : "Only reviewed, published plans appear here. You can still explore exercises and create a routine in the mobile app."}</p><Link className="button secondary" href={admin ? `/admin/${mode}` : "/exercises"}>{admin ? `Manage ${mode}` : "Explore exercises"}</Link></div> : <div className="training-cards">{rows.map(row => <article className="panel training-card" key={row.id}><div className="training-card-top"><span className="eyebrow">{mode === "programs" ? "Multi-week program" : "Single-session routine"}</span><span className="badge">{pretty(row.level)}</span></div><h3><Link href={`/${mode}/${row.id}`}>{row.name}</Link></h3><p>{row.description}</p><div className="training-facts"><span>{mode === "programs" ? `${(row as Program).days_per_week} days / week` : `~${(row as Routine).estimated_minutes} min`}</span>{mode === "programs" && <span>{(row as Program).duration_weeks} weeks</span>}<span>{trainingLabels[row.equipment]}</span></div><Link href={`/${mode}/${row.id}`} className="button secondary">{mode === "programs" ? "View weekly plan" : "Preview exercises"} →</Link></article>)}</div>}
    </section>
    <section className="panel training-guidance"><h2>Start with a schedule you can repeat</h2><p>Choose training days that fit your life and leave room for recovery. For beginners, the NSCA describes two or three full-body sessions per week as a typical starting frequency—not a requirement to train every day.</p><a className="text-link" href="https://www.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/" target="_blank" rel="noreferrer">Read the NSCA guidance ↗</a><p>FitSync programs currently show a repeating weekly schedule. They do not automatically change loads or exercises from week to week.</p></section>
  </>;
}
