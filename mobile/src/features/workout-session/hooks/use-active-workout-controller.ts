import * as Haptics from "expo-haptics";

import { router } from "expo-router";

import { useEffect, useMemo, useState } from "react";

import { useSQLiteContext } from "expo-sqlite";

import { useAuthStore } from "@/features/auth/store";

import type { Exercise } from "@/features/exercises/types";

import type {
  WorkoutExercise,
  WorkoutSession,
} from "@/features/workouts/types";

import {
  findActiveWorkoutPosition,
  nextExerciseAfter,
} from "../domain/active-set";

import {
  formatVolume,
  formatWorkoutClock,
  workoutVolume,
} from "../domain/calculations";

import { replaceWorkoutExercise as buildReplacement } from "../domain/replacement";

import {
  createWorkoutSuperset,
  moveWorkoutExercise,
  removeWorkoutExercise,
  removeWorkoutSuperset,
  replaceWorkoutExercise,
} from "../store/workout-draft-store";

import { buildWorkoutExercise } from "../local/workout-exercise-builder";

import {
  completeLocalWorkout,
  deleteLocalWorkout,
  getLocalWorkoutByAnyId,
  cancelLocalWorkout,
} from "../local/local-workout-repository";

import { useLocalWorkoutWriter } from "../local/use-local-workout-writer";

import { useLocalWorkoutPersistence } from "../local/use-local-workout-persistence";

import { requestWorkoutSync } from "@/features/sync/sync-manager";

import { useNetworkStatus } from "@/features/sync/use-network-status";

import {
  clearRestRuntime,
  getRestRuntime,
  saveRestRuntime,
  type RestRuntime,
} from "../rest/rest-runtime-repository";

import { createRestEndsAt } from "../rest/rest-time";

import { useResolvedPreviousPerformance } from "./use-resolved-previous-performance";

export function useActiveWorkoutController(sessionId: string) {
  const database = useSQLiteContext();

  const user = useAuthStore((state) => state.user);

  const online = useNetworkStatus();

  const writer = useLocalWorkoutWriter();

  const [localId, setLocalId] = useState<string | null>(null);

  const [draft, setDraft] = useState<WorkoutSession | null>(null);

  const [syncStatus, setSyncStatus] = useState<
    "LOCAL_ONLY" | "DIRTY" | "SYNCING" | "SYNCED" | "CONFLICT" | "ERROR" | null
  >(null);

  const [loading, setLoading] = useState(true);

  const [selectedExpandedId, setExpandedId] = useState<
    string | null | undefined
  >(undefined);

  const [pickerOpen, setPickerOpen] = useState(false);

  const [optionsIndex, setOptionsIndex] = useState<number | null>(null);

  const [replacementIndex, setReplacementIndex] = useState<number | null>(null);

  const [rest, setRest] = useState<RestRuntime | null>(null);

  const [elapsed, setElapsed] = useState(0);

  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  /*
   * -------------------------------------------------
   * INITIAL LOCAL LOAD
   * -------------------------------------------------
   */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user?.id || !sessionId) {
        setLoading(false);

        return;
      }

      setLoading(true);

      try {
        const record = await getLocalWorkoutByAnyId(database, {
          workoutId: sessionId,

          userId: user.id,
        });

        if (cancelled) {
          return;
        }

        if (!record) {
          setError("Workout could not be found on this device.");

          return;
        }

        setLocalId(record.localId);

        setDraft(record.workout);

        setSyncStatus(record.syncStatus);

        const runtime = await getRestRuntime(database, record.localId);

        if (!cancelled) {
          setRest(runtime);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load workout.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [database, user?.id, sessionId]);

  /*
   * -------------------------------------------------
   * DURATION
   * -------------------------------------------------
   */
  useEffect(() => {
    if (!draft?.started_at) {
      return;
    }

    const started = new Date(draft.started_at).getTime();

    const tick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    };

    tick();

    const interval = setInterval(tick, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [draft?.started_at]);

  /*
   * -------------------------------------------------
   * LOCAL PERSISTENCE
   * -------------------------------------------------
   */
  const localPersistence = useLocalWorkoutPersistence({
    localId,

    userId: user?.id ?? null,

    workout: draft,

    writer,

    onSaved: () => {
      setSyncStatus((current) => (current === "CONFLICT" ? current : "DIRTY"));

      if (user?.id) {
        requestWorkoutSync(database, user.id);
      }
    },
  });

  /*
   * Flush local data when leaving this controller.
   */
  useEffect(() => {
    return () => {
      if (localId) {
        void writer.flush(localId);
      }
    };
  }, [writer, localId]);

  /*
   * -------------------------------------------------
   * PREVIOUS PERFORMANCE
   * -------------------------------------------------
   */
  const exerciseIds = useMemo(
    () => draft?.exercises.map((exercise) => exercise.exercise_id) ?? [],
    [draft?.exercises],
  );

  const previousMap = useResolvedPreviousPerformance(exerciseIds);

  const initialPosition = draft ? findActiveWorkoutPosition(draft) : null;

  const initialExpandedId =
    initialPosition?.exerciseId ?? draft?.exercises[0]?.id ?? null;

  const expandedId =
    selectedExpandedId === undefined ? initialExpandedId : selectedExpandedId;

  const completedSets = useMemo(
    () =>
      draft?.exercises.reduce(
        (total, exercise) =>
          total + exercise.sets.filter((set) => set.completed).length,
        0,
      ) ?? 0,
    [draft],
  );

  const totalSets = useMemo(
    () =>
      draft?.exercises.reduce(
        (total, exercise) => total + exercise.sets.length,
        0,
      ) ?? 0,
    [draft],
  );

  const incompleteSets = useMemo(
    () =>
      draft?.exercises.reduce(
        (total, exercise) =>
          total + exercise.sets.filter((set) => !set.completed).length,
        0,
      ) ?? 0,
    [draft],
  );

  const incompleteSetsWithData = useMemo(
    () =>
      draft?.exercises.reduce(
        (total, exercise) =>
          total +
          exercise.sets.filter(
            (set) =>
              !set.completed &&
              (set.weight !== null ||
                set.reps !== null ||
                set.duration_seconds !== null ||
                set.distance_meters !== null),
          ).length,
        0,
      ) ?? 0,
    [draft],
  );

  const volume = useMemo(
    () => (draft ? workoutVolume(draft, user?.weight_unit ?? "KG") : 0),
    [draft, user?.weight_unit],
  );

  const activeOptionsExercise =
    optionsIndex !== null ? (draft?.exercises[optionsIndex] ?? null) : null;

  function replaceDraft(next: WorkoutSession) {
    /*
     * Recalculate derived response-style counts
     * because the local device has no server serializer.
     */
    const completed = next.exercises.reduce(
      (total, exercise) =>
        total + exercise.sets.filter((set) => set.completed).length,
      0,
    );

    const total = next.exercises.reduce(
      (count, exercise) => count + exercise.sets.length,
      0,
    );

    setDraft({
      ...next,

      completed_set_count: completed,

      total_set_count: total,
    });
  }

  function updateDraft(patch: Partial<Pick<WorkoutSession, "name" | "notes">>) {
    if (!draft) {
      return;
    }

    replaceDraft({
      ...draft,
      ...patch,
    });
  }

  function updateExercise(updated: WorkoutExercise) {
    if (!draft) {
      return;
    }

    replaceDraft(replaceWorkoutExercise(draft, updated));
  }

  function setExerciseRestSeconds(index: number, seconds: number) {
    if (!draft) {
      return;
    }

    const exercise = draft.exercises[index];

    if (!exercise) {
      return;
    }

    updateExercise({
      ...exercise,

      rest_seconds: seconds,
    });
  }

  function replaceExerciseAtIndex(index: number, replacement: Exercise) {
    if (!draft) {
      return;
    }

    const current = draft.exercises[index];

    if (!current) {
      return;
    }

    const replaced = buildReplacement(current, replacement);

    const next = {
      ...draft,

      exercises: draft.exercises.map((exercise, position) =>
        position === index ? replaced : exercise,
      ),
    };

    replaceDraft(next);

    setExpandedId(replaced.id);

    setReplacementIndex(null);
  }

  function moveExercise(
    index: number,

    direction: -1 | 1,
  ) {
    if (!draft) {
      return;
    }

    replaceDraft(moveWorkoutExercise(draft, index, direction));
  }

  function removeExercise(index: number) {
    if (!draft) {
      return;
    }

    const removing = draft.exercises[index];

    if (!removing) {
      return;
    }

    const next = removeWorkoutExercise(draft, index);

    if (expandedId === removing.id) {
      setExpandedId(
        next.exercises[index]?.id ?? next.exercises[index - 1]?.id ?? null,
      );
    }

    replaceDraft(next);
  }

  function createSuperset(index: number) {
    if (!draft) {
      return;
    }

    replaceDraft(createWorkoutSuperset(draft, index));
  }

  function removeSuperset(groupId: string) {
    if (!draft) {
      return;
    }

    replaceDraft(removeWorkoutSuperset(draft, groupId));
  }

  /*
   * -------------------------------------------------
   * OFFLINE ADD EXERCISE
   * -------------------------------------------------
   */
  async function addExercises(exercises: Exercise[]) {
    if (!draft || !user || exercises.length === 0) {
      return;
    }

    const existing = new Set(
      draft.exercises.map((exercise) => exercise.exercise_id),
    );

    const added = exercises
      .filter((exercise) => !existing.has(exercise.id))
      .map((exercise, index) =>
        buildWorkoutExercise(
          exercise,
          draft.exercises.length + index,
          user.weight_unit,
        ),
      );

    if (added.length === 0) {
      return;
    }

    const next = {
      ...draft,

      exercises: [...draft.exercises, ...added],
    };

    replaceDraft(next);

    setExpandedId(added[0]?.id ?? null);

    void Haptics.selectionAsync();
  }

  /*
   * -------------------------------------------------
   * REST TIMER
   * -------------------------------------------------
   */
  async function startRest(
    seconds: number,

    exerciseId: string,

    exerciseName: string,
  ) {
    if (!localId) {
      return;
    }

    const runtime: RestRuntime = {
      workoutLocalId: localId,

      restEndsAt: createRestEndsAt(seconds),

      exerciseId,

      exerciseName,

      notificationId: null,
    };

    await saveRestRuntime(database, runtime);

    setRest(runtime);
  }

  async function updateRestEndsAt(restEndsAt: string) {
    if (!rest || !localId) {
      return;
    }

    const next = {
      ...rest,

      restEndsAt,
    };

    await saveRestRuntime(database, next);

    setRest(next);
  }

  async function stopRest() {
    if (!localId) {
      return;
    }

    await clearRestRuntime(database, localId);

    setRest(null);
  }

  function completeSet(
    original: WorkoutExercise,

    updated: WorkoutExercise,

    seconds: number,

    exerciseName: string,

    setIndex: number,
  ) {
    const oldById = new Map(original.sets.map((set) => [set.id, set]));

    const now = new Date().toISOString();

    const normalized: WorkoutExercise = {
      ...updated,

      sets: updated.sets.map((set) => {
        const old = oldById.get(set.id);

        if (set.completed && !old?.completed && !set.completed_at) {
          return {
            ...set,

            completed_at: now,
          };
        }

        if (!set.completed) {
          return {
            ...set,

            completed_at: null,
          };
        }

        return set;
      }),
    };

    updateExercise(normalized);

    const completedSet = normalized.sets[setIndex];

    if (!completedSet || !completedSet.completed) {
      return;
    }

    const groupId = normalized.superset_group_id;

    let shouldRest = true;

    if (groupId) {
      const members =
        draft?.exercises.filter(
          (exercise) => exercise.superset_group_id === groupId,
        ) ?? [];

      const memberIndex = members.findIndex(
        (exercise) => exercise.id === normalized.id,
      );

      /*
       * Rest only after the final exercise
       * in the superset round.
       */
      shouldRest = memberIndex === members.length - 1;

      if (!shouldRest) {
        const nextMember = members[memberIndex + 1];

        if (nextMember) {
          setExpandedId(nextMember.id);
        }
      }
    }

    if (shouldRest && seconds > 0) {
      void startRest(seconds, normalized.exercise_id, exerciseName);
    }

    const allExerciseSetsDone = normalized.sets.every((set) => set.completed);

    if (allExerciseSetsDone && draft) {
      const next = nextExerciseAfter(
        {
          ...draft,

          exercises: draft.exercises.map((item) =>
            item.id === normalized.id ? normalized : item,
          ),
        },

        normalized.id,
      );

      if (next && !groupId) {
        setExpandedId(next.id);
      }
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  /*
   * -------------------------------------------------
   * OFFLINE FINISH
   * -------------------------------------------------
   */
  async function finishWorkout() {
    if (!draft || !user || !localId) {
      return;
    }

    setActionLoading(true);

    setError(null);

    try {
      /*
       * Flush newest draft first.
       */
      await localPersistence.saveNow();

      const now = new Date();

      const started = new Date(draft.started_at);

      const duration = Math.max(
        0,
        Math.floor((now.getTime() - started.getTime()) / 1000),
      );

      const completedWorkout: WorkoutSession = {
        ...draft,

        status: "COMPLETED",

        completed_at: now.toISOString(),

        duration_seconds: duration,

        completed_set_count: completedSets,

        total_set_count: totalSets,
      };

      /*
       * This SQL write is the moment Finish succeeds.
       *
       * No internet required.
       */
      await completeLocalWorkout(database, {
        localId,

        userId: user.id,

        workout: completedWorkout,
      });

      await stopRest();

      /*
       * Cloud sync is best effort after local finish.
       */
      requestWorkoutSync(database, user.id, 0);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.replace({
        pathname: "/workout-summary/[sessionId]",

        params: {
          sessionId: localId,
        },
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to finish workout.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  /*
   * -------------------------------------------------
   * CANCEL
   * -------------------------------------------------
   */
  async function cancelCurrentWorkout() {
    if (!draft || !user || !localId) {
      return;
    }

    setActionLoading(true);

    try {
      await localPersistence.saveNow();

      const record = await getLocalWorkoutByAnyId(database, {
        workoutId: localId,

        userId: user.id,
      });

      if (!record) {
        router.replace("/train");

        return;
      }

      await stopRest();

      if (!record.serverId) {
        /*
         * Never existed in cloud.
         */
        await deleteLocalWorkout(database, {
          localId,

          userId: user.id,
        });
      } else {
        const cancelled: WorkoutSession = {
          ...draft,

          status: "CANCELLED",

          cancelled_at: new Date().toISOString(),
        };

        await cancelLocalWorkout(database, {
          localId,

          userId: user.id,

          workout: cancelled,
        });

        requestWorkoutSync(database, user.id, 0);
      }

      router.replace("/train");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to discard workout.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  return {
    isLoading: loading,

    draft,

    expandedId,

    setExpandedId,

    pickerOpen,

    setPickerOpen,

    optionsIndex,

    setOptionsIndex,

    replacementIndex,

    setReplacementIndex,

    rest,

    actionLoading,

    error,

    localSaveStatus: localPersistence.status,

    syncStatus,

    online,

    completedSets,

    incompleteSets,

    incompleteSetsWithData,

    previousMap,

    activeOptionsExercise,

    updateDraft,

    updateExercise,

    replaceExerciseAtIndex,

    setExerciseRestSeconds,

    moveExercise,

    removeExercise,

    createSuperset,

    removeSuperset,

    addExercises,

    finishWorkout,

    cancelCurrentWorkout,

    completeSet,

    updateRestEndsAt,

    stopRest,

    elapsedLabel: formatWorkoutClock(elapsed),

    volumeLabel: `${formatVolume(volume)} ${user?.weight_unit ?? "KG"}`,
  };
}
