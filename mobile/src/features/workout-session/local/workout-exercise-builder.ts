import * as Crypto from "expo-crypto";

import type { Exercise } from "@/features/exercises/types";

import type {
  WeightUnit,
  WorkoutExercise,
  WorkoutSet,
} from "@/features/workouts/types";

function createSet(
  position: number,

  weightUnit: WeightUnit,
): WorkoutSet {
  return {
    id: Crypto.randomUUID(),

    position,

    type: "NORMAL",

    target_reps_min: null,

    target_reps_max: null,

    target_weight: null,

    target_rpe: null,

    target_rir: null,

    reps: null,

    weight: null,

    weight_unit: weightUnit,

    rpe: null,

    rir: null,

    completed: false,

    completed_at: null,
  };
}

export function exerciseThumbnail(exercise: Exercise): string | null {
  const media =
    exercise.media.find((item) => item.type === "IMAGE") ?? exercise.media[0];

  return media?.thumbnail_url ?? null;
}

export function buildWorkoutExercise(
  exercise: Exercise,

  position: number,

  weightUnit: WeightUnit,
): WorkoutExercise {
  return {
    id: Crypto.randomUUID(),

    exercise_id: exercise.id,

    exercise_name: exercise.name,

    thumbnail_url: exerciseThumbnail(exercise),

    position,

    rest_seconds: exercise.mechanic === "COMPOUND" ? 180 : 90,

    notes: null,

    superset_group_id: null,

    sets: [
      createSet(0, weightUnit),

      createSet(1, weightUnit),

      createSet(2, weightUnit),
    ],
  };
}
