import type { SQLiteDatabase } from "expo-sqlite";
import {
  createLocalFolder,
  listLocalFolders,
  saveLocalFolder,
} from "./local-folder-repository";

export async function createRoutineFolder(
  database: SQLiteDatabase,
  userId: string,
  name: string,
) {
  const folders = await listLocalFolders(database, userId, true);
  return createLocalFolder(database, userId, name, folders.length);
}
export async function renameRoutineFolder(
  database: SQLiteDatabase,
  userId: string,
  localId: string,
  name: string,
) {
  const folder = (await listLocalFolders(database, userId, true)).find(
    (item) => item.localId === localId,
  );
  if (!folder) throw new Error("Folder not found.");
  await saveLocalFolder(database, folder, { name: name.trim() });
}
export async function archiveRoutineFolder(
  database: SQLiteDatabase,
  userId: string,
  localId: string,
) {
  const folder = (await listLocalFolders(database, userId, true)).find(
    (item) => item.localId === localId,
  );
  if (!folder) throw new Error("Folder not found.");
  await saveLocalFolder(database, folder, { archived: true });
}
export async function moveRoutineFolder(
  database: SQLiteDatabase,
  userId: string,
  localId: string,
  direction: -1 | 1,
) {
  const folders = await listLocalFolders(database, userId);
  const index = folders.findIndex((item) => item.localId === localId);
  const other = folders[index + direction];
  const current = folders[index];
  if (!current || !other) return;
  await database.withTransactionAsync(async () => {
    await saveLocalFolder(database, current, { position: other.position });
    await saveLocalFolder(database, other, { position: current.position });
  });
}
