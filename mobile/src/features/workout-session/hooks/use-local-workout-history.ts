import { useCallback, useState } from "react";

import { useFocusEffect } from "expo-router";

import { useSQLiteContext } from "expo-sqlite";

import { useAuthStore } from "@/features/auth/store";

import type { WorkoutSession } from "@/features/workouts/types";

export interface LocalHistoryItem {
  route_id: string;

  local_id: string;

  server_id: string | null;

  client_workout_id: string;

  sync_status: string;

  name: string;

  started_at: string;

  completed_at: string;

  duration_seconds: number;

  exercise_count: number;

  completed_set_count: number;

  exercise_names: string[];
}

interface LocalRow {
  local_id: string;

  server_id: string | null;

  client_workout_id: string;

  sync_status: string;

  payload_json: string;
}

export function useLocalWorkoutHistory() {
  const database = useSQLiteContext();

  const user = useAuthStore((state) => state.user);

  const [items, setItems] = useState<LocalHistoryItem[]>([]);

  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setItems([]);

      setLoading(false);

      return;
    }

    setLoading(true);

    try {
      const rows = await database.getAllAsync<LocalRow>(
        `
                SELECT
                  local_id,
                  server_id,
                  client_workout_id,
                  sync_status,
                  payload_json
                FROM local_workouts
                WHERE user_id = ?
                  AND local_status = 'COMPLETED'
                ORDER BY updated_at DESC
                `,
        user.id,
      );

      const mapped: LocalHistoryItem[] = [];

      for (const row of rows) {
        try {
          const workout = JSON.parse(row.payload_json) as WorkoutSession;

          if (!workout.completed_at) {
            continue;
          }

          mapped.push({
            route_id: row.local_id,

            local_id: row.local_id,

            server_id: row.server_id,

            client_workout_id: row.client_workout_id,

            sync_status: row.sync_status,

            name: workout.name,

            started_at: workout.started_at,

            completed_at: workout.completed_at,

            duration_seconds: workout.duration_seconds ?? 0,

            exercise_count: workout.exercises.length,

            completed_set_count: workout.completed_set_count,

            exercise_names: workout.exercises.map(
              (exercise) => exercise.exercise_name,
            ),
          });
        } catch {
          // Ignore a malformed local row here.
          // Sync diagnostics should report it elsewhere.
        }
      }

      setItems(mapped);
    } finally {
      setLoading(false);
    }
  }, [database, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();

      return undefined;
    }, [load]),
  );

  return {
    items,

    isLoading: loading,

    refetch: load,
  };
}
