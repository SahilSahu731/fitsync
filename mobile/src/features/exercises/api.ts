import { apiClient } from "@/lib/api/client";

import type {
  Exercise,
  ExerciseFilters,
  ExerciseListResponse,
  ExerciseMutationInput,
} from "./types";

export async function getExercises(
  input: ExerciseFilters & {
    cursor?: string | null;

    limit?: number;
  },
): Promise<ExerciseListResponse> {
  const response = await apiClient.get<ExerciseListResponse>("/exercises", {
    params: {
      q: input.q || undefined,

      muscle: input.muscle || undefined,

      equipment: input.equipment || undefined,

      source: input.source || undefined,

      cursor: input.cursor || undefined,

      limit: input.limit ?? 30,
    },
  });

  return response.data;
}

export async function getExercise(exerciseId: string): Promise<Exercise> {
  const response = await apiClient.get<Exercise>(`/exercises/${exerciseId}`);

  return response.data;
}

export async function createExercise(
  input: ExerciseMutationInput,
): Promise<Exercise> {
  const response = await apiClient.post<Exercise>("/exercises", input);

  return response.data;
}

export async function updateExercise(
  exerciseId: string,
  input: ExerciseMutationInput,
): Promise<Exercise> {
  const response = await apiClient.patch<Exercise>(
    `/exercises/${exerciseId}`,
    input,
  );

  return response.data;
}

export async function archiveExercise(exerciseId: string): Promise<void> {
  await apiClient.delete(`/exercises/${exerciseId}`);
}
