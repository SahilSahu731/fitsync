import { router, useLocalSearchParams } from "expo-router";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { ActiveExerciseCard } from "@/features/workout-session/components/active-exercise-card";

import { EmptyWorkoutState } from "@/features/workout-session/components/empty-workout-state";

import { ExerciseOptionsModal } from "@/features/workout-session/components/exercise-options-modal";

import { ExercisePickerModal } from "@/features/workout-session/components/exercise-picker-modal";

import { RestTimer } from "@/features/workout-session/components/rest-timer";

import { SaveIndicator } from "@/features/workout-session/components/save-indicator";

import { WorkoutHeader } from "@/features/workout-session/components/workout-header";

import { useActiveWorkoutController } from "@/features/workout-session/hooks/use-active-workout-controller";

import { useWorkoutLoggingUi } from "@/features/workout-session/hooks/use-workout-logging-ui";

export default function ActiveWorkoutScreen() {
  const params = useLocalSearchParams<{
    sessionId?: string;
  }>();

  const sessionId =
    typeof params.sessionId === "string" ? params.sessionId : "";

  const controller = useActiveWorkoutController(sessionId);

  const { setScrollView, registerExercisePosition, scrollToExercise } =
    useWorkoutLoggingUi();

  const {
    isLoading,
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

    localSaveStatus,
    syncStatus,
    online,

    completedSets,
    incompleteSets,
    incompleteSetsWithData,

    previousMap,
    activeOptionsExercise,

    updateDraft,
    updateExercise,

    moveExercise,
    removeExercise,

    createSuperset,
    removeSuperset,

    addExercises,
    replaceExerciseAtIndex,
    setExerciseRestSeconds,

    finishWorkout,
    cancelCurrentWorkout,

    completeSet,

    updateRestEndsAt,
    stopRest,

    elapsedLabel,
    volumeLabel,
  } = controller;

  const totalSets =
    draft?.exercises.reduce(
      (total, exercise) => total + exercise.sets.length,
      0,
    ) ?? 0;

  function confirmFinish() {
    const warning =
      incompleteSetsWithData > 0
        ? `You have ${incompleteSetsWithData} incomplete ` +
          "set(s) containing logged values. " +
          "They will remain in the workout but won't count as completed."
        : incompleteSets > 0
          ? `${incompleteSets} set(s) are still incomplete.`
          : "Everything is logged.";

    Alert.alert(
      "Finish workout?",

      `${completedSets} completed sets.\n\n` + warning,
      [
        {
          text: "Go back",

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

      "This removes the current workout from " + "your device and cloud sync.",
      [
        {
          text: "Keep training",

          style: "cancel",
        },

        {
          text: "Discard",

          style: "destructive",

          onPress: () => {
            void cancelCurrentWorkout();
          },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#3B82F6" />
      </SafeAreaView>
    );
  }

  if (!draft) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-white/40">
          Workout isn&apos;t available on this device.
        </Text>

        <Pressable
          onPress={() => {
            router.replace("/train");
          }}
          className="mt-5 rounded-xl bg-brand px-5 py-3"
        >
          <Text className="font-bold text-white">Back to Train</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <WorkoutHeader
          elapsedLabel={elapsedLabel}
          volumeLabel={volumeLabel}
          completedSets={completedSets}
          totalSets={totalSets}
          actionLoading={actionLoading}
          onExit={() => {
            router.replace("/train");
          }}
          onCancel={confirmCancel}
          onFinish={confirmFinish}
        />

        <ScrollView
          ref={setScrollView}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: rest ? 145 : 80,
          }}
        >
          <View className="px-4 pb-3 pt-4">
            <TextInput
              value={draft.name}
              onChangeText={(name) => {
                updateDraft({
                  name,
                });
              }}
              selectionColor="#3B82F6"
              className="text-[22px] font-extrabold tracking-[-0.7px] text-white"
            />

            <View className="mt-1">
              <SaveIndicator
                localStatus={localSaveStatus}
                syncStatus={syncStatus}
                online={online}
              />
            </View>

            {error ? (
              <Text className="mt-3 text-[12px] text-red-300">{error}</Text>
            ) : null}
          </View>

          {draft.exercises.length === 0 ? (
            <EmptyWorkoutState />
          ) : (
            draft.exercises.map((exercise, index) => (
              <View
                key={exercise.id}
                onLayout={(event) => {
                  registerExercisePosition(
                    exercise.id,
                    event.nativeEvent.layout.y,
                  );
                }}
                className="flex-row"
              >
                {exercise.superset_group_id ? (
                  <View className="w-[3px] bg-brand/70" />
                ) : null}

                <View className="flex-1">
                  {exercise.superset_group_id ? (
                    <View className="bg-brand/[0.06] px-4 py-1">
                      <Text className="text-[9px] font-bold uppercase tracking-[1.5px] text-brand-bright/70">
                        Superset
                      </Text>
                    </View>
                  ) : null}

                  <ActiveExerciseCard
                    exercise={exercise}
                    previous={previousMap.get(exercise.exercise_id)}
                    expanded={expandedId === exercise.id}
                    onToggleExpanded={() => {
                      const next =
                        expandedId === exercise.id ? null : exercise.id;

                      setExpandedId(next);

                      if (next) {
                        setTimeout(() => {
                          scrollToExercise(next);
                        }, 120);
                      }
                    }}
                    onChange={updateExercise}
                    onCompletedSet={(
                      seconds,
                      exerciseName,
                      updatedExercise,
                      setIndex,
                    ) => {
                      completeSet(
                        exercise,
                        updatedExercise,
                        seconds,
                        exerciseName,
                        setIndex,
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
            className="mx-4 mt-5 min-h-[48px] flex-row items-center justify-center rounded-xl bg-brand"
          >
            <Text className="text-[14px] font-extrabold text-white">
              + Add Exercise
            </Text>
          </Pressable>

          <View className="mx-4 mt-6">
            <Text className="mb-2 text-[10px] font-bold uppercase tracking-[1.4px] text-white/20">
              Workout notes
            </Text>

            <TextInput
              value={draft.notes ?? ""}
              onChangeText={(value) => {
                updateDraft({
                  notes: value || null,
                });
              }}
              multiline
              placeholder="Anything worth remembering?"
              placeholderTextColor="rgba(255,255,255,.18)"
              className="min-h-[72px] rounded-xl bg-white/[0.025] px-4 py-3 text-[12px] leading-5 text-white/55"
            />
          </View>
        </ScrollView>

        {rest ? (
          <RestTimer
            restEndsAt={rest.restEndsAt}
            exerciseName={rest.exerciseName}
            onAdjust={(next) => {
              void updateRestEndsAt(next);
            }}
            onClose={() => {
              void stopRest();
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

        <ExercisePickerModal
          visible={replacementIndex !== null}
          title="Replace exercise"
          selectionMode="single"
          excludeExerciseIds={draft.exercises.map(
            (exercise) => exercise.exercise_id,
          )}
          onClose={() => {
            setReplacementIndex(null);
          }}
          onAdd={(exercises) => {
            const exercise = exercises[0];

            if (exercise && replacementIndex !== null) {
              replaceExerciseAtIndex(replacementIndex, exercise);
            }
          }}
        />

        {activeOptionsExercise ? (
          <ExerciseOptionsModal
            visible={optionsIndex !== null}
            exerciseName={activeOptionsExercise.exercise_name}
            restSeconds={activeOptionsExercise.rest_seconds}
            canMoveUp={optionsIndex !== null && optionsIndex > 0}
            canMoveDown={
              optionsIndex !== null && optionsIndex < draft.exercises.length - 1
            }
            inSuperset={Boolean(activeOptionsExercise.superset_group_id)}
            canSupersetNext={
              optionsIndex !== null && optionsIndex < draft.exercises.length - 1
            }
            onViewExercise={() => {
              router.push(`/exercises/${activeOptionsExercise.exercise_id}`);
            }}
            onReplace={() => {
              if (optionsIndex !== null) {
                setReplacementIndex(optionsIndex);
              }
            }}
            onRestChange={(seconds) => {
              if (optionsIndex !== null) {
                setExerciseRestSeconds(optionsIndex, seconds);
              }
            }}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
