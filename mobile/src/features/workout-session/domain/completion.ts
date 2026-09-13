import type { ExerciseTrackingType } from "@/features/exercises/types";

import type { WorkoutSet } from "@/features/workouts/types";

export function canCompleteSet(
  trackingType: ExerciseTrackingType,

  set: WorkoutSet,
): boolean {
  switch (trackingType) {
    case "WEIGHT_REPS":
      return (
        set.weight !== null &&
        set.weight >= 0 &&
        set.reps !== null &&
        set.reps > 0
      );

    case "BODYWEIGHT_REPS":
      return set.reps !== null && set.reps > 0;

    case "ASSISTED_REPS":
      return (
        set.weight !== null &&
        set.weight >= 0 &&
        set.reps !== null &&
        set.reps > 0
      );

    case "REPS_ONLY":
      return set.reps !== null && set.reps > 0;

    case "DURATION":
      return set.duration_seconds !== null && set.duration_seconds > 0;

    case "DISTANCE_DURATION":
      return (
        set.distance_meters !== null &&
        set.distance_meters > 0 &&
        set.duration_seconds !== null &&
        set.duration_seconds > 0
      );

    case "WEIGHT_DURATION":
      return (
        set.weight !== null &&
        set.weight >= 0 &&
        set.duration_seconds !== null &&
        set.duration_seconds > 0
      );

    case "WEIGHT_DISTANCE":
      return (
        set.weight !== null &&
        set.weight >= 0 &&
        set.distance_meters !== null &&
        set.distance_meters > 0
      );

    default:
      return false;
  }
}

export function completionError(
  trackingType: ExerciseTrackingType,

  set: WorkoutSet,
): string | null {
  if (canCompleteSet(trackingType, set)) {
    return null;
  }

  switch (trackingType) {
    case "WEIGHT_REPS":
      if (set.weight === null) {
        return "Enter weight first.";
      }

      return "Enter reps first.";

    case "BODYWEIGHT_REPS":
    case "REPS_ONLY":
      return "Enter reps first.";

    case "ASSISTED_REPS":
      if (set.weight === null) {
        return "Enter assistance first.";
      }

      return "Enter reps first.";

    case "DURATION":
      return "Enter a duration first.";

    case "DISTANCE_DURATION":
      if (!set.distance_meters) {
        return "Enter distance first.";
      }

      return "Enter a duration first.";

    case "WEIGHT_DURATION":
      if (set.weight === null) {
        return "Enter weight first.";
      }

      return "Enter a duration first.";

    case "WEIGHT_DISTANCE":
      if (set.weight === null) {
        return "Enter weight first.";
      }

      return "Enter distance first.";

    default:
      return "Complete the required values first.";
  }
}

export function setHasLoggedData(set: WorkoutSet): boolean {
  return (
    set.weight !== null ||
    set.reps !== null ||
    set.duration_seconds !== null ||
    set.distance_meters !== null ||
    set.rpe !== null ||
    set.rir !== null
  );
}
