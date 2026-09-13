import * as Crypto from "expo-crypto";

import type { SQLiteDatabase } from "expo-sqlite";

import type { WorkoutSession } from "@/features/workouts/types";

import { getLocalWorkoutByAnyId } from "./local-workout-repository";

export async function importServerWorkout(
  database: SQLiteDatabase,

  userId: string,

  serverWorkout: WorkoutSession,
): Promise<string> {
  const existing = await getLocalWorkoutByAnyId(database, {
    workoutId: serverWorkout.id,
    userId,
  });

  /*
   * Never replace unsynced local changes with
   * an incoming server snapshot.
   */
  if (existing && existing.dirty) {
    return existing.localId;
  }

  const localId = existing?.localId ?? Crypto.randomUUID();

  const clientWorkoutId =
    serverWorkout.client_workout_id ??
    existing?.clientWorkoutId ??
    serverWorkout.id;

  /*
   * Keep the local route identity stable.
   *
   * Mongo ObjectId remains in server_id.
   */
  const localWorkout: WorkoutSession = {
    ...serverWorkout,

    id: localId,
  };

  const now = new Date().toISOString();

  if (existing) {
    await database.runAsync(
      `
      UPDATE local_workouts
      SET
        client_workout_id = ?,
        server_id = ?,
        server_revision = ?,
        payload_json = ?,
        payload_version = 2,
        local_status = ?,
        sync_status = 'SYNCED',
        dirty = 0,
        last_synced_payload_json = ?,
        last_sync_error = NULL,
        retry_count = 0,
        next_retry_at = NULL,
        last_synced_at = ?,
        updated_at = ?
      WHERE local_id = ?
        AND user_id = ?
      `,
      clientWorkoutId,
      serverWorkout.id,
      serverWorkout.revision,
      JSON.stringify(localWorkout),
      serverWorkout.status,
      JSON.stringify(localWorkout),
      now,
      now,
      localId,
      userId,
    );

    return localId;
  }

  await database.runAsync(
    `
    INSERT INTO local_workouts (
      local_id,
      user_id,
      client_workout_id,
      server_id,
      server_revision,
      payload_json,
      payload_version,
      local_status,
      sync_status,
      dirty,
      local_version,
      last_synced_payload_json,
      last_sync_error,
      retry_count,
      next_retry_at,
      created_at,
      updated_at,
      last_synced_at
    )
    VALUES (
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      2,
      ?,
      'SYNCED',
      0,
      1,
      ?,
      NULL,
      0,
      NULL,
      ?,
      ?,
      ?
    )
    `,
    localId,
    userId,
    clientWorkoutId,
    serverWorkout.id,
    serverWorkout.revision,
    JSON.stringify(localWorkout),
    serverWorkout.status,
    JSON.stringify(localWorkout),
    now,
    now,
    now,
  );

  return localId;
}
