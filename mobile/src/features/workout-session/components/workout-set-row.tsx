import { Ionicons } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import { useState } from "react";

import { Pressable, Text, TextInput, View } from "react-native";

import {
  formatExerciseDuration,
  parseExerciseDuration,
} from "@/features/exercises/duration";

import { formatDistanceMeters } from "@/features/exercises/distance";

import {
  usesDistance,
  usesDuration,
  usesReps,
  usesWeight,
} from "@/features/exercises/tracking";

import type { ExerciseTrackingType } from "@/features/exercises/types";

import type { PreviousSet, WorkoutSet } from "@/features/workouts/types";

import { RpeModal } from "./rpe-modal";

import { SetTypeModal } from "./set-type-modal";

interface Props {
  workoutSet: WorkoutSet;

  previous: PreviousSet | undefined;

  trackingType: ExerciseTrackingType;

  index: number;

  onChange: (patch: Partial<WorkoutSet>) => void;

  onToggleComplete: () => void;

  onRemove: () => void;
}

function setLabel(
  workoutSet: WorkoutSet,

  index: number,
): string {
  switch (workoutSet.type) {
    case "WARMUP":
      return "W";

    case "DROP":
      return "D";

    case "FAILURE":
      return "F";

    case "BACKOFF":
      return "B";

    case "AMRAP":
      return "A";

    default:
      return String(index + 1);
  }
}

function previousLabel(
  previous: PreviousSet | undefined,

  trackingType: ExerciseTrackingType,
): string {
  if (!previous) {
    return "—";
  }

  if (trackingType === "DURATION") {
    return previous.duration_seconds !== null
      ? formatExerciseDuration(previous.duration_seconds)
      : "—";
  }

  if (trackingType === "DISTANCE_DURATION") {
    const distance =
      previous.distance_meters !== null
        ? formatDistanceMeters(previous.distance_meters)
        : "—";

    const duration =
      previous.duration_seconds !== null
        ? formatExerciseDuration(previous.duration_seconds)
        : "—";

    return `${distance} · ${duration}`;
  }

  if (trackingType === "WEIGHT_DURATION") {
    return (
      `${previous.weight ?? "—"} · ` +
      (previous.duration_seconds !== null
        ? formatExerciseDuration(previous.duration_seconds)
        : "—")
    );
  }

  if (trackingType === "WEIGHT_DISTANCE") {
    return (
      `${previous.weight ?? "—"} · ` +
      (previous.distance_meters !== null
        ? formatDistanceMeters(previous.distance_meters)
        : "—")
    );
  }

  if (trackingType === "REPS_ONLY") {
    return `${previous.reps ?? "—"} reps`;
  }

  if (trackingType === "BODYWEIGHT_REPS") {
    return previous.weight
      ? `+${previous.weight} × ${previous.reps ?? "—"}`
      : `BW × ${previous.reps ?? "—"}`;
  }

  if (trackingType === "ASSISTED_REPS") {
    return `${previous.weight ?? "—"} assist × ` + `${previous.reps ?? "—"}`;
  }

  return `${previous.weight ?? "—"} × ` + `${previous.reps ?? "—"}`;
}

export function WorkoutSetRow({
  workoutSet,
  previous,
  trackingType,
  index,
  onChange,
  onToggleComplete,
  onRemove,
}: Props) {
  const [setTypeOpen, setSetTypeOpen] = useState(false);

  const [rpeOpen, setRpeOpen] = useState(false);

  const [durationDraft, setDurationDraft] = useState({
    source: workoutSet.duration_seconds,

    text: formatExerciseDuration(workoutSet.duration_seconds),
  });

  const durationText =
    durationDraft.source === workoutSet.duration_seconds
      ? durationDraft.text
      : formatExerciseDuration(workoutSet.duration_seconds);

  function copyPrevious() {
    if (!previous) {
      return;
    }

    onChange({
      weight: previous.weight,

      weight_unit: previous.weight_unit,

      reps: previous.reps,

      duration_seconds: previous.duration_seconds,

      distance_meters: previous.distance_meters,

      rpe: previous.rpe,
    });

    void Haptics.selectionAsync();
  }

  return (
    <>
      <View
        className="min-h-[48px] flex-row items-center rounded-xl px-1"
        style={{
          backgroundColor: workoutSet.completed
            ? "rgba(37,99,235,.13)"
            : "transparent",
        }}
      >
        <Pressable
          onPress={() => {
            setSetTypeOpen(true);
          }}
          className="w-[34px] items-center justify-center"
        >
          <Text className="text-[11px] font-extrabold text-white/55">
            {setLabel(workoutSet, index)}
          </Text>
        </Pressable>

        <Pressable
          onPress={copyPrevious}
          className="w-[84px] items-center justify-center px-1"
        >
          <Text
            numberOfLines={1}
            className="text-white/27 text-[9px] font-medium"
          >
            {previousLabel(previous, trackingType)}
          </Text>
        </Pressable>

        {usesWeight(trackingType) ? (
          <View className="mx-1 flex-1">
            <TextInput
              value={workoutSet.weight?.toString() ?? ""}
              onChangeText={(value) => {
                const cleaned = value.replace(/[^0-9.]/g, "");

                onChange({
                  weight: cleaned ? Number(cleaned) : null,
                });
              }}
              keyboardType="decimal-pad"
              selectTextOnFocus
              placeholder={workoutSet.target_weight?.toString() ?? "-"}
              placeholderTextColor="rgba(255,255,255,.18)"
              className="min-h-[39px] rounded-lg bg-white/[0.045] text-center text-[13px] font-bold text-white"
            />
          </View>
        ) : null}

        {usesReps(trackingType) ? (
          <View className="mx-1 flex-1">
            <TextInput
              value={workoutSet.reps?.toString() ?? ""}
              onChangeText={(value) => {
                const cleaned = value.replace(/\D/g, "");

                onChange({
                  reps: cleaned ? Number(cleaned) : null,
                });
              }}
              keyboardType="number-pad"
              selectTextOnFocus
              placeholder={workoutSet.target_reps_min?.toString() ?? "-"}
              placeholderTextColor="rgba(255,255,255,.18)"
              className="min-h-[39px] rounded-lg bg-white/[0.045] text-center text-[13px] font-bold text-white"
            />
          </View>
        ) : null}

        {usesDuration(trackingType) ? (
          <View className="mx-1 flex-1">
            <TextInput
              value={durationText}
              onChangeText={(text) => {
                setDurationDraft({
                  source: workoutSet.duration_seconds,

                  text,
                });
              }}
              onBlur={() => {
                onChange({
                  duration_seconds: parseExerciseDuration(durationText),
                });
              }}
              keyboardType="numbers-and-punctuation"
              selectTextOnFocus
              placeholder={
                workoutSet.target_duration_seconds
                  ? formatExerciseDuration(workoutSet.target_duration_seconds)
                  : "0:00"
              }
              placeholderTextColor="rgba(255,255,255,.18)"
              className="min-h-[39px] rounded-lg bg-white/[0.045] text-center text-[13px] font-bold text-white"
            />
          </View>
        ) : null}

        {usesDistance(trackingType) ? (
          <View className="mx-1 flex-1">
            <TextInput
              value={workoutSet.distance_meters?.toString() ?? ""}
              onChangeText={(value) => {
                const cleaned = value.replace(/[^0-9.]/g, "");

                onChange({
                  distance_meters: cleaned ? Number(cleaned) : null,
                });
              }}
              keyboardType="decimal-pad"
              selectTextOnFocus
              placeholder={workoutSet.target_distance_meters?.toString() ?? "m"}
              placeholderTextColor="rgba(255,255,255,.18)"
              className="min-h-[39px] rounded-lg bg-white/[0.045] text-center text-[13px] font-bold text-white"
            />
          </View>
        ) : null}

        <Pressable
          onPress={() => {
            setRpeOpen(true);
          }}
          className="mx-1 h-[39px] w-[43px] items-center justify-center rounded-lg bg-white/[0.045]"
        >
          <Text className="text-[10px] font-bold text-white/30">
            {workoutSet.rpe ?? "RPE"}
          </Text>
        </Pressable>

        <Pressable
          onLongPress={onRemove}
          onPress={onToggleComplete}
          className="ml-1 h-9 w-9 items-center justify-center rounded-full"
          style={{
            backgroundColor: workoutSet.completed
              ? "#2563EB"
              : "rgba(255,255,255,.065)",
          }}
        >
          <Ionicons
            name="checkmark"
            size={18}
            color={workoutSet.completed ? "#FFFFFF" : "rgba(255,255,255,.25)"}
          />
        </Pressable>
      </View>

      <SetTypeModal
        visible={setTypeOpen}
        value={workoutSet.type}
        onClose={() => {
          setSetTypeOpen(false);
        }}
        onSelect={(type) => {
          onChange({
            type,
          });
        }}
      />

      <RpeModal
        visible={rpeOpen}
        value={workoutSet.rpe}
        onClose={() => {
          setRpeOpen(false);
        }}
        onSelect={(rpe) => {
          onChange({
            rpe,
          });
        }}
      />
    </>
  );
}
