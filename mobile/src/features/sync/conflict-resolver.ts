import type { SQLiteDatabase } from "expo-sqlite";

import { getWorkoutSession } from "@/features/workouts/api";

import {
  getLocalWorkout,
  setServerWorkoutMetadata,
  updateLocalWorkoutSyncStatus,
} from "@/features/workout-session/local/local-workout-repository";

import { requestWorkoutSync } from "./sync-manager";

export async function resolveConflictUsingServer(
  database: SQLiteDatabase,

  userId: string,

  localId: string,
): Promise<void> {
  const local = await getLocalWorkout(database, {
    localId,
    userId,
  });

  if (!local || !local.serverId) {
    throw new Error("Server workout is unavailable.");
  }

  const server = await getWorkoutSession(local.serverId);

  const localShape = {
    ...server,

    /*
     * Keep local route identity.
     */
    id: local.localId,
  };

  const now = new Date().toISOString();

  await database.runAsync(
    `
    UPDATE local_workouts
    SET
      server_revision = ?,
      payload_json = ?,
      local_status = ?,
      sync_status = 'SYNCED',
      dirty = 0,
      local_version = local_version + 1,
      last_synced_payload_json = ?,
      last_sync_error = NULL,
      retry_count = 0,
      next_retry_at = NULL,
      updated_at = ?,
      last_synced_at = ?
    WHERE local_id = ?
      AND user_id = ?
    `,
    server.revision,
    JSON.stringify(localShape),
    server.status,
    JSON.stringify(localShape),
    now,
    now,
    localId,
    userId,
  );
}

export async function resolveConflictUsingLocal(
  database: SQLiteDatabase,

  userId: string,

  localId: string,
): Promise<void> {
  const local = await getLocalWorkout(database, {
    localId,
    userId,
  });

  if (!local || !local.serverId) {
    throw new Error("Server workout is unavailable.");
  }

  const server = await getWorkoutSession(local.serverId);

  if (server.status !== "IN_PROGRESS") {
    throw new Error(
      "This workout was already finished " +
        "on another device. Use the server version.",
    );
  }

  /*
   * Explicit user choice:
   *
   * adopt current server revision as the expected
   * revision, while keeping local payload dirty.
   */
  await setServerWorkoutMetadata(database, {
    localId,

    userId,

    serverId: server.id,

    serverRevision: server.revision,
  });

  await updateLocalWorkoutSyncStatus(database, {
    localId,

    userId,

    status: "DIRTY",
  });

  await database.runAsync(
    `
    UPDATE local_workouts
    SET
      dirty = 1,
      last_sync_error = NULL,
      next_retry_at = NULL
    WHERE local_id = ?
      AND user_id = ?
    `,
    localId,
    userId,
  );

  requestWorkoutSync(database, userId, 0);
}
