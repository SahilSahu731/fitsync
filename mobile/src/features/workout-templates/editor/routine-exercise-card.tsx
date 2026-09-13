import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { Pressable, Text, TextInput, View } from "react-native";

import { trackingLabel } from "@/features/exercises/tracking";
import { formatRestSeconds } from "../routine-format";
import {
  applyTemplateSetToAll,
  makeTemplateSet,
  type LocalTemplateExercise,
} from "./model";
import { TemplateSetRow } from "./template-set-row";

export function RoutineExerciseCard({
  exercise,
  expanded,
  index,
  totalExercises,
  onToggle,
  onChange,
  onMoveUp,
  onMoveDown,
  onReplace,
  onSupersetNext,
  onRemoveSuperset,
  onRemove,
}: {
  exercise: LocalTemplateExercise;
  expanded: boolean;
  index: number;
  totalExercises: number;
  onToggle: () => void;
  onChange: (exercise: LocalTemplateExercise) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onReplace: () => void;
  onSupersetNext: () => void;
  onRemoveSuperset: () => void;
  onRemove: () => void;
}) {
  const updateSet = (
    id: string,
    patch: Partial<LocalTemplateExercise["sets"][number]>,
  ) =>
    onChange({
      ...exercise,
      sets: exercise.sets.map((set) =>
        set.id === id ? { ...set, ...patch } : set,
      ),
    });
  const duplicateSet = (id: string) => {
    const position = exercise.sets.findIndex((set) => set.id === id);
    if (position < 0) return;
    const sets = [...exercise.sets];
    sets.splice(position + 1, 0, {
      ...sets[position],
      id: Crypto.randomUUID(),
    });
    onChange({ ...exercise, sets });
  };
  const actions = [
    ["Replace", onReplace],
    ["Move up", onMoveUp],
    ["Move down", onMoveDown],
    [
      exercise.supersetGroupId ? "Unlink" : "Superset next",
      exercise.supersetGroupId ? onRemoveSuperset : onSupersetNext,
    ],
    ["Remove", onRemove],
  ] as const;
  return (
    <View className="border-b border-white/[0.07] bg-[#090A0C]">
      {exercise.supersetGroupId ? (
        <Text className="bg-brand/[0.06] px-4 py-2 text-[9px] font-bold uppercase text-brand-bright/70">
          Superset
        </Text>
      ) : null}
      <Pressable onPress={onToggle} className="flex-row items-center px-4 py-4">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-muted">
          <Text className="font-extrabold text-brand-bright">{index + 1}</Text>
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-extrabold text-white">
            {exercise.exerciseName}
          </Text>
          <Text className="mt-1 text-[10px] text-white/30">
            {exercise.sets.length} sets · {trackingLabel(exercise.trackingType)}{" "}
            · {formatRestSeconds(exercise.restSeconds)}
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={17}
          color="rgba(255,255,255,.3)"
        />
      </Pressable>
      {expanded ? (
        <View className="px-4 pb-5">
          <TextInput
            value={exercise.notes}
            onChangeText={(notes) => onChange({ ...exercise, notes })}
            placeholder="Optional cue or reminder..."
            placeholderTextColor="rgba(255,255,255,.18)"
            multiline
            className="min-h-[55px] rounded-xl bg-white/[0.035] px-3 py-3 text-white/60"
          />
          <View className="mt-4 flex-row flex-wrap gap-2">
            {[0, 30, 60, 90, 120, 180, 300].map((seconds) => (
              <Pressable
                key={seconds}
                onPress={() => onChange({ ...exercise, restSeconds: seconds })}
                className="rounded-xl px-3 py-2"
                style={{
                  backgroundColor:
                    exercise.restSeconds === seconds
                      ? "#2563EB"
                      : "rgba(255,255,255,.045)",
                }}
              >
                <Text className="text-[11px] font-bold text-white/60">
                  {formatRestSeconds(seconds)}
                </Text>
              </Pressable>
            ))}
          </View>
          <View className="mt-5">
            {exercise.sets.map((set, setIndex) => (
              <TemplateSetRow
                key={set.id}
                set={set}
                trackingType={exercise.trackingType}
                index={setIndex}
                totalSets={exercise.sets.length}
                onChange={(patch) => updateSet(set.id, patch)}
                onApplyAll={() =>
                  onChange(applyTemplateSetToAll(exercise, set.id))
                }
                onDuplicate={() => duplicateSet(set.id)}
                onDelete={() =>
                  onChange({
                    ...exercise,
                    sets: exercise.sets.filter((item) => item.id !== set.id),
                  })
                }
              />
            ))}
          </View>
          <Pressable
            onPress={() =>
              onChange({
                ...exercise,
                sets: [...exercise.sets, makeTemplateSet()],
              })
            }
            className="min-h-[43px] items-center justify-center rounded-xl bg-white/[0.04]"
          >
            <Text className="font-bold text-white/45">+ Add Set</Text>
          </Pressable>
          <View className="mt-4 flex-row flex-wrap gap-2">
            {actions.map(([label, action]) => (
              <Pressable
                key={label}
                disabled={
                  (label === "Move up" && index === 0) ||
                  (label === "Move down" && index === totalExercises - 1) ||
                  (label === "Superset next" && index === totalExercises - 1)
                }
                onPress={action}
                className="rounded-xl bg-white/[0.04] px-3 py-2.5"
              >
                <Text
                  className={
                    label === "Remove"
                      ? "text-[10px] font-bold text-red-300"
                      : "text-[10px] font-bold text-white/50"
                  }
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
