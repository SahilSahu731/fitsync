import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import {
  getActivityCalendar,
  getExerciseProgress,
  getExerciseProgressSessions,
  getMuscleGroupProgress,
  getPersonalRecords,
  getProgressOverview,
  getProgressPreferences,
  getWorkoutPersonalRecords,
} from "./api";

import { progressKeys } from "./keys";

import type { MuscleRange, PersonalRecordType, ProgressRange } from "./types";

export function useProgressPreferences() {
  return useQuery({
    queryKey: progressKeys.preferences(),

    queryFn: getProgressPreferences,

    staleTime: 5 * 60 * 1000,
  });
}

export function useProgressOverview(range: ProgressRange) {
  return useQuery({
    queryKey: progressKeys.overview(range),

    queryFn: () => getProgressOverview(range),

    staleTime: 0,

    refetchOnMount: true,
  });
}

export function usePersonalRecords(
  filters: {
    exerciseId?: string | null;

    recordType?: PersonalRecordType | null;
  } = {},
) {
  return useInfiniteQuery({
    queryKey: progressKeys.records(filters),

    queryFn: ({ pageParam }) =>
      getPersonalRecords({
        cursor: pageParam,

        exerciseId: filters.exerciseId,

        recordType: filters.recordType,
      }),

    initialPageParam: null as string | null,

    getNextPageParam: (lastPage) => lastPage.next_cursor,

    staleTime: 30_000,
  });
}

export function useWorkoutPersonalRecords(sessionId: string) {
  return useQuery({
    queryKey: progressKeys.workoutRecords(sessionId),

    queryFn: () => getWorkoutPersonalRecords(sessionId),

    enabled: Boolean(sessionId),

    staleTime: Infinity,
  });
}

export function useExerciseProgress(exerciseId: string, range: ProgressRange) {
  return useQuery({
    queryKey: progressKeys.exercise(exerciseId, range),

    queryFn: () => getExerciseProgress(exerciseId, range),

    enabled: Boolean(exerciseId),

    staleTime: 30_000,
  });
}

export function useExerciseProgressSessions(exerciseId: string) {
  return useInfiniteQuery({
    queryKey: progressKeys.exerciseSessions(exerciseId),

    queryFn: ({ pageParam }) =>
      getExerciseProgressSessions(exerciseId, pageParam),

    initialPageParam: null as string | null,

    getNextPageParam: (lastPage) => lastPage.next_cursor,

    enabled: Boolean(exerciseId),

    staleTime: 30_000,
  });
}

export function useMuscleGroupProgress(range: MuscleRange) {
  return useQuery({
    queryKey: progressKeys.muscles(range),

    queryFn: () => getMuscleGroupProgress(range),

    staleTime: 30_000,
  });
}

export function useActivityCalendar(months = 3) {
  return useQuery({
    queryKey: progressKeys.calendar(months),

    queryFn: () => getActivityCalendar(months),

    staleTime: 5 * 60 * 1000,
  });
}
