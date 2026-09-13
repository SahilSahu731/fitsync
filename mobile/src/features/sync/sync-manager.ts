import type { SQLiteDatabase } from "expo-sqlite";
import { syncPendingWorkouts } from "./sync-engine";


const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function requestWorkoutSync(
  database: SQLiteDatabase,

  userId: string,

  delay = 900,
): void {
  const existing = timers.get(userId);

  if (existing) {
    clearTimeout(existing);
  }

  const timer = setTimeout(() => {
    timers.delete(userId);

    void syncPendingWorkouts(database, userId);
  }, delay);

  timers.set(userId, timer);
}

export async function flushWorkoutSync(
  database: SQLiteDatabase,

  userId: string,
): Promise<void> {
  const existing = timers.get(userId);

  if (existing) {
    clearTimeout(existing);

    timers.delete(userId);
  }

  await syncPendingWorkouts(database, userId);
}
