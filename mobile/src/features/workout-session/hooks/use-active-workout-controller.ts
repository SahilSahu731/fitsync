import * as Haptics from "expo-haptics";

import { router } from "expo-router";

import { useEffect, useMemo, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store";

import type { Exercise } from "@/features/exercises/types";

import { workoutSessionKeys } from "@/features/workouts/keys";

import {
  usePreviousPerformance,
  useWorkoutSession,
} from "@/features/workouts/queries";

import type {
  WorkoutExercise,
  WorkoutSession,
} from "@/features/workouts/types";

import { parseApiError } from "@/lib/api/errors";

import { addWorkoutExercises, cancelWorkout, completeWorkout } from "../api";

import {
  formatVolume,
  formatWorkoutClock,
  workoutVolume,
} from "../domain/calculations";

import {
  createWorkoutSuperset,
  moveWorkoutExercise,
  removeWorkoutExercise,
  removeWorkoutSuperset,
  replaceWorkoutExercise,
} from "../store/workout-draft-store";

import type { RestState } from "../types";

import { useWorkoutAutosave } from "./use-workout-autosave";

export function useActiveWorkoutController(sessionId: string) {
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);

  const workoutQuery = useWorkoutSession(sessionId);

  const [localDraft, setDraft] = useState<WorkoutSession | null>(null);

  const [selectedExpandedId, setExpandedId] = useState<
    string | null | undefined
  >(undefined);

  const [pickerOpen, setPickerOpen] = useState(false);

  const [optionsIndex, setOptionsIndex] = useState<number | null>(null);

  const [rest, setRest] = useState<RestState | null>(null);

  const [elapsed, setElapsed] = useState(0);

  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  /*
   * Until the first local edit we can render
   * directly from React Query.
   *
   * Once localDraft exists, refetches must not
   * overwrite edits currently being autosaved.
   */
  const draft =
    localDraft?.id === sessionId ? localDraft : (workoutQuery.data ?? null);

  const initialExpandedId =
    workoutQuery.data?.exercises.find((exercise) =>
      exercise.sets.some((workoutSet) => !workoutSet.completed),
    )?.id ??
    workoutQuery.data?.exercises[0]?.id ??
    null;

  /*
   * undefined = user has not touched expansion.
   * null = user explicitly collapsed everything.
   */
  const expandedId =
    selectedExpandedId === undefined ? initialExpandedId : selectedExpandedId;

  /*
   * Workout duration.
   *
   * Phase 2 will improve lifecycle/background
   * handling further.
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

    return () => clearInterval(interval);
  }, [draft?.started_at]);

  const exerciseIds = useMemo(
    () => draft?.exercises.map((exercise) => exercise.exercise_id) ?? [],
    [draft?.exercises],
  );

  const previousQuery = usePreviousPerformance(exerciseIds);

  const previousMap = useMemo(
    () =>
      new Map(
        (previousQuery.data?.items ?? []).map((item) => [
          item.exercise_id,
          item,
        ]),
      ),
    [previousQuery.data],
  );

  /*
   * Keep the Phase 0 autosave implementation
   * exactly as our source of persistence.
   */
  const autosave = useWorkoutAutosave({
    workout: draft,

    enabled: Boolean(draft && draft.status === "IN_PROGRESS"),

    onSaved: (saved) => {
      queryClient.setQueryData(workoutSessionKeys.detail(saved.id), saved);

      queryClient.setQueryData(workoutSessionKeys.active(), {
        workout: saved,
      });
    },
  });

  const completedSets = useMemo(
    () =>
      draft?.exercises.reduce(
        (total, exercise) =>
          total +
          exercise.sets.filter((workoutSet) => workoutSet.completed).length,
        0,
      ) ?? 0,
    [draft],
  );

  const volume = useMemo(
    () =>
      draft
        ? workoutVolume(
            draft,

            user?.weight_unit ?? "KG",
          )
        : 0,
    [draft, user?.weight_unit],
  );

  const activeOptionsExercise =
    optionsIndex !== null ? (draft?.exercises[optionsIndex] ?? null) : null;

  function updateDraft(patch: Partial<Pick<WorkoutSession, "name" | "notes">>) {
    if (!draft) {
      return;
    }

    setDraft({
      ...draft,
      ...patch,
    });
  }

  function updateExercise(updated: WorkoutExercise) {
    if (!draft) {
      return;
    }

    setDraft(replaceWorkoutExercise(draft, updated));
  }

  function moveExercise(index: number, direction: -1 | 1) {
    if (!draft) {
      return;
    }

    setDraft(moveWorkoutExercise(draft, index, direction));
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

    setDraft(next);
  }

  function createSuperset(index: number) {
    if (!draft) {
      return;
    }

    setDraft(createWorkoutSuperset(draft, index));
  }

  function removeSuperset(groupId: string) {
    if (!draft) {
      return;
    }

    setDraft(removeWorkoutSuperset(draft, groupId));
  }

  async function addExercises(exercises: Exercise[]) {
    if (!draft || exercises.length === 0) {
      return;
    }

    setActionLoading(true);

    setError(null);

    try {
      /*
       * Preserve Phase 0 rule:
       * flush before structural server mutation.
       */
      const savedBeforeAdd = await autosave.saveNow();

      const updated = await addWorkoutExercises(
        draft.id,

        exercises.map((exercise) => exercise.id),

        savedBeforeAdd?.revision ?? draft.revision,
      );

      /*
       * Adding exercises incremented revision,
       * so autosave needs the returned snapshot.
       */
      autosave.adoptServerSnapshot(updated);

      setDraft(updated);

      const newlyAdded = updated.exercises.find((exercise) =>
        exercises.some((selected) => selected.id === exercise.exercise_id),
      );

      if (newlyAdded) {
        setExpandedId(newlyAdded.id);
      }

      await queryClient.invalidateQueries({
        queryKey: workoutSessionKeys.all,
      });
    } catch (requestError) {
      const parsed = parseApiError(requestError, "Unable to add exercises.");

      setError(
        parsed.code === "WORKOUT_REVISION_CONFLICT"
          ? "This workout changed somewhere else. " +
              "Leave and reopen it before continuing."
          : parsed.message,
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function finishWorkout() {
    if (!draft) {
      return;
    }

    setActionLoading(true);

    setError(null);

    try {
      /*
       * Preserve Phase 0 reliability:
       * completion waits for newest draft.
       */
      const saved = await autosave.saveNow();

      const completed = await completeWorkout(
        draft.id,

        saved?.revision ?? draft.revision,
      );

      queryClient.setQueryData(
        workoutSessionKeys.detail(completed.id),
        completed,
      );

      queryClient.setQueryData(workoutSessionKeys.active(), {
        workout: null,
      });

      await queryClient.invalidateQueries({
        queryKey: workoutSessionKeys.all,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.replace({
        pathname: "/workout-summary/[sessionId]",

        params: {
          sessionId: completed.id,
        },
      });
    } catch (requestError) {
      const parsed = parseApiError(requestError, "Unable to finish workout.");

      setError(
        parsed.code === "WORKOUT_REVISION_CONFLICT"
          ? "This workout changed somewhere else. " +
              "Leave and reopen it before finishing."
          : parsed.message,
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function cancelCurrentWorkout() {
    if (!draft) {
      return;
    }

    setActionLoading(true);

    setError(null);

    try {
      await cancelWorkout(draft.id);

      await queryClient.invalidateQueries({
        queryKey: workoutSessionKeys.all,
      });

      router.replace("/train");
    } catch (requestError) {
      setError(
        parseApiError(requestError, "Unable to discard workout.").message,
      );
    } finally {
      setActionLoading(false);
    }
  }

  function completeSet(
    original: WorkoutExercise,

    updated: WorkoutExercise,

    seconds: number,

    exerciseName: string,
  ) {
    updateExercise(updated);

    const completedIndex = updated.sets.findIndex(
      (workoutSet) =>
        workoutSet.completed &&
        !original.sets.find(
          (oldSet) => oldSet.id === workoutSet.id && oldSet.completed,
        ),
    );

    if (completedIndex < 0) {
      return;
    }

    const nextSet = updated.sets[completedIndex + 1];

    if (nextSet?.type !== "DROP") {
      setRest({
        seconds,
        exerciseName,
      });
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  return {
    workoutQuery,

    draft,
    setDraft,

    expandedId,
    setExpandedId,

    pickerOpen,
    setPickerOpen,

    optionsIndex,
    setOptionsIndex,

    rest,
    setRest,

    actionLoading,
    error,

    autosave,

    completedSets,
    previousMap,

    activeOptionsExercise,

    updateDraft,
    updateExercise,

    moveExercise,
    removeExercise,

    createSuperset,
    removeSuperset,

    addExercises,
    finishWorkout,
    cancelCurrentWorkout,

    completeSet,

    elapsedLabel: formatWorkoutClock(elapsed),

    volumeLabel: `${formatVolume(volume)} ${user?.weight_unit ?? "KG"}`,
  };
}
