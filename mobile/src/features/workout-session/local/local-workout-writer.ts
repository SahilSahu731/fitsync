import type { SQLiteDatabase } from "expo-sqlite";

import type { WorkoutSession } from "@/features/workouts/types";

import { saveLocalWorkoutPayload } from "./local-workout-repository";

interface PendingWrite {
  userId: string;

  workout: WorkoutSession;
}

/*
 * Small delay lets multiple rapid TextInput changes
 * collapse into one SQLite write.
 *
 * SQLite remains much faster and more reliable than
 * waiting for HTTP, but we still don't need to write
 * every individual keystroke.
 */
const WRITE_DELAY_MS = 75;

export class LocalWorkoutWriter {
  private database: SQLiteDatabase;

  private pending = new Map<string, PendingWrite>();

  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  private running = new Map<string, Promise<void>>();

  constructor(database: SQLiteDatabase) {
    this.database = database;
  }

  queue(
    localId: string,

    userId: string,

    workout: WorkoutSession,
  ): void {
    /*
     * Always keep only the newest snapshot.
     */
    this.pending.set(localId, {
      userId,

      workout,
    });

    const existingTimer = this.timers.get(localId);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.timers.delete(localId);

      void this.flush(localId);
    }, WRITE_DELAY_MS);

    this.timers.set(localId, timer);
  }

  async flush(localId: string): Promise<void> {
    const timer = this.timers.get(localId);

    if (timer) {
      clearTimeout(timer);

      this.timers.delete(localId);
    }

    /*
     * Another write loop for this workout is
     * already active.
     *
     * Wait for it, then check if something new
     * arrived during that write.
     */
    const currentRun = this.running.get(localId);

    if (currentRun) {
      await currentRun;

      if (!this.pending.has(localId)) {
        return;
      }
    }

    const run = this.runLoop(localId);

    this.running.set(localId, run);

    try {
      await run;
    } finally {
      if (this.running.get(localId) === run) {
        this.running.delete(localId);
      }
    }
  }

  private async runLoop(localId: string): Promise<void> {
    while (true) {
      const pending = this.pending.get(localId);

      if (!pending) {
        return;
      }

      /*
       * Remove exactly the snapshot we're
       * about to persist.
       *
       * If a newer edit arrives during the SQL
       * write, queue() inserts a newer PendingWrite
       * into this map.
       */
      this.pending.delete(localId);

      await saveLocalWorkoutPayload(
        this.database,
        localId,
        pending.userId,
        pending.workout,
      );

      /*
       * If queue() ran while await was in progress,
       * loop again immediately and persist the
       * newest snapshot.
       */
      if (!this.pending.has(localId)) {
        return;
      }
    }
  }

  async flushAll(): Promise<void> {
    const ids = new Set<string>([
      ...this.pending.keys(),

      ...this.running.keys(),

      ...this.timers.keys(),
    ]);

    await Promise.all([...ids].map((localId) => this.flush(localId)));
  }

  cancel(localId: string): void {
    const timer = this.timers.get(localId);

    if (timer) {
      clearTimeout(timer);
    }

    this.timers.delete(localId);

    this.pending.delete(localId);
  }
}
