import {
  Ionicons,
} from "@expo/vector-icons";

import * as Haptics
  from "expo-haptics";

import {
  useQueryClient,
} from "@tanstack/react-query";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import type {
  Exercise,
} from "@/features/exercises/types";

import {
  ExercisePickerModal,
} from "@/features/workouts/components/exercise-picker-modal";

import {
  ActiveExerciseCard,
} from "@/features/workouts/components/active-exercise-card";

import {
  RestTimer,
} from "@/features/workouts/components/rest-timer";

import {
  addWorkoutExercises,
  cancelWorkout,
  completeWorkout,
  updateWorkoutSession,
} from "@/features/workouts/api";

import {
  workoutSessionKeys,
} from "@/features/workouts/keys";

import {
  useWorkoutSession,
} from "@/features/workouts/queries";

import {
  formatDuration,
  reorderExercises,
  sessionToUpdateInput,
} from "@/features/workouts/utils";

import type {
  WorkoutExercise,
  WorkoutSession,
} from "@/features/workouts/types";

import {
  parseApiError,
} from "@/lib/api/errors";


export default function ActiveWorkoutScreen() {
  const params =
    useLocalSearchParams<{
      sessionId?: string;
    }>();

  const sessionId =
    typeof params.sessionId ===
    "string"
      ? params.sessionId
      : "";

  const queryClient =
    useQueryClient();

  const query =
    useWorkoutSession(
      sessionId
    );

  const [
    localDraft,
    setDraft,
  ] = useState<
    WorkoutSession | null
  >(null);

  const [
    pickerOpen,
    setPickerOpen,
  ] = useState(false);

  const [
    restSeconds,
    setRestSeconds,
  ] = useState<
    number | null
  >(null);

  const [
    elapsed,
    setElapsed,
  ] = useState(0);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);


  // Server data supplies the initial draft; edits stay local until persisted.
  const draft = localDraft?.id === sessionId ? localDraft : query.data ?? null;
  const startedAt = draft?.started_at;

  useEffect(() => {
    if (!startedAt) return;
    const started = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const completedSets =
    useMemo(
      () =>
        draft?.exercises.reduce(
          (
            total,
            exercise,
          ) =>
            total +
            exercise.sets.filter(
              (
                workoutSet,
              ) =>
                workoutSet.completed,
            ).length,
          0,
        ) ??
        0,
      [
        draft,
      ],
    );


  async function persist(
    next:
      WorkoutSession,
  ) {
    setDraft(
      next
    );

    setSaving(
      true
    );

    try {
      const updated =
        await updateWorkoutSession(
          next.id,
          sessionToUpdateInput(
            next
          ),
        );

      setDraft(
        updated
      );

      queryClient.setQueryData(
        workoutSessionKeys.detail(
          next.id
        ),
        updated,
      );

      queryClient.setQueryData(
        workoutSessionKeys.active(),
        {
          workout:
            updated,
        },
      );

      setError(
        null
      );

    } catch (
      requestError
    ) {
      setError(
        parseApiError(
          requestError,
          "Unable to save workout.",
        ).message,
      );

    } finally {
      setSaving(
        false
      );
    }
  }


  async function addExercises(
    exercises: Exercise[],
  ) {
    if (
      !draft ||
      exercises.length ===
      0
    ) {
      return;
    }

    setSaving(
      true
    );

    try {
      const updated =
        await addWorkoutExercises(
          draft.id,
          exercises.map(
            (
              exercise,
            ) =>
              exercise.id,
          ),
        );

      setDraft(
        updated
      );

      await queryClient
        .invalidateQueries({
          queryKey:
            workoutSessionKeys
              .all,
        });

    } catch (
      requestError
    ) {
      setError(
        parseApiError(
          requestError,
          "Unable to add exercises.",
        ).message,
      );

    } finally {
      setSaving(
        false
      );
    }
  }


  function updateExercise(
    exercise:
      WorkoutExercise,
  ) {
    if (!draft) {
      return;
    }

    const next = {
      ...draft,

      exercises:
        draft.exercises.map(
          (
            item,
          ) =>
            item.id ===
            exercise.id
              ? exercise
              : item,
        ),
    };

    /*
     * Local first.
     *
     * We persist when the user completes
     * a set or performs structural actions.
     */
    setDraft(
      next
    );
  }


  async function removeExercise(
    exerciseId: string,
  ) {
    if (!draft) {
      return;
    }

    const next = {
      ...draft,

      exercises:
        reorderExercises(
          draft.exercises.filter(
            (
              exercise,
            ) =>
              exercise.id !==
              exerciseId,
          ),
        ),
    };

    await persist(
      next
    );
  }


  function confirmCancel() {
    Alert.alert(
      "Cancel workout?",
      "Your current workout will be marked as cancelled.",
      [
        {
          text:
            "Keep training",

          style:
            "cancel",
        },

        {
          text:
            "Cancel workout",

          style:
            "destructive",

          onPress:
            () => {
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

    setSaving(
      true
    );

    try {
      await cancelWorkout(
        draft.id
      );

      await queryClient
        .invalidateQueries({
          queryKey:
            workoutSessionKeys
              .all,
        });

      router.replace(
        "/train"
      );

    } finally {
      setSaving(
        false
      );
    }
  }


  function confirmFinish() {
    if (!draft) {
      return;
    }

    Alert.alert(
      "Finish workout?",
      `${completedSets} completed sets will be saved to your history.`,
      [
        {
          text:
            "Keep training",

          style:
            "cancel",
        },

        {
          text:
            "Finish",

          onPress:
            () => {
              void handleFinish();
            },
        },
      ],
    );
  }


  async function handleFinish() {
    if (!draft) {
      return;
    }

    setSaving(
      true
    );

    try {
      /*
       * Save latest inputs first.
       */
      const updated =
        await updateWorkoutSession(
          draft.id,
          sessionToUpdateInput(
            draft
          ),
        );

      const completed =
        await completeWorkout(
          updated.id
        );

      queryClient.setQueryData(
        workoutSessionKeys.detail(
          completed.id
        ),
        completed,
      );

      await queryClient
        .invalidateQueries({
          queryKey:
            workoutSessionKeys
              .all,
        });

      await Haptics
        .notificationAsync(
          Haptics
            .NotificationFeedbackType
            .Success,
        );

      router.replace(
        `/workout-history/${completed.id}`
      );

    } catch (
      requestError
    ) {
      setError(
        parseApiError(
          requestError,
          "Unable to finish workout.",
        ).message,
      );

    } finally {
      setSaving(
        false
      );
    }
  }


  if (
    query.isLoading ||
    !draft
  ) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator
          color="#3B82F6"
        />
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 pt-3">
        <Pressable
          onPress={() => {
            router.replace(
              "/train"
            );
          }}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/[0.05]"
        >
          <Ionicons
            name="chevron-down"
            size={21}
            color="#FFFFFF"
          />
        </Pressable>

        <View className="ml-4 flex-1">
          <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-bright">
            Workout in progress
          </Text>

          <Text className="mt-1 text-[20px] font-extrabold text-white">
            {formatDuration(
              elapsed
            )}
          </Text>
        </View>

        <Pressable
          onPress={
            confirmCancel
          }
          className="mr-2 h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05]"
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color="#FFFFFF"
          />
        </Pressable>

        <Pressable
          onPress={
            confirmFinish
          }
          className="rounded-xl bg-brand px-4 py-3"
        >
          {saving ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Text className="text-[13px] font-extrabold text-white">
              Finish
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding:
            20,

          paddingBottom:
            restSeconds !==
            null
              ? 150
              : 80,
        }}
      >
        <TextInput
          value={
            draft.name
          }
          onChangeText={(
            value,
          ) => {
            setDraft({
              ...draft,

              name:
                value,
            });
          }}
          selectionColor="#3B82F6"
          className="text-[30px] font-extrabold tracking-[-1.2px] text-white"
        />

        <View className="mt-3 flex-row items-center">
          <Text className="text-[12px] text-white/35">
            {draft.exercises.length} exercises
          </Text>

          <View className="mx-2 h-1 w-1 rounded-full bg-white/20" />

          <Text className="text-[12px] text-white/35">
            {completedSets} sets complete
          </Text>

          {saving ? (
            <>
              <View className="mx-2 h-1 w-1 rounded-full bg-white/20" />

              <Text className="text-[11px] text-brand-bright">
                Saving…
              </Text>
            </>
          ) : null}
        </View>

        {error ? (
          <View className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/[0.05] p-4">
            <Text className="text-[13px] leading-5 text-red-300">
              {error}
            </Text>
          </View>
        ) : null}

        <View className="mt-7 gap-4">
          {draft.exercises.map(
            (
              exercise,
            ) => (
              <ActiveExerciseCard
                key={
                  exercise.id
                }
                exercise={
                  exercise
                }
                onChange={
                  updateExercise
                }
                onRemove={() => {
                  void removeExercise(
                    exercise.id
                  );
                }}
                onCompletedSet={(rest, updatedExercise) => {
                  if (!draft) {
                    return;
                  }

                  const next = {
                    ...draft,
                    exercises: draft.exercises.map((item) =>
                      item.id === updatedExercise.id ? updatedExercise : item,
                    ),
                  };

                  setDraft(next);
                  setRestSeconds(rest);
                  void persist(next);
                }}
              />
            ),
          )}
        </View>

        <Pressable
          onPress={() => {
            setPickerOpen(
              true
            );
          }}
          className="mt-5 min-h-[56px] flex-row items-center justify-center gap-2 rounded-2xl border border-brand-bright/25 bg-brand-muted"
        >
          <Ionicons
            name="add"
            size={19}
            color="#60A5FA"
          />

          <Text className="text-[14px] font-bold text-brand-bright">
            Add exercise
          </Text>
        </Pressable>

        <TextInput
          value={
            draft.notes ??
            ""
          }
          onChangeText={(
            value,
          ) => {
            setDraft({
              ...draft,

              notes:
                value ||
                null,
            });
          }}
          multiline
          placeholder="Workout notes"
          placeholderTextColor="rgba(255,255,255,.2)"
          className="mt-6 min-h-[90px] rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-[13px] leading-5 text-white"
        />

        <Pressable
          onPress={() => {
            void persist(
              draft
            );
          }}
          className="mt-4 min-h-[52px] items-center justify-center rounded-2xl bg-white/[0.05]"
        >
          <Text className="text-[13px] font-bold text-white/70">
            Save workout
          </Text>
        </Pressable>
      </ScrollView>

      {restSeconds !==
      null ? (
        <RestTimer
          seconds={
            restSeconds
          }
          onClose={() => {
            setRestSeconds(
              null
            );
          }}
        />
      ) : null}

      <ExercisePickerModal
        visible={
          pickerOpen
        }
        onClose={() => {
          setPickerOpen(
            false
          );
        }}
        onAdd={(
          exercises,
        ) => {
          void addExercises(
            exercises
          );
        }}
      />
    </SafeAreaView>
  );
}