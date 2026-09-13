import type { SQLiteDatabase } from "expo-sqlite";

import type { WorkoutSession } from "@/features/workouts/types";

import { normalizeWorkoutSession } from "../normalization";

import type {
  LocalWorkoutRecord,
  LocalWorkoutRow,
  NewLocalWorkout,
  WorkoutSyncStatus,
} from "./types";

function parseWorkout(raw: string): WorkoutSession {
  return normalizeWorkoutSession(JSON.parse(raw) as WorkoutSession);
}

function rowToRecord(row: LocalWorkoutRow): LocalWorkoutRecord {
  return {
    localId: row.local_id,

    userId: row.user_id,

    clientWorkoutId: row.client_workout_id,

    serverId: row.server_id,

    serverRevision: row.server_revision,

    workout: parseWorkout(row.payload_json),

    payloadVersion: row.payload_version ?? 1,

    localStatus: row.local_status,

    syncStatus: row.sync_status,

    dirty: row.dirty === 1,

    localVersion: row.local_version,

    lastSyncedWorkout: row.last_synced_payload_json
      ? parseWorkout(row.last_synced_payload_json)
      : null,

    lastSyncError: row.last_sync_error,

    retryCount: row.retry_count,

    nextRetryAt: row.next_retry_at,

    createdAt: row.created_at,

    updatedAt: row.updated_at,

    lastSyncedAt: row.last_synced_at,
  };
}

export async function insertLocalWorkout(
  database: SQLiteDatabase,

  input: NewLocalWorkout,
): Promise<void> {
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
      NULL,
      NULL,
      ?,
      2,
      'IN_PROGRESS',
      'LOCAL_ONLY',
      1,
      1,
      NULL,
      NULL,
      0,
      NULL,
      ?,
      ?,
      NULL
    )
    `,
    input.localId,
    input.userId,
    input.clientWorkoutId,
    JSON.stringify(input.workout),
    input.createdAt,
    input.createdAt,
  );
}

export async function getLocalWorkout(
  database: SQLiteDatabase,
  { localId, userId }: { localId: string; userId: string },
): Promise<LocalWorkoutRecord | null> {
  const row = await database.getFirstAsync<LocalWorkoutRow>(
    `
        SELECT *
        FROM local_workouts
        WHERE local_id = ?
          AND user_id = ?
        LIMIT 1
        `,
    localId,
    userId,
  );

  return row ? rowToRecord(row) : null;
}

export async function getLocalWorkoutByAnyId(
  database: SQLiteDatabase,
  { workoutId, userId }: { workoutId: string; userId: string },
): Promise<LocalWorkoutRecord | null> {
  const row = await database.getFirstAsync<LocalWorkoutRow>(
    `
        SELECT *
        FROM local_workouts
        WHERE user_id = ?
          AND (
            local_id = ?
            OR server_id = ?
            OR client_workout_id = ?
          )
        LIMIT 1
        `,
    userId,
    workoutId,
    workoutId,
    workoutId,
  );

  return row ? rowToRecord(row) : null;
}

export async function getActiveLocalWorkout(
  database: SQLiteDatabase,

  userId: string,
): Promise<LocalWorkoutRecord | null> {
  const row = await database.getFirstAsync<LocalWorkoutRow>(
    `
        SELECT *
        FROM local_workouts
        WHERE user_id = ?
          AND local_status = 'IN_PROGRESS'
        LIMIT 1
        `,
    userId,
  );

  return row ? rowToRecord(row) : null;
}

export async function listPendingLocalWorkouts(
  database: SQLiteDatabase,

  userId: string,
): Promise<LocalWorkoutRecord[]> {
  const now = new Date().toISOString();

  const rows = await database.getAllAsync<LocalWorkoutRow>(
    `
        SELECT *
        FROM local_workouts
        WHERE user_id = ?
          AND dirty = 1
          AND sync_status != 'CONFLICT'
          AND (
            sync_status IN (
              'LOCAL_ONLY',
              'DIRTY',
              'SYNCING'
            )
            OR (
              sync_status = 'ERROR'
              AND next_retry_at IS NOT NULL
              AND next_retry_at <= ?
            )
          )
        ORDER BY updated_at ASC
        `,
    userId,
    now,
  );

  return rows.map(rowToRecord);
}

export async function saveLocalWorkoutPayload(
  database: SQLiteDatabase,

  localId: string,

  userId: string,

  workout: WorkoutSession,
): Promise<void> {
  const now = new Date().toISOString();

  await database.runAsync(
    `
    UPDATE local_workouts
    SET
      payload_json = ?,
      payload_version = 2,
      dirty = 1,
      local_version = local_version + 1,
      sync_status = CASE
        WHEN sync_status = 'CONFLICT'
          THEN 'CONFLICT'
        ELSE 'DIRTY'
      END,
      last_sync_error = NULL,
      next_retry_at = NULL,
      updated_at = ?
    WHERE local_id = ?
      AND user_id = ?
    `,
    JSON.stringify(workout),
    now,
    localId,
    userId,
  );
}

export async function markLocalWorkoutSyncing(
  database: SQLiteDatabase,
  { localId, userId }: { localId: string; userId: string },
): Promise<void> {
  await database.runAsync(
    `
    UPDATE local_workouts
    SET sync_status = 'SYNCING'
    WHERE local_id = ?
      AND user_id = ?
      AND dirty = 1
      AND sync_status != 'CONFLICT'
    `,
    localId,
    userId,
  );
}

export async function setServerWorkoutMetadata(
  database: SQLiteDatabase,
  {
    localId,
    userId,
    serverId,
    serverRevision,
  }: {
    localId: string;
    userId: string;
    serverId: string;
    serverRevision: number;
  },
): Promise<void> {
  await database.runAsync(
    `
    UPDATE local_workouts
    SET
      server_id = ?,
      server_revision = ?
    WHERE local_id = ?
      AND user_id = ?
    `,
    serverId,
    serverRevision,
    localId,
    userId,
  );
}

/*
 * This is one of the most important functions.
 *
 * A server request may succeed while the user
 * modifies the local workout.
 *
 * Only clear dirty if the exact local version
 * that was synchronized is still current.
 */
export async function markLocalWorkoutSyncedIfVersion(
  database: SQLiteDatabase,
  {
    localId,
    userId,
    expectedLocalVersion,
    serverId,
    serverRevision,
    syncedWorkout,
  }: {
    localId: string;
    userId: string;
    expectedLocalVersion: number;
    serverId: string;
    serverRevision: number;
    syncedWorkout: WorkoutSession;
  },
): Promise<boolean> {
  const now = new Date().toISOString();

  const result = await database.runAsync(
    `
      UPDATE local_workouts
      SET
        server_id = ?,
        server_revision = ?,
        last_synced_payload_json = ?,
        dirty = 0,
        sync_status = 'SYNCED',
        last_sync_error = NULL,
        retry_count = 0,
        next_retry_at = NULL,
        last_synced_at = ?
      WHERE local_id = ?
        AND user_id = ?
        AND local_version = ?
      `,
    serverId,
    serverRevision,
    JSON.stringify(syncedWorkout),
    now,
    localId,
    userId,
    expectedLocalVersion,
  );

  return result.changes === 1;
}

export async function keepLocalWorkoutDirtyWithServerMetadata(
  database: SQLiteDatabase,
  {
    localId,
    userId,
    serverId,
    serverRevision,
  }: {
    localId: string;
    userId: string;
    serverId: string;
    serverRevision: number;
  },
): Promise<void> {
  await database.runAsync(
    `
    UPDATE local_workouts
    SET
      server_id = ?,
      server_revision = ?,
      dirty = 1,
      sync_status = 'DIRTY'
    WHERE local_id = ?
      AND user_id = ?
    `,
    serverId,
    serverRevision,
    localId,
    userId,
  );
}

export async function updateLocalWorkoutSyncStatus(
  database: SQLiteDatabase,
  {
    localId,
    userId,
    status,
  }: {
    localId: string;
    userId: string;
    status: WorkoutSyncStatus;
  },
): Promise<void> {
  await database.runAsync(
    `
    UPDATE local_workouts
    SET sync_status = ?
    WHERE local_id = ?
      AND user_id = ?
    `,
    status,
    localId,
    userId,
  );
}

export async function markLocalWorkoutConflict(
  database: SQLiteDatabase,
  {
    localId,
    userId,
    message,
  }: {
    localId: string;
    userId: string;
    message: string;
  },
): Promise<void> {
  await database.runAsync(
    `
    UPDATE local_workouts
    SET
      sync_status = 'CONFLICT',
      dirty = 1,
      last_sync_error = ?,
      next_retry_at = NULL
    WHERE local_id = ?
      AND user_id = ?
    `,
    message,
    localId,
    userId,
  );
}

export async function markLocalWorkoutSyncError(
  database: SQLiteDatabase,
  {
    localId,
    userId,
    message,
    retryCount,
    nextRetryAt,
  }: {
    localId: string;
    userId: string;
    message: string;
    retryCount: number;
    nextRetryAt: string | null;
  },
): Promise<void> {
  await database.runAsync(
    `
    UPDATE local_workouts
    SET
      sync_status = 'ERROR',
      dirty = 1,
      last_sync_error = ?,
      retry_count = ?,
      next_retry_at = ?
    WHERE local_id = ?
      AND user_id = ?
    `,
    message,
    retryCount,
    nextRetryAt,
    localId,
    userId,
  );
}

export async function completeLocalWorkout(
  database: SQLiteDatabase,
  {
    localId,
    userId,
    workout,
  }: {
    localId: string;
    userId: string;
    workout: WorkoutSession;
  },
): Promise<void> {
  const now = new Date().toISOString();

  await database.runAsync(
    `
    UPDATE local_workouts
    SET
      payload_json = ?,
      payload_version = 2,
      local_status = 'COMPLETED',
      dirty = 1,
      local_version = local_version + 1,
      sync_status = CASE
        WHEN sync_status = 'CONFLICT'
          THEN 'CONFLICT'
        ELSE 'DIRTY'
      END,
      updated_at = ?
    WHERE local_id = ?
      AND user_id = ?
    `,
    JSON.stringify(workout),
    now,
    localId,
    userId,
  );
}

export async function cancelLocalWorkout(
  database: SQLiteDatabase,
  {
    localId,
    userId,
    workout,
  }: {
    localId: string;
    userId: string;
    workout: WorkoutSession;
  },
): Promise<void> {
  const now = new Date().toISOString();

  await database.runAsync(
    `
    UPDATE local_workouts
    SET
      payload_json = ?,
      payload_version = 2,
      local_status = 'CANCELLED',
      dirty = 1,
      local_version = local_version + 1,
      sync_status = CASE
        WHEN server_id IS NULL
          THEN 'LOCAL_ONLY'
        ELSE 'DIRTY'
      END,
      updated_at = ?
    WHERE local_id = ?
      AND user_id = ?
    `,
    JSON.stringify(workout),
    now,
    localId,
    userId,
  );
}

export async function deleteLocalWorkout(
  database: SQLiteDatabase,
  { localId, userId }: { localId: string; userId: string },
): Promise<void> {
  await database.runAsync(
    `
    DELETE FROM local_workouts
    WHERE local_id = ?
      AND user_id = ?
    `,
    localId,
    userId,
  );
}

export async function deleteLocalWorkoutIfVersion(
  database: SQLiteDatabase,
  {
    localId,
    userId,
    expectedLocalVersion,
  }: {
    localId: string;
    userId: string;
    expectedLocalVersion: number;
  },
): Promise<boolean> {
  const result = await database.runAsync(
    `
    DELETE FROM local_workouts
    WHERE local_id = ?
      AND user_id = ?
      AND local_version = ?
    `,
    localId,
    userId,
    expectedLocalVersion,
  );

  return result.changes === 1;
}
