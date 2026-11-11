"use client";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Dumbbell, RotateCcw, Search } from "lucide-react";
import { Reveal } from "./motion";
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
    Promise.all([
      api<Program[]>("/catalog/programs"),
      api<Routine[]>("/catalog/routines"),
      api<Category[]>("/catalog/categories"),
    ])
      .then(([p, r, c]) => {
        if (active) {
          setPrograms(p);
          setRoutines(r);
          setCategories(c);
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
  }, [retry]);
  const rows = (mode === "programs" ? programs : routines).filter(
    (row) =>
      `${row.name} ${row.description}`.toLowerCase().includes(search.toLowerCase()) &&
      (!level || row.level === level) &&
      (!equipment || row.equipment === equipment) &&
      (!goal || row.goal === goal) &&
      (mode !== "programs" || !days || (row as Program).days_per_week === Number(days)) &&
      (mode !== "routines" || !category || row.training_routine_categories?.slug === category),
  );
  function reset() {
    setSearch("");
    setLevel("");
    setEquipment("");
    setGoal("");
    setDays("");
    setCategory("");
  }
  function filter(label: string, value: string, change: (v: string) => void, options: string[]) {
    return (
      <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
        <span>{label}</span>
        <select value={value} onChange={(e) => change(e.target.value)}>
          <option value="">Any {label.toLowerCase()}</option>
          {options.map((v) => (
            <option key={v} value={v}>
              {trainingLabels[v] ?? pretty(v)}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <>
      <section className="grid gap-12 pt-10 pb-20 sm:pt-16 sm:pb-28 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-24">
        <Reveal>
          <p className="text-xs tracking-[.12em] text-white/55 uppercase">The training library</p>
          <h1 className="mt-6 text-[clamp(3rem,6.5vw,6rem)] leading-[1.04] font-medium tracking-[-.06em]">
            A little structure.
            <br />
            <span className="text-white/50">A lot of possibility.</span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-8 text-white/55">
            Find a program for your week or a routine for your next session. Preview the work, make
            it yours, and take it to the mobile app.
          </p>
          <a
            href="#browse-training"
            className="mt-7 inline-flex min-h-11 items-center gap-3 text-sm font-medium"
          >
            Find your next session
            <ArrowUpRight size={17} />
          </a>
        </Reveal>
        <Reveal delay={80}>
          <div className="rounded-3xl bg-panel p-7 sm:p-9">
            <p className="text-xs text-white/55">A little training clarity</p>
            <div className="mt-8 space-y-7">
              {[
                {
                  icon: CalendarDays,
                  title: "Program",
                  detail: "Routines arranged into a weekly plan.",
                },
                {
                  icon: Dumbbell,
                  title: "Routine",
                  detail: "A reusable session with exercises and targets.",
                },
                {
                  icon: CheckMark,
                  title: "Workout",
                  detail: "The session you actually complete and log.",
                },
              ].map(({ icon: Icon, title, detail }) => (
                <div key={title} className="flex gap-4">
                  <Icon size={21} strokeWidth={1.2} className="mt-1 text-white/50" />
                  <div>
                    <h2 className="text-base font-medium">{title}</h2>
                    <p className="mt-2 text-sm leading-7 text-white/55">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>
      <section id="browse-training" className="scroll-mt-32 pb-16" aria-label="Browse training">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-6">
          <div className="inline-flex rounded-full bg-white/5 p-1.5" aria-label="Training type">
            {(["programs", "routines"] as const).map((value) => (
              <button
                key={value}
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={`min-h-11 rounded-full px-6 text-sm transition-colors ${mode === value ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
              >
                {value === "programs" ? "Programs" : "Routines"}
              </button>
            ))}
          </div>
          <p className="text-xs text-white/50">Published plans. Ready to make your own.</p>
        </div>
        <div className="grid gap-4 rounded-3xl bg-panel p-6 sm:grid-cols-2 lg:grid-cols-5 sm:p-8">
          <label className="flex min-w-0 flex-col gap-2 text-sm">
            <span>Search</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${mode}`}
            />
          </label>
          {filter("Level", level, setLevel, ["beginner", "intermediate", "advanced"])}
          {filter("Equipment", equipment, setEquipment, [
            "gym",
            "dumbbells",
            "bodyweight",
            "bands",
            "mixed",
          ])}
          {filter("Goal", goal, setGoal, [
            "general",
            "muscle",
            "strength",
            "endurance",
            "fat_loss",
          ])}
          {mode === "programs" ? (
            filter("Days per week", days, setDays, ["1", "2", "3", "4", "5", "6", "7"])
          ) : (
            <label className="flex min-w-0 flex-col gap-2 text-sm">
              <span>Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">All categories</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="my-6 flex items-center justify-between gap-5 text-xs text-white/55">
          <span role="status">
            {loading ? "Loading your training library…" : `${rows.length} ${mode}`}
          </span>
          <button
            onClick={reset}
            className="inline-flex min-h-11 items-center gap-2 hover:text-white"
          >
            <RotateCcw size={13} />
            Reset filters
          </button>
        </div>
        {error ? (
          <div role="alert" className="rounded-3xl bg-panel p-10 text-center">
            <h2 className="text-2xl font-medium">The library couldn’t load.</h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/50">{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                setRetry((value) => value + 1);
              }}
              className="mt-6 inline-flex min-h-12 items-center gap-3 rounded-full bg-white px-6 text-sm font-medium text-black"
            >
              Try again
              <RotateCcw size={15} />
            </button>
          </div>
        ) : loading ? (
          <div
            role="status"
            aria-label="Loading training plans"
            className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          >
            {[0, 1, 2].map((value) => (
              <div
                key={value}
                className="h-75 animate-pulse rounded-3xl bg-panel motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : !rows.length ? (
          <div className="rounded-3xl bg-panel px-6 py-20 text-center">
            <Search size={30} strokeWidth={1} className="mx-auto text-white/50" />
            <h2 className="mt-6 text-2xl font-medium">
              {(mode === "programs" ? programs : routines).length
                ? "A different starting point?"
                : "Good things take a little preparation."}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-white/50">
              {(mode === "programs" ? programs : routines).length
                ? "There are no matches for these filters. Try a broader search to find your next session."
                : "The published library is being prepared. You can explore the exercise library or build a routine in the mobile app in the meantime."}
            </p>
            <Link
              href={admin ? `/admin/${mode}` : "/exercises"}
              className="mt-7 inline-flex min-h-12 items-center gap-4 rounded-full bg-white px-6 text-sm font-medium text-black"
            >
              {admin ? "Manage the library" : "Explore exercises"}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <article
                key={row.id}
                className="group flex flex-col rounded-3xl bg-panel p-7 transition-colors duration-300 hover:bg-panel-raised sm:p-8"
              >
                <div className="flex items-center justify-between text-white/50">
                  <Dumbbell size={28} strokeWidth={1} />
                  <span className="rounded-full bg-white/6 px-3 py-1 text-[10px]">
                    {pretty(row.level)}
                  </span>
                </div>
                <p className="mt-10 text-[10px] tracking-wider text-white/50 uppercase">
                  {mode === "programs" ? "Multi-week program" : "Single-session routine"}
                </p>
                <h3 className="mt-3 text-2xl leading-tight font-medium tracking-tight">
                  <Link href={`/${mode}/${row.id}`}>{row.name}</Link>
                </h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-white/50">{row.description}</p>
                <div className="mt-7 flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/50">
                  <span>
                    {mode === "programs"
                      ? `${(row as Program).days_per_week} days / week`
                      : `~${(row as Routine).estimated_minutes} min`}
                  </span>
                  {mode === "programs" && <span>{(row as Program).duration_weeks} weeks</span>}
                  <span>{trainingLabels[row.equipment]}</span>
                </div>
                <Link
                  href={`/${mode}/${row.id}`}
                  className="mt-8 flex min-h-12 items-center justify-between rounded-full bg-white/7 px-5 text-xs font-medium transition-colors group-hover:bg-white group-hover:text-black"
                >
                  {mode === "programs" ? "Explore the program" : "Preview the session"}
                  <ArrowUpRight size={17} />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="my-10 flex flex-col justify-between gap-7 rounded-3xl bg-white p-8 text-black sm:flex-row sm:items-center sm:p-10">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">Make room for your real week.</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-black/55">
            Save a routine or program to your account. Open it in FitSync mobile when you’re ready
            to train.
          </p>
        </div>
        <Link
          href="/features"
          className="inline-flex min-h-12 shrink-0 items-center gap-5 rounded-full bg-black px-6 text-sm font-medium text-white"
        >
          Meet the app
          <ArrowUpRight size={16} />
        </Link>
      </section>
    </>
  );
}
function CheckMark({
  size = 21,
  className = "",
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      className={className}
      aria-hidden="true"
    >
      <path d="m5 12 4 4 10-10" />
    </svg>
  );
}
