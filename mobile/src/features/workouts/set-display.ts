import { formatDistanceMeters } from "@/features/exercises/distance";

import { formatExerciseDuration } from "@/features/exercises/duration";

import type { ExerciseTrackingType } from "@/features/exercises/types";

import type { WorkoutSet } from "./types";

export function formatWorkoutSetMetrics(
  trackingType: ExerciseTrackingType,

  set: WorkoutSet,
): string {
  switch (trackingType) {
    case "BODYWEIGHT_REPS":
      return set.weight
        ? `+${set.weight} ${set.weight_unit} × ${set.reps ?? "—"}`
        : `BW × ${set.reps ?? "—"}`;

    case "ASSISTED_REPS":
      return (
        `${set.weight ?? "—"} ${set.weight_unit} assist` +
        ` × ${set.reps ?? "—"}`
      );

    case "REPS_ONLY":
      return `${set.reps ?? "—"} reps`;

    case "DURATION":
      return formatExerciseDuration(set.duration_seconds) || "—";

    case "DISTANCE_DURATION":
      return (
        `${formatDistanceMeters(set.distance_meters) || "—"} · ` +
        (formatExerciseDuration(set.duration_seconds) || "—")
      );

    case "WEIGHT_DURATION":
      return (
        `${set.weight ?? "—"} ${set.weight_unit}` +
        ` · ${formatExerciseDuration(set.duration_seconds) || "—"}`
      );

    case "WEIGHT_DISTANCE":
      return (
        `${set.weight ?? "—"} ${set.weight_unit}` +
        ` · ${formatDistanceMeters(set.distance_meters) || "—"}`
      );

    default:
      return (
        `${set.weight ?? "—"} ${set.weight_unit}` + ` × ${set.reps ?? "—"}`
      );
  }
}
