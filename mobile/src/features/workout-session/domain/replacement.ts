import * as Crypto from "expo-crypto";

import { normalizeExercise } from "@/features/exercises/normalization";

import type { Exercise } from "@/features/exercises/types";

import type { WorkoutExercise, WorkoutSet } from "@/features/workouts/types";

function resetSet(set: WorkoutSet): WorkoutSet {
  return {
    ...set,

    id: Crypto.randomUUID(),

    target_reps_min: null,

    target_reps_max: null,

    target_weight: null,

    target_duration_seconds: null,

    target_distance_meters: null,

    target_rpe: null,

    target_rir: null,

    reps: null,

    weight: null,

    duration_seconds: null,

    distance_meters: null,

    rpe: null,

    rir: null,

    completed: false,

    completed_at: null,
  };
}

export function replaceWorkoutExercise(
  current: WorkoutExercise,

  replacementRaw: Exercise,
): WorkoutExercise {
  const replacement = normalizeExercise(replacementRaw);

  const sameTracking = current.tracking_type === replacement.tracking_type;

  return {
    ...current,

    exercise_id: replacement.id,

    exercise_name: replacement.name,

    thumbnail_url:
      replacement.media.find((media) => media.type === "IMAGE")
        ?.thumbnail_url ??
      replacement.media[0]?.thumbnail_url ??
      null,

    tracking_type: replacement.tracking_type,

    laterality: replacement.laterality,

    load_mode: replacement.load_mode,

    rest_seconds: replacement.default_rest_seconds,

    /*
     * Safe behavior:
     *
     * retain data only when both exercises log
     * the exact same metric model.
     */
    sets: sameTracking ? current.sets : current.sets.map(resetSet),
  };
}
