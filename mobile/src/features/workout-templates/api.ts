import { apiClient } from "@/lib/api/client";
import type {
  TemplateFolder,
  TemplateFolderListResponse,
  WorkoutTemplate,
  WorkoutTemplateListResponse,
} from "@/features/workouts/types";
import type {
  FolderCreateInput,
  FolderUpdateInput,
  RoutineCreateInput,
  RoutineUpdateInput,
} from "./types";

export async function getServerRoutines(): Promise<WorkoutTemplate[]> {
  const response =
    await apiClient.get<WorkoutTemplateListResponse>("/workout-templates");
  return response.data.items;
}

export async function getServerRoutine(
  serverId: string,
): Promise<WorkoutTemplate> {
  const response = await apiClient.get<WorkoutTemplate>(
    `/workout-templates/${serverId}`,
  );
  return response.data;
}

export async function createServerRoutine(
  input: RoutineCreateInput,
): Promise<WorkoutTemplate> {
  const response = await apiClient.post<WorkoutTemplate>(
    "/workout-templates",
    input,
  );
  return response.data;
}

export async function updateServerRoutine(
  serverId: string,
  input: RoutineUpdateInput,
): Promise<WorkoutTemplate> {
  const response = await apiClient.patch<WorkoutTemplate>(
    `/workout-templates/${serverId}`,
    input,
  );
  return response.data;
}

export async function getServerFolders(): Promise<TemplateFolder[]> {
  const response = await apiClient.get<TemplateFolderListResponse>(
    "/workout-template-folders",
  );
  return response.data.items;
}

export async function createServerFolder(
  input: FolderCreateInput,
): Promise<TemplateFolder> {
  const response = await apiClient.post<TemplateFolder>(
    "/workout-template-folders",
    input,
  );
  return response.data;
}

export async function updateServerFolder(
  serverId: string,
  input: FolderUpdateInput,
): Promise<TemplateFolder> {
  const response = await apiClient.patch<TemplateFolder>(
    `/workout-template-folders/${serverId}`,
    input,
  );
  return response.data;
}
