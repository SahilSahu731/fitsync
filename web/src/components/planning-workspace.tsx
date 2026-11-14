"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronRight,
  Copy,
  Download,
  Link2,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api, ApiError, pretty } from "@/lib/api";
import type { Account, ExercisePage } from "@/lib/types";
import { useSession } from "./session";

type Preferences = {
  goal: "muscle" | "strength" | "fat_loss" | "fitness";
  experience: "beginner" | "intermediate" | "advanced";
  trainingDays: number;
  minutesPerWorkout: 30 | 45 | 60;
  equipment: "gym" | "dumbbells" | "bodyweight";
};
type PrescriptionExercise = {
  exerciseId: string;
  name: string;
  trackingType: string;
  sets: number;
  repsMin: number | null;
  repsMax: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  restSeconds: number;
  reason?: string;
};
type Day = {
  id?: string;
  date: string;
  name: string;
  status?: string;
  revision?: number;
  prescription: { minutes: number; explanation: string[]; exercises: PrescriptionExercise[] };
};
type Plan = Preferences & {
  id?: string;
  name: string;
  startDate: string;
  explanation: string[];
  sessions: Day[];
};
type Template = {
  id: string;
  name: string;
  can_rename?: boolean;
  revision?: number;
  workout_template_exercises: { id: string; position: number; exercises: { name: string } }[];
};
type DraftExercise = {
  exerciseId: string;
  name: string;
  trackingType: string;
  sets: number;
  reps: number;
  weight: number | null;
  seconds: number;
  rest: number;
  notes: string;
  supersetGroup: string | null;
  setRows: DraftSet[];
};
type DraftSet = {
  setType: string;
  targetReps: number | null;
  targetWeight: number | null;
  targetDurationSeconds: number | null;
  restSeconds: number | null;
  tempo: string | null;
};
const initialSet = (trackingType: string): DraftSet => ({
  setType: "normal",
  targetReps: ["duration", "distance_duration"].includes(trackingType) ? null : 8,
  targetWeight: null,
  targetDurationSeconds: ["duration", "distance_duration"].includes(trackingType) ? 30 : null,
  restSeconds: null,
  tempo: null,
});
type Share = {
  id: string;
  label: string;
  fields: string[];
  expiresAt: string;
  revokedAt: string | null;
};
type CompanionState = { shares: Share[] };
const input =
  "min-h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-lime-200 disabled:opacity-50";
const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-200 disabled:cursor-not-allowed disabled:opacity-40";
const button = `${buttonBase} border-white/15 bg-white/5 text-white hover:bg-white/10`;
const primary = `${buttonBase} border-lime-200/60 bg-lime-200 text-black hover:bg-lime-100`;
const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/4 p-5 backdrop-blur-xl sm:p-7">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{description}</p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-xs font-medium text-white/60">
      {label}
      {children}
    </label>
  );
}
function dose(exercise: PrescriptionExercise) {
  return `${exercise.sets} × ${exercise.repsMin === null ? `${exercise.durationSeconds ?? 0} sec` : `${exercise.repsMin}${exercise.repsMax !== exercise.repsMin ? `–${exercise.repsMax}` : ""} reps`}${exercise.weightKg == null ? "" : ` · ${exercise.weightKg} kg`} · ${exercise.restSeconds}s rest`;
}
export function PlanningWorkspace() {
  const { account } = useSession();
  return account ? (
    <Planner key={account.user.id} owner={account.user.id} initialProfile={account.profile} />
  ) : null;
}
function Planner({ owner, initialProfile }: { owner: string; initialProfile: Account["profile"] }) {
  const active = useRef(true);
  const syncGeneration = useRef(0),
    mutating = useRef(false);
  const [tab, setTab] = useState<"plan" | "routines" | "sharing">("plan");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [sync, setSync] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [preferences, setPreferences] = useState<Preferences>(() => ({
    goal:
      initialProfile && ["muscle", "strength", "fat_loss", "fitness"].includes(initialProfile.goal)
        ? (initialProfile.goal as Preferences["goal"])
        : "muscle",
    experience:
      initialProfile && ["beginner", "intermediate", "advanced"].includes(initialProfile.experience)
        ? (initialProfile.experience as Preferences["experience"])
        : "beginner",
    trainingDays: initialProfile?.trainingDays ?? 3,
    minutesPerWorkout:
      initialProfile && [30, 45, 60].includes(initialProfile.minutesPerWorkout)
        ? (initialProfile.minutesPerWorkout as Preferences["minutesPerWorkout"])
        : 45,
    equipment:
      initialProfile && ["gym", "dumbbells", "bodyweight"].includes(initialProfile.equipment)
        ? (initialProfile.equipment as Preferences["equipment"])
        : "gym",
  }));
  const [startDate, setStartDate] = useState(localDate);
  const [preview, setPreview] = useState<Plan | null>(null);
  const [adaptation, setAdaptation] = useState<{
    plan: Plan;
    id: string;
    revision: number;
    minutes: number;
    effort: "easy" | "normal";
  } | null>(null);
  const [dates, setDates] = useState<Record<string, string>>({});
  const request = useCallback(
    <T,>(path: string, options: RequestInit & { json?: unknown } = {}) =>
      api<T>(path, { ...options, headers: { ...options.headers, "X-FitSync-Owner": owner } }),
    [owner],
  );
  const reload = useCallback(async () => {
    const generation = ++syncGeneration.current;
    const result = await Promise.allSettled([
      request<{ profile: Preferences | null; plan: Plan | null }>("/coaching/"),
      request<Template[]>("/workouts/templates"),
      request<CompanionState>("/companion/state"),
    ]);
    if (!active.current || generation !== syncGeneration.current) return;
    const messages: string[] = [];
    if (result[0].status === "fulfilled") setPlan(result[0].value.plan);
    else
      messages.push(
        result[0].reason instanceof Error ? result[0].reason.message : "Could not load your plan.",
      );
    if (result[1].status === "fulfilled") setTemplates(result[1].value);
    else
      messages.push(
        result[1].reason instanceof Error ? result[1].reason.message : "Could not load routines.",
      );
    if (result[2].status === "fulfilled") setShares(result[2].value.shares);
    else
      messages.push(
        result[2].reason instanceof Error ? result[2].reason.message : "Could not load sharing.",
      );
    setSync(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setError([...new Set(messages)].join(" "));
  }, [request]);
  useEffect(() => {
    active.current = true;
    const initial = setTimeout(() => void reload(), 0);
    const refresh = () => {
      if (document.visibilityState === "visible" && !mutating.current) void reload();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = setInterval(refresh, 30000);
    return () => {
      active.current = false;
      clearTimeout(initial);
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [reload]);
  async function run(key: string, action: () => Promise<void>) {
    if (mutating.current) return;
    mutating.current = true;
    syncGeneration.current++;
    setBusy(key);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      if (active.current)
        setError(e instanceof Error ? e.message : "Could not save. Please try again.");
    } finally {
      mutating.current = false;
      if (active.current) setBusy("");
    }
  }
  async function previewPlan() {
    await run("preview", async () => {
      const value = await request<Plan>("/coaching/plans/preview", {
        method: "POST",
        json: {
          startDate,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferences,
        },
      });
      if (active.current) {
        setPreview(value);
        setAdaptation(null);
      }
    });
  }
  async function savePlan() {
    if (!preview) return;
    await run("save-plan", async () => {
      const value = await request<Plan>("/coaching/plans", {
        method: "POST",
        json: {
          requestId: crypto.randomUUID(),
          startDate: preview.startDate,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferences: {
            goal: preview.goal,
            experience: preferences.experience,
            trainingDays: preview.trainingDays,
            minutesPerWorkout: preview.minutesPerWorkout,
            equipment: preview.equipment,
          },
          ...(plan?.id ? { replacePlanId: plan.id } : {}),
        },
      });
      if (active.current) {
        setPlan(value);
        setPreview(null);
        setNotice("Your plan is saved. Mobile will load the same schedule when it refreshes.");
      }
    });
  }
  async function reschedule(day: Day) {
    if (!day.id || !dates[day.id]) return;
    await run(day.id, async () => {
      const value = await request<Plan>(`/coaching/sessions/${day.id}/reschedule`, {
        method: "POST",
        json: {
          requestId: crypto.randomUUID(),
          expectedRevision: day.revision,
          date: dates[day.id!],
        },
      });
      if (active.current) {
        setPlan(value);
        setNotice("Session rescheduled across your account.");
      }
    });
  }
  async function adapt(day: Day, apply = false) {
    if (!day.id) return;
    const minutes =
      apply && adaptation ? adaptation.minutes : Math.min(day.prescription.minutes, 30);
    await run(day.id, async () => {
      const value = await request<Plan>(`/coaching/sessions/${day.id}/adapt`, {
        method: "POST",
        json: {
          requestId: crypto.randomUUID(),
          expectedRevision: apply && adaptation ? adaptation.revision : day.revision,
          minutes,
          effort: "easy",
          preview: !apply,
        },
      });
      if (active.current) {
        if (apply) {
          setPlan(value);
          setAdaptation(null);
          setNotice("Your reviewed adaptation is saved.");
        } else {
          setAdaptation({
            plan: value,
            id: day.id!,
            revision: day.revision!,
            minutes,
            effort: "easy",
          });
          setPreview(null);
        }
      }
    });
  }
  return (
    <div className="space-y-8 text-white">
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_top_right,#b7f28b1c,transparent_65%)] p-6 sm:p-9">
        <div className="flex flex-wrap items-center gap-3 text-xs text-lime-200">
          <Sparkles size={15} />
          <span className="font-medium tracking-widest uppercase">FitSync planning</span>
          <span className="ml-auto flex items-center gap-2 text-white/45">
            <span className="size-1.5 rounded-full bg-lime-200" />
            {sync ? `Last checked ${sync}` : "Connecting to your account"}
          </span>
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
          Your training, with room to think.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-white/55">
          Plan on a bigger screen. Take the same routines, schedule and progress back to your phone.
        </p>
      </header>
      <div className="flex flex-wrap items-center gap-2">
        <nav
          aria-label="Planner sections"
          className="flex flex-wrap gap-1 rounded-2xl bg-white/5 p-1"
        >
          {(
            [
              ["plan", "Training plan"],
              ["routines", "My routines"],
              ["sharing", "Reports & sharing"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`${button} border-transparent! ${tab === key ? "bg-white/12! text-lime-200!" : "bg-transparent! text-white/50!"}`}
              aria-pressed={tab === key}
            >
              {label}
            </button>
          ))}
        </nav>
        <button
          className={`${button} ml-auto`}
          disabled={!!busy}
          onClick={() => void run("refresh", reload)}
        >
          <RefreshCw
            size={15}
            className={busy === "refresh" ? "animate-spin motion-reduce:animate-none" : ""}
          />
          Refresh
        </button>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200/20 bg-amber-200/5 p-4 text-sm leading-6 text-amber-100"
        >
          {error}
          <button
            onClick={() => void run("refresh", reload)}
            className="ml-3 underline underline-offset-4"
          >
            Refresh
          </button>
        </div>
      )}
      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-lime-200/8 p-4 text-sm text-lime-100"
        >
          <Check size={17} />
          {notice}
        </p>
      )}
      {tab === "plan" && (
        <>
          <Panel
            title="Build your next four weeks"
            description="Preview every session before saving. Replacing a plan archives its schedule and preserves your completed workouts."
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <Field label="Goal">
                <select
                  className={input}
                  value={preferences.goal}
                  onChange={(e) => {
                    setPreferences({ ...preferences, goal: e.target.value as Preferences["goal"] });
                    setPreview(null);
                  }}
                >
                  {["muscle", "strength", "fat_loss", "fitness"].map((value) => (
                    <option key={value} value={value}>
                      {pretty(value)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Experience">
                <select
                  className={input}
                  value={preferences.experience}
                  onChange={(e) => {
                    setPreferences({
                      ...preferences,
                      experience: e.target.value as Preferences["experience"],
                    });
                    setPreview(null);
                  }}
                >
                  {["beginner", "intermediate", "advanced"].map((value) => (
                    <option key={value} value={value}>
                      {pretty(value)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Equipment">
                <select
                  className={input}
                  value={preferences.equipment}
                  onChange={(e) => {
                    setPreferences({
                      ...preferences,
                      equipment: e.target.value as Preferences["equipment"],
                    });
                    setPreview(null);
                  }}
                >
                  {["gym", "dumbbells", "bodyweight"].map((value) => (
                    <option key={value} value={value}>
                      {pretty(value)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Available days">
                <select
                  className={input}
                  value={preferences.trainingDays}
                  onChange={(e) => {
                    setPreferences({ ...preferences, trainingDays: Number(e.target.value) });
                    setPreview(null);
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                    <option key={value} value={value}>
                      {value} / week
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Session length">
                <select
                  className={input}
                  value={preferences.minutesPerWorkout}
                  onChange={(e) => {
                    setPreferences({
                      ...preferences,
                      minutesPerWorkout: Number(e.target.value) as 30 | 45 | 60,
                    });
                    setPreview(null);
                  }}
                >
                  {[30, 45, 60].map((value) => (
                    <option key={value} value={value}>
                      {value} minutes
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Starts on">
                <input
                  type="date"
                  className={input}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPreview(null);
                  }}
                />
              </Field>
            </div>
            <button
              disabled={!!busy || !startDate}
              onClick={() => void previewPlan()}
              className={`${primary} mt-5`}
            >
              {busy === "preview" ? (
                <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Sparkles size={16} />
              )}
              Preview my plan
            </button>
          </Panel>
          {preview && (
            <Panel
              title="Your plan preview"
              description="Review the full schedule below. This preview has not changed your saved plan."
            >
              <div className="space-y-2 text-sm leading-6 text-white/60">
                {preview.explanation.map((text, index) => (
                  <p key={index}>{text}</p>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button disabled={!!busy} onClick={() => void savePlan()} className={primary}>
                  {plan ? "Replace active plan with this preview" : "Save this plan"}
                  <ChevronRight size={16} />
                </button>
                <button onClick={() => setPreview(null)} className={button}>
                  Dismiss preview
                </button>
              </div>
            </Panel>
          )}
          {adaptation && (
            <Panel
              title="Review shorter, easier session"
              description="The changes below are a preview. The original remains active until you apply it."
            >
              <DayContent day={adaptation.plan.sessions.find((day) => day.id === adaptation.id)!} />
              <div className="mt-4 flex gap-3">
                <button
                  disabled={!!busy}
                  className={primary}
                  onClick={() => {
                    const day = plan?.sessions.find((row) => row.id === adaptation.id);
                    if (day) void adapt(day, true);
                  }}
                >
                  Apply this adaptation
                </button>
                <button className={button} onClick={() => setAdaptation(null)}>
                  Keep current session
                </button>
              </div>
            </Panel>
          )}
          <section>
            <div className="mb-5 flex items-center gap-3">
              <CalendarDays size={19} className="text-lime-200" />
              <h2 className="text-xl font-semibold">
                {preview ? "Preview schedule" : (plan?.name ?? "Your schedule")}
              </h2>
            </div>
            {!(preview ?? plan) ? (
              <Panel
                title="A fresh start"
                description="Generate a preview above, or create a personal routine in My routines."
              >
                <p className="text-sm text-white/45">
                  Your saved mobile plan will also appear here.
                </p>
              </Panel>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(preview ?? plan)!.sessions.map((day, index) => (
                  <article
                    key={day.id ?? `${day.date}-${index}`}
                    className="rounded-2xl border border-white/10 bg-white/3 p-5"
                  >
                    <div className="flex items-center justify-between gap-3 text-xs text-white/45">
                      <span>{day.date}</span>
                      <span className={day.status === "completed" ? "text-lime-200" : ""}>
                        {pretty(day.status ?? "Preview")}
                      </span>
                    </div>
                    <h3 className="mt-3 font-semibold">{day.name}</h3>
                    <DayContent day={day} />
                    {!preview && day.id && !["active", "completed"].includes(day.status ?? "") && (
                      <div className="mt-5 border-t border-white/10 pt-4">
                        <label className="text-xs text-white/50" htmlFor={`date-${day.id}`}>
                          Move session
                        </label>
                        <div className="mt-2 flex gap-2">
                          <input
                            id={`date-${day.id}`}
                            type="date"
                            className={input}
                            value={dates[day.id] ?? day.date}
                            onChange={(e) => setDates({ ...dates, [day.id!]: e.target.value })}
                          />
                          <button
                            disabled={!!busy || !dates[day.id] || dates[day.id] === day.date}
                            className={button}
                            onClick={() => void reschedule(day)}
                          >
                            Save
                          </button>
                        </div>
                        <button
                          disabled={!!busy}
                          className={`${button} mt-3 w-full`}
                          onClick={() => void adapt(day)}
                        >
                          Preview 30-minute easier session
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
      <div hidden={tab !== "routines"}>
        <RoutineWorkspace
          templates={templates}
          request={request}
          run={run}
          busy={busy}
          reload={reload}
          notify={setNotice}
        />
      </div>
      <div hidden={tab !== "sharing"}>
        <SharingWorkspace shares={shares} request={request} run={run} busy={busy} reload={reload} />
      </div>
    </div>
  );
}
function DayContent({ day }: { day: Day }) {
  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs text-white/40">About {day.prescription.minutes} minutes</p>
      {day.prescription.exercises.map((exercise, index) => (
        <div key={`${exercise.exerciseId}-${index}`}>
          <p className="text-sm text-white/85">{exercise.name}</p>
          <p className="mt-1 text-xs leading-5 text-white/45">{dose(exercise)}</p>
        </div>
      ))}
      <details className="text-xs leading-6 text-white/45">
        <summary className="cursor-pointer text-lime-200/80">Why this session?</summary>
        {day.prescription.explanation.map((text, index) => (
          <p className="mt-2" key={index}>
            {text}
          </p>
        ))}
        {day.prescription.exercises
          .filter((exercise) => exercise.reason)
          .map((exercise, index) => (
            <p className="mt-2" key={index}>
              {exercise.name}: {exercise.reason}
            </p>
          ))}
      </details>
    </div>
  );
}
type Request = <T>(path: string, options?: RequestInit & { json?: unknown }) => Promise<T>;
type Run = (key: string, action: () => Promise<void>) => Promise<void>;
function RoutineWorkspace({
  templates,
  request,
  run,
  busy,
  reload,
  notify,
}: {
  templates: Template[];
  request: Request;
  run: Run;
  busy: string;
  reload: () => Promise<void>;
  notify: (value: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState<DraftExercise[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ExercisePage["items"]>([]);
  const [rename, setRename] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<{ id: string; name: string; revision: number } | null>(
    null,
  );
  const [conflict, setConflict] = useState(false);
  function update(index: number, patch: Partial<DraftExercise>) {
    setDraft(
      draft.map((exercise, i) => {
        if (i !== index) return exercise;
        const setRows =
          patch.sets === undefined
            ? exercise.setRows
            : Array.from(
                { length: patch.sets },
                (_, position) => exercise.setRows[position] ?? initialSet(exercise.trackingType),
              );
        return { ...exercise, ...patch, setRows };
      }),
    );
  }
  function updateSet(index: number, position: number, patch: Partial<DraftSet>) {
    update(index, {
      setRows: draft[index].setRows.map((set, i) => (i === position ? { ...set, ...patch } : set)),
    });
  }
  function move(index: number, direction: number) {
    const rows = [...draft];
    [rows[index], rows[index + direction]] = [rows[index + direction], rows[index]];
    setDraft(rows);
  }
  async function loadRoutine(template: Template, asCopy = false) {
    await run("copy", async () => {
      const value = await request<{
        name: string;
        revision: number;
        description: string;
        workout_template_exercises: {
          exercise_id: string;
          exercises: { name: string; tracking_type: string };
          rest_seconds: number;
          notes: string;
          superset_group: string | null;
          position: number;
          workout_template_sets: {
            position: number;
            set_type: string;
            target_reps: number | null;
            target_weight: number | null;
            target_duration_seconds: number | null;
            rest_seconds: number | null;
            tempo: string | null;
          }[];
        }[];
      }>(`/workouts/templates/${template.id}`);
      setName(asCopy ? `${value.name.slice(0, 95)} copy` : value.name);
      setEditing(
        asCopy ? null : { id: template.id, name: value.name, revision: value.revision ?? 0 },
      );
      setConflict(false);
      setDescription(value.description ?? "");
      setDraft(
        [...value.workout_template_exercises]
          .sort((a, b) => a.position - b.position)
          .map((exercise) => ({
            exerciseId: exercise.exercise_id,
            name: exercise.exercises.name,
            trackingType: exercise.exercises.tracking_type,
            sets: exercise.workout_template_sets.length,
            reps: exercise.workout_template_sets[0]?.target_reps ?? 8,
            weight: exercise.workout_template_sets[0]?.target_weight ?? null,
            seconds: exercise.workout_template_sets[0]?.target_duration_seconds ?? 30,
            rest: exercise.rest_seconds,
            notes: exercise.notes ?? "",
            supersetGroup: exercise.superset_group,
            setRows: [...exercise.workout_template_sets]
              .sort((a, b) => a.position - b.position)
              .map((set) => ({
                setType: set.set_type,
                targetReps: set.target_reps,
                targetWeight: set.target_weight,
                targetDurationSeconds: set.target_duration_seconds,
                restSeconds: set.rest_seconds ?? null,
                tempo: set.tempo ?? null,
              })),
          })),
      );
      notify(
        asCopy
          ? "Routine loaded as an editable copy. Your existing routine is preserved."
          : "Editing your saved routine. Changes apply after you save; completed workout history stays intact.",
      );
    });
  }
  async function save(asNew = false) {
    await run("routine", async () => {
      try {
        await request(
          editing && !asNew ? `/workouts/templates/${editing.id}` : "/workouts/templates",
          {
            method: editing && !asNew ? "PUT" : "POST",
            json: {
              ...(editing && !asNew ? { expectedRevision: editing.revision } : {}),
              name: name.trim(),
              description,
              exercises: draft.map((exercise) => ({
                exerciseId: exercise.exerciseId,
                notes: exercise.notes,
                restSeconds: exercise.rest,
                supersetGroup: exercise.supersetGroup,
                sets: exercise.setRows,
              })),
            },
          },
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) setConflict(true);
        throw error;
      }
      setName("");
      setDescription("");
      setDraft([]);
      setEditing(null);
      setConflict(false);
      await reload();
      notify("Routine saved to your account and available on mobile.");
    });
  }
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Panel
        title="Your saved routines"
        description="Edit your personal routines or use any saved routine as the starting point for a new copy."
      >
        <div className="space-y-4">
          {templates.length === 0 && (
            <p className="text-sm text-white/45">Your personal routines will appear here.</p>
          )}
          {templates.map((template) => (
            <div key={template.id} className="rounded-2xl border border-white/10 p-4">
              <h3 className="font-medium">{template.name}</h3>
              <p className="mt-2 text-xs leading-6 text-white/45">
                {template.workout_template_exercises.length} exercises ·{" "}
                {[...template.workout_template_exercises]
                  .sort((a, b) => a.position - b.position)
                  .map((exercise) => exercise.exercises.name)
                  .join(" · ")}
              </p>
              <button
                className={`${button} mt-3`}
                disabled={!!busy}
                onClick={() => void loadRoutine(template, true)}
              >
                <Copy size={14} />
                Edit a copy
              </button>
              {template.can_rename && (
                <button
                  className={`${button} mt-3 ml-2`}
                  disabled={!!busy}
                  onClick={() => void loadRoutine(template)}
                >
                  Edit routine
                </button>
              )}
              {template.can_rename && (
                <div className="mt-3 flex gap-2">
                  <input
                    aria-label={`New name for ${template.name}`}
                    className={input}
                    maxLength={100}
                    placeholder="Rename routine"
                    value={rename[template.id] ?? ""}
                    onChange={(e) => setRename({ ...rename, [template.id]: e.target.value })}
                  />
                  <button
                    className={button}
                    disabled={!!busy || !rename[template.id]?.trim()}
                    onClick={() =>
                      void run("rename", async () => {
                        await request(`/workouts/templates/${template.id}`, {
                          method: "PATCH",
                          json: { name: rename[template.id].trim() },
                        });
                        await reload();
                        notify("Routine renamed across your account.");
                      })
                    }
                  >
                    Rename
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>
      <Panel
        title={editing ? `Editing ${editing.name}` : "Routine builder"}
        description="Arrange exercises and working targets. Weight is stored in kilograms across your account."
      >
        {editing && (
          <div className="mb-5 flex flex-wrap items-center gap-3 text-xs text-white/50">
            <span>Loaded version {editing.revision}. Background sync preserves this draft.</span>
            <button
              className={button}
              disabled={!!busy}
              onClick={() => {
                setEditing(null);
                setName("");
                setDescription("");
                setDraft([]);
                setConflict(false);
              }}
            >
              Start a new routine
            </button>
          </div>
        )}
        {conflict && editing && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-amber-200/20 bg-amber-200/5 p-4"
          >
            <p className="text-sm leading-6 text-amber-100">
              This routine changed on another device. Your unsaved edits are still here.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className={button}
                disabled={!!busy}
                onClick={() =>
                  void loadRoutine({
                    id: editing.id,
                    name: editing.name,
                    can_rename: true,
                    workout_template_exercises: [],
                  })
                }
              >
                Reload saved routine (replace this draft)
              </button>
              <button
                className={button}
                disabled={!!busy || !name.trim() || !draft.length}
                onClick={() => void save(true)}
              >
                Save this draft as a new routine
              </button>
            </div>
          </div>
        )}
        <Field label="Routine name">
          <input
            className={input}
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            placeholder="My upper-body day"
          />
        </Field>
        <div className="mt-4">
          <Field label="Routine description">
            <textarea
              className={input}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-5 flex gap-2">
          <input
            aria-label="Search exercises"
            className={input}
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your exercise library"
            onKeyDown={(e) => {
              if (e.key === "Enter")
                void run("search", async () => {
                  const value = await request<ExercisePage>(
                    `/exercises?q=${encodeURIComponent(search)}&pageSize=20`,
                  );
                  setResults(value.items);
                });
            }}
          />
          <button
            className={button}
            disabled={!!busy}
            onClick={() =>
              void run("search", async () => {
                const value = await request<ExercisePage>(
                  `/exercises?q=${encodeURIComponent(search)}&pageSize=20`,
                );
                setResults(value.items);
              })
            }
          >
            Search
          </button>
        </div>
        {results.length > 0 && (
          <div className="mt-3 max-h-60 overflow-y-auto rounded-xl border border-white/10">
            {results.map((exercise) => (
              <button
                key={exercise.id}
                disabled={draft.length >= 50 || draft.some((row) => row.exerciseId === exercise.id)}
                className="flex min-h-12 w-full items-center justify-between gap-4 border-b border-white/5 px-3 py-2 text-left text-sm hover:bg-white/5 disabled:opacity-30"
                onClick={() => {
                  setDraft([
                    ...draft,
                    {
                      exerciseId: exercise.id,
                      name: exercise.name,
                      trackingType: exercise.trackingType,
                      sets: 3,
                      reps: 8,
                      weight: null,
                      seconds: 30,
                      rest: 90,
                      notes: "",
                      supersetGroup: null,
                      setRows: Array.from({ length: 3 }, () => initialSet(exercise.trackingType)),
                    },
                  ]);
                  setResults([]);
                }}
              >
                <span>
                  {exercise.name}
                  <span className="mt-1 block text-xs text-white/40">
                    {pretty(exercise.trackingType)}
                  </span>
                </span>
                <Plus size={15} />
              </button>
            ))}
          </div>
        )}
        <div className="mt-5 space-y-4">
          {draft.map((exercise, index) => (
            <div
              key={`${exercise.exerciseId}-${index}`}
              className="rounded-2xl border border-white/10 p-4"
            >
              <div className="flex items-center gap-2">
                <span className="mr-1 text-xs text-lime-200">{index + 1}</span>
                <h3 className="mr-auto text-sm font-medium">{exercise.name}</h3>
                <button
                  aria-label={`Move ${exercise.name} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className={`${button} min-h-9 px-2`}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  aria-label={`Move ${exercise.name} down`}
                  disabled={index === draft.length - 1}
                  onClick={() => move(index, 1)}
                  className={`${button} min-h-9 px-2`}
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  aria-label={`Remove ${exercise.name}`}
                  onClick={() => setDraft(draft.filter((_, i) => i !== index))}
                  className={`${button} min-h-9 px-2`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Number of sets">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={exercise.sets}
                    className={input}
                    onChange={(e) =>
                      update(index, { sets: Math.min(30, Math.max(1, Number(e.target.value))) })
                    }
                  />
                </Field>
                <Field label="Default rest (seconds)">
                  <input
                    type="number"
                    min={0}
                    max={900}
                    value={exercise.rest}
                    className={input}
                    onChange={(e) => update(index, { rest: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Superset group (optional)">
                  <input
                    className={input}
                    maxLength={24}
                    value={exercise.supersetGroup ?? ""}
                    placeholder="A"
                    onChange={(e) => update(index, { supersetGroup: e.target.value || null })}
                  />
                </Field>
              </div>
              <details className="mt-4" open>
                <summary className="cursor-pointer text-xs font-medium text-lime-200/80">
                  Individual set targets
                </summary>
                <p className="mt-2 text-xs leading-6 text-white/40">
                  Equal superset groups link exercises. Tempo uses lowering–pause–lifting–pause,
                  such as 3-1-1-0. Empty rest uses the exercise default.
                </p>
                <div className="mt-3 space-y-3">
                  {exercise.setRows.map((set, position) => (
                    <div key={position} className="rounded-xl bg-black/20 p-3">
                      <p className="mb-3 text-xs text-white/45">Set {position + 1}</p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <Field label="Method">
                          <select
                            className={input}
                            value={set.setType}
                            onChange={(e) =>
                              updateSet(index, position, { setType: e.target.value })
                            }
                          >
                            {["warmup", "normal", "heavy", "failure", "drop", "rest_pause"].map(
                              (type) => (
                                <option key={type} value={type}>
                                  {pretty(type)}
                                </option>
                              ),
                            )}
                          </select>
                        </Field>
                        {["duration", "distance_duration"].includes(exercise.trackingType) ? (
                          <Field label="Seconds">
                            <input
                              className={input}
                              type="number"
                              min={0}
                              value={set.targetDurationSeconds ?? ""}
                              onChange={(e) =>
                                updateSet(index, position, {
                                  targetDurationSeconds: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                })
                              }
                            />
                          </Field>
                        ) : (
                          <Field label="Repetitions">
                            <input
                              className={input}
                              type="number"
                              min={1}
                              max={1000}
                              value={set.targetReps ?? ""}
                              onChange={(e) =>
                                updateSet(index, position, {
                                  targetReps: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                            />
                          </Field>
                        )}
                        <Field label="Load (kg, optional)">
                          <input
                            className={input}
                            type="number"
                            min={0}
                            max={100000}
                            step={0.25}
                            value={set.targetWeight ?? ""}
                            onChange={(e) =>
                              updateSet(index, position, {
                                targetWeight: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                          />
                        </Field>
                        <Field label="Set rest (seconds)">
                          <input
                            className={input}
                            type="number"
                            min={0}
                            max={900}
                            placeholder={String(exercise.rest)}
                            value={set.restSeconds ?? ""}
                            onChange={(e) =>
                              updateSet(index, position, {
                                restSeconds: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                          />
                        </Field>
                        <Field label="Tempo (optional)">
                          <input
                            className={input}
                            maxLength={7}
                            value={set.tempo ?? ""}
                            placeholder="3-1-1-0"
                            onChange={(e) =>
                              updateSet(index, position, { tempo: e.target.value || null })
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
              <div className="mt-4">
                <Field label="Exercise notes">
                  <textarea
                    className={input}
                    maxLength={1000}
                    value={exercise.notes}
                    onChange={(e) => update(index, { notes: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
        <button
          className={`${primary} mt-5 w-full`}
          disabled={!!busy || !name.trim() || !draft.length}
          onClick={() => void save()}
        >
          <Plus size={16} />
          {editing ? "Save changes to this routine" : "Save as new routine"}
        </button>
      </Panel>
    </div>
  );
}
function SharingWorkspace({
  shares,
  request,
  run,
  busy,
  reload,
}: {
  shares: Share[];
  request: Request;
  run: Run;
  busy: string;
  reload: () => Promise<void>;
}) {
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  const [label, setLabel] = useState("");
  const [fields, setFields] = useState<string[]>(["workouts", "plan"]);
  const [days, setDays] = useState(7);
  const [link, setLink] = useState("");
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  async function download() {
    await run("report", async () => {
      const result = await request<{ text: string }>(
        `/companion/reports?month=${month}&timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`,
      );
      const url = URL.createObjectURL(
        new Blob([result.text], { type: "text/plain;charset=utf-8" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `FitSync-${month}.txt`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Panel
        title="A month, made readable"
        description="Download completed sessions, working sets, exercise observations and your latest measurement entries. Reports use your local calendar and include explanations of what was counted."
      >
        <Field label="Report month">
          <input
            type="month"
            className={input}
            value={month}
            max={localDate().slice(0, 7)}
            onChange={(e) => setMonth(e.target.value)}
          />
        </Field>
        <button
          className={`${primary} mt-5`}
          disabled={!!busy || !month}
          onClick={() => void download()}
        >
          <Download size={16} />
          Download monthly report
        </button>
      </Panel>
      <Panel
        title="Share a training view"
        description="Create a read-only link for someone you trust. Anyone holding the link can view only your selected training information until it expires or you revoke it."
      >
        <div className="mb-5 flex items-center gap-2 text-xs leading-6 text-lime-200">
          <ShieldCheck size={17} />
          Photos, body measurements, readiness notes and nutrition stay private.
        </div>
        <div className="space-y-4">
          <Field label="Link label">
            <input
              className={input}
              maxLength={120}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="My coach"
            />
          </Field>
          <fieldset>
            <legend className="mb-3 text-xs text-white/60">Choose exactly what to share</legend>
            <div className="flex flex-wrap gap-5">
              {[
                ["workouts", "Last 90 days of workouts"],
                ["plan", "Current training plan"],
              ].map(([key, title]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={fields.includes(key)}
                    onChange={(e) =>
                      setFields(
                        e.target.checked
                          ? [...fields, key]
                          : fields.filter((value) => value !== key),
                      )
                    }
                    className="size-4 accent-lime-200"
                  />
                  {title}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Expires after">
            <select
              className={input}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              {[1, 3, 7, 14, 30].map((value) => (
                <option key={value} value={value}>
                  {value} days
                </option>
              ))}
            </select>
          </Field>
          <button
            className={primary}
            disabled={!!busy || !label.trim() || !fields.length}
            onClick={() =>
              void run("share", async () => {
                const result = await request<{ token: string }>("/companion/shares", {
                  method: "POST",
                  json: { label: label.trim(), fields, expiresInDays: days },
                });
                setLink(`${window.location.origin}/shared/${result.token}`);
                await reload();
              })
            }
          >
            <Link2 size={16} />
            Create private training link
          </button>
          {link && (
            <div className="rounded-xl border border-lime-200/20 bg-lime-200/5 p-4">
              <p className="text-xs leading-6 text-white/60">
                Copy this link now. It is shown only here and is not saved in your browser.
              </p>
              <input
                className={`${input} mt-2`}
                readOnly
                aria-label="New private training link"
                value={link}
                onFocus={(e) => e.target.select()}
              />
              <button
                className={`${button} mt-3`}
                onClick={() =>
                  void run("copy-link", async () => {
                    await navigator.clipboard.writeText(link);
                  })
                }
              >
                <Copy size={14} />
                Copy link
              </button>
              <button className={`${button} mt-3 ml-2`} onClick={() => setLink("")}>
                Hide
              </button>
            </div>
          )}
        </div>
      </Panel>
      <div className="lg:col-span-2">
        <Panel
          title="Your sharing controls"
          description="Revoking a link stops future access. Information already viewed or saved by a recipient cannot be recalled."
        >
          <div className="space-y-3">
            {shares.length === 0 && (
              <p className="text-sm text-white/45">You have no shared training links.</p>
            )}
            {shares.map((share) => {
              const expired = Date.parse(share.expiresAt) <= now;
              return (
                <div
                  key={share.id}
                  className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 p-4"
                >
                  <div className="mr-auto">
                    <p className="font-medium">{share.label}</p>
                    <p className="mt-1 text-xs leading-6 text-white/45">
                      {share.fields.map(pretty).join(" + ")} ·{" "}
                      {share.revokedAt
                        ? "Revoked"
                        : expired
                          ? "Expired"
                          : `Expires ${new Date(share.expiresAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  {!share.revokedAt && !expired && (
                    <button
                      className={button}
                      disabled={!!busy}
                      onClick={() =>
                        void run("revoke", async () => {
                          await request(`/companion/shares/${share.id}`, { method: "DELETE" });
                          setLink("");
                          await reload();
                        })
                      }
                    >
                      Revoke link
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
