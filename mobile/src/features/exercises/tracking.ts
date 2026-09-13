import type { ExerciseTrackingType } from "./types";

export const TRACKING_LABELS: Record<ExerciseTrackingType, string> = {
  WEIGHT_REPS: "Weight & reps",

  BODYWEIGHT_REPS: "Bodyweight & reps",

  ASSISTED_REPS: "Assisted reps",

  REPS_ONLY: "Reps only",

  DURATION: "Time",

  DISTANCE_DURATION: "Distance & time",

  WEIGHT_DURATION: "Weight & time",

  WEIGHT_DISTANCE: "Weight & distance",
};

export const TRACKING_DESCRIPTIONS: Record<ExerciseTrackingType, string> = {
  WEIGHT_REPS: "Log weight and repetitions for every set.",

  BODYWEIGHT_REPS:
    "Log repetitions and optionally " + "additional external weight.",

  ASSISTED_REPS: "Log repetitions and the amount " + "of assistance used.",

  REPS_ONLY: "Log repetitions without weight.",

  DURATION: "Log how long each set lasts.",

  DISTANCE_DURATION: "Log distance and elapsed time.",

  WEIGHT_DURATION: "Log external weight and time.",

  WEIGHT_DISTANCE: "Log external weight and distance.",
};

export const TRACKING_TYPES = Object.keys(
  TRACKING_LABELS,
) as ExerciseTrackingType[];

export function usesWeight(type: ExerciseTrackingType): boolean {
  return [
    "WEIGHT_REPS",
    "BODYWEIGHT_REPS",
    "ASSISTED_REPS",
    "WEIGHT_DURATION",
    "WEIGHT_DISTANCE",
  ].includes(type);
}

export function usesReps(type: ExerciseTrackingType): boolean {
  return [
    "WEIGHT_REPS",
    "BODYWEIGHT_REPS",
    "ASSISTED_REPS",
    "REPS_ONLY",
  ].includes(type);
}

export function usesDuration(type: ExerciseTrackingType): boolean {
  return ["DURATION", "DISTANCE_DURATION", "WEIGHT_DURATION"].includes(type);
}

export function usesDistance(type: ExerciseTrackingType): boolean {
  return ["DISTANCE_DURATION", "WEIGHT_DISTANCE"].includes(type);
}

export function weightLabel(type: ExerciseTrackingType, unit: string): string {
  if (type === "ASSISTED_REPS") {
    return "Assist";
  }

  if (type === "BODYWEIGHT_REPS") {
    return `+${unit}`;
  }

  return unit;
}

export function trackingLabel(type: ExerciseTrackingType): string {
  return TRACKING_LABELS[type];
}
