import * as Crypto from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";
import type { TemplateFolder } from "@/features/workouts/types";
import type { LocalFolderRecord, RoutineSyncStatus } from "./types";
import { runSerializedTransaction } from "@/lib/database/transaction";

interface FolderRow {
  local_id: string;
  user_id: string;
  client_folder_id: string;
  server_id: string | null;
  server_revision: number | null;
  name: string;
  position: number;
  archived: number;
  sync_status: RoutineSyncStatus;
  dirty: number;
  local_version: number;
  last_sync_error: string | null;
  retry_count: number;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
}
const mapRow = (row: FolderRow): LocalFolderRecord => ({
  localId: row.local_id,
  userId: row.user_id,
  clientFolderId: row.client_folder_id,
  serverId: row.server_id,
  serverRevision: row.server_revision,
  name: row.name,
  position: row.position,
  archived: row.archived === 1,
  syncStatus: row.sync_status,
  dirty: row.dirty === 1,
  localVersion: row.local_version,
  lastSyncError: row.last_sync_error,
  retryCount: row.retry_count,
  nextRetryAt: row.next_retry_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lastSyncedAt: row.last_synced_at,
});

export async function listLocalFolders(
  database: SQLiteDatabase,
  userId: string,
  includeArchived = false,
) {
  return (
    await database.getAllAsync<FolderRow>(
      `SELECT * FROM template_folders WHERE user_id=? ${includeArchived ? "" : "AND archived=0"} ORDER BY position ASC`,
      userId,
    )
  ).map(mapRow);
}
export async function getLocalFolderByClientId(
  database: SQLiteDatabase,
  userId: string,
  clientId: string,
) {
  const row = await database.getFirstAsync<FolderRow>(
    `SELECT * FROM template_folders WHERE user_id=? AND client_folder_id=? LIMIT 1`,
    userId,
    clientId,
  );
  return row ? mapRow(row) : null;
}
export async function createLocalFolder(
  database: SQLiteDatabase,
  userId: string,
  name: string,
  position: number,
) {
  const now = new Date().toISOString();
  const localId = Crypto.randomUUID();
  const clientId = Crypto.randomUUID();
  await database.runAsync(
    `INSERT INTO template_folders (local_id,user_id,client_folder_id,server_id,server_revision,name,position,archived,sync_status,dirty,local_version,last_sync_error,retry_count,next_retry_at,created_at,updated_at,last_synced_at) VALUES (?,?,?,NULL,NULL,?,?,0,'LOCAL_ONLY',1,1,NULL,0,NULL,?,?,NULL)`,
    localId,
    userId,
    clientId,
    name.trim(),
    position,
    now,
    now,
  );
  return {
    localId,
    userId,
    clientFolderId: clientId,
    serverId: null,
    serverRevision: null,
    name: name.trim(),
    position,
    archived: false,
    syncStatus: "LOCAL_ONLY" as const,
    dirty: true,
    localVersion: 1,
    lastSyncError: null,
    retryCount: 0,
    nextRetryAt: null,
    createdAt: now,
    updatedAt: now,
    lastSyncedAt: null,
  };
}
export async function saveLocalFolder(
  database: SQLiteDatabase,
  record: LocalFolderRecord,
  patch: { name?: string; position?: number; archived?: boolean },
) {
  const now = new Date().toISOString();
  const name = patch.name ?? record.name;
  const position = patch.position ?? record.position;
  const archived = patch.archived ?? record.archived;
  await runSerializedTransaction(database, async () => {
    await database.runAsync(
      `UPDATE template_folders SET name=?,position=?,archived=?,dirty=1,local_version=local_version+1,sync_status=CASE WHEN sync_status='CONFLICT' THEN 'CONFLICT' WHEN server_id IS NULL THEN 'LOCAL_ONLY' ELSE 'DIRTY' END,last_sync_error=NULL,next_retry_at=NULL,updated_at=? WHERE local_id=? AND user_id=?`,
      name,
      position,
      archived ? 1 : 0,
      now,
      record.localId,
      record.userId,
    );
    if (archived)
      await database.runAsync(
        `UPDATE local_templates SET payload_json=json_set(payload_json,'$.folder_client_id',NULL),dirty=1,local_version=local_version+1,sync_status=CASE WHEN server_id IS NULL THEN 'LOCAL_ONLY' ELSE 'DIRTY' END,updated_at=? WHERE user_id=? AND json_extract(payload_json,'$.folder_client_id')=?`,
        now,
        record.userId,
        record.clientFolderId,
      );
  });
}
export async function importServerFolder(
  database: SQLiteDatabase,
  userId: string,
  folder: TemplateFolder,
) {
  const existing = await getLocalFolderByClientId(
    database,
    userId,
    folder.client_folder_id,
  );
  if (existing?.dirty) return;
  const localId = existing?.localId ?? folder.client_folder_id;
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO template_folders (local_id,user_id,client_folder_id,server_id,server_revision,name,position,archived,sync_status,dirty,local_version,last_sync_error,retry_count,next_retry_at,created_at,updated_at,last_synced_at) VALUES (?,?,?,?,?,?,?,?,'SYNCED',0,1,NULL,0,NULL,?,?,?) ON CONFLICT(user_id,client_folder_id) DO UPDATE SET server_id=excluded.server_id,server_revision=excluded.server_revision,name=excluded.name,position=excluded.position,archived=excluded.archived,sync_status='SYNCED',dirty=0,last_sync_error=NULL,retry_count=0,next_retry_at=NULL,updated_at=excluded.updated_at,last_synced_at=excluded.last_synced_at`,
    localId,
    userId,
    folder.client_folder_id,
    folder.id,
    folder.revision,
    folder.name,
    folder.position,
    folder.archived ? 1 : 0,
    folder.created_at ?? now,
    folder.updated_at ?? now,
    now,
  );
}
export async function listPendingFolders(
  database: SQLiteDatabase,
  userId: string,
) {
  return (
    await database.getAllAsync<FolderRow>(
      `SELECT * FROM template_folders WHERE user_id=? AND dirty=1 AND sync_status!='CONFLICT' ORDER BY updated_at ASC`,
      userId,
    )
  ).map(mapRow);
}
