import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSession } from "@/src/context/session";
import {
  readJournal,
  saveMetric,
  saveGoalsEvent,
  syncJournal,
  syncWorkouts,
  subscribeJournal,
} from "./journal";
import {
  currentGoals,
  hasSavedGoals,
  emptyJournal,
  type Goals,
  type Metric,
  type Journal,
  validMetric,
} from "./model";

export function useProgress() {
  const { user, profile } = useSession();
  const ownerId = user?.id ?? "";
  const ownerRef = useRef(ownerId);
  useEffect(() => {
    ownerRef.current = ownerId;
    return () => {
      ownerRef.current = "";
    };
  }, [ownerId]);
  const [cache, setCache] = useState({ ownerId: "", journal: emptyJournal() });
  const journal = cache.ownerId === ownerId ? cache.journal : emptyJournal();
  useEffect(
    () =>
      subscribeJournal((id, value) => {
        if (id === ownerId && ownerRef.current === ownerId) setCache({ ownerId, journal: value });
      }),
    [ownerId],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [workoutError, setWorkoutError] = useState("");
  const [storageError, setStorageError] = useState("");
  const syncing = useRef<{ ownerId: string; operation: Promise<void> } | null>(null);
  const load = useCallback(async () => {
    if (!ownerId) return;
    // A new account never waits for an old account's request.
    const current = () => ownerRef.current === ownerId;
    setRefreshing(true);
    try {
      const saved = await readJournal(ownerId);
      if (!current()) return;
      setCache({ ownerId, journal: saved });
      setStorageError("");
    } catch (error) {
      if (current()) {
        setStorageError(error instanceof Error ? error.message : "Unable to read local storage.");
        setLoading(false);
        setRefreshing(false);
      }
      return;
    }
    if (current()) setLoading(false);
    await Promise.allSettled([
      syncJournal(ownerId, current)
        .then((value) => {
          if (current()) {
            setCache({ ownerId, journal: value });
            setSyncError("");
          }
        })
        .catch((error) => {
          if (current())
            setSyncError(error instanceof Error ? error.message : "Cloud sync unavailable.");
        }),
      syncWorkouts(ownerId, current)
        .then((value) => {
          if (current()) {
            setCache({ ownerId, journal: value });
            setWorkoutError("");
          }
        })
        .catch((error) => {
          if (current())
            setWorkoutError(
              error instanceof Error ? error.message : "Workout history unavailable.",
            );
        }),
    ]);
    if (current()) {
      const saved = await readJournal(ownerId);
      setCache({ ownerId, journal: saved });
      setRefreshing(false);
    }
  }, [ownerId]);
  const refresh = useCallback(() => {
    if (syncing.current?.ownerId === ownerId) return syncing.current.operation;
    const request = load()
      .catch((error) => {
        if (ownerRef.current === ownerId) {
          setStorageError(error instanceof Error ? error.message : "Could not load progress.");
          setRefreshing(false);
        }
      })
      .finally(() => {
        if (syncing.current?.operation === request) syncing.current = null;
      });
    syncing.current = { ownerId, operation: request };
    return request;
  }, [load, ownerId]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  async function commit(write: () => Promise<Journal>) {
    if (loading) throw new Error("Your journal is still opening. Try again in a moment.");
    if (!ownerId || storageError) throw new Error(storageError || "Sign in to log progress.");
    const saved = await write();
    if (ownerRef.current === ownerId) setCache({ ownerId, journal: saved });
    // A metric changes the event journal, not workout history. Coalesce with other
    // screens and request a trailing upload if another sync was already running.
    void syncJournal(ownerId, () => ownerRef.current === ownerId, true)
      .then(() => {
        if (ownerRef.current === ownerId) setSyncError("");
      })
      .catch((error) => {
        if (ownerRef.current === ownerId)
          setSyncError(error instanceof Error ? error.message : "Cloud sync unavailable.");
      });
  }

  const goals = useMemo(
    () => currentGoals(journal.events, profile?.trainingDays ?? 3),
    [journal.events, profile?.trainingDays],
  );
  const hasGoals = useMemo(() => hasSavedGoals(journal.events), [journal.events]);

  return {
    journal,
    goals,
    hasGoals,
    loading: loading || (cache.ownerId !== ownerId && !storageError),
    refreshing,
    syncError,
    workoutError,
    storageError,
    refresh,
    log: async (
      metric: Metric,
      date: string,
      value: number | null,
      notes: string,
      source: "manual" | "pedometer" = "manual",
    ) => {
      if (!validMetric(metric, value)) throw new Error("Enter a value within the allowed range.");
      await commit(() => saveMetric(ownerId, metric, date, value, notes, source));
    },
    increment: async (
      metric: Metric,
      date: string,
      value: number,
      notes: string,
      source: "manual" | "pedometer" = "manual",
    ) => {
      await commit(() => saveMetric(ownerId, metric, date, value, notes, source, true));
    },
    saveGoals: async (goals: Goals) => {
      await commit(() => saveGoalsEvent(ownerId, goals));
    },
  };
}
