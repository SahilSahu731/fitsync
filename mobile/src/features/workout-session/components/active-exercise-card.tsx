import { Ionicons } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import {
  Keyboard,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { useMemo, useRef, useState } from "react";

import type {
  PreviousExercisePerformance,
  WorkoutExercise,
  WorkoutSet,
} from "@/features/workouts/types";

import { trackingLabel } from "@/features/exercises/tracking";

import { canCompleteSet } from "../domain/completion";

import { buildNextWorkoutSet, duplicateWorkoutSet } from "../domain/new-set";

import { matchPreviousSet } from "../domain/previous-performance";

import { getTrackingColumns } from "../domain/tracking-layout";

import { WorkoutSetRow, type WorkoutSetRowHandle } from "./workout-set-row";

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

    setIndex: number,
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
  const [notesOpen, setNotesOpen] = useState(Boolean(exercise.notes));

  const rowRefs = useRef<Map<string, WorkoutSetRowHandle>>(new Map());

  const completed = exercise.sets.filter((set) => set.completed).length;

  const activeSetId = exercise.sets.find((set) => !set.completed)?.id ?? null;

  const columns = useMemo(
    () =>
      getTrackingColumns(
        exercise.tracking_type,

        exercise.sets[0]?.weight_unit ?? "KG",
      ),
    [exercise.tracking_type, exercise.sets],
  );

  function updateSet(
    setId: string,

    patch: Partial<WorkoutSet>,
  ) {
    onChange({
      ...exercise,

      sets: exercise.sets.map((set) =>
        set.id === setId
          ? {
              ...set,
              ...patch,
            }
          : set,
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
        .filter((set) => set.id !== setId)
        .map((set, index) => ({
          ...set,

          position: index,
        })),
    });
  }

  function duplicateSet(index: number) {
    const source = exercise.sets[index];

    if (!source) {
      return;
    }

    const duplicate = duplicateWorkoutSet(source, index + 1);

    const next = [...exercise.sets];

    next.splice(index + 1, 0, duplicate);

    onChange({
      ...exercise,

      sets: next.map((set, position) => ({
        ...set,
        position,
      })),
    });

    void Haptics.selectionAsync();
  }

  function addSet() {
    const previousSet = exercise.sets[exercise.sets.length - 1];

    const newSet = buildNextWorkoutSet(previousSet, exercise.sets.length);

    onChange({
      ...exercise,

      sets: [...exercise.sets, newSet],
    });

    void Haptics.selectionAsync();

    if (Keyboard.isVisible()) {
      setTimeout(() => {
        rowRefs.current.get(newSet.id)?.focusFirst();
      }, 100);
    }
  }

  function toggleComplete(
    workoutSet: WorkoutSet,

    setIndex: number,
  ) {
    const becomingComplete = !workoutSet.completed;

    if (
      becomingComplete &&
      !canCompleteSet(exercise.tracking_type, workoutSet)
    ) {
      return;
    }

    const now = new Date().toISOString();

    const updatedExercise: WorkoutExercise = {
      ...exercise,

      sets: exercise.sets.map((set) =>
        set.id === workoutSet.id
          ? {
              ...set,

              completed: becomingComplete,

              completed_at: becomingComplete ? now : null,
            }
          : set,
      ),
    };

    onChange(updatedExercise);

    if (becomingComplete) {
      onCompletedSet(
        exercise.rest_seconds,

        exercise.exercise_name,

        updatedExercise,

        setIndex,
      );

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (Keyboard.isVisible()) {
        const next = updatedExercise.sets.find(
          (set, index) => index > setIndex && !set.completed,
        );

        if (next) {
          setTimeout(() => {
            rowRefs.current.get(next.id)?.focusFirst();
          }, 120);
        }
      }
    }
  }

  return (
    <View
      className="border-b border-white/[0.06]"
      style={{
        backgroundColor: expanded ? "#0B0D10" : "#08090B",
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
            className="h-10 w-10 rounded-xl bg-elevated"
          />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05]">
            <Ionicons name="barbell-outline" size={18} color="#737373" />
          </View>
        )}

        <View className="ml-3 flex-1">
          <Text
            numberOfLines={1}
            className="text-[15px] font-extrabold text-white"
          >
            {exercise.exercise_name}
          </Text>

          <View className="mt-1 flex-row items-center">
            <Text className="text-[10px] font-semibold text-brand-bright">
              {trackingLabel(exercise.tracking_type)}
            </Text>

            <View className="mx-2 h-1 w-1 rounded-full bg-white/15" />

            <Text className="text-[10px] text-white/30">
              {completed}/{exercise.sets.length} sets
            </Text>

            <View className="mx-2 h-1 w-1 rounded-full bg-white/15" />

            <Text className="text-[10px] text-white/30">
              {exercise.rest_seconds === 0
                ? "No rest"
                : exercise.rest_seconds >= 60
                  ? `${exercise.rest_seconds / 60}m rest`
                  : `${exercise.rest_seconds}s rest`}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={(event) => {
            event.stopPropagation();

            onMenu();
          }}
          className="h-10 w-10 items-center justify-center"
          hitSlop={4}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={18}
            color="rgba(255,255,255,.42)"
          />
        </Pressable>

        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color="rgba(255,255,255,.25)"
        />
      </Pressable>

      {!expanded ? (
        <View className="px-[67px] pb-4">
          <View className="flex-row gap-1">
            {exercise.sets.map((set) => (
              <View
                key={set.id}
                className="h-1 flex-1 rounded-full"
                style={{
                  backgroundColor: set.completed
                    ? "#3B82F6"
                    : set.id === activeSetId
                      ? "rgba(96,165,250,.35)"
                      : "rgba(255,255,255,.07)",
                }}
              />
            ))}
          </View>
        </View>
      ) : null}

      {expanded ? (
        <View className="pb-5">
          <View className="mb-2 px-4">
            {notesOpen ? (
              <TextInput
                multiline
                value={exercise.notes ?? ""}
                onChangeText={(value) => {
                  onChange({
                    ...exercise,

                    notes: value || null,
                  });
                }}
                placeholder="Exercise notes..."
                placeholderTextColor="rgba(255,255,255,.2)"
                className="min-h-[45px] rounded-xl bg-white/[0.03] px-3 py-2 text-[12px] leading-5 text-white/60"
              />
            ) : (
              <Pressable
                onPress={() => {
                  setNotesOpen(true);
                }}
                className="self-start py-1"
              >
                <Text className="text-[11px] font-semibold text-white/25">
                  + Add note
                </Text>
              </Pressable>
            )}
          </View>

          <View className="mb-1 flex-row items-center px-3">
            <Text className="w-[34px] text-center text-[9px] font-bold uppercase text-white/20">
              Set
            </Text>

            <Text className="w-[82px] text-center text-[9px] font-bold uppercase text-white/20">
              Previous
            </Text>

            <View className="flex-1 flex-row gap-1.5">
              {columns.map((column) => (
                <Text
                  key={column.metric}
                  className="flex-1 text-center text-[9px] font-bold uppercase text-white/20"
                >
                  {column.label}
                </Text>
              ))}
            </View>

            <View className="w-10" />

            <View className="w-8" />
          </View>

          <View className="px-3">
            {exercise.sets.map((workoutSet, index) => {
              const previousSet = previous
                ? matchPreviousSet(exercise.sets, previous.sets, index)
                : undefined;

              return (
                <WorkoutSetRow
                  key={workoutSet.id}
                  ref={(value) => {
                    if (value) {
                      rowRefs.current.set(workoutSet.id, value);
                    } else {
                      rowRefs.current.delete(workoutSet.id);
                    }
                  }}
                  workoutSet={workoutSet}
                  previous={previousSet}
                  trackingType={exercise.tracking_type}
                  index={index}
                  active={workoutSet.id === activeSetId}
                  totalSets={exercise.sets.length}
                  onChange={(patch) => {
                    updateSet(workoutSet.id, patch);
                  }}
                  onToggleComplete={() => {
                    toggleComplete(workoutSet, index);
                  }}
                  onDuplicate={() => {
                    duplicateSet(index);
                  }}
                  onRemove={() => {
                    removeSet(workoutSet.id);
                  }}
                />
              );
            })}
          </View>

          <Pressable
            onPress={addSet}
            className="mx-4 mt-2 min-h-[43px] flex-row items-center justify-center rounded-xl bg-white/[0.035]"
          >
            <Ionicons name="add" size={16} color="rgba(255,255,255,.45)" />

            <Text className="ml-1 text-[12px] font-bold text-white/45">
              Add Set
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
