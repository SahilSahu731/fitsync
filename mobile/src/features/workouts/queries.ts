import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import {
  getActiveWorkout,
  getPreviousPerformance,
  getWorkoutHistory,
  getWorkoutSession,
  getWorkoutTemplate,
  getWorkoutTemplates,
} from "./api";

import { workoutSessionKeys, workoutTemplateKeys } from "./keys";

export function useWorkoutTemplates() {
  return useQuery({
    queryKey: workoutTemplateKeys.list(),

    queryFn: getWorkoutTemplates,

    staleTime: 60_000,
  });
}

export function useWorkoutTemplate(templateId: string) {
  return useQuery({
    queryKey: workoutTemplateKeys.detail(templateId),

    queryFn: () => getWorkoutTemplate(templateId),

    enabled: Boolean(templateId),
  });
}

export function useActiveWorkout() {
  return useQuery({
    queryKey: workoutSessionKeys.active(),

    queryFn: getActiveWorkout,

    staleTime: 5_000,
  });
}

export function useWorkoutSession(sessionId: string) {
  return useQuery({
    queryKey: workoutSessionKeys.detail(sessionId),

    queryFn: () => getWorkoutSession(sessionId),

    enabled: Boolean(sessionId),

    staleTime: 5_000,
  });
}

export function useWorkoutHistory() {
  return useInfiniteQuery({
    queryKey: workoutSessionKeys.history(),

    queryFn: ({ pageParam }) => getWorkoutHistory(pageParam),

    initialPageParam: null as string | null,

    getNextPageParam: (lastPage) => lastPage.next_cursor,

    staleTime: 30_000,
  });
}

export function usePreviousPerformance(exerciseIds: string[]) {
  return useQuery({
    queryKey: workoutSessionKeys.previous(exerciseIds),

    queryFn: () => getPreviousPerformance(exerciseIds),

    enabled: exerciseIds.length > 0,

    staleTime: 60_000,
  });
}
