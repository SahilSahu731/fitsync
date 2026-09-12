import { useEffect, useRef, useState } from "react";

import { updateWorkoutSession } from "./api";

import { sessionToUpdateInput } from "./utils";

import type { WorkoutSession } from "./types";

export type SaveState = "saved" | "saving" | "unsaved" | "error";

interface Props {
  workout: WorkoutSession | null;

  enabled?: boolean;

  delay?: number;

  onSaved?: (workout: WorkoutSession) => void;
}

export function useWorkoutAutosave({
  workout,
  enabled = true,
  delay = 900,
  onSaved,
}: Props) {
  const [status, setStatus] = useState<SaveState>("saved");

  const lastSaved = useRef<string | null>(null);

  const running = useRef(false);

  const queued = useRef(false);

  useEffect(
    () => {
      if (!workout || !enabled) {
        return;
      }

      const serialized = JSON.stringify(sessionToUpdateInput(workout));

      if (lastSaved.current === null) {
        lastSaved.current = serialized;

        return;
      }

      if (serialized === lastSaved.current) {
        return;
      }

      setStatus("unsaved");

      const timeout = setTimeout(() => {
        void save(workout, serialized);
      }, delay);

      return () => clearTimeout(timeout);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workout, enabled, delay],
  );

  async function save(
    current: WorkoutSession,

    serialized = JSON.stringify(sessionToUpdateInput(current)),
  ) {
    if (running.current) {
      queued.current = true;

      return;
    }

    running.current = true;

    setStatus("saving");

    try {
      const saved = await updateWorkoutSession(
        current.id,
        sessionToUpdateInput(current),
      );

      lastSaved.current = serialized;

      setStatus("saved");

      onSaved?.(saved);
    } catch {
      setStatus("error");
    } finally {
      running.current = false;

      if (queued.current) {
        queued.current = false;
      }
    }
  }

  return {
    status,

    saveNow: async () => {
      if (!workout) {
        return;
      }

      await save(workout);
    },
  };
}
