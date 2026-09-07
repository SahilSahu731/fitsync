import {
  Ionicons,
} from "@expo/vector-icons";

import {
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  WorkoutSetRow,
} from "./workout-set-row";

import {
  randomLocalId,
} from "../utils";

import type {
  WorkoutExercise,
  WorkoutSet,
} from "../types";


interface Props {
  exercise: WorkoutExercise;

  onChange:
    (
      exercise:
        WorkoutExercise,
    ) => void;

  onRemove:
    () => void;

  onCompletedSet:
    (
      restSeconds:
        number,
      updatedExercise: WorkoutExercise,
    ) => void;
}


export function ActiveExerciseCard({
  exercise,
  onChange,
  onRemove,
  onCompletedSet,
}: Props) {
  function updateSet(
    setId: string,
    patch:
      Partial<
        WorkoutSet
      >,
  ) {
    onChange({
      ...exercise,

      sets:
        exercise.sets.map(
          (
            workoutSet,
          ) =>
            workoutSet.id ===
            setId
              ? {
                  ...workoutSet,
                  ...patch,
                }
              : workoutSet,
        ),
    });
  }


  function removeSet(
    setId: string,
  ) {
    if (
      exercise.sets.length <=
      1
    ) {
      return;
    }

    onChange({
      ...exercise,

      sets:
        exercise.sets
          .filter(
            (
              workoutSet,
            ) =>
              workoutSet.id !==
              setId,
          )
          .map(
            (
              workoutSet,
              index,
            ) => ({
              ...workoutSet,

              position:
                index,
            }),
          ),
    });
  }


  function addSet() {
    const previous =
      exercise.sets[
        exercise.sets.length -
          1
      ];

    const next: WorkoutSet = {
      id:
        randomLocalId(),

      position:
        exercise.sets.length,

      type:
        "NORMAL",

      target_reps_min:
        previous
          ?.target_reps_min ??
        null,

      target_reps_max:
        previous
          ?.target_reps_max ??
        null,

      target_weight:
        previous
          ?.target_weight ??
        null,

      target_rpe:
        previous
          ?.target_rpe ??
        null,

      target_rir:
        previous
          ?.target_rir ??
        null,

      reps:
        null,

      weight:
        null,

      weight_unit:
        previous
          ?.weight_unit ??
        "KG",

      rpe:
        null,

      rir:
        null,

      completed:
        false,

      completed_at:
        null,
    };

    onChange({
      ...exercise,

      sets: [
        ...exercise.sets,
        next,
      ],
    });
  }


  return (
    <View className="rounded-[26px] border border-white/10 bg-white/[0.025] p-4">
      <View className="flex-row items-center">
        {exercise.thumbnail_url ? (
          <Image
            source={{
              uri:
                exercise.thumbnail_url,
            }}
            className="h-12 w-12 rounded-xl bg-elevated"
          />
        ) : (
          <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
            <Ionicons
              name="barbell-outline"
              size={21}
              color="#60A5FA"
            />
          </View>
        )}

        <View className="ml-3 flex-1">
          <Text className="text-[16px] font-extrabold text-white">
            {exercise.exercise_name}
          </Text>

          <Text className="mt-1 text-[11px] text-white/30">
            Rest{" "}
            {exercise.rest_seconds}s
          </Text>
        </View>

        <Pressable
          onPress={
            onRemove
          }
          className="h-9 w-9 items-center justify-center rounded-xl bg-red-400/[0.06]"
        >
          <Ionicons
            name="trash-outline"
            size={16}
            color="#F87171"
          />
        </Pressable>
      </View>

      <View className="mt-5 flex-row items-center px-2">
        <Text className="w-9 text-center text-[9px] font-bold uppercase tracking-[1px] text-white/25">
          Set
        </Text>

        <Text className="mx-1 flex-1 text-center text-[9px] font-bold uppercase tracking-[1px] text-white/25">
          {exercise.sets[0]
            ?.weight_unit ??
            "KG"}
        </Text>

        <Text className="mx-1 flex-1 text-center text-[9px] font-bold uppercase tracking-[1px] text-white/25">
          Reps
        </Text>

        <Text className="mx-1 flex-1 text-center text-[9px] font-bold uppercase tracking-[1px] text-white/25">
          RPE
        </Text>

        <View className="w-[51px]" />
      </View>

      <View className="mt-2 gap-1">
        {exercise.sets.map(
          (
            workoutSet,
            index,
          ) => (
            <WorkoutSetRow
              key={
                workoutSet.id
              }
              workoutSet={
                workoutSet
              }
              index={
                index
              }
              onChange={(
                patch,
              ) => {
                updateSet(
                  workoutSet.id,
                  patch,
                );
              }}
              onToggleComplete={() => {
                const completing = !workoutSet.completed;
                const updatedExercise = {
                  ...exercise,
                  sets: exercise.sets.map((current) =>
                    current.id === workoutSet.id
                      ? { ...current, completed: completing }
                      : current,
                  ),
                };

                onChange(updatedExercise);

                if (completing) {
                  onCompletedSet(exercise.rest_seconds, updatedExercise);
                }
              }}
              onRemove={() => {
                removeSet(
                  workoutSet.id
                );
              }}
            />
          ),
        )}
      </View>

      <Pressable
        onPress={
          addSet
        }
        className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-white/[0.035] py-3"
      >
        <Ionicons
          name="add"
          size={16}
          color="#60A5FA"
        />

        <Text className="text-[12px] font-bold text-brand-bright">
          Add set
        </Text>
      </Pressable>

      <TextInput
        value={
          exercise.notes ??
          ""
        }
        onChangeText={(
          value,
        ) => {
          onChange({
            ...exercise,

            notes:
              value ||
              null,
          });
        }}
        placeholder="Exercise notes"
        placeholderTextColor="rgba(255,255,255,.2)"
        multiline
        className="mt-3 min-h-[58px] rounded-xl bg-white/[0.03] px-3 py-3 text-[12px] leading-5 text-white"
      />
    </View>
  );
}