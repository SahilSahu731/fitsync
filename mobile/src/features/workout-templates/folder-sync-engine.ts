import type { SQLiteDatabase } from "expo-sqlite";
import { classifySyncError } from "@/features/sync/sync-errors";
import { isInternetAvailable } from "@/features/sync/network";
import { createServerFolder, updateServerFolder } from "./api";
import {
  getLocalFolderByClientId,
  listPendingFolders,
} from "./local-folder-repository";
import type { LocalFolderRecord } from "./types";

export async function syncFolderRecord(
  database: SQLiteDatabase,
  record: LocalFolderRecord,
) {
  try {
    let serverId = record.serverId;
    let revision = record.serverRevision;
    if (!serverId) {
      const created = await createServerFolder({
        client_folder_id: record.clientFolderId,
        name: record.name,
        position: record.position,
      });
      await database.runAsync(
        `UPDATE template_folders SET server_id=?,server_revision=? WHERE local_id=? AND user_id=?`,
        created.id,
        created.revision,
        record.localId,
        record.userId,
      );
      serverId = created.id;
      revision = created.revision;
    }
    const latest = await getLocalFolderByClientId(
      database,
      record.userId,
      record.clientFolderId,
    );
    if (!latest || !serverId || revision === null) return;
    const sentVersion = latest.localVersion;
    const updated = await updateServerFolder(serverId, {
      revision,
      name: latest.name,
      position: latest.position,
      archived: latest.archived,
    });
    const after = await getLocalFolderByClientId(
      database,
      record.userId,
      record.clientFolderId,
    );
    if (!after) return;
    if (after.localVersion !== sentVersion) {
      await database.runAsync(
        `UPDATE template_folders SET server_id=?,server_revision=?,dirty=1,sync_status='DIRTY' WHERE local_id=? AND user_id=?`,
        updated.id,
        updated.revision,
        after.localId,
        after.userId,
      );
      return;
    }
    await database.runAsync(
      `UPDATE template_folders SET server_id=?,server_revision=?,dirty=0,sync_status='SYNCED',last_sync_error=NULL,retry_count=0,next_retry_at=NULL,last_synced_at=? WHERE local_id=? AND user_id=? AND local_version=?`,
      updated.id,
      updated.revision,
      new Date().toISOString(),
      after.localId,
      after.userId,
      sentVersion,
    );
  } catch (error) {
    const failure = classifySyncError(error);
    await database.runAsync(
      `UPDATE template_folders SET sync_status=?,dirty=1,last_sync_error=? WHERE local_id=? AND user_id=?`,
      failure.kind === "CONFLICT" ? "CONFLICT" : "ERROR",
      failure.message,
      record.localId,
      record.userId,
    );
  }
}
export async function ensureFolderSyncedByClientId(
  database: SQLiteDatabase,
  userId: string,
  clientId: string,
) {
  const record = await getLocalFolderByClientId(database, userId, clientId);
  if (!record) return null;
  if (!record.serverId || record.dirty)
    await syncFolderRecord(database, record);
  return getLocalFolderByClientId(database, userId, clientId);
}
export async function syncPendingFolders(
  database: SQLiteDatabase,
  userId: string,
) {
  if (!(await isInternetAvailable())) return;
  for (const folder of await listPendingFolders(database, userId))
    await syncFolderRecord(database, folder);
}
