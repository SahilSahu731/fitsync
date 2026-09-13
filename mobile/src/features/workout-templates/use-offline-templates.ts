import { useEffect, useMemo, useState } from "react";

import { useSQLiteContext } from "expo-sqlite";

import { useAuthStore } from "@/features/auth/store";

import { getWorkoutTemplate } from "@/features/workouts/api";

import { useWorkoutTemplates } from "@/features/workouts/queries";

import type {
  WorkoutTemplate,
  WorkoutTemplateListItem,
} from "@/features/workouts/types";

import { cacheWorkoutTemplate, getCachedWorkoutTemplates } from "./cache";

function fullToListItem(template: WorkoutTemplate): WorkoutTemplateListItem {
  return {
    id: template.id,

    name: template.name,

    description: template.description,

    exercise_count: template.exercise_count,

    exercise_names: template.exercises.map(
      (exercise) => exercise.exercise_name,
    ),

    thumbnail_url:
      template.exercises.find((exercise) => Boolean(exercise.thumbnail_url))
        ?.thumbnail_url ?? null,

    updated_at: template.updated_at,
  };
}

export function useOfflineTemplates() {
  const database = useSQLiteContext();

  const user = useAuthStore((state) => state.user);

  const serverQuery = useWorkoutTemplates();

  const [cached, setCached] = useState<WorkoutTemplate[]>([]);

  const userId = user?.id;

  useEffect(() => {
    let cancelled = false;

    async function loadCachedTemplates() {
      if (!userId) {
        await Promise.resolve();

        if (!cancelled) {
          setCached([]);
        }

        return;
      }

      const templates = await getCachedWorkoutTemplates(database, userId);

      if (!cancelled) {
        setCached(templates);
      }
    }

    void loadCachedTemplates();

    return () => {
      cancelled = true;
    };
  }, [database, userId]);

  /*
   * When the lightweight server list arrives,
   * fetch full details and cache them.
   *
   * This runs in the background and does not
   * block the Train screen.
   */
  useEffect(() => {
    if (!user?.id || !serverQuery.data?.items.length) {
      return;
    }

    let cancelled = false;

    async function warmCache() {
      const full: WorkoutTemplate[] = [];

      for (const item of serverQuery.data!.items) {
        try {
          const template = await getWorkoutTemplate(item.id);

          if (cancelled) {
            return;
          }

          await cacheWorkoutTemplate(database, user!.id, template);

          full.push(template);
        } catch {
          /*
           * Cache warming is best effort.
           */
        }
      }

      if (!cancelled && full.length > 0) {
        setCached(full);
      }
    }

    void warmCache();

    return () => {
      cancelled = true;
    };
  }, [database, user?.id, serverQuery.data, user]);

  const cachedItems = useMemo(() => cached.map(fullToListItem), [cached]);

  const items = serverQuery.data?.items.length
    ? serverQuery.data.items
    : cachedItems;

  return {
    items,

    isLoading: serverQuery.isLoading && cached.length === 0,

    isOfflineFallback: !serverQuery.data?.items.length && cached.length > 0,

    refetch: serverQuery.refetch,
  };
}
