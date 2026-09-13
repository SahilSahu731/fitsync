import type { Exercise } from "./types";

export function normalizeExercise(exercise: Exercise): Exercise {
  const trackingType = exercise.tracking_type ?? "WEIGHT_REPS";

  return {
    ...exercise,

    tracking_type: trackingType,

    laterality: exercise.laterality ?? "BILATERAL",

    load_mode: exercise.load_mode ?? "TOTAL",

    default_rest_seconds:
      exercise.default_rest_seconds ??
      (exercise.mechanic === "COMPOUND" ? 180 : 90),
  };
}
