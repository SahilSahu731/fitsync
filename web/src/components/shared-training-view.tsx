"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
type Shared = {
  expiresAt: string;
  fields: string[];
  note: string;
  plan?: {
    name: string;
    sessions: {
      date: string;
      name: string;
      status: string;
      exercises: {
        name: string;
        sets: number;
        repsMin: number | null;
        repsMax: number | null;
        durationSeconds: number | null;
        weightKg: number | null;
        restSeconds: number;
      }[];
    }[];
  } | null;
  workouts?: {
    id: string;
    name: string;
    finished_at: string;
    elapsed_seconds: number | null;
    workout_session_exercises: {
      exercise_id: string;
      exercise_name: string;
      tracking_type: string;
      workout_logged_sets: {
        id: string;
        set_type: string;
        weight_kg: number | null;
        reps: number | null;
        duration_seconds: number | null;
        completed_at: string | null;
      }[];
    }[];
  }[];
};
export function SharedTrainingView({ token }: { token: string }) {
  const [value, setValue] = useState<Shared | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const mounted = useRef(false);
  const requestGeneration = useRef(0);
  const reload = useCallback(async () => {
    const generation = ++requestGeneration.current;
    try {
      const result = await api<Shared>(`/companion/shared/${encodeURIComponent(token)}`);
      if (mounted.current && generation === requestGeneration.current) {
        setValue(result);
        setError("");
      }
    } catch (e) {
      if (mounted.current && generation === requestGeneration.current) {
        setValue(null);
        setError(e instanceof Error ? e.message : "This training view is unavailable.");
      }
    } finally {
      if (mounted.current && generation === requestGeneration.current) setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    mounted.current = true;
    const initial = setTimeout(() => void reload(), 0);
    const refresh = () => {
      if (document.visibilityState === "visible") void reload();
    };
    const interval = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      mounted.current = false;
      clearTimeout(initial);
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [reload]);
  useEffect(() => {
    if (!value) return;
    const timeout = setTimeout(
      () => {
        setValue(null);
        setError("This shared training view has expired.");
      },
      Math.max(0, Math.min(2147483647, Date.parse(value.expiresAt) - Date.now())),
    );
    return () => clearTimeout(timeout);
  }, [value]);
  return (
    <main
      id="main"
      className="mx-auto min-h-screen max-w-6xl px-5 py-12 text-white sm:px-9 sm:py-20"
    >
      <p className="flex items-center gap-3 text-sm font-semibold tracking-widest text-lime-200">
        <ShieldCheck size={19} />
        FITSYNC · SHARED TRAINING
      </p>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-5xl">
        A clear view of the training.
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55">
        Read-only access granted by a FitSync member. This view does not include their photos,
        measurements, readiness notes or nutrition.
      </p>
      {loading && (
        <p role="status" className="mt-10 rounded-2xl border border-white/10 p-6 text-white/55">
          Checking this private link…
        </p>
      )}
      {error && (
        <div role="alert" className="mt-10 rounded-2xl border border-white/10 p-6">
          <LockKeyhole size={24} className="text-white/40" />
          <h2 className="mt-4 text-lg font-medium">Training view unavailable</h2>
          <p className="mt-2 text-sm leading-7 text-white/55">{error}</p>
          <button
            onClick={() => void reload()}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm hover:bg-white/5"
          >
            <RefreshCw size={15} />
            Check again
          </button>
        </div>
      )}
      {value && (
        <div className="mt-10 space-y-10">
          <div className="flex flex-wrap gap-3 rounded-xl bg-white/5 p-4 text-xs leading-6 text-white/55">
            <LockKeyhole size={16} />
            <span>
              Expires {new Date(value.expiresAt).toLocaleString()} · Access may be revoked earlier.
            </span>
            <button onClick={() => void reload()} className="ml-auto underline underline-offset-4">
              Refresh access
            </button>
          </div>
          {value.fields.includes("plan") && (
            <section>
              <h2 className="flex items-center gap-3 text-xl font-semibold">
                <CalendarDays size={20} className="text-lime-200" />
                {value.plan?.name ?? "Current training plan"}
              </h2>
              {!value.plan ? (
                <p className="mt-4 text-sm text-white/45">No active training plan.</p>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {value.plan.sessions.map((day, index) => (
                    <article
                      key={`${day.date}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/3 p-5"
                    >
                      <p className="text-xs text-white/40">
                        {day.date} · {day.status}
                      </p>
                      <h3 className="mt-3 font-medium">{day.name}</h3>
                      <div className="mt-4 space-y-3">
                        {day.exercises.map((exercise, i) => (
                          <div key={i}>
                            <p className="text-sm text-white/80">{exercise.name}</p>
                            <p className="mt-1 text-xs leading-6 text-white/45">
                              {exercise.sets} ×{" "}
                              {exercise.repsMin == null
                                ? `${exercise.durationSeconds ?? 0} sec`
                                : `${exercise.repsMin}–${exercise.repsMax} reps`}
                              {exercise.weightKg == null ? "" : ` · ${exercise.weightKg} kg`} ·{" "}
                              {exercise.restSeconds}s rest
                            </p>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
          {value.fields.includes("workouts") && (
            <section>
              <h2 className="text-xl font-semibold">Completed workouts · last 90 days</h2>
              {!value.workouts?.length ? (
                <p className="mt-4 text-sm text-white/45">No completed workouts in this period.</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {[...value.workouts].reverse().map((workout) => (
                    <details
                      key={workout.id}
                      className="rounded-2xl border border-white/10 bg-white/3 p-5"
                    >
                      <summary className="cursor-pointer">
                        <span className="font-medium">{workout.name}</span>
                        <span className="mt-2 block text-xs text-white/45">
                          {new Date(workout.finished_at).toLocaleString()} ·{" "}
                          {Math.round((workout.elapsed_seconds ?? 0) / 60)} minutes
                        </span>
                      </summary>
                      <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        {workout.workout_session_exercises.map((exercise, index) => (
                          <div key={`${exercise.exercise_id}-${index}`}>
                            <h3 className="text-sm font-medium">{exercise.exercise_name}</h3>
                            {exercise.workout_logged_sets
                              .filter((set) => set.completed_at)
                              .map((set, i) => (
                                <p key={set.id} className="mt-2 text-xs leading-6 text-white/50">
                                  Set {i + 1} · {set.set_type}
                                  {set.weight_kg == null ? "" : ` · ${set.weight_kg} kg`}
                                  {set.reps == null ? "" : ` × ${set.reps}`}
                                  {set.duration_seconds == null
                                    ? ""
                                    : ` · ${set.duration_seconds}s`}
                                </p>
                              ))}
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </section>
          )}
          <p className="border-t border-white/10 pt-6 text-xs leading-7 text-white/40">
            {value.note} This link permits viewing and does not allow changes to the member’s
            account.
          </p>
        </div>
      )}
    </main>
  );
}
