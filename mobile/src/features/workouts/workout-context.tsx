import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  scheduleRestNotification,
  cancelRestNotification,
  configureWorkoutNotifications,
  requestWorkoutNotificationPermission,
} from "./notifications";

import { AppState } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { optimisticSet, replaceSet } from "./set-state";
import { loadExercisePicker } from "../exercises/picker-cache";
import { workoutApi, type WorkoutSession, type SetType } from "./api";

type RestTimer = {
  endsAt: number;
  duration: number;
};

type WorkoutContextType = {
  session: WorkoutSession | null;
  loading: boolean;
  busy: boolean;
  restTimer: RestTimer | null;

  refresh: () => Promise<void>;
  start: (templateId?: string) => Promise<void>;
  addExercise: (exerciseId: string) => Promise<void>;
  addExercises: (exerciseIds: string[]) => Promise<void>;
  removeExercise: (exerciseItemId: string) => Promise<void>;
  reorderExercises: (exerciseItemIds: string[]) => Promise<void>;
  addSet: (exerciseItemId: string, type?: SetType) => Promise<void>;
  updateSet: (
    setId: string,
    data: Parameters<typeof workoutApi.updateSet>[2],
  ) => Promise<void>;
  pendingSaves: number;
  syncError: boolean;
  updateNotes: (notes: string) => Promise<void>;
  finish: () => Promise<void>;
  discard: () => Promise<void>;
  startRest: (seconds: number) => void;
  stopRest: () => void;
};

const Context = createContext<WorkoutContextType | null>(null);

const REST_KEY = "fitsync.workout.rest.v1";

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<WorkoutSession | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingSaves, setPendingSaves] = useState(0);
  const pending = useRef(new Map<string, Promise<void>>());
  const failedWrites = useRef(new Set<string>());
  const [syncError, setSyncError] = useState(false);

  // Warm the small search index while the user is training, before opening Add.
  const activeSessionId = session?.id;
  useEffect(() => {
    if (activeSessionId) void loadExercisePicker().catch(() => {});
  }, [activeSessionId]);


  const [restTimer, setRestTimer] = useState<RestTimer | null>(null);

  useEffect(() => {
    void configureWorkoutNotifications().catch(console.warn);
  }, []);

  const restRevision = useRef(0);

  const refresh = useCallback(async () => {
    try {
      await Promise.allSettled([...pending.current.values()]);
      const result = await workoutApi.active();
      if (pending.current.size) return;
      setSession(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh().catch(console.warn);

    void AsyncStorage.getItem(REST_KEY).then((value) => {
      if (!value) return;

      try {
        const saved = JSON.parse(value) as RestTimer;

        if (saved.endsAt > Date.now()) {
          setRestTimer(saved);
        } else {
          void AsyncStorage.removeItem(REST_KEY);
        }
      } catch {
        void AsyncStorage.removeItem(REST_KEY);
      }
    });

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refresh().catch(console.warn);
      }
    });

    return () => subscription.remove();
  }, [refresh]);

  const run = useCallback(
    async (operation: () => Promise<WorkoutSession | null>) => {
      setBusy(true);

      try {
        await Promise.all([...pending.current.values()]);
        const result = await operation();
        setSession(result);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const start = async (templateId?: string) => {
    await run(() => workoutApi.start(templateId));
    failedWrites.current.clear();
    setSyncError(false);
  };

  const addExercise = async (exerciseId: string) => {
    if (!session) return;

    await run(() => workoutApi.addExercise(session.id, exerciseId));
  };

  const addExercises = async (exerciseIds: string[]) => {
    if (!session) throw new Error("No active workout.");
    await run(() => workoutApi.addExercises(session.id, exerciseIds));
  };

  const addSet = async (exerciseItemId: string, type: SetType = "normal") => {
    if (!session) return;

    await run(() => workoutApi.addSet(session.id, exerciseItemId, type));
  };

  const removeExercise = async (exerciseItemId: string) => {
    if (!session) throw new Error("No active workout.");
    const setIds = session.workout_session_exercises.find(item => item.id === exerciseItemId)?.workout_logged_sets.map(set => set.id) ?? [];
    await run(() => workoutApi.removeExercise(session.id, exerciseItemId));
    setIds.forEach(id => failedWrites.current.delete(id));
    setSyncError(failedWrites.current.size > 0);
  };

  const reorderExercises = async (exerciseItemIds: string[]) => {
    if (!session) throw new Error("No active workout.");
    try { await run(() => workoutApi.reorderExercises(session.id, exerciseItemIds)); }
    catch (error) {
      // Re-read actual positions after a rejected/stale order or a network error.
      await refresh().catch(() => {});
      throw error;
    }
  };

  const updateSet = async (setId: string, data: Parameters<typeof workoutApi.updateSet>[2]) => {
    if (!session) throw new Error("No active workout.");
    const sessionId = session.id;
    const previous = session.workout_session_exercises.flatMap(e => e.workout_logged_sets).find(row => row.id === setId);
    if (!previous) throw new Error("Set no longer exists.");
    setSession(current => current?.id === sessionId ? replaceSet(current, setId, optimisticSet(previous, data)) : current);
    setPendingSaves(value => value + 1);
    const operation = (pending.current.get(setId) ?? Promise.resolve()).catch(() => {}).then(async () => {
      try {
        const saved = await workoutApi.updateSet(sessionId, setId, data);
        if (pending.current.get(setId) === operation) {
          failedWrites.current.delete(setId);
          setSyncError(failedWrites.current.size > 0);
          setSession(current => current?.id === sessionId ? replaceSet(current, setId, saved) : current);
        }
      } catch (error) {
        if (pending.current.get(setId) === operation) {
          failedWrites.current.add(setId);
          setSyncError(true);
          setSession(current => current?.id === sessionId ? replaceSet(current, setId, previous) : current);
        }
        throw error;
      }
    });
    pending.current.set(setId, operation);
    try { await operation; } finally {
      if (pending.current.get(setId) === operation) pending.current.delete(setId);
      setPendingSaves(value => value - 1);
    }
  };

  const updateNotes = async (notes: string) => {
    if (!session) return;
    const sessionId = session.id;
    const operation = workoutApi.updateNotes(sessionId, notes).then(() => {
      setSession(current => current?.id === sessionId ? { ...current, notes } : current);
    });
    pending.current.set("notes", operation);
    setPendingSaves(value => value + 1);
    try { await operation; } finally {
      if (pending.current.get("notes") === operation) pending.current.delete("notes");
      setPendingSaves(value => value - 1);
    }
  };

  const startRest = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const revision = ++restRevision.current;
    void (async () => {
      await requestWorkoutNotificationPermission().catch(console.warn);
      if (revision !== restRevision.current) return;
      const timer = {
        endsAt: Date.now() + seconds * 1000,
        duration: seconds,
      };
      setRestTimer(timer);
      void scheduleRestNotification(seconds).catch(console.warn);
      await AsyncStorage.setItem(REST_KEY, JSON.stringify(timer));
    })().catch(console.warn);
  };

  const stopRest = () => {
    restRevision.current += 1;
    void cancelRestNotification().catch(console.warn);
    setRestTimer(null);
    void AsyncStorage.removeItem(REST_KEY);
  };

  const finish = async () => {
    if (!session) return;
    await Promise.all([...pending.current.values()]);
    if (failedWrites.current.size) throw new Error("Some sets were not saved. Retry their updates before finishing.");

    const elapsed = Math.floor(
      (Date.now() - new Date(session.started_at).getTime()) / 1000,
    );

    await run(async () => {
      await workoutApi.finish(session.id, elapsed, session.notes);
      return null;
    });

    stopRest();
  };

  const discard = async () => {
    if (!session) return;

    await run(async () => {
      await workoutApi.discard(session.id);
      return null;
    });

    stopRest();
  };

  return (
    <Context.Provider
      value={{
        session,
        loading,
        busy,
        pendingSaves,
        syncError,
        updateNotes,
        restTimer,
        refresh,
        start,
        addExercise,
        addExercises,
        removeExercise,
        reorderExercises,
        addSet,
        updateSet,
        finish,
        discard,
        startRest,
        stopRest,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useWorkout() {
  const context = useContext(Context);

  if (!context) {
    throw new Error("WorkoutProvider is missing.");
  }

  return context;
}
