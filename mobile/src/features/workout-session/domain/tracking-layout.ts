import type { ExerciseTrackingType } from "@/features/exercises/types";

export type WorkoutMetric = "weight" | "reps" | "duration" | "distance";

export interface TrackingColumn {
  metric: WorkoutMetric;

  label: string;

  flex: number;
}

export function getTrackingColumns(
  trackingType: ExerciseTrackingType,

  weightUnit: string,
): TrackingColumn[] {
  switch (trackingType) {
    case "BODYWEIGHT_REPS":
      return [
        {
          metric: "weight",

          label: `Added ${weightUnit}`,

          flex: 1,
        },
        {
          metric: "reps",

          label: "Reps",

          flex: 1,
        },
      ];

    case "ASSISTED_REPS":
      return [
        {
          metric: "weight",

          label: "Assist",

          flex: 1,
        },
        {
          metric: "reps",

          label: "Reps",

          flex: 1,
        },
      ];

    case "REPS_ONLY":
      return [
        {
          metric: "reps",

          label: "Reps",

          flex: 1,
        },
      ];

    case "DURATION":
      return [
        {
          metric: "duration",

          label: "Time",

          flex: 1,
        },
      ];

    case "DISTANCE_DURATION":
      return [
        {
          metric: "distance",

          label: "Distance",

          flex: 1,
        },
        {
          metric: "duration",

          label: "Time",

          flex: 1,
        },
      ];

    case "WEIGHT_DURATION":
      return [
        {
          metric: "weight",

          label: weightUnit,

          flex: 1,
        },
        {
          metric: "duration",

          label: "Time",

          flex: 1,
        },
      ];

    case "WEIGHT_DISTANCE":
      return [
        {
          metric: "weight",

          label: weightUnit,

          flex: 1,
        },
        {
          metric: "distance",

          label: "Distance",

          flex: 1,
        },
      ];

    default:
      return [
        {
          metric: "weight",

          label: weightUnit,

          flex: 1,
        },
        {
          metric: "reps",

          label: "Reps",

          flex: 1,
        },
      ];
  }
}
