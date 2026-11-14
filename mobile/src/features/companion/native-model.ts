import type { WorkoutSession, WorkoutSet } from "../workouts/api";
import { nextWorkoutSet } from "../workouts/session-progress";
import type { WorkoutControlsSnapshot } from "./native-controls";
export function canCompleteControlSet(set: WorkoutSet, tracking: string) {
  const valid = (value: number | null, maximum: number, integer = false) =>
    value !== null &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= maximum &&
    (!integer || Number.isInteger(value));
  if (set.completed_at) return false;
  if (tracking === "reps_weight" || tracking === "reps")
    return (
      valid(set.reps, 1000, true) &&
      set.reps! > 0 &&
      ((tracking === "reps" && set.weight_kg === null) || valid(set.weight_kg, 100000))
    );
  if (tracking === "duration" || tracking === "distance_duration")
    return (
      valid(set.duration_seconds, 86400, true) &&
      set.duration_seconds! > 0 &&
      (tracking === "duration" ||
        (valid(set.distance_meters, 1_000_000) && set.distance_meters! > 0))
    );
  return false;
}
export function workoutControlsSnapshot(
  ownerId: string,
  session: WorkoutSession | null,
  rest: WorkoutControlsSnapshot["rest"],
  focusedId?: string,
): WorkoutControlsSnapshot | null {
  if (!ownerId || session?.status !== "active") return null;
  const next = nextWorkoutSet(session.workout_session_exercises, focusedId);
  const exercise = next?.exercise;
  const set = next?.set;
  const canCompleteNextSet =
    !!set && !!exercise && canCompleteControlSet(set, exercise.tracking_type);
  const value =
    set && exercise
      ? exercise.tracking_type === "duration"
        ? `${set.duration_seconds ?? "—"} sec`
        : exercise.tracking_type === "distance_duration"
          ? `${set.distance_meters ?? "—"} m · ${set.duration_seconds ?? "—"} sec`
          : `${set.weight_kg ?? (exercise.tracking_type === "reps" ? 0 : "—")} kg × ${set.reps ?? "—"} reps`
      : "";
  return {
    ownerId,
    sessionId: session.id,
    title: session.name,
    nextSetId: set?.id ?? null,
    nextSetLabel:
      exercise && set
        ? `${exercise.exercise_name} · Set ${next!.number} · ${value}${canCompleteNextSet ? "" : " · enter values in FitSync"}`
        : null,
    canCompleteNextSet,
    rest,
  };
}
