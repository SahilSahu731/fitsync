import { useEffect, useMemo, useState } from "react";

import { useSQLiteContext } from "expo-sqlite";

import { useAuthStore } from "@/features/auth/store";

import { useExercises } from "./queries";

import { cacheExercises, getCachedExercises } from "./cache";

import type { Exercise } from "./types";

interface Props {
  search?: string;
}

export function useOfflineExercises({ search = "" }: Props) {
  const database = useSQLiteContext();

  const user = useAuthStore((state) => state.user);

  const serverQuery = useExercises({
    q: search || undefined,
  });

  const [cached, setCached] = useState<Exercise[]>([]);

  const userId = user?.id;

  useEffect(() => {
    let cancelled = false;

    async function loadCachedExercises() {
      if (!userId) {
        await Promise.resolve();

        if (!cancelled) {
          setCached([]);
        }

        return;
      }

      const items = await getCachedExercises(database, userId);

      if (!cancelled) {
        setCached(items);
      }
    }

    void loadCachedExercises();

    return () => {
      cancelled = true;
    };
  }, [database, userId]);

  const serverItems = useMemo(
    () => serverQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [serverQuery.data],
  );

  useEffect(() => {
    if (!userId || serverItems.length === 0) {
      return;
    }

    let cancelled = false;

    async function updateCache() {
      await cacheExercises(database, userId!, serverItems);

      if (cancelled) {
        return;
      }

      setCached((current) => {
        const map = new Map<string, Exercise>();

        for (const exercise of current) {
          map.set(exercise.id, exercise);
        }

        for (const exercise of serverItems) {
          map.set(exercise.id, exercise);
        }

        return [...map.values()];
      });
    }

    void updateCache();

    return () => {
      cancelled = true;
    };
  }, [database, userId, serverItems]);

  const filteredCached = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) {
      return cached;
    }

    return cached.filter(
      (exercise) =>
        exercise.name.toLowerCase().includes(q) ||
        exercise.primary_muscles.some((muscle) =>
          muscle.toLowerCase().includes(q),
        ),
    );
  }, [cached, search]);

  const items = serverItems.length > 0 ? serverItems : filteredCached;

  return {
    items,

    isLoading: serverQuery.isLoading && cached.length === 0,

    isOfflineFallback: serverItems.length === 0 && cached.length > 0,

    fetchNextPage: serverQuery.fetchNextPage,

    hasNextPage: serverQuery.hasNextPage,

    isFetchingNextPage: serverQuery.isFetchingNextPage,
  };
}
