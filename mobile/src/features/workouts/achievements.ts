import type { ProgressWorkout } from "../progress/model";
import { fromKg } from "../../lib/weight";

type AchievementWorkout = Pick<
  ProgressWorkout,
  "id" | "status" | "started_at" | "finished_at" | "elapsed_seconds"
> & {
  workout_session_exercises: Pick<
    ProgressWorkout["workout_session_exercises"][number],
    "exercise_id" | "exercise_name" | "tracking_type" | "workout_logged_sets"
  >[];
};
type Record = { exercise: string; label: string; value: number; kind: "load" | "reps" };
const best = (exercise: AchievementWorkout["workout_session_exercises"][number]) =>
  Math.max(
    0,
    ...exercise.workout_logged_sets
      .filter(
        (s) =>
          s.completed_at &&
          s.set_type === "normal" &&
          (s.reps ?? 0) > 0 &&
          Number.isFinite(s.reps) &&
          (exercise.tracking_type !== "reps_weight" || Number.isFinite(s.weight_kg)),
      )
      .map((s) => (exercise.tracking_type === "reps_weight" ? (s.weight_kg ?? 0) : (s.reps ?? 0))),
  );

export function workoutRecords(workout: AchievementWorkout, history: ProgressWorkout[]): Record[] {
  const before = history.filter(
    (w) =>
      w.id !== workout.id &&
      w.status === "completed" &&
      Date.parse(w.finished_at ?? w.started_at) <= Date.parse(workout.started_at),
  );
  const grouped = new Map<string, AchievementWorkout["workout_session_exercises"][number]>();
  for (const exercise of workout.workout_session_exercises) {
    const key = `${exercise.exercise_id}:${exercise.tracking_type}`;
    const existing = grouped.get(key);
    grouped.set(
      key,
      existing
        ? {
            ...existing,
            workout_logged_sets: [...existing.workout_logged_sets, ...exercise.workout_logged_sets],
          }
        : exercise,
    );
  }
  return [...grouped.values()].flatMap((exercise) => {
    if (!["reps_weight", "reps"].includes(exercise.tracking_type)) return [];
    const prior = before
      .flatMap((w) => w.workout_session_exercises)
      .filter(
        (e) =>
          e.exercise_id === exercise.exercise_id &&
          e.tracking_type === exercise.tracking_type &&
          best(e) > 0,
      );
    const value = best(exercise);
    if (!prior.length || value <= Math.max(...prior.map(best))) return [];
    return [
      {
        exercise: exercise.exercise_name,
        value,
        label:
          exercise.tracking_type === "reps_weight"
            ? "Heaviest working set"
            : "Most reps in a working set",
        kind: exercise.tracking_type === "reps_weight" ? ("load" as const) : ("reps" as const),
      },
    ];
  });
}

export function workoutShareText(workout: AchievementWorkout, recordCount = 0) {
  const sets = workout.workout_session_exercises.flatMap((e) =>
    e.workout_logged_sets.filter((s) => s.completed_at),
  );
  const minutes = Math.max(1, Math.round((workout.elapsed_seconds ?? 0) / 60));
  return `Workout complete on FitSync 💪\n${minutes} min · ${sets.length} set${sets.length === 1 ? "" : "s"}${recordCount ? ` · ${recordCount} personal best${recordCount === 1 ? "" : "s"}` : ""}\nKeep showing up. Join me: https://play.google.com/store/apps/details?id=com.sahil.fitsync`;
}
export function recordValue(record: Record, unit: "kg" | "lb") {
  return record.kind === "reps"
    ? `${record.value} reps`
    : `${Math.round(fromKg(record.value, unit) * 100) / 100} ${unit}`;
}
