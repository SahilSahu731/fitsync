import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";

import {
  usesDistance,
  usesDuration,
  usesReps,
  usesWeight,
  weightLabel,
} from "@/features/exercises/tracking";
import type { ExerciseTrackingType } from "@/features/exercises/types";

import type { LocalTemplateSet } from "./model";

interface Props {
  set: LocalTemplateSet;
  trackingType: ExerciseTrackingType;
  index: number;
  totalSets: number;
  onChange: (patch: Partial<LocalTemplateSet>) => void;
  onApplyAll: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function Field({
  label,
  value,
  decimal = false,
  onChangeText,
}: {
  label: string;
  value: string;
  decimal?: boolean;
  onChangeText: (value: string) => void;
}) {
  return (
    <View className="min-w-[100px] flex-1">
      <Text className="mb-1.5 text-[9px] font-bold uppercase text-white/20">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={decimal ? "decimal-pad" : "number-pad"}
        placeholder="-"
        placeholderTextColor="rgba(255,255,255,.18)"
        className="min-h-[43px] rounded-xl bg-white/[0.045] px-3 text-center text-[13px] font-bold text-white"
      />
    </View>
  );
}

export function TemplateSetRow({
  set,
  trackingType,
  index,
  totalSets,
  onChange,
  onApplyAll,
  onDuplicate,
  onDelete,
}: Props) {
  return (
    <View className="mb-2 rounded-2xl bg-white/[0.025] p-3">
      <View className="flex-row items-center">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05]">
          <Text className="text-[11px] font-extrabold text-white/55">
            {index + 1}
          </Text>
        </View>
        <Text className="ml-3 flex-1 text-[11px] font-bold uppercase text-white/25">
          Target set
        </Text>
        <Pressable
          onPress={onDuplicate}
          className="h-8 w-8 items-center justify-center"
        >
          <Ionicons
            name="copy-outline"
            size={15}
            color="rgba(255,255,255,.35)"
          />
        </Pressable>
        <Pressable
          disabled={totalSets <= 1}
          onPress={onDelete}
          className="h-8 w-8 items-center justify-center"
          style={{ opacity: totalSets <= 1 ? 0.25 : 1 }}
        >
          <Ionicons
            name="trash-outline"
            size={15}
            color="rgba(248,113,113,.75)"
          />
        </Pressable>
      </View>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {usesWeight(trackingType) ? (
          <Field
            label={weightLabel(trackingType, "KG")}
            value={set.weight}
            decimal
            onChangeText={(value) =>
              onChange({ weight: value.replace(/[^0-9.]/g, "") })
            }
          />
        ) : null}
        {usesReps(trackingType) ? (
          <>
            <Field
              label="Min reps"
              value={set.repsMin}
              onChangeText={(value) =>
                onChange({ repsMin: value.replace(/\D/g, "") })
              }
            />
            <Field
              label="Max reps"
              value={set.repsMax}
              onChangeText={(value) =>
                onChange({ repsMax: value.replace(/\D/g, "") })
              }
            />
          </>
        ) : null}
        {usesDuration(trackingType) ? (
          <Field
            label="Seconds"
            value={set.duration}
            onChangeText={(value) =>
              onChange({ duration: value.replace(/\D/g, "") })
            }
          />
        ) : null}
        {usesDistance(trackingType) ? (
          <Field
            label="Meters"
            value={set.distance}
            decimal
            onChangeText={(value) =>
              onChange({ distance: value.replace(/[^0-9.]/g, "") })
            }
          />
        ) : null}
        <Field
          label="RPE"
          value={set.rpe}
          decimal
          onChangeText={(value) =>
            onChange({ rpe: value.replace(/[^0-9.]/g, "") })
          }
        />
      </View>
      {index === 0 ? (
        <Pressable
          onPress={onApplyAll}
          className="mt-3 self-start rounded-lg bg-brand-muted px-3 py-2"
        >
          <Text className="text-[10px] font-bold text-brand-bright">
            Apply set 1 targets to all
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
