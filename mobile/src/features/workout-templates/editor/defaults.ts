import * as Crypto from "expo-crypto";
import type {
  Exercise,
  ExerciseTrackingType,
} from "@/features/exercises/types";
import type { TemplateSet } from "@/features/workouts/types";
export function defaultSetCount(type: ExerciseTrackingType) {
  return type === "DISTANCE_DURATION" ? 1 : 3;
}
export function newTemplateSet(position: number): TemplateSet {
  return {
    id: Crypto.randomUUID(),
    position,
    type: "NORMAL",
    target_reps_min: null,
    target_reps_max: null,
    target_weight: null,
    target_duration_seconds: null,
    target_distance_meters: null,
    target_rpe: null,
    target_rir: null,
  };
}
export function defaultSetsForExercise(exercise: Exercise) {
  return Array.from(
    { length: defaultSetCount(exercise.tracking_type) },
    (_, index) => newTemplateSet(index),
  );
}
