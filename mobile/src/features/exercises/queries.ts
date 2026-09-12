import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { getExercise, getExercises } from "./api";

import { exerciseKeys } from "./keys";

import type { ExerciseFilters } from "./types";

export function useExercises(filters: ExerciseFilters) {
  return useInfiniteQuery({
    queryKey: exerciseKeys.list(filters),

    queryFn: ({ pageParam }) =>
      getExercises({
        ...filters,

        cursor: pageParam,
      }),

    initialPageParam: null as string | null,

    getNextPageParam: (lastPage) => lastPage.next_cursor,

    staleTime: 5 * 60 * 1000,
  });
}

export function useExercise(exerciseId: string) {
  return useQuery({
    queryKey: exerciseKeys.detail(exerciseId),

    queryFn: () => getExercise(exerciseId),

    enabled: Boolean(exerciseId),

    staleTime: 5 * 60 * 1000,
  });
}
