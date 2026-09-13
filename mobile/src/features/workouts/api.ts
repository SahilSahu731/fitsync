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
  const current = await getWorkoutTemplate(templateId);

  const response = await apiClient.patch<WorkoutTemplate>(
    `/workout-templates/${templateId}`,
    {
      ...input,
      folder_client_id: current.folder_client_id,
      is_favorite: current.is_favorite,
      position: current.position,
      archived: current.archived,
      revision: current.revision,
    },
  );

  return response.data;
}

export async function duplicateWorkoutTemplate(
  templateId: string,
): Promise<WorkoutTemplate> {
  const current = await getWorkoutTemplate(templateId);

  const response = await apiClient.post<WorkoutTemplate>("/workout-templates", {
    name: `${current.name} Copy`,
    description: current.description,
    folder_client_id: current.folder_client_id,
    is_favorite: false,
    position: current.position + 1,
    archived: false,
    exercises: current.exercises.map((exercise) => ({
      exercise_id: exercise.exercise_id,
      rest_seconds: exercise.rest_seconds,
      notes: exercise.notes,
      superset_group_id: exercise.superset_group_id,
      planned_sets: exercise.planned_sets.map((set) => ({
        type: set.type,
        target_reps_min: set.target_reps_min,
        target_reps_max: set.target_reps_max,
        target_weight: set.target_weight,
        target_duration_seconds: set.target_duration_seconds,
        target_distance_meters: set.target_distance_meters,
        target_rpe: set.target_rpe,
        target_rir: set.target_rir,
      })),
    })),
  });

  return response.data;
}

export async function archiveWorkoutTemplate(
  templateId: string,
): Promise<void> {
  const current = await getWorkoutTemplate(templateId);

  await apiClient.patch(`/workout-templates/${templateId}`, {
    revision: current.revision,
    name: current.name,
    description: current.description,
    folder_client_id: current.folder_client_id,
    is_favorite: current.is_favorite,
    position: current.position,
    archived: true,
    exercises: current.exercises.map((exercise) => ({
      exercise_id: exercise.exercise_id,
      rest_seconds: exercise.rest_seconds,
      notes: exercise.notes,
      superset_group_id: exercise.superset_group_id,
      planned_sets: exercise.planned_sets.map((set) => ({
        type: set.type,
        target_reps_min: set.target_reps_min,
        target_reps_max: set.target_reps_max,
        target_weight: set.target_weight,
        target_duration_seconds: set.target_duration_seconds,
        target_distance_meters: set.target_distance_meters,
        target_rpe: set.target_rpe,
        target_rir: set.target_rir,
      })),
    })),
  });
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
  completedAt?: string,
): Promise<WorkoutSession> {
  const response = await apiClient.post<WorkoutSession>(
    `/workout-sessions/${sessionId}/complete`,
    {
      revision,

      completed_at: completedAt ?? undefined,
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
