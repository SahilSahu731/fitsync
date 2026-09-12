import { apiClient } from "@/lib/api/client";

import type {
  ActivityCalendarResponse,
  ExerciseProgress,
  ExerciseSessionListResponse,
  MuscleGroupProgressResponse,
  MuscleRange,
  PersonalRecordListResponse,
  PersonalRecordType,
  ProgressOverview,
  ProgressPreferences,
  ProgressRange,
  WorkoutPersonalRecordsResponse,
} from "./types";

export async function getProgressPreferences(): Promise<ProgressPreferences> {
  const response = await apiClient.get<ProgressPreferences>(
    "/progress/preferences",
  );

  return response.data;
}

export async function updateProgressPreferences(input: {
  timezone?: string;

  weekly_workout_target?: number;
}): Promise<ProgressPreferences> {
  const response = await apiClient.patch<ProgressPreferences>(
    "/progress/preferences",
    input,
  );

  return response.data;
}

export async function getProgressOverview(
  range: ProgressRange,
): Promise<ProgressOverview> {
  const response = await apiClient.get<ProgressOverview>("/progress/overview", {
    params: {
      range,
    },
  });

  return response.data;
}

export async function getPersonalRecords(
  input: {
    cursor?: string | null;

    exerciseId?: string | null;

    recordType?: PersonalRecordType | null;

    limit?: number;
  } = {},
): Promise<PersonalRecordListResponse> {
  const response = await apiClient.get<PersonalRecordListResponse>(
    "/progress/personal-records",
    {
      params: {
        cursor: input.cursor ?? undefined,

        exercise_id: input.exerciseId ?? undefined,

        record_type: input.recordType ?? undefined,

        limit: input.limit ?? 20,
      },
    },
  );

  return response.data;
}

export async function getWorkoutPersonalRecords(
  sessionId: string,
): Promise<WorkoutPersonalRecordsResponse> {
  const response = await apiClient.get<WorkoutPersonalRecordsResponse>(
    `/progress/workouts/${sessionId}/records`,
  );

  return response.data;
}

export async function getExerciseProgress(
  exerciseId: string,
  range: ProgressRange,
): Promise<ExerciseProgress> {
  const response = await apiClient.get<ExerciseProgress>(
    `/progress/exercises/${exerciseId}`,
    {
      params: {
        range,
      },
    },
  );

  return response.data;
}

export async function getExerciseProgressSessions(
  exerciseId: string,
  cursor: string | null = null,
): Promise<ExerciseSessionListResponse> {
  const response = await apiClient.get<ExerciseSessionListResponse>(
    `/progress/exercises/${exerciseId}/sessions`,
    {
      params: {
        cursor: cursor ?? undefined,

        limit: 20,
      },
    },
  );

  return response.data;
}

export async function getMuscleGroupProgress(
  range: MuscleRange,
): Promise<MuscleGroupProgressResponse> {
  const response = await apiClient.get<MuscleGroupProgressResponse>(
    "/progress/muscle-groups",
    {
      params: {
        range,
      },
    },
  );

  return response.data;
}

export async function getActivityCalendar(
  months = 3,
): Promise<ActivityCalendarResponse> {
  const response = await apiClient.get<ActivityCalendarResponse>(
    "/progress/activity-calendar",
    {
      params: {
        months,
      },
    },
  );

  return response.data;
}
