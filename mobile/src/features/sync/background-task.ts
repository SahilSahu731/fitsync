import * as BackgroundTask
  from "expo-background-task";

import * as Network
  from "expo-network";

import * as TaskManager
  from "expo-task-manager";

import {
  openDatabaseAsync,
} from "expo-sqlite";

import {
  getCurrentUser,
} from "@/features/auth/api";

import {
  getMemoryTokens,
  hydrateTokens,
} from "@/features/auth/token-storage";

import {
  migrateDatabase,
} from "@/lib/database/migrations";

import {
  syncPendingWorkouts,
} from "./sync-engine";


export const WORKOUT_SYNC_BACKGROUND_TASK =
  "fitsync-workout-sync-v1";


TaskManager.defineTask(
  WORKOUT_SYNC_BACKGROUND_TASK,

  async () => {
    try {
      await hydrateTokens();


      if (
        !getMemoryTokens()
      ) {
        return BackgroundTask
          .BackgroundTaskResult
          .Success;
      }


      const network =
        await Network
          .getNetworkStateAsync();


      if (
        network.isConnected ===
          false ||
        network
          .isInternetReachable ===
          false
      ) {
        return BackgroundTask
          .BackgroundTaskResult
          .Success;
      }


      const user =
        await getCurrentUser();


      const database =
        await openDatabaseAsync(
          "fitsync.db"
        );


      await migrateDatabase(
        database
      );


      await syncPendingWorkouts(
        database,
        user.id,
      );


      return BackgroundTask
        .BackgroundTaskResult
        .Success;

    } catch {
      return BackgroundTask
        .BackgroundTaskResult
        .Failed;
    }
  },
);


export async function registerWorkoutBackgroundSync():
  Promise<void> {
  const registered =
    await TaskManager
      .isTaskRegisteredAsync(
        WORKOUT_SYNC_BACKGROUND_TASK
      );


  if (
    registered
  ) {
    return;
  }


  await BackgroundTask
    .registerTaskAsync(
      WORKOUT_SYNC_BACKGROUND_TASK,

      {
        minimumInterval:
          15,
      },
    );
}