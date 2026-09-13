import type { SQLiteDatabase } from "expo-sqlite";
import { classifySyncError } from "@/features/sync/sync-errors";
import { isInternetAvailable } from "@/features/sync/network";
import { getNextRetryAt } from "@/features/sync/retry";
import {
  createServerRoutine,
  getServerRoutine,
  updateServerRoutine,
} from "./api";
import { ensureFolderSyncedByClientId } from "./folder-sync-engine";
import {
  deleteLocalRoutine,
  getLocalRoutine,
  getLocalRoutineByClientId,
  listPendingRoutines,
  markRoutineConflict,
  markRoutineDirty,
  markRoutineError,
  markRoutineSyncedIfVersion,
  markRoutineSyncing,
  setRoutineServerMetadata,
} from "./local-routine-repository";
import { routineCreateInput, routineUpdateInput } from "./routine-api-mapper";
import type { LocalRoutineRecord } from "./types";
let running: Promise<void> | null = null;
export async function syncRoutineRecord(
  database: SQLiteDatabase,
  initial: LocalRoutineRecord,
) {
  await markRoutineSyncing(database, initial.localId, initial.userId);
  try {
    const folderId = initial.template.folder_client_id;
    if (folderId)
      await ensureFolderSyncedByClientId(database, initial.userId, folderId);
    let serverId = initial.serverId;
    let revision = initial.serverRevision;
    if (!serverId && initial.archived) {
      await deleteLocalRoutine(database, initial.userId, initial.localId);
      return;
    }
    if (!serverId) {
      const created = await createServerRoutine(routineCreateInput(initial));
      serverId = created.id;
      revision = created.revision;
      await setRoutineServerMetadata(
        database,
        initial.localId,
        initial.userId,
        serverId,
        revision,
      );
    }
    for (let pass = 0; pass < 10; pass += 1) {
      const current = await getLocalRoutine(
        database,
        initial.userId,
        initial.localId,
      );
      if (!current || !serverId || revision === null) return;
      const sentVersion = current.localVersion;
      const updated = await updateServerRoutine(
        serverId,
        routineUpdateInput(current, revision),
      );
      revision = updated.revision;
      await setRoutineServerMetadata(
        database,
        current.localId,
        current.userId,
        serverId,
        revision,
      );
      const after = await getLocalRoutine(
        database,
        current.userId,
        current.localId,
      );
      if (!after) return;
      if (after.localVersion !== sentVersion) {
        await markRoutineDirty(
          database,
          after.localId,
          after.userId,
          serverId,
          revision,
        );
        continue;
      }
      if (
        await markRoutineSyncedIfVersion(
          database,
          after,
          sentVersion,
          serverId,
          revision,
        )
      )
        return;
    }
    throw new Error("Routine changed continuously while synchronizing.");
  } catch (error) {
    const latest = await getLocalRoutine(
      database,
      initial.userId,
      initial.localId,
    );
    if (!latest) return;
    const failure = classifySyncError(error);
    if (failure.kind === "CONFLICT") {
      await markRoutineConflict(
        database,
        latest.localId,
        latest.userId,
        failure.message,
      );
      return;
    }
    const retryCount = latest.retryCount + 1;
    const retryable = failure.kind === "NETWORK" || failure.kind === "SERVER";
    await markRoutineError(
      database,
      latest,
      failure.message,
      retryCount,
      retryable ? getNextRetryAt(retryCount) : null,
    );
  }
}
async function performSync(database: SQLiteDatabase, userId: string) {
  if (!(await isInternetAvailable())) return;
  for (const record of await listPendingRoutines(database, userId))
    await syncRoutineRecord(database, record);
}
export async function syncPendingRoutines(
  database: SQLiteDatabase,
  userId: string,
) {
  if (running) {
    await running;
    return;
  }
  const promise = performSync(database, userId);
  running = promise;
  try {
    await promise;
  } finally {
    if (running === promise) running = null;
  }
}
export async function ensureRoutineSyncedByClientId(
  database: SQLiteDatabase,
  userId: string,
  clientId: string,
) {
  const record = await getLocalRoutineByClientId(database, userId, clientId);
  if (!record) return null;
  if (!record.serverId || record.dirty)
    await syncRoutineRecord(database, record);
  return getLocalRoutineByClientId(database, userId, clientId);
}
export async function fetchServerRoutineForConflict(
  record: LocalRoutineRecord,
) {
  return record.serverId ? getServerRoutine(record.serverId) : null;
}
