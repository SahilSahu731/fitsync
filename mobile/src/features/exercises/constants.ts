import type {
  Equipment,
  ExerciseLaterality,
  ExerciseLoadMode,
  ExerciseTrackingType,
  MuscleGroup,
} from "./types";

export const MUSCLE_OPTIONS: {
  value: MuscleGroup;
  label: string;
}[] = [
  {
    value: "CHEST",
    label: "Chest",
  },
  {
    value: "BACK",
    label: "Back",
  },
  {
    value: "LATS",
    label: "Lats",
  },
  {
    value: "SHOULDERS",
    label: "Shoulders",
  },
  {
    value: "SIDE_DELTS",
    label: "Side delts",
  },
  {
    value: "REAR_DELTS",
    label: "Rear delts",
  },
  {
    value: "BICEPS",
    label: "Biceps",
  },
  {
    value: "TRICEPS",
    label: "Triceps",
  },
  {
    value: "QUADS",
    label: "Quads",
  },
  {
    value: "HAMSTRINGS",
    label: "Hamstrings",
  },
  {
    value: "GLUTES",
    label: "Glutes",
  },
  {
    value: "CALVES",
    label: "Calves",
  },
  {
    value: "ABS",
    label: "Abs",
  },
];

export const EQUIPMENT_OPTIONS: {
  value: Equipment;
  label: string;
}[] = [
  {
    value: "BARBELL",
    label: "Barbell",
  },
  {
    value: "DUMBBELL",
    label: "Dumbbell",
  },
  {
    value: "MACHINE",
    label: "Machine",
  },
  {
    value: "CABLE",
    label: "Cable",
  },
  {
    value: "SMITH_MACHINE",
    label: "Smith machine",
  },
  {
    value: "BODYWEIGHT",
    label: "Bodyweight",
  },
  {
    value: "KETTLEBELL",
    label: "Kettlebell",
  },
  {
    value: "EZ_BAR",
    label: "EZ bar",
  },
];

export const TRACKING_OPTIONS: {
  value: ExerciseTrackingType;
  label: string;
}[] = [
  { value: "WEIGHT_REPS", label: "Weight & reps" },
  { value: "BODYWEIGHT_REPS", label: "Bodyweight & reps" },
  { value: "ASSISTED_REPS", label: "Assisted reps" },
  { value: "REPS_ONLY", label: "Reps only" },
  { value: "DURATION", label: "Time" },
  { value: "DISTANCE_DURATION", label: "Distance & time" },
  { value: "WEIGHT_DURATION", label: "Weight & time" },
  { value: "WEIGHT_DISTANCE", label: "Weight & distance" },
];

export const LATERALITY_OPTIONS: {
  value: ExerciseLaterality;
  label: string;
}[] = [
  { value: "BILATERAL", label: "Both sides together" },
  { value: "UNILATERAL", label: "One side at a time" },
  { value: "ALTERNATING", label: "Alternating sides" },
];

export const LOAD_MODE_OPTIONS: {
  value: ExerciseLoadMode;
  label: string;
}[] = [
  { value: "TOTAL", label: "Total weight" },
  { value: "PER_SIDE", label: "Weight per side" },
];

export const REST_OPTIONS = [30, 60, 90, 120, 180, 300] as const;

export function prettifyEnum(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
