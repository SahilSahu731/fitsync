import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSession } from "@/src/context/session";
import {
  scheduleRestNotification,
  cancelRestNotification,
  configureWorkoutNotifications,
  requestWorkoutNotificationPermission,
} from "./notifications";
import { loadExercisePicker } from "../exercises/picker-cache";
import { completedWorkout as completeSession } from "./summary";
import { workoutApi, type WorkoutSession, type WorkoutSet, type SetType } from "./api";
import {
  cacheWorkout,
  commitAddedSet,
  draftPending,
  flushWorkoutDraft,
  queueFinish,
  queueNotes,
  queueSet,
  readWorkoutDraft,
  type WorkoutDraft,
} from "./offline";

type RestTimer = { endsAt: number; duration: number; sessionId: string };
type WorkoutContextType = {
  session: WorkoutSession | null;
  loading: boolean;
  busy: boolean;
  addingSetExerciseIds: string[];
  pendingSetIds: string[];
  restTimer: RestTimer | null;
  focusedExerciseId: string | undefined;
  setFocusedExerciseId: (id: string | undefined) => void;
  refresh: () => Promise<void>;
  ensureSynced: () => Promise<void>;
  start: (templateId?: string, programSlotId?: string) => Promise<void>;
  addExercise: (exerciseId: string) => Promise<void>;
  addExercises: (ids: string[]) => Promise<void>;
  removeExercise: (id: string) => Promise<void>;
  reorderExercises: (ids: string[]) => Promise<void>;
  updateExercise: (
    id: string,
    input: { restSeconds?: number; supersetGroup?: string | null },
  ) => Promise<void>;
  addSet: (id: string, type?: SetType) => Promise<void>;
  removeSet: (id: string) => Promise<void>;
  updateSet: (id: string, data: Parameters<typeof workoutApi.updateSet>[2]) => Promise<void>;
  pendingSaves: number;
  syncError: boolean;
  pendingCompletion: boolean;
  dataRevision: number;
  completedWorkout: WorkoutSession | null;
  updateNotes: (notes: string) => Promise<void>;
  finish: () => Promise<void>;
  discard: () => Promise<void>;
  startRest: (seconds: number) => void;
  stopRest: () => void;
};
const Context = createContext<WorkoutContextType | null>(null);
export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  return (
    <WorkoutAccountProvider key={user?.id ?? "signed-out"} ownerId={user?.id ?? ""}>
      {children}
    </WorkoutAccountProvider>
  );
}
function WorkoutAccountProvider({
  children,
  ownerId,
}: {
  children: React.ReactNode;
  ownerId: string;
}) {
  const owner = useRef(ownerId);
  useLayoutEffect(() => {
    owner.current = ownerId;
    return () => {
      owner.current = "";
    };
  }, [ownerId]);
  const mutationRevision = useRef(0);
  const refreshSequence = useRef(0);
  const operationLock = useRef(false);
  const pendingWrites = useRef(new Set<Promise<unknown>>());
  const addingSets = useRef(new Map<string, Promise<void>>());
  const addSequence = useRef(0);
  const [pendingAdds, setPendingAdds] = useState<
    { exerciseId: string; sessionId: string; set: WorkoutSet }[]
  >([]);
  const restWrites = useRef(Promise.resolve());
  const [dataRevision, setDataRevision] = useState(0);
  const [lastCompleted, setLastCompleted] = useState<WorkoutSession | null>(null);
  const [snapshot, setSnapshot] = useState<{ ownerId: string; draft: WorkoutDraft | null }>({
    ownerId: "",
    draft: null,
  });
  const draft = snapshot.ownerId === ownerId ? snapshot.draft : null;
  const activeSession = draft?.finish ? null : (draft?.session ?? null);
  const session = useMemo(
    () =>
      !activeSession || !pendingAdds.length
        ? activeSession
        : {
            ...activeSession,
            workout_session_exercises: activeSession.workout_session_exercises.map((exercise) => {
              const pending = pendingAdds.filter(
                (add) => add.sessionId === activeSession.id && add.exerciseId === exercise.id,
              );
              return pending.length
                ? {
                    ...exercise,
                    workout_logged_sets: [
                      ...exercise.workout_logged_sets,
                      ...pending.map((add) => add.set),
                    ],
                  }
                : exercise;
            }),
          },
    [activeSession, pendingAdds],
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  // Focus is local navigation state. Scope it to the current account/session;
  // it never enters the offline workout draft or a server mutation.
  const [exerciseFocus, setExerciseFocus] = useState<{
    sessionId: string;
    exerciseId: string;
  } | null>(null);
  const focusSession = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    focusSession.current = session?.id;
  }, [session?.id]);
  const focusedExerciseId =
    exerciseFocus &&
    session &&
    exerciseFocus.sessionId === session.id &&
    session.workout_session_exercises.some((exercise) => exercise.id === exerciseFocus.exerciseId)
      ? exerciseFocus.exerciseId
      : undefined;
  const setFocusedExerciseId = useCallback(
    (id: string | undefined) => {
      if (!ownerId || owner.current !== ownerId || focusSession.current !== session?.id) return;
      setExerciseFocus(
        session && id && session.workout_session_exercises.some((exercise) => exercise.id === id)
          ? { sessionId: session.id, exerciseId: id }
          : null,
      );
    },
    [ownerId, session],
  );
  const [syncError, setSyncError] = useState(false);
  const syncing = useRef<{ ownerId: string; operation: Promise<WorkoutDraft | null> } | null>(null);
  const restRevision = useRef(0);
  const [restTimer, setRestTimer] = useState<RestTimer | null>(null);
  const restKey = `fitsync.workout.rest.v2.${ownerId}`;
  const apply = useCallback((id: string, value: WorkoutDraft | null) => {
    if (owner.current === id)
      setSnapshot((previous) =>
        previous.ownerId === id &&
        previous.draft?.session.id === value?.session.id &&
        previous.draft &&
        value &&
        previous.draft.revision > value.revision
          ? previous
          : { ownerId: id, draft: value },
      );
  }, []);
  const resyncRequested = useRef(false);
  const sync = useCallback(() => {
    if (!ownerId) return Promise.resolve(null);
    if (syncing.current?.ownerId === ownerId) {
      resyncRequested.current = true;
      return syncing.current.operation;
    }
    const operation = (async () => {
      let value: WorkoutDraft | null;
      do {
        resyncRequested.current = false;
        value = await flushWorkoutDraft(ownerId, () => owner.current === ownerId, {
          set: (id, set, data) => workoutApi.updateSet(id, set, data, ownerId),
          notes: (id, notes) => workoutApi.updateNotes(id, notes, ownerId),
          finish: async (id, elapsed, notes) => {
            const completed = await workoutApi.finish(id, elapsed, notes, ownerId);
            if (owner.current === ownerId) {
              setLastCompleted(completed);
              setDataRevision((value) => value + 1);
            }
            return completed;
          },
        });
      } while (resyncRequested.current && owner.current === ownerId);
      return value;
    })()
      .then((value) => {
        apply(ownerId, value);
        if (owner.current === ownerId) setSyncError(false);
        return value;
      })
      .catch((error) => {
        if (owner.current === ownerId) setSyncError(true);
        throw error;
      })
      .finally(() => {
        if (syncing.current?.operation === operation) syncing.current = null;
      });
    syncing.current = { ownerId, operation };
    return operation;
  }, [ownerId, apply]);
  const refresh = useCallback(async () => {
    if (!ownerId) {
      setLoading(false);
      return;
    }
    const request = ++refreshSequence.current;
    try {
      const saved = await readWorkoutDraft(ownerId);
      apply(ownerId, saved);
      if (saved && owner.current === ownerId) setLoading(false);
      await sync();
      if (owner.current !== ownerId) return;
      if (operationLock.current || addingSets.current.size) return;
      const before = await readWorkoutDraft(ownerId);
      const revision = mutationRevision.current;
      const remote = await workoutApi.active(ownerId);
      if (
        owner.current !== ownerId ||
        refreshSequence.current !== request ||
        mutationRevision.current !== revision ||
        operationLock.current ||
        addingSets.current.size
      )
        return;
      const next = await cacheWorkout(ownerId, remote, before?.revision ?? 0);
      apply(ownerId, next);
      if (
        owner.current === ownerId &&
        before?.session.id &&
        before.session.id !== next?.session.id
      ) {
        setDataRevision((value) => value + 1);
      }
      setSyncError(false);
    } catch (error) {
      if (owner.current === ownerId) setSyncError(true);
      throw error;
    } finally {
      if (owner.current === ownerId) setLoading(false);
    }
  }, [ownerId, apply, sync]);
  useEffect(() => {
    void Promise.resolve()
      .then(refresh)
      .catch(() => {});
    return () => {
      void cancelRestNotification().catch(() => {});
    };
  }, [refresh]);
  useEffect(() => {
    void configureWorkoutNotifications().catch(console.warn);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh().catch(() => {});
    });
    const retry = setInterval(() => {
      if (AppState.currentState === "active") void sync().catch(() => {});
    }, 15000);
    return () => {
      subscription.remove();
      clearInterval(retry);
    };
  }, [refresh, sync]);
  useEffect(() => {
    if (session?.id) void loadExercisePicker().catch(() => {});
  }, [session?.id]);
  useEffect(() => {
    if (!session?.id) return;
    const revision = restRevision.current;
    let active = true;
    void AsyncStorage.getItem(restKey)
      .then((value) => {
        if (!active || !value || owner.current !== ownerId || revision !== restRevision.current)
          return;
        const saved = JSON.parse(value) as RestTimer;
        if (saved.sessionId === session.id && saved.endsAt > Date.now()) {
          setRestTimer(saved);
          void scheduleRestNotification(Math.ceil((saved.endsAt - Date.now()) / 1000)).catch(
            console.warn,
          );
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [ownerId, restKey, session?.id]);
  async function requireSynced() {
    await Promise.all([...pendingWrites.current]);
    const value = await sync();
    if (draftPending(value))
      throw new Error("Your saved updates need to sync before changing the workout structure.");
    if (owner.current !== ownerId) throw new Error("Account changed.");
  }
  async function run(operation: () => Promise<WorkoutSession | null>) {
    if (!ownerId) throw new Error("Sign in to train.");
    if (operationLock.current) throw new Error("A workout change is already in progress.");
    operationLock.current = true;
    mutationRevision.current++;
    setBusy(true);
    try {
      await requireSynced();
      const next = await operation();
      mutationRevision.current++;
      if (owner.current === ownerId) apply(ownerId, await cacheWorkout(ownerId, next));
    } finally {
      operationLock.current = false;
      if (owner.current === ownerId) setBusy(false);
    }
  }
  const start = (templateId?: string, programSlotId?: string) =>
    run(() => workoutApi.start(templateId, programSlotId, ownerId));
  const addExercise = async (id: string) => {
    if (session) await run(() => workoutApi.addExercise(session.id, id));
  };
  const addExercises = async (ids: string[]) => {
    if (!session) throw new Error("No active workout.");
    await run(() => workoutApi.addExercises(session.id, ids));
  };
  const updateExercise = async (
    id: string,
    input: { restSeconds?: number; supersetGroup?: string | null },
  ) => {
    if (!session) throw new Error("No active workout.");
    await run(() => workoutApi.updateExercise(session.id, id, input, ownerId));
  };
  const addSet = async (id: string, type: SetType = "normal") => {
    if (!ownerId || !activeSession) throw new Error("No active workout.");
    if (operationLock.current) throw new Error("A workout change is already in progress.");
    const existing = addingSets.current.get(id);
    if (existing) return existing;
    const exercise = activeSession.workout_session_exercises.find((item) => item.id === id);
    if (!exercise) throw new Error("Exercise no longer exists.");
    const previous = [...exercise.workout_logged_sets].sort((a, b) => b.position - a.position)[0];
    const preview: WorkoutSet = {
      id: `pending-set-${++addSequence.current}`,
      position: (previous?.position ?? -1) + 1,
      set_type: type,
      weight_kg: previous?.weight_kg ?? null,
      reps: previous?.reps ?? null,
      duration_seconds: previous?.duration_seconds ?? null,
      distance_meters: previous?.distance_meters ?? null,
      rpe: null,
      rir: null,
      completed_at: null,
      notes: "",
    };
    mutationRevision.current++;
    setPendingAdds((rows) => [
      ...rows,
      { exerciseId: id, sessionId: activeSession.id, set: preview },
    ]);
    const knownIds = new Set(exercise.workout_logged_sets.map((set) => set.id));
    const operation = Promise.resolve()
      .then(async () => {
        if (owner.current !== ownerId) throw new Error("Account changed.");
        const response = await workoutApi.addSet(activeSession.id, id, type, ownerId);
        if (owner.current !== ownerId) throw new Error("Account changed.");
        // Older servers still return the complete session; accept both response shapes.
        const created =
          "workout_session_exercises" in response
            ? response.workout_session_exercises
                .find((item) => item.id === id)
                ?.workout_logged_sets.filter((set) => !knownIds.has(set.id))
                .sort((a, b) => b.position - a.position)[0]
            : response;
        if (!created) throw new Error("The new set could not be confirmed. Refresh your workout.");
        const next = await commitAddedSet(ownerId, activeSession.id, id, created, preview);
        mutationRevision.current++;
        apply(ownerId, next);
        void sync().catch(() => {});
      })
      .finally(() => {
        addingSets.current.delete(id);
        pendingWrites.current.delete(operation);
        if (owner.current === ownerId)
          setPendingAdds((rows) => rows.filter((row) => row.set.id !== preview.id));
      });
    addingSets.current.set(id, operation);
    pendingWrites.current.add(operation);
    return operation;
  };
  const removeSet = async (id: string) => {
    if (session) await run(() => workoutApi.removeSet(session.id, id, ownerId));
  };
  const removeExercise = async (id: string) => {
    if (session) await run(() => workoutApi.removeExercise(session.id, id));
  };
  const reorderExercises = async (ids: string[]) => {
    if (session) await run(() => workoutApi.reorderExercises(session.id, ids));
  };
  async function updateSet(id: string, data: Parameters<typeof workoutApi.updateSet>[2]) {
    if (!ownerId || !session) throw new Error("No active workout.");
    if (operationLock.current) throw new Error("Wait for the current workout change to finish.");
    mutationRevision.current++;
    const write = queueSet(ownerId, id, data, session.id);
    pendingWrites.current.add(write);
    try {
      apply(ownerId, await write);
      void sync().catch(() => {});
    } finally {
      pendingWrites.current.delete(write);
    }
  }
  async function updateNotes(notes: string) {
    if (!ownerId || !session) throw new Error("No active workout.");
    if (operationLock.current) throw new Error("Wait for the current workout change to finish.");
    mutationRevision.current++;
    const write = queueNotes(ownerId, notes, session.id);
    pendingWrites.current.add(write);
    try {
      apply(ownerId, await write);
      void sync().catch(() => {});
    } finally {
      pendingWrites.current.delete(write);
    }
  }
  const stopRest = () => {
    restRevision.current++;
    void cancelRestNotification().catch(console.warn);
    setRestTimer(null);
    restWrites.current = restWrites.current
      .catch(() => {})
      .then(() => AsyncStorage.removeItem(restKey));
    void restWrites.current.catch(console.warn);
  };
  const startRest = (seconds: number) => {
    if (!ownerId || !session || !Number.isFinite(seconds) || seconds <= 0) return;
    const revision = ++restRevision.current;
    const value = { endsAt: Date.now() + seconds * 1000, duration: seconds, sessionId: session.id };
    setRestTimer(value);
    restWrites.current = restWrites.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(restKey, JSON.stringify(value)));
    void restWrites.current.catch(console.warn);
    void (async () => {
      await requestWorkoutNotificationPermission().catch(console.warn);
      if (revision !== restRevision.current || owner.current !== ownerId) return;
      const remaining = Math.ceil((value.endsAt - Date.now()) / 1000);
      if (remaining > 0) await scheduleRestNotification(remaining);
    })().catch(console.warn);
  };
  async function finish() {
    if (!session || !ownerId) throw new Error("No active workout.");
    if (operationLock.current) throw new Error("A workout change is already in progress.");
    operationLock.current = true;
    setBusy(true);
    try {
      await Promise.all([...pendingWrites.current]);
      const latest = await readWorkoutDraft(ownerId);
      if (!latest || latest.session.id !== session.id)
        throw new Error("This workout changed. Reopen it before finishing.");
      if (
        !latest.session.workout_session_exercises.some((e) =>
          e.workout_logged_sets.some((s) => s.completed_at),
        )
      )
        throw new Error("Complete at least one set before finishing.");
      const elapsed = Math.max(0, Math.floor((Date.now() - Date.parse(session.started_at)) / 1000));
      mutationRevision.current++;
      apply(ownerId, await queueFinish(ownerId, elapsed, session.id));
      stopRest();
      void sync().catch(() => {});
    } finally {
      operationLock.current = false;
      if (owner.current === ownerId) setBusy(false);
    }
  }
  async function discard() {
    if (session)
      await run(async () => {
        await workoutApi.discard(session.id);
        stopRest();
        return null;
      });
  }
  return (
    <Context.Provider
      value={{
        session,
        loading,
        busy,
        addingSetExerciseIds: pendingAdds.map((add) => add.exerciseId),
        pendingSetIds: pendingAdds.map((add) => add.set.id),
        restTimer,
        focusedExerciseId,
        setFocusedExerciseId,
        refresh,
        ensureSynced: requireSynced,
        start,
        addExercise,
        addExercises,
        removeExercise,
        reorderExercises,
        updateExercise,
        addSet,
        removeSet,
        updateSet,
        dataRevision,
        completedWorkout: draft?.finish
          ? completeSession(draft.session, draft.finish.elapsedSeconds)
          : lastCompleted,
        pendingSaves: draftPending(draft) + pendingAdds.length,
        syncError,
        pendingCompletion: !!draft?.finish,
        updateNotes,
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
  const value = useContext(Context);
  if (!value) throw new Error("WorkoutProvider is missing.");
  return value;
}
