import { Ionicons } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import { useQueryClient } from "@tanstack/react-query";

import { router, useLocalSearchParams } from "expo-router";

import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import type { Exercise } from "@/features/exercises/types";

import { ActiveExerciseCard } from "@/features/workouts/components/active-exercise-card";

import { ExerciseOptionsModal } from "@/features/workouts/components/exercise-options-modal";

import { ExercisePickerModal } from "@/features/workouts/components/exercise-picker-modal";

import { RestTimer } from "@/features/workouts/components/rest-timer";

import {
  addWorkoutExercises,
  cancelWorkout,
  completeWorkout,
} from "@/features/workouts/api";

import { workoutSessionKeys } from "@/features/workouts/keys";

import { progressKeys } from "@/features/progress/keys";

import {
  usePreviousPerformance,
  useWorkoutSession,
} from "@/features/workouts/queries";

import {
  formatVolume,
  reorderExercises,
  workoutVolume,
} from "@/features/workouts/utils";

import { useWorkoutAutosave } from "@/features/workouts/use-workout-autosave";

import type {
  WorkoutExercise,
  WorkoutSession,
} from "@/features/workouts/types";

import { useAuthStore } from "@/features/auth/store";

import { parseApiError } from "@/lib/api/errors";

interface RestState {
  seconds: number;

  exerciseName: string;
}

export default function ActiveWorkoutScreen() {
  const params = useLocalSearchParams<{
    sessionId?: string;
  }>();

  const sessionId =
    typeof params.sessionId === "string" ? params.sessionId : "";

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

  // Use fetched data until the first edit; refetches must not overwrite a draft.
  const draft =
    localDraft?.id === sessionId ? localDraft : (workoutQuery.data ?? null);
  const initialExpandedId =
    workoutQuery.data?.exercises.find((exercise) =>
      exercise.sets.some((workoutSet) => !workoutSet.completed),
    )?.id ??
    workoutQuery.data?.exercises[0]?.id ??
    null;
  // undefined means untouched; null means the user explicitly collapsed the card.
  const expandedId =
    selectedExpandedId === undefined ? initialExpandedId : selectedExpandedId;
  const startedAt = draft?.started_at;

  useEffect(() => {
    if (!startedAt) return;
    const started = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

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
    () => (draft ? workoutVolume(draft, user?.weight_unit ?? "KG") : 0),
    [draft, user?.weight_unit],
  );

  function updateExercise(updated: WorkoutExercise) {
    if (!draft) {
      return;
    }

    setDraft({
      ...draft,

      exercises: draft.exercises.map((exercise) =>
        exercise.id === updated.id ? updated : exercise,
      ),
    });
  }

  async function addExercises(exercises: Exercise[]) {
    if (!draft || exercises.length === 0) {
      return;
    }

    setActionLoading(true);

    try {
      const updated = await addWorkoutExercises(
        draft.id,

        exercises.map((exercise) => exercise.id),
      );

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
      setError(parseApiError(requestError, "Unable to add exercises.").message);
    } finally {
      setActionLoading(false);
    }
  }

  function moveExercise(index: number, direction: -1 | 1) {
    if (!draft) {
      return;
    }

    const target = index + direction;

    if (target < 0 || target >= draft.exercises.length) {
      return;
    }

    const copy = [...draft.exercises];

    const [moved] = copy.splice(index, 1);

    copy.splice(target, 0, moved);

    setDraft({
      ...draft,

      exercises: reorderExercises(copy),
    });
  }

  function removeExercise(index: number) {
    if (!draft) {
      return;
    }

    const removing = draft.exercises[index];

    const next = reorderExercises(
      draft.exercises.filter((_, current) => current !== index),
    );

    if (expandedId === removing.id) {
      setExpandedId(next[index]?.id ?? next[index - 1]?.id ?? null);
    }

    setDraft({
      ...draft,

      exercises: next,
    });
  }

  function createSuperset(index: number) {
    if (!draft || index >= draft.exercises.length - 1) {
      return;
    }

    const groupId = `superset-${Date.now()}`;

    setDraft({
      ...draft,

      exercises: draft.exercises.map((exercise, currentIndex) =>
        currentIndex === index || currentIndex === index + 1
          ? {
              ...exercise,

              superset_group_id: groupId,
            }
          : exercise,
      ),
    });
  }

  function removeSuperset(groupId: string) {
    if (!draft) {
      return;
    }

    setDraft({
      ...draft,

      exercises: draft.exercises.map((exercise) =>
        exercise.superset_group_id === groupId
          ? {
              ...exercise,

              superset_group_id: null,
            }
          : exercise,
      ),
    });
  }

  async function finishWorkout() {
    if (!draft) {
      return;
    }

    setActionLoading(true);

    try {
      await autosave.saveNow();

      const completed = await completeWorkout(draft.id);

      queryClient.setQueryData(
        workoutSessionKeys.detail(completed.id),
        completed,
      );

      await queryClient.invalidateQueries({
        queryKey: workoutSessionKeys.all,
      });

      await queryClient.invalidateQueries({
        queryKey: progressKeys.all,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.replace({
        pathname: "/workout-history/[sessionId]",
        params: { sessionId: completed.id },
      });
    } catch (requestError) {
      setError(
        parseApiError(requestError, "Unable to finish workout.").message,
      );
    } finally {
      setActionLoading(false);
    }
  }

  function confirmFinish() {
    Alert.alert(
      "Finish workout?",
      `${completedSets} completed sets will be saved.`,
      [
        {
          text: "Keep training",

          style: "cancel",
        },

        {
          text: "Finish",

          onPress: () => {
            void finishWorkout();
          },
        },
      ],
    );
  }

  function confirmCancel() {
    Alert.alert(
      "Discard workout?",
      "This workout will be marked as cancelled.",
      [
        {
          text: "Keep training",

          style: "cancel",
        },

        {
          text: "Discard",

          style: "destructive",

          onPress: () => {
            void handleCancel();
          },
        },
      ],
    );
  }

  async function handleCancel() {
    if (!draft) {
      return;
    }

    await cancelWorkout(draft.id);

    await queryClient.invalidateQueries({
      queryKey: workoutSessionKeys.all,
    });

    router.replace("/train");
  }

  if (workoutQuery.isLoading || !draft) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#3B82F6" />
      </SafeAreaView>
    );
  }

  const activeOptionsExercise =
    optionsIndex !== null ? draft.exercises[optionsIndex] : null;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* HEADER */}

      <View className="border-b border-white/[0.07]">
        <View className="flex-row items-center px-4 py-2">
          <Pressable
            onPress={() => {
              router.replace("/train");
            }}
            className="h-10 w-10 items-center justify-center"
          >
            <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
          </Pressable>

          <Text className="ml-1 flex-1 text-[16px] font-extrabold text-white">
            Log Workout
          </Text>

          <Pressable
            onPress={confirmCancel}
            className="mr-2 h-9 w-9 items-center justify-center"
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color="rgba(255,255,255,.55)"
            />
          </Pressable>

          <Pressable
            disabled={actionLoading}
            onPress={confirmFinish}
            className="min-h-[38px] min-w-[70px] items-center justify-center rounded-xl bg-brand px-4"
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-[13px] font-extrabold text-white">
                Finish
              </Text>
            )}
          </Pressable>
        </View>

        <View className="flex-row px-5 pb-3 pt-1">
          <Metric title="Duration" value={formatClock(elapsed)} />

          <Metric
            title="Volume"
            value={`${formatVolume(volume)} ${user?.weight_unit ?? "KG"}`}
          />

          <Metric title="Sets" value={String(completedSets)} />
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: rest ? 150 : 100,
        }}
      >
        <View className="px-4 py-4">
          <TextInput
            value={draft.name}
            onChangeText={(name) => {
              setDraft({
                ...draft,
                name,
              });
            }}
            selectionColor="#3B82F6"
            className="text-[23px] font-extrabold tracking-[-0.7px] text-white"
          />

          <View className="mt-1 flex-row items-center">
            <SaveIndicator status={autosave.status} />
          </View>

          {error ? (
            <Text className="mt-3 text-[12px] text-red-300">{error}</Text>
          ) : null}
        </View>

        {draft.exercises.length === 0 ? (
          <View className="items-center px-8 py-16">
            <View className="h-16 w-16 items-center justify-center rounded-3xl bg-brand-muted">
              <Ionicons name="barbell-outline" size={28} color="#60A5FA" />
            </View>

            <Text className="mt-5 text-[18px] font-extrabold text-white">
              Add your first exercise
            </Text>

            <Text className="mt-2 text-center text-[13px] leading-5 text-white/35">
              Build this workout as you train.
            </Text>
          </View>
        ) : (
          draft.exercises.map((exercise, index) => (
            <View key={exercise.id} className="flex-row">
              {exercise.superset_group_id ? (
                <View className="w-[3px] bg-brand-bright" />
              ) : null}

              <View className="flex-1">
                <ActiveExerciseCard
                  exercise={exercise}
                  previous={previousMap.get(exercise.exercise_id)}
                  expanded={expandedId === exercise.id}
                  onToggleExpanded={() => {
                    setExpandedId((current) =>
                      current === exercise.id ? null : exercise.id,
                    );
                  }}
                  onChange={updateExercise}
                  onCompletedSet={(seconds, exerciseName, updatedExercise) => {
                    updateExercise(updatedExercise);

                    const completedIndex = updatedExercise.sets.findIndex(
                      (workoutSet) =>
                        workoutSet.completed &&
                        !exercise.sets.find(
                          (oldSet) =>
                            oldSet.id === workoutSet.id && oldSet.completed,
                        ),
                    );

                    const nextSet = updatedExercise.sets[completedIndex + 1];

                    if (nextSet?.type !== "DROP") {
                      setRest({
                        seconds,
                        exerciseName,
                      });
                    }

                    void Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Medium,
                    );
                  }}
                  onMenu={() => {
                    setOptionsIndex(index);
                  }}
                />
              </View>
            </View>
          ))
        )}

        <Pressable
          onPress={() => {
            setPickerOpen(true);
          }}
          className="mx-4 mt-5 min-h-[48px] items-center justify-center rounded-xl bg-brand"
        >
          <Text className="text-[14px] font-extrabold text-white">
            + Add Exercise
          </Text>
        </Pressable>

        <TextInput
          value={draft.notes ?? ""}
          onChangeText={(value) => {
            setDraft({
              ...draft,

              notes: value || null,
            });
          }}
          multiline
          placeholder="Workout notes..."
          placeholderTextColor="rgba(255,255,255,.2)"
          className="mx-4 mt-4 min-h-[65px] rounded-xl bg-white/[0.025] px-4 py-3 text-[12px] leading-5 text-white"
        />
      </ScrollView>

      {rest ? (
        <RestTimer
          key={`${rest.exerciseName}-${rest.seconds}`}
          seconds={rest.seconds}
          exerciseName={rest.exerciseName}
          onClose={() => {
            setRest(null);
          }}
        />
      ) : null}

      <ExercisePickerModal
        visible={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
        }}
        onAdd={(exercises) => {
          void addExercises(exercises);
        }}
      />

      {activeOptionsExercise ? (
        <ExerciseOptionsModal
          visible={optionsIndex !== null}
          canMoveUp={optionsIndex !== null && optionsIndex > 0}
          canMoveDown={
            optionsIndex !== null && optionsIndex < draft.exercises.length - 1
          }
          inSuperset={Boolean(activeOptionsExercise.superset_group_id)}
          canSupersetNext={
            optionsIndex !== null && optionsIndex < draft.exercises.length - 1
          }
          onMoveUp={() => {
            if (optionsIndex !== null) {
              moveExercise(optionsIndex, -1);
            }
          }}
          onMoveDown={() => {
            if (optionsIndex !== null) {
              moveExercise(optionsIndex, 1);
            }
          }}
          onSupersetNext={() => {
            if (optionsIndex !== null) {
              createSuperset(optionsIndex);
            }
          }}
          onRemoveSuperset={() => {
            const group = activeOptionsExercise.superset_group_id;

            if (group) {
              removeSuperset(group);
            }
          }}
          onRemoveExercise={() => {
            if (optionsIndex !== null) {
              removeExercise(optionsIndex);
            }
          }}
          onClose={() => {
            setOptionsIndex(null);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function Metric({
  title,
  value,
}: {
  title: string;

  value: string;
}) {
  return (
    <View className="flex-1">
      <Text className="text-[10px] font-medium text-white/25">{title}</Text>

      <Text className="mt-1 text-[13px] font-bold text-white/70">{value}</Text>
    </View>
  );
}

function SaveIndicator({
  status,
}: {
  status: "saved" | "saving" | "unsaved" | "error";
}) {
  if (status === "saving") {
    return <Text className="text-[10px] text-white/25">Saving…</Text>;
  }

  if (status === "error") {
    return (
      <Text className="text-[10px] text-red-300/70">
        Not saved · check connection
      </Text>
    );
  }

  if (status === "unsaved") {
    return <Text className="text-[10px] text-white/25">Unsaved changes</Text>;
  }

  return <Text className="text-[10px] text-white/20">Saved</Text>;
}

function formatClock(seconds: number): string {
  const hours = Math.floor(seconds / 3600);

  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}
