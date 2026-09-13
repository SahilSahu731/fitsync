import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { useSQLiteContext } from "expo-sqlite";

import { useAuthStore } from "@/features/auth/store";

import { getWorkoutSession } from "@/features/workouts/api";

import { workoutSessionKeys } from "@/features/workouts/keys";

import type { WorkoutSession } from "@/features/workouts/types";

import { normalizeWorkoutSession } from "../normalization";

export type LocalWorkoutSyncStatus =
  "LOCAL_ONLY" | "DIRTY" | "SYNCING" | "SYNCED" | "CONFLICT" | "ERROR";

interface LocalWorkoutRow {
  local_id: string;

  server_id: string | null;

  client_workout_id: string;

  payload_json: string;

  sync_status: LocalWorkoutSyncStatus;
}

interface ResolvedWorkout {
  workout: WorkoutSession | null;

  source: "local" | "server" | null;

  syncStatus: LocalWorkoutSyncStatus | null;

  localId: string | null;

  serverId: string | null;

  isLoading: boolean;

  error: unknown;
}

function looksLikeMongoId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

export function useResolvedWorkout(workoutKey: string): ResolvedWorkout {
  const database = useSQLiteContext();

  const user = useAuthStore((state) => state.user);

  const userId = user?.id;

  const [localRow, setLocalRow] = useState<LocalWorkoutRow | null>(null);

  const [localReady, setLocalReady] = useState(false);

  const [localError, setLocalError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await Promise.resolve();

      if (cancelled) {
        return;
      }

      setLocalReady(false);

      if (!userId || !workoutKey) {
        if (!cancelled) {
          setLocalRow(null);

          setLocalReady(true);
        }

        return;
      }

      try {
        const row = await database.getFirstAsync<LocalWorkoutRow>(
          `
                SELECT
                  local_id,
                  server_id,
                  client_workout_id,
                  payload_json,
                  sync_status
                FROM local_workouts
                WHERE user_id = ?
                  AND (
                    local_id = ?
                    OR server_id = ?
                    OR client_workout_id = ?
                  )
                LIMIT 1
                `,
          userId,
          workoutKey,
          workoutKey,
          workoutKey,
        );

        if (cancelled) {
          return;
        }

        setLocalRow(row ?? null);

        setLocalError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setLocalError(error);
      } finally {
        if (!cancelled) {
          setLocalReady(true);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [database, userId, workoutKey]);

  let localWorkout: WorkoutSession | null = null;

  if (localRow) {
    try {
      localWorkout = normalizeWorkoutSession(
        JSON.parse(localRow.payload_json) as WorkoutSession,
      );
    } catch {
      localWorkout = null;
    }
  }

  const serverLookupId =
    localRow?.server_id ?? (looksLikeMongoId(workoutKey) ? workoutKey : null);

  const serverQuery = useQuery({
    queryKey: serverLookupId
      ? workoutSessionKeys.detail(serverLookupId)
      : ["workout-resolution", workoutKey],

    queryFn: () => getWorkoutSession(serverLookupId!),

    enabled: localReady && !localWorkout && Boolean(serverLookupId),

    retry: 1,
  });

  return {
    workout: localWorkout ?? serverQuery.data ?? null,

    source: localWorkout ? "local" : serverQuery.data ? "server" : null,

    syncStatus: localRow?.sync_status ?? null,

    localId: localRow?.local_id ?? null,

    serverId: localRow?.server_id ?? serverLookupId ?? null,

    isLoading:
      !localReady ||
      (!localWorkout && Boolean(serverLookupId) && serverQuery.isLoading),

    error: localError ?? serverQuery.error,
  };
}
