import { useEffect, useMemo, useState } from "react";

import { useSQLiteContext } from "expo-sqlite";

import { useAuthStore } from "@/features/auth/store";

import { usePreviousPerformance } from "@/features/workouts/queries";

import type { PreviousExercisePerformance } from "@/features/workouts/types";

import { getLocalPreviousPerformance } from "../local/local-previous-performance";

export function useResolvedPreviousPerformance(exerciseIds: string[]) {
  const database = useSQLiteContext();

  const user = useAuthStore((state) => state.user);

  const server = usePreviousPerformance(exerciseIds);

  const [local, setLocal] = useState<PreviousExercisePerformance[]>([]);

  const key = exerciseIds.slice().sort().join("|");

  useEffect(() => {
    let cancelled = false;

    if (!user?.id || exerciseIds.length === 0) {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setLocal([]);
        }
      });

      return () => {
        cancelled = true;
      };
    }

    void getLocalPreviousPerformance(database, user.id, exerciseIds).then(
      (items) => {
        if (!cancelled) {
          setLocal(items);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [database, user?.id, key, exerciseIds]);

  return useMemo(() => {
    const map = new Map<string, PreviousExercisePerformance>();

    for (const item of server.data?.items ?? []) {
      map.set(item.exercise_id, item);
    }

    for (const item of local) {
      const existing = map.get(item.exercise_id);

      if (
        !existing ||
        new Date(item.completed_at).getTime() >
          new Date(existing.completed_at).getTime()
      ) {
        map.set(item.exercise_id, item);
      }
    }

    return map;
  }, [local, server.data]);
}
