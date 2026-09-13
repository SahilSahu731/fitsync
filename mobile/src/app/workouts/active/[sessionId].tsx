import { router, useLocalSearchParams } from "expo-router";

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

import { ActiveExerciseCard } from "@/features/workout-session/components/active-exercise-card";

import { EmptyWorkoutState } from "@/features/workout-session/components/empty-workout-state";

import { ExerciseOptionsModal } from "@/features/workout-session/components/exercise-options-modal";

import { ExercisePickerModal } from "@/features/workout-session/components/exercise-picker-modal";

import { RestTimer } from "@/features/workout-session/components/rest-timer";

import { SaveIndicator } from "@/features/workout-session/components/save-indicator";

import { WorkoutHeader } from "@/features/workout-session/components/workout-header";

import { useActiveWorkoutController } from "@/features/workout-session/hooks/use-active-workout-controller";

export default function ActiveWorkoutScreen() {
  const params = useLocalSearchParams<{
    sessionId?: string;
  }>();

  const sessionId =
    typeof params.sessionId === "string" ? params.sessionId : "";

  const controller = useActiveWorkoutController(sessionId);

  const {
    isLoading,

    draft,

    expandedId,
    setExpandedId,

    pickerOpen,
    setPickerOpen,

    optionsIndex,
    setOptionsIndex,

    rest,

    actionLoading,
    error,

    localSaveStatus,
    syncStatus,
    online,

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

    updateRestEndsAt,
    stopRest,

    elapsedLabel,
    volumeLabel,
  } = controller;

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

      "This workout will be discarded.",

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
      <WorkoutHeader
        elapsedLabel={elapsedLabel}
        volumeLabel={volumeLabel}
        completedSets={completedSets}
        actionLoading={actionLoading}
        onExit={() => {
          router.replace("/train");
        }}
        onCancel={confirmCancel}
        onFinish={confirmFinish}
      />

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
              updateDraft({
                name,
              });
            }}
            selectionColor="#3B82F6"
            className="text-[23px] font-extrabold tracking-[-0.7px] text-white"
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
                    completeSet(
                      exercise,
                      updatedExercise,
                      seconds,
                      exerciseName,
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
            updateDraft({
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
