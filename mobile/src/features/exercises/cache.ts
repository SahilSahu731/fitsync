import type { SQLiteDatabase } from "expo-sqlite";

import type { Exercise } from "./types";

import { normalizeExercise } from "./normalization";

interface ExerciseCacheRow {
  payload_json: string;
}

export async function cacheExercise(
  database: SQLiteDatabase,

  userId: string,

  exercise: Exercise,
): Promise<void> {
  const now = new Date().toISOString();

  await database.runAsync(
    `
    INSERT INTO cached_exercises (
      user_id,
      exercise_id,
      payload_json,
      cached_at
    )
    VALUES (?, ?, ?, ?)

    ON CONFLICT (
      user_id,
      exercise_id
    )
    DO UPDATE SET
      payload_json =
        excluded.payload_json,

      cached_at =
        excluded.cached_at
    `,
    userId,
    exercise.id,
    JSON.stringify(normalizeExercise(exercise)),
    now,
  );
}

export async function cacheExercises(
  database: SQLiteDatabase,

  userId: string,

  exercises: Exercise[],
): Promise<void> {
  if (exercises.length === 0) {
    return;
  }

  await database.withTransactionAsync(async () => {
    for (const exercise of exercises) {
      await cacheExercise(database, userId, exercise);
    }
  });
}

export async function getCachedExercises(
  database: SQLiteDatabase,

  userId: string,
): Promise<Exercise[]> {
  const rows = await database.getAllAsync<ExerciseCacheRow>(
    `
        SELECT payload_json
        FROM cached_exercises
        WHERE user_id = ?
        ORDER BY cached_at DESC
        `,
    userId,
  );

  const exercises: Exercise[] = [];

  for (const row of rows) {
    try {
      exercises.push(
        normalizeExercise(JSON.parse(row.payload_json) as Exercise),
      );
    } catch {
      // Ignore malformed cache row.
    }
  }

  return exercises;
}

export async function removeCachedExercise(
  database: SQLiteDatabase,

  userId: string,

  exerciseId: string,
): Promise<void> {
  await database.runAsync(
    `
    DELETE FROM cached_exercises
    WHERE user_id = ?
      AND exercise_id = ?
    `,
    userId,
    exerciseId,
  );
}

export async function clearExerciseCache(
  database: SQLiteDatabase,

  userId: string,
): Promise<void> {
  await database.runAsync(
    `
    DELETE FROM cached_exercises
    WHERE user_id = ?
    `,
    userId,
  );
}
