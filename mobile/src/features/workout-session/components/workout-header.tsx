import { Ionicons } from "@expo/vector-icons";

import { Pressable, Text, View } from "react-native";

interface Props {
  elapsedLabel: string;

  volumeLabel: string;

  completedSets: number;

  totalSets: number;

  actionLoading: boolean;

  onExit: () => void;

  onCancel: () => void;

  onFinish: () => void;
}

export function WorkoutHeader({
  elapsedLabel,
  volumeLabel,
  completedSets,
  totalSets,
  actionLoading,
  onExit,
  onCancel,
  onFinish,
}: Props) {
  const progress = totalSets > 0 ? completedSets / totalSets : 0;

  return (
    <View className="border-b border-white/[0.06] bg-[#07080A] px-4 pb-3 pt-2">
      <View className="flex-row items-center">
        <Pressable
          onPress={onExit}
          className="h-10 w-10 items-center justify-center rounded-full bg-white/[0.045]"
        >
          <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
        </Pressable>

        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-extrabold text-white">
            Log Workout
          </Text>

          <Text className="mt-0.5 text-[10px] text-white/30">
            {completedSets}/{totalSets} sets
            {" · "}
            {elapsedLabel}
          </Text>
        </View>

        <Pressable
          onPress={onCancel}
          className="h-10 w-10 items-center justify-center"
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={19}
            color="rgba(255,255,255,.45)"
          />
        </Pressable>

        <Pressable
          disabled={actionLoading}
          onPress={onFinish}
          className="ml-2 min-h-[40px] items-center justify-center rounded-xl bg-brand px-4"
          style={{
            opacity: actionLoading ? 0.55 : 1,
          }}
        >
          <Text className="text-[12px] font-extrabold text-white">Finish</Text>
        </Pressable>
      </View>

      <View className="mt-3 h-[3px] overflow-hidden rounded-full bg-white/[0.07]">
        <View
          className="h-full rounded-full bg-brand"
          style={{
            width: `${Math.min(100, progress * 100)}%`,
          }}
        />
      </View>

      <View className="mt-2 flex-row justify-between">
        <Text className="text-[9px] font-semibold uppercase tracking-[1px] text-white/20">
          {elapsedLabel}
        </Text>

        <Text className="text-[9px] font-semibold uppercase tracking-[1px] text-white/20">
          {volumeLabel}
        </Text>
      </View>
    </View>
  );
}
