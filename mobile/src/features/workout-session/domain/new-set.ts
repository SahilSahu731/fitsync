import * as Crypto from "expo-crypto";

import type { WorkoutSet } from "@/features/workouts/types";

export function buildNextWorkoutSet(
  previous: WorkoutSet | undefined,

  position: number,
): WorkoutSet {
  return {
    id: Crypto.randomUUID(),

    position,

    type: "NORMAL",

    target_reps_min: previous?.target_reps_min ?? null,

    target_reps_max: previous?.target_reps_max ?? null,

    target_weight: previous?.target_weight ?? null,

    target_duration_seconds: previous?.target_duration_seconds ?? null,

    target_distance_meters: previous?.target_distance_meters ?? null,

    target_rpe: previous?.target_rpe ?? null,

    target_rir: previous?.target_rir ?? null,

    /*
     * Prefill from the immediately preceding set.
     *
     * The new set remains incomplete.
     */
    reps: previous?.reps ?? null,

    weight: previous?.weight ?? null,

    weight_unit: previous?.weight_unit ?? "KG",

    duration_seconds: previous?.duration_seconds ?? null,

    distance_meters: previous?.distance_meters ?? null,

    rpe: previous?.rpe ?? null,

    rir: previous?.rir ?? null,

    completed: false,

    completed_at: null,
  };
}

export function duplicateWorkoutSet(
  source: WorkoutSet,

  position: number,
): WorkoutSet {
  return {
    ...source,

    id: Crypto.randomUUID(),

    position,

    completed: false,

    completed_at: null,
  };
}
