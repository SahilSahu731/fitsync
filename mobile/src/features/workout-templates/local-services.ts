import * as Crypto from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type {
  TemplateExercise,
  WorkoutTemplate,
  WorkoutTemplateInput,
} from "@/features/workouts/types";
import { getCachedExercises } from "@/features/exercises/cache";
import { createLocalRoutine } from "./create-local-routine";
import {
  getLocalRoutine,
  listLocalRoutines,
  saveLocalRoutine,
} from "./local-routine-repository";

async function inputExercises(
  database: SQLiteDatabase,
  userId: string,
  input: WorkoutTemplateInput,
  previous?: WorkoutTemplate,
): Promise<TemplateExercise[]> {
  const cached = new Map(
    (await getCachedExercises(database, userId)).map((exercise) => [
      exercise.id,
      exercise,
    ]),
  );
  return input.exercises.map((exercise, position) => {
    const old = previous?.exercises.find(
      (item) => item.exercise_id === exercise.exercise_id,
    );
    const snapshot = cached.get(exercise.exercise_id);
    return {
      id: old?.id ?? Crypto.randomUUID(),
      exercise_id: exercise.exercise_id,
      exercise_name: old?.exercise_name ?? snapshot?.name ?? "Exercise",
      thumbnail_url:
        old?.thumbnail_url ?? snapshot?.media[0]?.thumbnail_url ?? null,
      tracking_type:
        old?.tracking_type ?? snapshot?.tracking_type ?? "WEIGHT_REPS",
      laterality: old?.laterality ?? snapshot?.laterality ?? "BILATERAL",
      load_mode: old?.load_mode ?? snapshot?.load_mode ?? "TOTAL",
      primary_muscles: old?.primary_muscles ?? snapshot?.primary_muscles ?? [],
      position,
      rest_seconds: exercise.rest_seconds,
      notes: exercise.notes,
      superset_group_id: exercise.superset_group_id,
      planned_sets: exercise.planned_sets.map((set, setPosition) => ({
        ...set,
        id: old?.planned_sets[setPosition]?.id ?? Crypto.randomUUID(),
        position: setPosition,
      })),
    };
  });
}

export async function createLocalTemplate(
  database: SQLiteDatabase,
  options: {
    userId: string;
    input: WorkoutTemplateInput;
    folderId: string | null;
    isFavorite: boolean;
  },
) {
  const routines = await listLocalRoutines(database, options.userId, true);
  const exercises = await inputExercises(
    database,
    options.userId,
    options.input,
  );
  return createLocalRoutine(database, options.userId, {
    name: options.input.name,
    description: options.input.description,
    folder_client_id: options.folderId,
    is_favorite: options.isFavorite,
    position: routines.length,
    archived: false,
    exercise_count: exercises.length,
    set_count: exercises.reduce(
      (sum, item) => sum + item.planned_sets.length,
      0,
    ),
    muscle_groups: [],
    exercises,
  });
}

export async function saveLocalTemplate(
  database: SQLiteDatabase,
  options: {
    userId: string;
    localId: string;
    input: WorkoutTemplateInput;
    folderId: string | null;
    isFavorite: boolean;
  },
) {
  const record = await getLocalRoutine(
    database,
    options.userId,
    options.localId,
  );
  if (!record) throw new Error("Routine not found.");
  const exercises = await inputExercises(
    database,
    options.userId,
    options.input,
    record.template,
  );
  await saveLocalRoutine(database, record, {
    ...record.template,
    name: options.input.name,
    description: options.input.description,
    folder_client_id: options.folderId,
    is_favorite: options.isFavorite,
    exercise_count: exercises.length,
    set_count: exercises.reduce(
      (sum, item) => sum + item.planned_sets.length,
      0,
    ),
    exercises,
    updated_at: new Date().toISOString(),
  });
}

export async function patchLocalTemplate(
  database: SQLiteDatabase,
  userId: string,
  localId: string,
  patch: Partial<
    Pick<WorkoutTemplate, "is_favorite" | "folder_client_id" | "archived">
  >,
) {
  const record = await getLocalRoutine(database, userId, localId);
  if (!record) throw new Error("Routine not found.");
  await saveLocalRoutine(database, record, {
    ...record.template,
    ...patch,
    updated_at: new Date().toISOString(),
  });
}

export async function duplicateLocalTemplate(
  database: SQLiteDatabase,
  userId: string,
  localId: string,
) {
  const record = await getLocalRoutine(database, userId, localId);
  if (!record) throw new Error("Routine not found.");
  return createLocalRoutine(database, userId, {
    ...record.template,
    name: `${record.template.name} Copy`,
    is_favorite: false,
    archived: false,
    position: (await listLocalRoutines(database, userId, true)).length,
    exercises: record.template.exercises.map((exercise) => ({
      ...exercise,
      id: Crypto.randomUUID(),
      planned_sets: exercise.planned_sets.map((set) => ({
        ...set,
        id: Crypto.randomUUID(),
      })),
    })),
  });
}
