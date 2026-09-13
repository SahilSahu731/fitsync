import type { SQLiteDatabase } from "expo-sqlite";
import { syncPendingFolders } from "./folder-sync-engine";
import { syncPendingRoutines } from "./routine-sync-engine";
const timers = new Map<string, ReturnType<typeof setTimeout>>();
export function requestRoutineSync(
  database: SQLiteDatabase,
  userId: string,
  delay = 500,
) {
  const existing = timers.get(userId);
  if (existing) clearTimeout(existing);
  timers.set(
    userId,
    setTimeout(() => {
      timers.delete(userId);
      void (async () => {
        await syncPendingFolders(database, userId);
        await syncPendingRoutines(database, userId);
      })();
    }, delay),
  );
}
export async function flushRoutineSync(
  database: SQLiteDatabase,
  userId: string,
) {
  const timer = timers.get(userId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(userId);
  }
  await syncPendingFolders(database, userId);
  await syncPendingRoutines(database, userId);
}
