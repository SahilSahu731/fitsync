import {
  usesDistance,
  usesDuration,
  usesReps,
  usesWeight,
} from "@/features/exercises/tracking";
import type { LocalTemplateExercise } from "./model";
export interface RoutineValidationResult {
  valid: boolean;
  message: string | null;
}
export function validateRoutineEditor(
  name: string,
  exercises: LocalTemplateExercise[],
): RoutineValidationResult {
  if (!name.trim())
    return { valid: false, message: "Give your routine a name." };
  if (!exercises.length)
    return { valid: false, message: "Add at least one exercise." };
  const ids = new Set<string>();
  for (const exercise of exercises) {
    if (ids.has(exercise.exerciseId))
      return {
        valid: false,
        message: `${exercise.exerciseName} appears more than once.`,
      };
    ids.add(exercise.exerciseId);
    if (!exercise.sets.length)
      return {
        valid: false,
        message: `${exercise.exerciseName} needs at least one set.`,
      };
    if (exercise.restSeconds < 0 || exercise.restSeconds > 900)
      return {
        valid: false,
        message: `${exercise.exerciseName} has an invalid rest timer.`,
      };
    for (const set of exercise.sets) {
      if (!usesWeight(exercise.trackingType) && set.weight.trim())
        return {
          valid: false,
          message: `${exercise.exerciseName} does not use weight targets.`,
        };
      if (
        !usesReps(exercise.trackingType) &&
        (set.repsMin.trim() || set.repsMax.trim())
      )
        return {
          valid: false,
          message: `${exercise.exerciseName} does not use rep targets.`,
        };
      if (!usesDuration(exercise.trackingType) && set.duration.trim())
        return {
          valid: false,
          message: `${exercise.exerciseName} does not use duration targets.`,
        };
      if (!usesDistance(exercise.trackingType) && set.distance.trim())
        return {
          valid: false,
          message: `${exercise.exerciseName} does not use distance targets.`,
        };
    }
  }
  return { valid: true, message: null };
}
