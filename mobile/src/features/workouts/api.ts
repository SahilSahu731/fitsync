import { apiClient } from "@/lib/api/client";

import type {
  ActiveWorkoutResponse,
  PreviousPerformanceResponse,
  StartWorkoutInput,
  WorkoutHistoryResponse,
  WorkoutSession,
  WorkoutTemplate,
  WorkoutTemplateInput,
  WorkoutTemplateListResponse,
  WorkoutUpdateInput,
} from "./types";

// =====================================================
// TEMPLATES
// =====================================================

export async function getWorkoutTemplates(): Promise<WorkoutTemplateListResponse> {
  const response =
    await apiClient.get<WorkoutTemplateListResponse>("/workout-templates");

  return response.data;
}

export async function getWorkoutTemplate(
  templateId: string,
): Promise<WorkoutTemplate> {
  const response = await apiClient.get<WorkoutTemplate>(
    `/workout-templates/${templateId}`,
  );

  return response.data;
}

export async function createWorkoutTemplate(
  input: WorkoutTemplateInput,
): Promise<WorkoutTemplate> {
  const response = await apiClient.post<WorkoutTemplate>(
    "/workout-templates",
    input,
  );

  return response.data;
}

export async function updateWorkoutTemplate(
  templateId: string,
  input: WorkoutTemplateInput,
): Promise<WorkoutTemplate> {
  const response = await apiClient.patch<WorkoutTemplate>(
    `/workout-templates/${templateId}`,
    input,
  );

  return response.data;
}

export async function duplicateWorkoutTemplate(
  templateId: string,
): Promise<WorkoutTemplate> {
  const response = await apiClient.post<WorkoutTemplate>(
    `/workout-templates/${templateId}/duplicate`,
  );

  return response.data;
}

export async function archiveWorkoutTemplate(
  templateId: string,
): Promise<void> {
  await apiClient.delete(`/workout-templates/${templateId}`);
}

// =====================================================
// WORKOUT SESSIONS
// =====================================================

export async function startWorkout(
  input: StartWorkoutInput,
): Promise<WorkoutSession> {
  const response = await apiClient.post<WorkoutSession>(
    "/workout-sessions",
    input,
  );

  return response.data;
}

export async function getActiveWorkout(): Promise<ActiveWorkoutResponse> {
  const response = await apiClient.get<ActiveWorkoutResponse>(
    "/workout-sessions/active",
  );

  return response.data;
}

export async function getWorkoutSession(
  sessionId: string,
): Promise<WorkoutSession> {
  const response = await apiClient.get<WorkoutSession>(
    `/workout-sessions/${sessionId}`,
  );

  return response.data;
}

export async function addWorkoutExercises(
  sessionId: string,
  exerciseIds: string[],
  revision: number,
): Promise<WorkoutSession> {
  const response = await apiClient.post<WorkoutSession>(
    `/workout-sessions/${sessionId}/exercises`,
    {
      revision,

      exercise_ids: exerciseIds,
    },
  );

  return response.data;
}

export async function updateWorkoutSession(
  sessionId: string,
  input: WorkoutUpdateInput,
): Promise<WorkoutSession> {
  const response = await apiClient.patch<WorkoutSession>(
    `/workout-sessions/${sessionId}`,
    input,
  );

  return response.data;
}

export async function completeWorkout(
  sessionId: string,
  revision: number,
): Promise<WorkoutSession> {
  const response = await apiClient.post<WorkoutSession>(
    `/workout-sessions/${sessionId}/complete`,
    {
      revision,
    },
  );

  return response.data;
}

export async function cancelWorkout(sessionId: string): Promise<void> {
  await apiClient.post(`/workout-sessions/${sessionId}/cancel`);
}

export async function getWorkoutHistory(
  cursor: string | null = null,
): Promise<WorkoutHistoryResponse> {
  const response = await apiClient.get<WorkoutHistoryResponse>(
    "/workout-sessions/history",
    {
      params: {
        cursor: cursor ?? undefined,

        limit: 20,
      },
    },
  );

  return response.data;
}

export async function getPreviousPerformance(
  exerciseIds: string[],
): Promise<PreviousPerformanceResponse> {
  const response = await apiClient.post<PreviousPerformanceResponse>(
    "/workout-sessions/previous-performance",
    {
      exercise_ids: exerciseIds,
    },
  );

  return response.data;
}
