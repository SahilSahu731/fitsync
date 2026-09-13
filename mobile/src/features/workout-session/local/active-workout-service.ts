import type { SQLiteDatabase } from "expo-sqlite";

import { getActiveWorkout } from "@/features/workouts/api";

import { isInternetAvailable } from "@/features/sync/network";

import {
  getActiveLocalWorkout,
  getLocalWorkoutByAnyId,
} from "./local-workout-repository";

import { importServerWorkout } from "./server-workout-import";

import type { LocalWorkoutRecord } from "./types";

export async function resolveActiveWorkout(
  database: SQLiteDatabase,

  userId: string,
): Promise<LocalWorkoutRecord | null> {
  /*
   * SQLite always wins.
   */
  const local = await getActiveLocalWorkout(database, userId);

  if (local) {
    return local;
  }

  /*
   * No local workout.
   *
   * Only ask server if internet is available.
   */
  const online = await isInternetAvailable();

  if (!online) {
    return null;
  }

  try {
    const response = await getActiveWorkout();

    if (!response.workout) {
      return null;
    }

    const localId = await importServerWorkout(
      database,
      userId,
      response.workout,
    );

    return await getLocalWorkoutByAnyId(database, {
      workoutId: localId,
      userId,
    });
  } catch {
    /*
     * Local functionality should still work even
     * if active-server lookup fails.
     */
    return null;
  }
}
