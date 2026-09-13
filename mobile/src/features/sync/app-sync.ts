import type { SQLiteDatabase } from "expo-sqlite";
import { syncPendingFolders } from "@/features/workout-templates/folder-sync-engine";
import { syncPendingRoutines } from "@/features/workout-templates/routine-sync-engine";
import { syncPendingWorkouts } from "./sync-engine";
export async function syncAppData(database: SQLiteDatabase, userId: string) {
  await syncPendingFolders(database, userId);
  await syncPendingRoutines(database, userId);
  await syncPendingWorkouts(database, userId);
}
