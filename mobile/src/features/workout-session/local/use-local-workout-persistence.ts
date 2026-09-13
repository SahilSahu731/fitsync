import { useCallback, useEffect, useRef, useState } from "react";

import type { WorkoutSession } from "@/features/workouts/types";

import type { LocalWorkoutWriter } from "./local-workout-writer";

export type LocalSaveState = "saved" | "unsaved" | "saving" | "error";

interface Props {
  localId: string | null;

  userId: string | null;

  workout: WorkoutSession | null;

  writer: LocalWorkoutWriter | null;

  onSaved?: () => void;
}

function serializeWorkout(workout: WorkoutSession): string {
  return JSON.stringify(workout);
}

export function useLocalWorkoutPersistence({
  localId,
  userId,
  workout,
  writer,
  onSaved,
}: Props) {
  const [status, setStatus] = useState<LocalSaveState>("saved");

  const latestWorkout = useRef<WorkoutSession | null>(workout);

  const lastSaved = useRef<string | null>(
    workout ? serializeWorkout(workout) : null,
  );

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSavedRef = useRef(onSaved);

  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  const saveNow = useCallback(async () => {
    if (!writer || !localId || !userId) {
      return;
    }

    if (timer.current) {
      clearTimeout(timer.current);

      timer.current = null;
    }

    const current = latestWorkout.current;

    if (!current) {
      return;
    }

    const serialized = serializeWorkout(current);

    if (serialized === lastSaved.current) {
      setStatus("saved");

      return;
    }

    try {
      setStatus("saving");

      writer.queue(localId, userId, current);

      await writer.flush(localId);

      lastSaved.current = serialized;

      setStatus("saved");

      onSavedRef.current?.();
    } catch (error) {
      setStatus("error");

      throw error;
    }
  }, [writer, localId, userId]);

  useEffect(() => {
    latestWorkout.current = workout;

    if (!workout || !writer || !localId || !userId) {
      return;
    }

    const serialized = serializeWorkout(workout);

    if (lastSaved.current === null) {
      lastSaved.current = serialized;

      return;
    }

    if (serialized === lastSaved.current) {
      return;
    }

    setStatus("unsaved");

    writer.queue(localId, userId, workout);

    if (timer.current) {
      clearTimeout(timer.current);
    }

    timer.current = setTimeout(() => {
      timer.current = null;

      void saveNow().catch(() => {
        // state is already error
      });
    }, 100);

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);

        timer.current = null;
      }
    };
  }, [workout, writer, localId, userId, saveNow]);

  return {
    status,

    saveNow,
  };
}
