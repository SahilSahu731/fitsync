import {
  Ionicons,
} from "@expo/vector-icons";

import {
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import type {
  WorkoutSet,
} from "../types";


interface Props {
  workoutSet: WorkoutSet;

  index: number;

  onChange: (
    patch:
      Partial<
        WorkoutSet
      >,
  ) => void;

  onToggleComplete:
    () => void;

  onRemove:
    () => void;
}


export function WorkoutSetRow({
  workoutSet,
  index,
  onChange,
  onToggleComplete,
  onRemove,
}: Props) {
  const completed =
    workoutSet.completed;

  return (
    <View
      className="flex-row items-center rounded-xl px-2 py-2"
      style={{
        backgroundColor:
          completed
            ? "rgba(37,99,235,.11)"
            : "transparent",
      }}
    >
      <Pressable
        onPress={() => {
          const next =
            workoutSet.type ===
            "WARMUP"
              ? "NORMAL"
              : "WARMUP";

          onChange({
            type:
              next,
          });
        }}
        className="w-9 items-center"
      >
        <Text
          className="text-[11px] font-extrabold"
          style={{
            color:
              workoutSet.type ===
              "WARMUP"
                ? "#F59E0B"
                : "rgba(255,255,255,.4)",
          }}
        >
          {workoutSet.type ===
          "WARMUP"
            ? "W"
            : index + 1}
        </Text>
      </Pressable>

      <View className="mx-1 flex-1">
        <TextInput
          value={
            workoutSet.weight
              ?.toString() ??
            ""
          }
          onChangeText={(
            value,
          ) => {
            const cleaned =
              value.replace(
                /[^0-9.]/g,
                ""
              );

            onChange({
              weight:
                cleaned
                  ? Number(
                      cleaned
                    )
                  : null,
            });
          }}
          keyboardType="decimal-pad"
          placeholder={
            workoutSet.target_weight
              ?.toString() ??
            "-"
          }
          placeholderTextColor="rgba(255,255,255,.2)"
          selectTextOnFocus
          className="min-h-[42px] rounded-xl bg-white/[0.045] text-center text-[14px] font-bold text-white"
        />
      </View>

      <View className="mx-1 flex-1">
        <TextInput
          value={
            workoutSet.reps
              ?.toString() ??
            ""
          }
          onChangeText={(
            value,
          ) => {
            const cleaned =
              value.replace(
                /\D/g,
                ""
              );

            onChange({
              reps:
                cleaned
                  ? Number(
                      cleaned
                    )
                  : null,
            });
          }}
          keyboardType="number-pad"
          placeholder={
            workoutSet
              .target_reps_min
              ?.toString() ??
            "-"
          }
          placeholderTextColor="rgba(255,255,255,.2)"
          selectTextOnFocus
          className="min-h-[42px] rounded-xl bg-white/[0.045] text-center text-[14px] font-bold text-white"
        />
      </View>

      <View className="mx-1 flex-1">
        <TextInput
          value={
            workoutSet.rpe
              ?.toString() ??
            ""
          }
          onChangeText={(
            value,
          ) => {
            const cleaned =
              value.replace(
                /[^0-9.]/g,
                ""
              );

            onChange({
              rpe:
                cleaned
                  ? Math.min(
                      10,
                      Number(
                        cleaned
                      ),
                    )
                  : null,
            });
          }}
          keyboardType="decimal-pad"
          placeholder={
            workoutSet
              .target_rpe
              ?.toString() ??
            "-"
          }
          placeholderTextColor="rgba(255,255,255,.2)"
          selectTextOnFocus
          className="min-h-[42px] rounded-xl bg-white/[0.045] text-center text-[14px] font-bold text-white"
        />
      </View>

      <Pressable
        onPress={
          onToggleComplete
        }
        className="ml-2 h-10 w-10 items-center justify-center rounded-xl"
        style={{
          backgroundColor:
            completed
              ? "#2563EB"
              : "rgba(255,255,255,.06)",
        }}
      >
        <Ionicons
          name="checkmark"
          size={20}
          color={
            completed
              ? "#FFFFFF"
              : "rgba(255,255,255,.25)"
          }
        />
      </Pressable>

      <Pressable
        onPress={
          onRemove
        }
        className="ml-1 h-9 w-8 items-center justify-center"
      >
        <Ionicons
          name="close"
          size={15}
          color="rgba(255,255,255,.22)"
        />
      </Pressable>
    </View>
  );
}