import type { SQLiteDatabase } from "expo-sqlite";
import { getServerFolders, getServerRoutines } from "./api";
import { importServerFolder } from "./local-folder-repository";
import { importServerRoutine } from "./local-routine-repository";
export async function refreshRoutineLibrary(
  database: SQLiteDatabase,
  userId: string,
) {
  const [folders, routines] = await Promise.all([
    getServerFolders(),
    getServerRoutines(),
  ]);
  for (const folder of folders)
    await importServerFolder(database, userId, folder);
  for (const routine of routines)
    await importServerRoutine(database, userId, routine);
}
