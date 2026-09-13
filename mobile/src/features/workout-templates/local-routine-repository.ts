import type { SQLiteDatabase } from "expo-sqlite";
import type { WorkoutTemplate } from "@/features/workouts/types";
import { normalizeRoutine } from "./normalization";
import type { LocalRoutineRecord, RoutineSyncStatus } from "./types";
import { getLocalRoutineUsage } from "./routine-usage";

interface LocalRoutineRow {
  local_id: string;
  user_id: string;
  client_template_id: string;
  server_id: string | null;
  server_revision: number | null;
  payload_json: string;
  payload_version: number;
  archived: number;
  sync_status: RoutineSyncStatus;
  dirty: number;
  local_version: number;
  last_synced_payload_json: string | null;
  last_sync_error: string | null;
  retry_count: number;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
}

const parseTemplate = (value: string) =>
  normalizeRoutine(JSON.parse(value) as WorkoutTemplate);

function mapRow(row: LocalRoutineRow): LocalRoutineRecord {
  const template = parseTemplate(row.payload_json);
  return {
    localId: row.local_id,
    userId: row.user_id,
    clientTemplateId: row.client_template_id,
    serverId: row.server_id,
    serverRevision: row.server_revision,
    template: {
      ...template,
      id: row.local_id,
      client_template_id: row.client_template_id,
      server_id: row.server_id,
    },
    archived: row.archived === 1,
    syncStatus: row.sync_status,
    dirty: row.dirty === 1,
    localVersion: row.local_version,
    lastSyncedTemplate: row.last_synced_payload_json
      ? parseTemplate(row.last_synced_payload_json)
      : null,
    lastSyncError: row.last_sync_error,
    retryCount: row.retry_count,
    nextRetryAt: row.next_retry_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSyncedAt: row.last_synced_at,
  };
}

async function first(
  database: SQLiteDatabase,
  userId: string,
  clause: string,
  values: string[],
) {
  const row = await database.getFirstAsync<LocalRoutineRow>(
    `SELECT * FROM local_templates WHERE user_id = ? AND ${clause} LIMIT 1`,
    userId,
    ...values,
  );
  return row ? mapRow(row) : null;
}

export function getLocalRoutine(
  database: SQLiteDatabase,
  userId: string,
  localId: string,
) {
  return first(database, userId, "local_id = ?", [localId]);
}
export function getLocalRoutineByClientId(
  database: SQLiteDatabase,
  userId: string,
  clientId: string,
) {
  return first(database, userId, "client_template_id = ?", [clientId]);
}
export function getLocalRoutineByAnyId(
  database: SQLiteDatabase,
  userId: string,
  value: string,
) {
  return first(
    database,
    userId,
    "(local_id = ? OR server_id = ? OR client_template_id = ?)",
    [value, value, value],
  );
}

export async function listLocalRoutines(
  database: SQLiteDatabase,
  userId: string,
  includeArchived = false,
) {
  const rows = await database.getAllAsync<LocalRoutineRow>(
    `SELECT * FROM local_templates WHERE user_id = ? ${includeArchived ? "" : "AND archived = 0"} ORDER BY archived ASC, json_extract(payload_json, '$.is_favorite') DESC, json_extract(payload_json, '$.position') ASC, updated_at DESC`,
    userId,
  );
  const records = rows.map(mapRow);
  const usage = await getLocalRoutineUsage(database, userId);
  return records.map((record) => {
    const local =
      usage.get(record.clientTemplateId) ??
      (record.serverId ? usage.get(record.serverId) : undefined);
    if (!local) return record;
    return {
      ...record,
      template: {
        ...record.template,
        times_performed: Math.max(
          record.template.times_performed,
          local.timesPerformed,
        ),
        last_performed_at:
          !record.template.last_performed_at ||
          (local.lastPerformedAt &&
            new Date(local.lastPerformedAt).getTime() >
              new Date(record.template.last_performed_at).getTime())
            ? local.lastPerformedAt
            : record.template.last_performed_at,
      },
    };
  });
}

export async function insertLocalRoutine(
  database: SQLiteDatabase,
  userId: string,
  localId: string,
  clientId: string,
  template: WorkoutTemplate,
) {
  const now = new Date().toISOString();
  const normalized = normalizeRoutine({
    ...template,
    id: localId,
    client_template_id: clientId,
  });
  await database.runAsync(
    `INSERT INTO local_templates (local_id,user_id,client_template_id,server_id,server_revision,payload_json,payload_version,archived,sync_status,dirty,local_version,last_synced_payload_json,last_sync_error,retry_count,next_retry_at,created_at,updated_at,last_synced_at) VALUES (?,?,?,NULL,NULL,?,1,?,'LOCAL_ONLY',1,1,NULL,NULL,0,NULL,?,?,NULL)`,
    localId,
    userId,
    clientId,
    JSON.stringify(normalized),
    normalized.archived ? 1 : 0,
    now,
    now,
  );
}

export async function saveLocalRoutine(
  database: SQLiteDatabase,
  record: LocalRoutineRecord,
  template: WorkoutTemplate,
) {
  const now = new Date().toISOString();
  const normalized = normalizeRoutine({
    ...template,
    id: record.localId,
    client_template_id: record.clientTemplateId,
    server_id: record.serverId,
  });
  await database.runAsync(
    `UPDATE local_templates SET payload_json=?,payload_version=1,archived=?,dirty=1,local_version=local_version+1,sync_status=CASE WHEN sync_status='CONFLICT' THEN 'CONFLICT' WHEN server_id IS NULL THEN 'LOCAL_ONLY' ELSE 'DIRTY' END,last_sync_error=NULL,next_retry_at=NULL,updated_at=? WHERE local_id=? AND user_id=?`,
    JSON.stringify(normalized),
    normalized.archived ? 1 : 0,
    now,
    record.localId,
    record.userId,
  );
}

export async function importServerRoutine(
  database: SQLiteDatabase,
  userId: string,
  server: WorkoutTemplate,
): Promise<string> {
  const existing =
    (await getLocalRoutineByAnyId(database, userId, server.id)) ??
    (await getLocalRoutineByClientId(
      database,
      userId,
      server.client_template_id,
    ));
  if (existing?.dirty) {
    if (
      existing.serverRevision !== null &&
      server.revision > existing.serverRevision
    )
      await markRoutineConflict(
        database,
        existing.localId,
        userId,
        "Routine changed on another device.",
      );
    return existing.localId;
  }
  const localId = existing?.localId ?? server.client_template_id;
  const normalized = normalizeRoutine({
    ...server,
    id: localId,
    server_id: server.id,
  });
  const now = new Date().toISOString();
  const json = JSON.stringify(normalized);
  await database.runAsync(
    `INSERT INTO local_templates (local_id,user_id,client_template_id,server_id,server_revision,payload_json,payload_version,archived,sync_status,dirty,local_version,last_synced_payload_json,last_sync_error,retry_count,next_retry_at,created_at,updated_at,last_synced_at) VALUES (?,?,?,?,?,?,1,?,'SYNCED',0,1,?,NULL,0,NULL,?,?,?) ON CONFLICT(user_id,client_template_id) DO UPDATE SET server_id=excluded.server_id,server_revision=excluded.server_revision,payload_json=excluded.payload_json,payload_version=1,archived=excluded.archived,sync_status='SYNCED',dirty=0,last_synced_payload_json=excluded.last_synced_payload_json,last_sync_error=NULL,retry_count=0,next_retry_at=NULL,updated_at=excluded.updated_at,last_synced_at=excluded.last_synced_at`,
    localId,
    userId,
    server.client_template_id,
    server.id,
    server.revision,
    json,
    server.archived ? 1 : 0,
    json,
    existing?.createdAt ?? now,
    now,
    now,
  );
  return localId;
}

export async function listPendingRoutines(
  database: SQLiteDatabase,
  userId: string,
) {
  const now = new Date().toISOString();
  return (
    await database.getAllAsync<LocalRoutineRow>(
      `SELECT * FROM local_templates WHERE user_id=? AND dirty=1 AND sync_status!='CONFLICT' AND (next_retry_at IS NULL OR next_retry_at<=?) ORDER BY updated_at ASC`,
      userId,
      now,
    )
  ).map(mapRow);
}
export async function markRoutineSyncing(
  database: SQLiteDatabase,
  localId: string,
  userId: string,
) {
  await database.runAsync(
    `UPDATE local_templates SET sync_status='SYNCING' WHERE local_id=? AND user_id=?`,
    localId,
    userId,
  );
}
export async function setRoutineServerMetadata(
  database: SQLiteDatabase,
  localId: string,
  userId: string,
  serverId: string,
  revision: number,
) {
  await database.runAsync(
    `UPDATE local_templates SET server_id=?,server_revision=? WHERE local_id=? AND user_id=?`,
    serverId,
    revision,
    localId,
    userId,
  );
}
export async function markRoutineSyncedIfVersion(
  database: SQLiteDatabase,
  record: LocalRoutineRecord,
  version: number,
  serverId: string,
  revision: number,
) {
  const result = await database.runAsync(
    `UPDATE local_templates SET server_id=?,server_revision=?,dirty=0,sync_status='SYNCED',last_synced_payload_json=payload_json,last_sync_error=NULL,retry_count=0,next_retry_at=NULL,last_synced_at=? WHERE local_id=? AND user_id=? AND local_version=?`,
    serverId,
    revision,
    new Date().toISOString(),
    record.localId,
    record.userId,
    version,
  );
  return result.changes === 1;
}
export async function markRoutineDirty(
  database: SQLiteDatabase,
  localId: string,
  userId: string,
  serverId: string,
  revision: number,
) {
  await database.runAsync(
    `UPDATE local_templates SET server_id=?,server_revision=?,dirty=1,sync_status='DIRTY' WHERE local_id=? AND user_id=?`,
    serverId,
    revision,
    localId,
    userId,
  );
}
export async function markRoutineConflict(
  database: SQLiteDatabase,
  localId: string,
  userId: string,
  message: string,
) {
  await database.runAsync(
    `UPDATE local_templates SET sync_status='CONFLICT',dirty=1,last_sync_error=?,next_retry_at=NULL WHERE local_id=? AND user_id=?`,
    message,
    localId,
    userId,
  );
}
export async function markRoutineError(
  database: SQLiteDatabase,
  record: LocalRoutineRecord,
  message: string,
  retryCount: number,
  nextRetryAt: string | null,
) {
  await database.runAsync(
    `UPDATE local_templates SET sync_status='ERROR',dirty=1,last_sync_error=?,retry_count=?,next_retry_at=? WHERE local_id=? AND user_id=?`,
    message,
    retryCount,
    nextRetryAt,
    record.localId,
    record.userId,
  );
}
export async function deleteLocalRoutine(
  database: SQLiteDatabase,
  userId: string,
  localId: string,
) {
  await database.runAsync(
    `DELETE FROM local_templates WHERE local_id=? AND user_id=?`,
    localId,
    userId,
  );
}
