import type {
  Equipment,
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


export function prettifyEnum(
  value: string,
): string {
  return value
    .toLowerCase()
    .split("_")
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase() +
        part.slice(1),
    )
    .join(" ");
}