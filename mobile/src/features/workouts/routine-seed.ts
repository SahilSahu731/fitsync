import { apiRequest } from "@/src/services/api";
import type { Exercise } from "../exercises/api";
import { pickerExercise } from "../exercises/custom-discovery";
import type { PickerExercise } from "../exercises/picker-cache";
import { newDraftExercise, type DraftExercise } from "./routine-draft";

export async function loadRoutineSeed(ownerId: string, exerciseId: string) {
  if (!ownerId) throw Error("Sign in again to add this exercise.");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exerciseId)) {
    throw Error("This exercise link is invalid. Choose a movement from your library.");
  }
  const exercise = await apiRequest<Exercise>(`/exercises/${encodeURIComponent(exerciseId)}`, {
    expectedOwnerId: ownerId,
  });
  if (exercise.id !== exerciseId || exercise.status !== "published") {
    throw Error("This exercise is no longer available. Choose another movement from your library.");
  }
  return pickerExercise(exercise);
}

export function appendRoutineSeed(rows: DraftExercise[], exercise: PickerExercise) {
  if (rows.some((row) => row.exercise.id === exercise.id) || rows.length >= 50) return rows;
  return [...rows, newDraftExercise(exercise)];
}
