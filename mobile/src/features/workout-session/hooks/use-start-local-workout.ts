import { useState } from "react";

import { router } from "expo-router";

import { useSQLiteContext } from "expo-sqlite";

import { useAuthStore } from "@/features/auth/store";

import { getWorkoutTemplate } from "@/features/workouts/api";

import { requestWorkoutSync } from "@/features/sync/sync-manager";

import {
  cacheWorkoutTemplate,
  getCachedWorkoutTemplate,
} from "@/features/workout-templates/cache";

import { startLocalWorkout } from "../local/start-local-workout";

export function useStartLocalWorkout() {
  const database = useSQLiteContext();

  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function startEmpty() {
    if (!user || loading) {
      return;
    }

    setLoading(true);

    setError(null);

    try {
      const localId = await startLocalWorkout(database, user, {
        name: "Workout",
      });

      requestWorkoutSync(database, user.id);

      router.push(`/workouts/active/${localId}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to start workout.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function startTemplate(templateId: string) {
    if (!user || loading) {
      return;
    }

    setLoading(true);

    setError(null);

    try {
      let template = await getCachedWorkoutTemplate(
        database,
        user.id,
        templateId,
      );

      /*
       * If no local copy exists, try server once.
       */
      if (!template) {
        try {
          template = await getWorkoutTemplate(templateId);

          await cacheWorkoutTemplate(database, user.id, template);
        } catch {
          throw new Error("This template isn't available offline yet.");
        }
      }

      const localId = await startLocalWorkout(database, user, {
        template,
      });

      requestWorkoutSync(database, user.id);

      router.push(`/workouts/active/${localId}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to start template.",
      );
    } finally {
      setLoading(false);
    }
  }

  return {
    startEmpty,

    startTemplate,

    isPending: loading,

    error,
  };
}
