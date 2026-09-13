import type { SQLiteDatabase } from "expo-sqlite";

export interface RestRuntime {
  workoutLocalId: string;

  restEndsAt: string;

  exerciseId: string | null;

  exerciseName: string;

  notificationId: string | null;
}

interface RestRuntimeRow {
  workout_local_id: string;

  rest_ends_at: string | null;

  rest_exercise_id: string | null;

  rest_exercise_name: string | null;

  rest_notification_id: string | null;
}

export async function getRestRuntime(
  database: SQLiteDatabase,

  localId: string,
): Promise<RestRuntime | null> {
  const row = await database.getFirstAsync<RestRuntimeRow>(
    `
        SELECT *
        FROM workout_runtime
        WHERE workout_local_id = ?
        LIMIT 1
        `,
    localId,
  );

  if (!row || !row.rest_ends_at || !row.rest_exercise_name) {
    return null;
  }

  if (new Date(row.rest_ends_at).getTime() <= Date.now()) {
    await clearRestRuntime(database, localId);

    return null;
  }

  return {
    workoutLocalId: row.workout_local_id,

    restEndsAt: row.rest_ends_at,

    exerciseId: row.rest_exercise_id,

    exerciseName: row.rest_exercise_name,

    notificationId: row.rest_notification_id,
  };
}

export async function saveRestRuntime(
  database: SQLiteDatabase,

  runtime: RestRuntime,
): Promise<void> {
  await database.runAsync(
    `
    INSERT INTO workout_runtime (
      workout_local_id,
      rest_ends_at,
      rest_exercise_id,
      rest_exercise_name,
      rest_notification_id
    )
    VALUES (?, ?, ?, ?, ?)

    ON CONFLICT (
      workout_local_id
    )
    DO UPDATE SET
      rest_ends_at =
        excluded.rest_ends_at,

      rest_exercise_id =
        excluded.rest_exercise_id,

      rest_exercise_name =
        excluded.rest_exercise_name,

      rest_notification_id =
        excluded.rest_notification_id
    `,
    runtime.workoutLocalId,
    runtime.restEndsAt,
    runtime.exerciseId,
    runtime.exerciseName,
    runtime.notificationId,
  );
}

export async function updateRestNotificationId(
  database: SQLiteDatabase,

  localId: string,

  notificationId: string | null,
): Promise<void> {
  await database.runAsync(
    `
    UPDATE workout_runtime
    SET rest_notification_id = ?
    WHERE workout_local_id = ?
    `,
    notificationId,
    localId,
  );
}

export async function clearRestRuntime(
  database: SQLiteDatabase,

  localId: string,
): Promise<void> {
  await database.runAsync(
    `
    DELETE FROM workout_runtime
    WHERE workout_local_id = ?
    `,
    localId,
  );
}
