import * as Crypto from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";
import type { WorkoutTemplate } from "@/features/workouts/types";
import {
  insertLocalRoutine,
  listLocalRoutines,
} from "./local-routine-repository";
export async function createLocalRoutine(
  database: SQLiteDatabase,
  userId: string,
  template: Omit<
    WorkoutTemplate,
    | "id"
    | "client_template_id"
    | "server_id"
    | "revision"
    | "created_at"
    | "updated_at"
    | "times_performed"
    | "last_performed_at"
  >,
) {
  const routines = await listLocalRoutines(database, userId, true);
  const localId = Crypto.randomUUID();
  const clientId = Crypto.randomUUID();
  const now = new Date().toISOString();
  await insertLocalRoutine(database, userId, localId, clientId, {
    ...template,
    id: localId,
    client_template_id: clientId,
    server_id: null,
    position: template.position ?? routines.length,
    revision: 1,
    times_performed: 0,
    last_performed_at: null,
    created_at: now,
    updated_at: now,
  });
  return localId;
}
