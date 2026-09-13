import type { SQLiteDatabase } from "expo-sqlite";

import { ensureRoutineSyncedByClientId } from "@/features/workout-templates/routine-sync-engine";

import {
  cancelWorkout,
  completeWorkout,
  getWorkoutSession,
  startWorkout,
  updateWorkoutSession,
} from "@/features/workouts/api";

import { sessionToUpdateInput } from "@/features/workouts/utils";

import {
  deleteLocalWorkout,
  deleteLocalWorkoutIfVersion,
  getLocalWorkout,
  keepLocalWorkoutDirtyWithServerMetadata,
  listPendingLocalWorkouts,
  markLocalWorkoutConflict,
  markLocalWorkoutSyncedIfVersion,
  markLocalWorkoutSyncError,
  markLocalWorkoutSyncing,
  setServerWorkoutMetadata,
} from "@/features/workout-session/local/local-workout-repository";

import type { LocalWorkoutRecord } from "@/features/workout-session/local/types";

import { classifySyncError } from "./sync-errors";

import { isInternetAvailable } from "./network";

import { getNextRetryAt } from "./retry";

import { syncError, syncLog } from "./sync-logger";

let running: Promise<void> | null = null;

async function handleSyncFailure(
  database: SQLiteDatabase,

  record: LocalWorkoutRecord,

  error: unknown,
): Promise<void> {
  const failure = classifySyncError(error);

  syncError(record.localId, failure);

  if (failure.kind === "CONFLICT") {
    await markLocalWorkoutConflict(database, {
      localId: record.localId,

      userId: record.userId,

      message: failure.message,
    });

    return;
  }

  const nextCount = record.retryCount + 1;

  if (failure.kind === "NETWORK" || failure.kind === "SERVER") {
    await markLocalWorkoutSyncError(database, {
      localId: record.localId,

      userId: record.userId,

      message: failure.message,

      retryCount: nextCount,

      nextRetryAt: getNextRetryAt(nextCount),
    });

    return;
  }

  /*
   * Authentication and validation failures should
   * not retry every time app state changes.
   */
  await markLocalWorkoutSyncError(database, {
    localId: record.localId,

    userId: record.userId,

    message: failure.message,

    retryCount: nextCount,

    nextRetryAt: null,
  });
}

async function createServerWorkout(
  database: SQLiteDatabase,

  record: LocalWorkoutRecord,
): Promise<{
  serverId: string;

  revision: number;
}> {
  syncLog(record.localId, "creating server workout");

  let templateServerId = record.workout.template_id;

  const templateClientId = record.workout.template_client_id;

  if (templateClientId) {
    const routine = await ensureRoutineSyncedByClientId(
      database,
      record.userId,
      templateClientId,
    );

    if (routine?.serverId) {
      templateServerId = routine.serverId;
    }
  }

  const created = await startWorkout({
    template_id: templateServerId,

    template_client_id: templateClientId,

    name: record.workout.name,

    client_workout_id: record.clientWorkoutId,

    started_at: record.workout.started_at,
  });

  await setServerWorkoutMetadata(database, {
    localId: record.localId,

    userId: record.userId,

    serverId: created.id,

    serverRevision: created.revision,
  });

  return {
    serverId: created.id,

    revision: created.revision,
  };
}

async function syncCancelledWorkout(
  database: SQLiteDatabase,

  record: LocalWorkoutRecord,
): Promise<void> {
  if (!record.serverId) {
    /*
     * Server never knew this workout existed.
     */
    await deleteLocalWorkoutIfVersion(database, {
      localId: record.localId,

      userId: record.userId,

      expectedLocalVersion: record.localVersion,
    });

    return;
  }

  await cancelWorkout(record.serverId);

  /*
   * Re-read after HTTP. If the row changed while cancellation was
   * in flight, preserve the newer dirty state instead of deleting it.
   */
  const afterCancel = await getLocalWorkout(database, {
    localId: record.localId,

    userId: record.userId,
  });

  if (!afterCancel || afterCancel.localVersion !== record.localVersion) {
    return;
  }

  await deleteLocalWorkoutIfVersion(database, {
    localId: afterCancel.localId,

    userId: afterCancel.userId,

    expectedLocalVersion: record.localVersion,
  });
}

async function syncOneWorkout(
  database: SQLiteDatabase,

  initial: LocalWorkoutRecord,
): Promise<void> {
  await markLocalWorkoutSyncing(database, {
    localId: initial.localId,

    userId: initial.userId,
  });

  let serverId = initial.serverId;

  let serverRevision = initial.serverRevision;

  try {
    /*
     * -------------------------------------------------
     * SERVER CREATE
     * -------------------------------------------------
     */
    if (!serverId) {
      if (initial.localStatus === "CANCELLED") {
        await deleteLocalWorkout(database, {
          localId: initial.localId,

          userId: initial.userId,
        });

        return;
      }

      const created = await createServerWorkout(database, initial);

      serverId = created.serverId;

      serverRevision = created.revision;
    }

    /*
     * We may need several passes if the user edits
     * while a request is running.
     */
    for (let pass = 0; pass < 10; pass += 1) {
      const current = await getLocalWorkout(database, {
        localId: initial.localId,

        userId: initial.userId,
      });

      if (!current) {
        return;
      }

      if (current.localStatus === "CANCELLED") {
        await syncCancelledWorkout(database, current);

        return;
      }

      if (!serverId || serverRevision === null) {
        throw new Error("Missing server workout metadata");
      }

      const versionBeingSynced = current.localVersion;

      syncLog(current.localId, "PATCH", {
        version: versionBeingSynced,

        revision: serverRevision,
      });

      /*
       * -------------------------------------------------
       * FULL DRAFT PATCH
       * -------------------------------------------------
       *
       * Even immediately after POST create we send the
       * complete local draft. The user may have already
       * edited it while offline.
       */
      const updated = await updateWorkoutSession(
        serverId,

        sessionToUpdateInput(current.workout, serverRevision),
      );

      serverRevision = updated.revision;

      await setServerWorkoutMetadata(database, {
        localId: current.localId,

        userId: current.userId,

        serverId,

        serverRevision,
      });

      /*
       * Re-read because user may have edited SQLite
       * while PATCH was in flight.
       */
      const afterPatch = await getLocalWorkout(database, {
        localId: current.localId,

        userId: current.userId,
      });

      if (!afterPatch) {
        return;
      }

      if (afterPatch.localVersion !== versionBeingSynced) {
        /*
         * Server accepted the old snapshot.
         *
         * Keep newest local state DIRTY and loop again
         * using the newly returned server revision.
         */
        await keepLocalWorkoutDirtyWithServerMetadata(database, {
          localId: current.localId,

          userId: current.userId,

          serverId,

          serverRevision,
        });

        continue;
      }

      /*
       * -------------------------------------------------
       * OFFLINE COMPLETION
       * -------------------------------------------------
       */
      if (afterPatch.localStatus === "COMPLETED") {
        const completedAt = afterPatch.workout.completed_at;

        if (!completedAt) {
          throw new Error("Completed local workout has no completed_at");
        }

        const completed = await completeWorkout(
          serverId,
          serverRevision,
          completedAt,
        );

        serverRevision = completed.revision;

        const afterComplete = await getLocalWorkout(database, {
          localId: afterPatch.localId,

          userId: afterPatch.userId,
        });

        if (!afterComplete) {
          return;
        }

        if (afterComplete.localVersion !== versionBeingSynced) {
          /*
           * Highly unusual: local row changed while
           * workout completion was in flight.
           *
           * Keep it dirty rather than lying that all
           * state is synced.
           */
          await keepLocalWorkoutDirtyWithServerMetadata(database, {
            localId: afterComplete.localId,

            userId: afterComplete.userId,

            serverId,

            serverRevision,
          });

          return;
        }

        await markLocalWorkoutSyncedIfVersion(database, {
          localId: afterComplete.localId,

          userId: afterComplete.userId,

          expectedLocalVersion: versionBeingSynced,

          serverId,

          serverRevision,

          syncedWorkout: completed,
        });

        syncLog(afterComplete.localId, "completed + synced");

        return;
      }

      /*
       * -------------------------------------------------
       * NORMAL ACTIVE SYNC
       * -------------------------------------------------
       */
      const marked = await markLocalWorkoutSyncedIfVersion(database, {
        localId: afterPatch.localId,

        userId: afterPatch.userId,

        expectedLocalVersion: versionBeingSynced,

        serverId,

        serverRevision,

        syncedWorkout: updated,
      });

      if (marked) {
        syncLog(afterPatch.localId, "synced", {
          revision: serverRevision,
        });

        return;
      }

      /*
       * Version changed between our read and SQL update.
       */
      await keepLocalWorkoutDirtyWithServerMetadata(database, {
        localId: afterPatch.localId,

        userId: afterPatch.userId,

        serverId,

        serverRevision,
      });
    }

    throw new Error("Workout kept changing during synchronization");
  } catch (error) {
    const latest = await getLocalWorkout(database, {
      localId: initial.localId,

      userId: initial.userId,
    });

    if (latest) {
      await handleSyncFailure(database, latest, error);
    }
  }
}

async function performSync(
  database: SQLiteDatabase,

  userId: string,
): Promise<void> {
  const online = await isInternetAvailable();

  if (!online) {
    return;
  }

  const pending = await listPendingLocalWorkouts(database, userId);

  for (const workout of pending) {
    await syncOneWorkout(database, workout);
  }
}

export async function syncPendingWorkouts(
  database: SQLiteDatabase,

  userId: string,
): Promise<void> {
  /*
   * One global sync loop at a time.
   *
   * Individual workout PATCHes must never race
   * against another sync loop.
   */
  if (running) {
    await running;

    return;
  }

  const promise = performSync(database, userId);

  running = promise;

  try {
    await promise;
  } finally {
    if (running === promise) {
      running = null;
    }
  }
}

/*
 * Used by conflict-resolution UI.
 */
export async function fetchServerWorkoutForLocal(record: LocalWorkoutRecord) {
  if (!record.serverId) {
    return null;
  }

  return getWorkoutSession(record.serverId);
}
