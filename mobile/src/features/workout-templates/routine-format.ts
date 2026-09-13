import { formatDistanceMeters } from "@/features/exercises/distance";
import { formatExerciseDuration } from "@/features/exercises/duration";
import type { ExerciseTrackingType } from "@/features/exercises/types";
import type {
  TemplateExercise,
  TemplateSet,
  WorkoutTemplate,
} from "@/features/workouts/types";

export const routineSetCount = (routine: Pick<WorkoutTemplate, "exercises">) =>
  routine.exercises.reduce(
    (total, exercise) => total + exercise.planned_sets.length,
    0,
  );

export function formatRestSeconds(seconds: number): string {
  if (seconds <= 0) return "No rest";
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  if (seconds > 60) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function repTarget(set: TemplateSet): string | null {
  const { target_reps_min: min, target_reps_max: max } = set;
  if (min === null && max === null) return null;
  if (min !== null && max !== null)
    return min === max ? `${min} reps` : `${min}–${max} reps`;
  return `${min ?? max} reps`;
}

export function formatRoutineSetTarget(
  trackingType: ExerciseTrackingType,
  set: TemplateSet,
): string {
  const weight = set.target_weight;
  const reps = repTarget(set);
  const duration =
    set.target_duration_seconds === null
      ? null
      : formatExerciseDuration(set.target_duration_seconds);
  const distance =
    set.target_distance_meters === null
      ? null
      : formatDistanceMeters(set.target_distance_meters);
  switch (trackingType) {
    case "WEIGHT_REPS":
      return weight !== null && reps
        ? `${weight} kg × ${reps}`
        : (reps ?? (weight !== null ? `${weight} kg` : "Open target"));
    case "BODYWEIGHT_REPS":
      return reps
        ? `${weight !== null ? `+${weight} kg` : "BW"} × ${reps}`
        : "BW";
    case "ASSISTED_REPS":
      return weight !== null
        ? `${weight} kg assist${reps ? ` × ${reps}` : ""}`
        : (reps ?? "Open target");
    case "REPS_ONLY":
      return reps ?? "Open target";
    case "DURATION":
      return duration ?? "Open target";
    case "DISTANCE_DURATION":
      return distance && duration
        ? `${distance} · ${duration}`
        : (distance ?? duration ?? "Open target");
    case "WEIGHT_DURATION":
      return weight !== null && duration
        ? `${weight} kg · ${duration}`
        : (duration ?? (weight !== null ? `${weight} kg` : "Open target"));
    case "WEIGHT_DISTANCE":
      return weight !== null && distance
        ? `${weight} kg · ${distance}`
        : (distance ?? (weight !== null ? `${weight} kg` : "Open target"));
  }
}

export function exerciseRoutineSummary(exercise: TemplateExercise): string {
  const first = exercise.planned_sets[0];
  if (!first) return "No sets";
  const count = exercise.planned_sets.length;
  return `${count} ${count === 1 ? "set" : "sets"} · ${formatRoutineSetTarget(exercise.tracking_type, first)}`;
}

export function estimateRoutineMinutes(routine: WorkoutTemplate): number {
  const seconds = routine.exercises.reduce((total, exercise) => {
    const sets = exercise.planned_sets.length;
    return total + sets * 45 + Math.max(0, sets - 1) * exercise.rest_seconds;
  }, 0);
  return Math.max(5, Math.round(seconds / 60));
}
