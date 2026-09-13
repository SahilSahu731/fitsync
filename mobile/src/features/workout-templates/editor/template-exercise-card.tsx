import { Ionicons } from "@expo/vector-icons";

import { Pressable, Text, TextInput, View } from "react-native";

import {
  usesDistance,
  usesDuration,
  usesReps,
  usesWeight,
  weightLabel,
} from "@/features/exercises/tracking";

import {
  makeTemplateSet,
  type LocalTemplateExercise,
  type LocalTemplateSet,
} from "./model";

interface Props {
  exercise: LocalTemplateExercise;

  index: number;

  onMove: (index: number, direction: -1 | 1) => void;

  onRemove: (localId: string) => void;

  onChange: (localId: string, patch: Partial<LocalTemplateExercise>) => void;

  onSetChange: (
    exerciseId: string,
    setId: string,
    patch: Partial<LocalTemplateSet>,
  ) => void;
}

export function TemplateExerciseCard({
  exercise,
  index,
  onMove,
  onRemove,
  onChange,
  onSetChange,
}: Props) {
  return (
    <View className="rounded-[24px] border border-white/10 bg-white/[0.025] p-4">
      <View className="flex-row items-center">
        <View className="flex-1">
          <Text className="text-[16px] font-extrabold text-white">
            {exercise.exerciseName}
          </Text>

          <Text className="mt-1 text-[11px] text-white/30">
            {exercise.sets.length} sets · {exercise.restSeconds} sec rest
          </Text>
        </View>

        <Pressable
          onPress={() => {
            onMove(index, -1);
          }}
          className="h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]"
        >
          <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
        </Pressable>

        <Pressable
          onPress={() => {
            onMove(index, 1);
          }}
          className="ml-2 h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]"
        >
          <Ionicons name="arrow-down" size={16} color="#FFFFFF" />
        </Pressable>

        <Pressable
          onPress={() => {
            onRemove(exercise.localId);
          }}
          className="ml-2 h-9 w-9 items-center justify-center rounded-xl bg-red-400/[0.07]"
        >
          <Ionicons name="trash-outline" size={16} color="#F87171" />
        </Pressable>
      </View>

      <Text className="mt-5 text-[11px] font-bold uppercase tracking-[1.4px] text-white/30">
        Rest
      </Text>

      <View className="mt-2 flex-row gap-2">
        {[60, 90, 120, 180, 300].map((seconds) => {
          const selected = exercise.restSeconds === seconds;

          return (
            <Pressable
              key={seconds}
              onPress={() => {
                onChange(exercise.localId, {
                  restSeconds: seconds,
                });
              }}
              className="flex-1 items-center rounded-xl border py-2"
              style={{
                borderColor: selected
                  ? "rgba(59,130,246,.55)"
                  : "rgba(255,255,255,.08)",

                backgroundColor: selected
                  ? "rgba(37,99,235,.12)"
                  : "rgba(255,255,255,.025)",
              }}
            >
              <Text
                className="text-[11px] font-bold"
                style={{
                  color: selected ? "#60A5FA" : "rgba(255,255,255,.45)",
                }}
              >
                {seconds < 120 ? `${seconds}s` : `${seconds / 60}m`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-4">
        {exercise.sets.map((set, setIndex) => (
          <View key={set.id} className="mt-2 flex-row items-center">
            <View className="w-8">
              <Text className="text-[12px] font-bold text-white/45">
                {setIndex + 1}
              </Text>
            </View>

            {usesWeight(exercise.trackingType) ? (
              <TextInput
                value={set.weight}
                onChangeText={(value) => {
                  onSetChange(exercise.localId, set.id, {
                    weight: value.replace(/[^0-9.]/g, ""),
                  });
                }}
                keyboardType="decimal-pad"
                placeholder={weightLabel(exercise.trackingType, "KG")}
                placeholderTextColor="rgba(255,255,255,.2)"
                className="mx-1 min-h-[42px] flex-1 rounded-xl bg-white/[0.045] text-center text-[12px] font-semibold text-white"
              />
            ) : null}

            {usesReps(exercise.trackingType) ? (
              <>
                <TextInput
                  value={set.repsMin}
                  onChangeText={(value) => {
                    onSetChange(exercise.localId, set.id, {
                      repsMin: value.replace(/\D/g, ""),
                    });
                  }}
                  keyboardType="number-pad"
                  placeholder="Min"
                  placeholderTextColor="rgba(255,255,255,.2)"
                  className="mx-1 min-h-[42px] flex-1 rounded-xl bg-white/[0.045] text-center text-[12px] font-semibold text-white"
                />

                <TextInput
                  value={set.repsMax}
                  onChangeText={(value) => {
                    onSetChange(exercise.localId, set.id, {
                      repsMax: value.replace(/\D/g, ""),
                    });
                  }}
                  keyboardType="number-pad"
                  placeholder="Max"
                  placeholderTextColor="rgba(255,255,255,.2)"
                  className="mx-1 min-h-[42px] flex-1 rounded-xl bg-white/[0.045] text-center text-[12px] font-semibold text-white"
                />
              </>
            ) : null}

            {usesDuration(exercise.trackingType) ? (
              <TextInput
                value={set.duration}
                onChangeText={(value) => {
                  onSetChange(exercise.localId, set.id, {
                    duration: value.replace(/\D/g, ""),
                  });
                }}
                keyboardType="number-pad"
                placeholder="Seconds"
                placeholderTextColor="rgba(255,255,255,.2)"
                className="mx-1 min-h-[42px] flex-1 rounded-xl bg-white/[0.045] text-center text-[12px] font-semibold text-white"
              />
            ) : null}

            {usesDistance(exercise.trackingType) ? (
              <TextInput
                value={set.distance}
                onChangeText={(value) => {
                  onSetChange(exercise.localId, set.id, {
                    distance: value.replace(/[^0-9.]/g, ""),
                  });
                }}
                keyboardType="decimal-pad"
                placeholder="Meters"
                placeholderTextColor="rgba(255,255,255,.2)"
                className="mx-1 min-h-[42px] flex-1 rounded-xl bg-white/[0.045] text-center text-[12px] font-semibold text-white"
              />
            ) : null}

            <Pressable
              onPress={() => {
                onChange(exercise.localId, {
                  sets: exercise.sets.filter((item) => item.id !== set.id),
                });
              }}
              className="h-8 w-8 items-center justify-center"
            >
              <Ionicons name="close" size={16} color="rgba(255,255,255,.35)" />
            </Pressable>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => {
          onChange(exercise.localId, {
            sets: [...exercise.sets, makeTemplateSet()],
          });
        }}
        className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-white/[0.04] py-3"
      >
        <Ionicons name="add" size={16} color="#60A5FA" />

        <Text className="text-[12px] font-bold text-brand-bright">Add set</Text>
      </Pressable>

      <TextInput
        value={exercise.notes}
        onChangeText={(value) => {
          onChange(exercise.localId, {
            notes: value,
          });
        }}
        placeholder="Exercise notes (optional)"
        placeholderTextColor="rgba(255,255,255,.22)"
        multiline
        className="mt-4 min-h-[70px] rounded-xl bg-white/[0.035] px-3 py-3 text-[12px] leading-5 text-white"
      />
    </View>
  );
}
