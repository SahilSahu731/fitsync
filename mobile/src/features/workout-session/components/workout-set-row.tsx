import { Ionicons } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import { useState } from "react";

import { Pressable, Text, TextInput, View } from "react-native";

import { RpeModal } from "./rpe-modal";

import { SetTypeModal } from "./set-type-modal";

import type { PreviousSet, WorkoutSet } from "@/features/workouts/types";

interface Props {
  workoutSet: WorkoutSet;

  previous: PreviousSet | undefined;

  index: number;

  onChange: (patch: Partial<WorkoutSet>) => void;

  onToggleComplete: () => void;

  onRemove: () => void;
}

function setLabel(workoutSet: WorkoutSet, index: number): string {
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

function previousLabel(previous: PreviousSet | undefined): string {
  if (!previous) {
    return "—";
  }

  const weight = previous.weight === null ? "—" : previous.weight;

  const reps = previous.reps === null ? "—" : previous.reps;

  return `${weight} × ${reps}`;
}

export function WorkoutSetRow({
  workoutSet,
  previous,
  index,
  onChange,
  onToggleComplete,
  onRemove,
}: Props) {
  const [setTypeOpen, setSetTypeOpen] = useState(false);

  const [rpeOpen, setRpeOpen] = useState(false);

  function copyPrevious() {
    if (!previous) {
      return;
    }

    onChange({
      weight: previous.weight,

      weight_unit: previous.weight_unit,

      reps: previous.reps,

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
          <Text
            className="text-[11px] font-extrabold"
            style={{
              color:
                workoutSet.type === "WARMUP"
                  ? "#F59E0B"
                  : workoutSet.type === "DROP"
                    ? "#60A5FA"
                    : "rgba(255,255,255,.55)",
            }}
          >
            {setLabel(workoutSet, index)}
          </Text>
        </Pressable>

        <Pressable
          onPress={copyPrevious}
          className="w-[76px] items-center justify-center"
        >
          <Text
            numberOfLines={1}
            className="text-white/27 text-[10px] font-medium"
          >
            {previousLabel(previous)}
          </Text>
        </Pressable>

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
            className="min-h-[39px] rounded-lg bg-white/[0.045] text-center text-[14px] font-bold text-white"
          />
        </View>

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
            className="min-h-[39px] rounded-lg bg-white/[0.045] text-center text-[14px] font-bold text-white"
          />
        </View>

        <Pressable
          onPress={() => {
            setRpeOpen(true);
          }}
          className="mx-1 h-[39px] w-[43px] items-center justify-center rounded-lg bg-white/[0.045]"
        >
          <Text
            className="text-[11px] font-bold"
            style={{
              color:
                workoutSet.rpe !== null ? "#60A5FA" : "rgba(255,255,255,.25)",
            }}
          >
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
