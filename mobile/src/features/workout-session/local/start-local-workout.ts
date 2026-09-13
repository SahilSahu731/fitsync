import type { SQLiteDatabase } from "expo-sqlite";

import type { User } from "@/features/auth/types";

import type { WorkoutTemplate } from "@/features/workouts/types";

import { buildLocalWorkout } from "./local-workout-builder";

import {
  getActiveLocalWorkout,
  insertLocalWorkout,
} from "./local-workout-repository";

export async function startLocalWorkout(
  database: SQLiteDatabase,

  user: User,

  options?: {
    name?: string;

    template?: WorkoutTemplate | null;
  },
): Promise<string> {
  const existing = await getActiveLocalWorkout(database, user.id);

  if (existing) {
    return existing.localId;
  }

  const local = buildLocalWorkout({
    userId: user.id,

    weightUnit: user.weight_unit,

    name: options?.name,

    template: options?.template ?? null,
  });

  await insertLocalWorkout(database, local);

  return local.localId;
}
