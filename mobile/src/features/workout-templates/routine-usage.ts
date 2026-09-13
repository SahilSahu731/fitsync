import type { SQLiteDatabase } from "expo-sqlite";
import type { WorkoutSession } from "@/features/workouts/types";

interface WorkoutRow {
  payload_json: string;
}
export interface LocalRoutineUsage {
  timesPerformed: number;
  lastPerformedAt: string | null;
}

export async function getLocalRoutineUsage(
  database: SQLiteDatabase,
  userId: string,
) {
  const rows = await database.getAllAsync<WorkoutRow>(
    "SELECT payload_json FROM local_workouts WHERE user_id=? AND local_status='COMPLETED' ORDER BY updated_at DESC",
    userId,
  );
  const result = new Map<string, LocalRoutineUsage>();
  const seen = new Set<string>();
  for (const row of rows) {
    try {
      const workout = JSON.parse(row.payload_json) as WorkoutSession;
      const unique = workout.client_workout_id ?? workout.id;
      const key = workout.template_client_id ?? workout.template_id;
      if (!key || !workout.completed_at || seen.has(unique)) continue;
      seen.add(unique);
      const current = result.get(key);
      result.set(key, {
        timesPerformed: (current?.timesPerformed ?? 0) + 1,
        lastPerformedAt:
          !current?.lastPerformedAt ||
          new Date(workout.completed_at).getTime() >
            new Date(current.lastPerformedAt).getTime()
            ? workout.completed_at
            : current.lastPerformedAt,
      });
    } catch {
      // Ignore malformed legacy payloads.
    }
  }
  return result;
}
