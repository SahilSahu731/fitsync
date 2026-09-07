import type {
  ExerciseFilters,
} from "./types";


export const exerciseKeys = {
  all: [
    "exercises",
  ] as const,

  list: (
    filters: ExerciseFilters,
  ) =>
    [
      ...exerciseKeys.all,
      "list",
      filters,
    ] as const,

  detail: (
    exerciseId: string,
  ) =>
    [
      ...exerciseKeys.all,
      "detail",
      exerciseId,
    ] as const,
};