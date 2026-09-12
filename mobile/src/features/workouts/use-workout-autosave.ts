import { useCallback, useEffect, useRef, useState } from "react";

import { updateWorkoutSession } from "./api";

import type { WorkoutSession } from "./types";

import { sessionToUpdateInput } from "./utils";

export type SaveState = "saved" | "saving" | "unsaved" | "error";

interface Props {
  workout: WorkoutSession | null;

  enabled?: boolean;

  delay?: number;

  onSaved?: (workout: WorkoutSession) => void;
}

/**
 * Serialize only editable workout data.
 *
 * Revision is deliberately excluded because it
 * is concurrency metadata, not a user edit.
 */
function serializeWorkout(workout: WorkoutSession): string {
  const input = sessionToUpdateInput(workout, workout.revision);

  const { revision: _revision, ...editable } = input;

  return JSON.stringify(editable);
}

export function useWorkoutAutosave({
  workout,
  enabled = true,
  delay = 900,
  onSaved,
}: Props) {
  const [status, setStatus] = useState<SaveState>("saved");

  /**
   * Newest draft received from React.
   *
   * It can change while an HTTP request is running.
   */
  const latestWorkout = useRef<WorkoutSession | null>(workout);

  /**
   * Which workout these refs currently belong to.
   */
  const currentSessionId = useRef<string | null>(workout?.id ?? null);

  /**
   * Content that the server has definitely accepted.
   */
  const lastSavedSerialized = useRef<string | null>(
    workout ? serializeWorkout(workout) : null,
  );

  /**
   * Latest revision returned by the server.
   *
   * This is deliberately separate from React draft state.
   */
  const serverRevision = useRef<number | null>(workout?.revision ?? null);

  /**
   * Latest complete server response.
   *
   * Finish Workout and Add Exercise need the current
   * confirmed server revision.
   */
  const lastServerSnapshot = useRef<WorkoutSession | null>(workout);

  /**
   * The currently running flush operation.
   *
   * There must never be two concurrent PATCH requests
   * for one workout from this screen.
   */
  const runningPromise = useRef<Promise<WorkoutSession | null> | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSavedRef = useRef(onSaved);

  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  /**
   * Use after another server mutation such as
   * Add Exercise returns a newer workout snapshot.
   *
   * It tells autosave:
   *
   * "The server definitely contains exactly this state."
   */
  const adoptServerSnapshot = useCallback((snapshot: WorkoutSession) => {
    currentSessionId.current = snapshot.id;

    serverRevision.current = snapshot.revision;

    lastServerSnapshot.current = snapshot;

    lastSavedSerialized.current = serializeWorkout(snapshot);

    latestWorkout.current = snapshot;

    setStatus("saved");
  }, []);

  /**
   * Keep PATCHing until the newest local draft has
   * definitely reached the server.
   *
   * This is the fix for the old dropped-save bug.
   */
  const performFlush = useCallback(async (): Promise<WorkoutSession | null> => {
    let mostRecent = lastServerSnapshot.current;

    while (true) {
      const current = latestWorkout.current;

      if (!current || !enabled) {
        return mostRecent;
      }

      const serialized = serializeWorkout(current);

      /**
       * Establish initial baseline if necessary.
       */
      if (lastSavedSerialized.current === null) {
        lastSavedSerialized.current = serialized;

        serverRevision.current = current.revision;

        lastServerSnapshot.current = current;

        setStatus("saved");

        return current;
      }

      /**
       * Nothing new to save.
       */
      if (serialized === lastSavedSerialized.current) {
        setStatus("saved");

        return lastServerSnapshot.current ?? current;
      }

      const expectedRevision = serverRevision.current ?? current.revision;

      setStatus("saving");

      try {
        /**
         * Capture the exact draft being sent.
         *
         * latestWorkout may change while awaiting
         * this request.
         */
        const saved = await updateWorkoutSession(
          current.id,
          sessionToUpdateInput(current, expectedRevision),
        );

        serverRevision.current = saved.revision;

        lastServerSnapshot.current = saved;

        /**
         * Mark ONLY the payload we actually sent
         * as successfully persisted.
         *
         * Do not serialize latestWorkout here,
         * because the user may have edited it
         * while this request was in flight.
         */
        lastSavedSerialized.current = serialized;

        mostRecent = saved;

        onSavedRef.current?.(saved);
      } catch (error) {
        setStatus("error");

        throw error;
      }

      const latest = latestWorkout.current;

      if (!latest) {
        setStatus("saved");

        return mostRecent;
      }

      const latestSerialized = serializeWorkout(latest);

      /**
       * No edit occurred while the request was running.
       */
      if (latestSerialized === lastSavedSerialized.current) {
        setStatus("saved");

        return mostRecent;
      }

      /**
       * Something changed while saving.
       *
       * Do NOT clear a queue flag and return.
       *
       * Loop immediately and PATCH the newest draft
       * using the revision returned by the previous
       * successful request.
       */
      setStatus("unsaved");
    }
  }, [enabled]);

  /**
   * Public forced flush.
   *
   * Finish Workout and Add Exercise use this.
   */
  const flush = useCallback(async (): Promise<WorkoutSession | null> => {
    if (timer.current) {
      clearTimeout(timer.current);

      timer.current = null;
    }

    /**
     * If another flush is already happening,
     * wait for it instead of returning early.
     */
    if (runningPromise.current) {
      await runningPromise.current;

      const latest = latestWorkout.current;

      if (!latest || serializeWorkout(latest) === lastSavedSerialized.current) {
        return lastServerSnapshot.current ?? latest;
      }
    }

    const promise = performFlush();

    runningPromise.current = promise;

    try {
      return await promise;
    } finally {
      if (runningPromise.current === promise) {
        runningPromise.current = null;
      }
    }
  }, [performFlush]);

  /**
   * Watch React draft changes and schedule autosave.
   */
  useEffect(
    () => {
      // This effect resets the autosave state when its external workout input changes.
      // The synchronous update is intentional; deferring it would briefly expose a
      // stale save state during workout switches.
      /* eslint-disable react-hooks/set-state-in-effect */
      latestWorkout.current = workout;

      if (!workout) {
        currentSessionId.current = null;

        serverRevision.current = null;

        lastServerSnapshot.current = null;

        lastSavedSerialized.current = null;

        setStatus("saved");

        return;
      }

      /**
       * We navigated to a completely different workout.
       */
      if (currentSessionId.current !== workout.id) {
        currentSessionId.current = workout.id;

        serverRevision.current = workout.revision;

        lastServerSnapshot.current = workout;

        lastSavedSerialized.current = serializeWorkout(workout);

        setStatus("saved");

        return;
      }

      const serialized = serializeWorkout(workout);

      /**
       * Initial baseline.
       */
      if (lastSavedSerialized.current === null) {
        serverRevision.current = workout.revision;

        lastServerSnapshot.current = workout;

        lastSavedSerialized.current = serialized;

        setStatus("saved");

        return;
      }

      if (!enabled || serialized === lastSavedSerialized.current) {
        return;
      }

      setStatus("unsaved");

      if (timer.current) {
        clearTimeout(timer.current);
      }

      timer.current = setTimeout(() => {
        timer.current = null;

        void flush().catch(() => {
          /**
           * status is already set to "error"
           * inside performFlush.
           */
        });
      }, delay);

      return () => {
        if (timer.current) {
          clearTimeout(timer.current);

          timer.current = null;
        }
      };
    },
    /* eslint-enable react-hooks/set-state-in-effect */
    [workout, enabled, delay, flush],
  );

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  return {
    status,

    saveNow: flush,

    adoptServerSnapshot,
  };
}
