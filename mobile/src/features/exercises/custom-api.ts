import { apiRequest } from "@/src/services/api";
import type { Exercise } from "./api";
export type CustomExerciseInput = Pick<
  Exercise,
  | "name"
  | "description"
  | "category"
  | "activityType"
  | "bodyRegion"
  | "difficulty"
  | "trackingType"
  | "movementPattern"
  | "primaryMuscles"
  | "secondaryMuscles"
  | "equipment"
  | "instructions"
  | "tips"
  | "mistakes"
  | "safetyNotes"
  | "breathingTip"
>;
export function customExerciseApi(ownerId: string) {
  return {
    list: () => apiRequest<Exercise[]>("/exercises/custom", { expectedOwnerId: ownerId }),
    save: (data: CustomExerciseInput, id?: string) =>
      apiRequest<Exercise>(id ? `/exercises/custom/${id}` : "/exercises/custom", {
        method: id ? "PATCH" : "POST",
        json: data,
        expectedOwnerId: ownerId,
      }),
    archive: (id: string) =>
      apiRequest<void>(`/exercises/custom/${id}`, { method: "DELETE", expectedOwnerId: ownerId }),
    restore: (id: string) =>
      apiRequest<void>(`/exercises/custom/${id}/restore`, {
        method: "POST",
        expectedOwnerId: ownerId,
      }),
  };
}
