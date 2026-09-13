import { Ionicons } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import { Image, Pressable, Text, TextInput, View } from "react-native";

import { WorkoutSetRow } from "./workout-set-row";

import { randomLocalId } from "@/features/workouts/utils";

import type {
  PreviousExercisePerformance,
  WorkoutExercise,
  WorkoutSet,
} from "@/features/workouts/types";
interface Props {
  exercise: WorkoutExercise;

  previous: PreviousExercisePerformance | undefined;

  expanded: boolean;

  onToggleExpanded: () => void;

  onChange: (exercise: WorkoutExercise) => void;

  onCompletedSet: (
    restSeconds: number,

    exerciseName: string,

    updatedExercise: WorkoutExercise,
  ) => void;

  onMenu: () => void;
}

export function ActiveExerciseCard({
  exercise,
  previous,
  expanded,
  onToggleExpanded,
  onChange,
  onCompletedSet,
  onMenu,
}: Props) {
  const completed = exercise.sets.filter(
    (workoutSet) => workoutSet.completed,
  ).length;

  function updateSet(setId: string, patch: Partial<WorkoutSet>) {
    onChange({
      ...exercise,

      sets: exercise.sets.map((workoutSet) =>
        workoutSet.id === setId
          ? {
              ...workoutSet,
              ...patch,
            }
          : workoutSet,
      ),
    });
  }

  function removeSet(setId: string) {
    if (exercise.sets.length <= 1) {
      return;
    }

    onChange({
      ...exercise,

      sets: exercise.sets
        .filter((workoutSet) => workoutSet.id !== setId)
        .map((workoutSet, index) => ({
          ...workoutSet,

          position: index,
        })),
    });
  }

  function addSet() {
    const previousSet = exercise.sets[exercise.sets.length - 1];

    const newSet: WorkoutSet = {
      id: randomLocalId(),

      position: exercise.sets.length,

      type: "NORMAL",

      target_reps_min: previousSet?.target_reps_min ?? null,

      target_reps_max: previousSet?.target_reps_max ?? null,

      target_weight: previousSet?.target_weight ?? null,

      target_duration_seconds: previousSet?.target_duration_seconds ?? null,

      target_distance_meters: previousSet?.target_distance_meters ?? null,

      target_rpe: previousSet?.target_rpe ?? null,

      target_rir: previousSet?.target_rir ?? null,

      reps: null,

      weight: null,

      weight_unit: previousSet?.weight_unit ?? "KG",

      duration_seconds: null,

      distance_meters: null,

      rpe: null,

      rir: null,

      completed: false,

      completed_at: null,
    };

    onChange({
      ...exercise,

      sets: [...exercise.sets, newSet],
    });

    void Haptics.selectionAsync();
  }

  return (
    <View
      className="overflow-hidden border-b border-white/[0.07]"
      style={{
        backgroundColor: expanded ? "#0B0B0B" : "#080808",
      }}
    >
      <Pressable
        onPress={onToggleExpanded}
        className="flex-row items-center px-4 py-4"
      >
        {exercise.thumbnail_url ? (
          <Image
            source={{
              uri: exercise.thumbnail_url,
            }}
            className="h-10 w-10 rounded-full bg-elevated"
          />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-white/[0.05]">
            <Ionicons name="barbell-outline" size={18} color="#737373" />
          </View>
        )}

        <View className="ml-3 flex-1">
          <Text
            numberOfLines={1}
            className="text-[15px] font-extrabold text-brand-bright"
          >
            {exercise.exercise_name}
          </Text>

          <View className="mt-1 flex-row items-center">
            <Text className="text-white/32 text-[11px]">
              {completed} / {exercise.sets.length} sets
            </Text>

            <View className="mx-2 h-1 w-1 rounded-full bg-white/15" />

            <Ionicons
              name="timer-outline"
              size={12}
              color="rgba(255,255,255,.28)"
            />

            <Text className="text-white/32 ml-1 text-[11px]">
              {exercise.rest_seconds >= 60
                ? `${exercise.rest_seconds / 60}m`
                : `${exercise.rest_seconds}s`}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={(event) => {
            event.stopPropagation();

            onMenu();
          }}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center"
        >
          <Ionicons
            name="ellipsis-vertical"
            size={17}
            color="rgba(255,255,255,.45)"
          />
        </Pressable>

        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={17}
          color="rgba(255,255,255,.3)"
        />
      </Pressable>

      {!expanded ? (
        <Pressable onPress={onToggleExpanded} className="px-[67px] pb-4">
          {completed > 0 ? (
            <View className="flex-row gap-1">
              {exercise.sets.map((workoutSet) => (
                <View
                  key={workoutSet.id}
                  className="h-1 flex-1 rounded-full"
                  style={{
                    backgroundColor: workoutSet.completed
                      ? "#3B82F6"
                      : "rgba(255,255,255,.08)",
                  }}
                />
              ))}
            </View>
          ) : (
            <Text className="text-[11px] text-white/20">Tap to log sets</Text>
          )}
        </Pressable>
      ) : null}

      {expanded ? (
        <View className="pb-4">
          <View className="px-4">
            {exercise.notes ? (
              <TextInput
                value={exercise.notes}
                onChangeText={(value) => {
                  onChange({
                    ...exercise,

                    notes: value || null,
                  });
                }}
                multiline
                placeholder="Add notes..."
                placeholderTextColor="rgba(255,255,255,.22)"
                className="mb-2 text-[12px] leading-5 text-white/45"
              />
            ) : (
              <TextInput
                value=""
                onChangeText={(value) => {
                  onChange({
                    ...exercise,

                    notes: value || null,
                  });
                }}
                placeholder="Add notes..."
                placeholderTextColor="rgba(255,255,255,.20)"
                className="mb-2 py-1 text-[12px] text-white"
              />
            )}

            <View className="mb-3 flex-row items-center">
              <Ionicons name="timer-outline" size={14} color="#60A5FA" />

              <Text className="ml-1.5 text-[11px] font-semibold text-brand-bright">
                Rest Timer:{" "}
                {exercise.rest_seconds >= 60
                  ? `${exercise.rest_seconds / 60} min`
                  : `${exercise.rest_seconds} sec`}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center px-4 pb-1">
            <Text className="text-white/22 w-[34px] text-center text-[9px] font-bold uppercase">
              Set
            </Text>

            <Text className="text-white/22 w-[84px] text-center text-[9px] font-bold uppercase">
              Previous
            </Text>

            <Text className="text-white/22 flex-1 text-center text-[9px] font-bold uppercase">
              Log
            </Text>

            <Text className="text-white/22 w-[43px] text-center text-[9px] font-bold uppercase">
              RPE
            </Text>

            <View className="w-10" />
          </View>

          <View className="px-3">
            {exercise.sets.map((workoutSet, index) => (
              <WorkoutSetRow
                key={workoutSet.id}
                workoutSet={workoutSet}
                previous={previous?.sets[index]}
                trackingType={exercise.tracking_type}
                index={index}
                onChange={(patch) => {
                  updateSet(workoutSet.id, patch);
                }}
                onToggleComplete={() => {
                  const updated = {
                    ...exercise,

                    sets: exercise.sets.map((item) =>
                      item.id === workoutSet.id
                        ? {
                            ...item,

                            completed: !item.completed,
                          }
                        : item,
                    ),
                  };

                  onChange(updated);

                  if (!workoutSet.completed) {
                    onCompletedSet(
                      exercise.rest_seconds,

                      exercise.exercise_name,

                      updated,
                    );
                  }
                }}
                onRemove={() => {
                  removeSet(workoutSet.id);
                }}
              />
            ))}
          </View>

          <Pressable
            onPress={addSet}
            className="mx-4 mt-2 min-h-[41px] items-center justify-center rounded-xl bg-white/[0.04]"
          >
            <Text className="text-[12px] font-bold text-white/50">
              + Add Set
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
