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
  addSet: (exerciseItemId: string, type?: SetType) => Promise<void>;
  updateSet: (
    setId: string,
    data: Parameters<typeof workoutApi.updateSet>[2],
  ) => Promise<void>;
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

  const [restTimer, setRestTimer] = useState<RestTimer | null>(null);

  useEffect(() => {
    void configureWorkoutNotifications().catch(console.warn);
  }, []);

  const restRevision = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const result = await workoutApi.active();
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
  };

  const addExercise = async (exerciseId: string) => {
    if (!session) return;

    await run(() => workoutApi.addExercise(session.id, exerciseId));
  };

  const addSet = async (exerciseItemId: string, type: SetType = "normal") => {
    if (!session) return;

    await run(() => workoutApi.addSet(session.id, exerciseItemId, type));
  };

  const updateSet = async (
    setId: string,
    data: Parameters<typeof workoutApi.updateSet>[2],
  ) => {
    if (!session) return;

    await run(() => workoutApi.updateSet(session.id, setId, data));
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

    const elapsed = Math.floor(
      (Date.now() - new Date(session.started_at).getTime()) / 1000,
    );

    await run(async () => {
      await workoutApi.finish(session.id, elapsed);
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
        restTimer,
        refresh,
        start,
        addExercise,
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
