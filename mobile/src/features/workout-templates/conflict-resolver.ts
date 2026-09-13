import type { SQLiteDatabase } from "expo-sqlite";
import { getServerRoutine } from "./api";
import {
  getLocalRoutine,
  importServerRoutine,
  markRoutineDirty,
  setRoutineServerMetadata,
} from "./local-routine-repository";
import { requestRoutineSync } from "./sync-manager";
export async function useServerRoutineVersion(
  database: SQLiteDatabase,
  userId: string,
  localId: string,
) {
  const local = await getLocalRoutine(database, userId, localId);
  if (!local?.serverId) throw new Error("Server routine is unavailable.");
  const server = await getServerRoutine(local.serverId);
  await database.runAsync(
    `UPDATE local_templates SET dirty=0,sync_status='SYNCED' WHERE local_id=? AND user_id=?`,
    localId,
    userId,
  );
  await importServerRoutine(database, userId, server);
}
export async function useLocalRoutineVersion(
  database: SQLiteDatabase,
  userId: string,
  localId: string,
) {
  const local = await getLocalRoutine(database, userId, localId);
  if (!local?.serverId) throw new Error("Server routine is unavailable.");
  const server = await getServerRoutine(local.serverId);
  await setRoutineServerMetadata(
    database,
    localId,
    userId,
    server.id,
    server.revision,
  );
  await markRoutineDirty(database, localId, userId, server.id, server.revision);
  requestRoutineSync(database, userId, 0);
}
