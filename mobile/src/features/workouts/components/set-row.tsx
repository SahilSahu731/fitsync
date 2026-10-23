import React, { useEffect, useState } from "react";

import { ActivityIndicator, Pressable, TextInput, View } from "react-native";

import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

import { type WorkoutSet, type SetType } from "../api";

import { useWorkout } from "../workout-context";

const TYPES: {
  value: SetType;
  label: string;
}[] = [
  { value: "warmup", label: "W" },
  { value: "normal", label: "N" },
  { value: "heavy", label: "H" },
  { value: "failure", label: "F" },
  { value: "drop", label: "D" },
];

export function SetRow({
  set,
  number,
  restSeconds,
  trackingType = "reps_weight",
}: {
  set: WorkoutSet;
  number: number;
  restSeconds: number;
  trackingType?: string;
}) {
  const { updateSet, startRest, busy } = useWorkout();

  const [weight, setWeight] = useState(set.weight_kg?.toString() ?? "");

  const [reps, setReps] = useState(set.reps?.toString() ?? "");

  const [type, setType] = useState<SetType>(set.set_type);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWeight(set.weight_kg?.toString() ?? "");
    setReps(set.reps?.toString() ?? "");
    setType(set.set_type);
  }, [set.id, set.weight_kg, set.reps, set.set_type]);

  const completed = Boolean(set.completed_at);

  const selectType = async (value: SetType) => {
    if (saving || busy) return;

    setType(value);
    setSaving(true);

    try {
      await updateSet(set.id, { setType: value });
    } catch (error) {
      setType(set.set_type);
      console.warn(error);
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async () => {
    if (saving || busy) return;

    const parsedWeight = weight.trim() === "" ? null : Number(weight);

    const parsedReps = reps.trim() === "" ? null : Number(reps);

    if (
      (parsedWeight !== null &&
        (!Number.isFinite(parsedWeight) || parsedWeight < 0)) ||
      (parsedReps !== null && (!Number.isInteger(parsedReps) || parsedReps < 0))
    ) {
      return;
    }

    if (
      !completed &&
      trackingType === "reps_weight" &&
      (parsedWeight === null || parsedReps === null)
    ) {
      return;
    }

    setSaving(true);

    try {
      await updateSet(set.id, {
        setType: type,
        weightKg: parsedWeight,
        reps: parsedReps,
        completed: !completed,
      });

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (!completed && restSeconds > 0) {
        startRest(restSeconds);
      }
    } catch (error) {
      console.warn(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      className={`mb-2 rounded-2xl px-3 py-3 ${
        completed ? "bg-brand/10" : "bg-elevated"
      }`}
    >
      <View className="mb-3 flex-row items-center justify-between">
        <Txt weight="semibold" className="text-xs text-muted">
          SET {number}
        </Txt>

        <View className="flex-row gap-1">
          {TYPES.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => void selectType(item.value)}
              className={`h-7 w-7 items-center justify-center rounded-lg ${
                type === item.value ? "bg-brand" : "bg-panel"
              }`}
            >
              <Txt
                weight="bold"
                className={`text-[11px] ${
                  type === item.value ? "text-bg" : "text-muted"
                }`}
              >
                {item.label}
              </Txt>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Txt className="mb-1 text-[10px] text-muted">WEIGHT (KG)</Txt>

          <TextInput
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={C.muted}
            editable={!completed && !saving}
            className="h-12 rounded-xl bg-panel px-3 text-center font-outfit-bold text-lg text-ink"
          />
        </View>

        <View className="flex-1">
          <Txt className="mb-1 text-[10px] text-muted">REPS</Txt>

          <TextInput
            value={reps}
            onChangeText={setReps}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={C.muted}
            editable={!completed && !saving}
            className="h-12 rounded-xl bg-panel px-3 text-center font-outfit-bold text-lg text-ink"
          />
        </View>

        <Pressable
          onPress={() => void toggleComplete()}
          disabled={saving || busy}
          className={`mt-4 h-12 w-12 items-center justify-center rounded-xl ${
            completed ? "bg-brand" : "bg-panel"
          }`}
        >
          {saving ? (
            <ActivityIndicator color={C.ink} />
          ) : (
            <MaterialCommunityIcons
              name={completed ? "check" : "check-outline"}
              size={25}
              color={completed ? C.bg : C.muted}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}
