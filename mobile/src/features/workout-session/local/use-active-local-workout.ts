import { useCallback, useEffect, useState } from "react";

import { useSQLiteContext } from "expo-sqlite";

import { useAuthStore } from "@/features/auth/store";

import { getLocalWorkoutByAnyId } from "./local-workout-repository";

import type { LocalWorkoutRecord } from "./types";

export function useActiveLocalWorkout(workoutId: string) {
  const database = useSQLiteContext();

  const user = useAuthStore((state) => state.user);

  const userId = user?.id;

  const [record, setRecord] = useState<LocalWorkoutRecord | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    if (!userId || !workoutId) {
      setRecord(null);

      setLoading(false);

      return null;
    }

    setLoading(true);

    try {
      const result = await getLocalWorkoutByAnyId(database, {
        workoutId,
        userId,
      });

      setRecord(result);

      setError(null);

      return result;
    } catch (requestError) {
      setError(requestError);

      return null;
    } finally {
      setLoading(false);
    }
  }, [database, userId, workoutId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void reload();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [reload]);

  return {
    record,

    setRecord,

    workout: record?.workout ?? null,

    isLoading: loading,

    error,

    reload,
  };
}
