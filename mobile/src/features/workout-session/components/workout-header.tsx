import { Ionicons } from "@expo/vector-icons";

import { ActivityIndicator, Pressable, Text, View } from "react-native";

interface Props {
  elapsedLabel: string;

  volumeLabel: string;

  completedSets: number;

  actionLoading: boolean;

  onExit: () => void;

  onCancel: () => void;

  onFinish: () => void;
}

function Metric({
  title,
  value,
}: {
  title: string;

  value: string;
}) {
  return (
    <View className="flex-1">
      <Text className="text-[10px] font-medium text-white/25">{title}</Text>

      <Text className="mt-1 text-[13px] font-bold text-white/70">{value}</Text>
    </View>
  );
}

export function WorkoutHeader({
  elapsedLabel,
  volumeLabel,
  completedSets,
  actionLoading,
  onExit,
  onCancel,
  onFinish,
}: Props) {
  return (
    <View className="border-b border-white/[0.07]">
      <View className="flex-row items-center px-4 py-2">
        <Pressable
          onPress={onExit}
          className="h-10 w-10 items-center justify-center"
        >
          <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
        </Pressable>

        <Text className="ml-1 flex-1 text-[16px] font-extrabold text-white">
          Log Workout
        </Text>

        <Pressable
          onPress={onCancel}
          className="mr-2 h-9 w-9 items-center justify-center"
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color="rgba(255,255,255,.55)"
          />
        </Pressable>

        <Pressable
          disabled={actionLoading}
          onPress={onFinish}
          className="min-h-[38px] min-w-[70px] items-center justify-center rounded-xl bg-brand px-4"
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-[13px] font-extrabold text-white">
              Finish
            </Text>
          )}
        </Pressable>
      </View>

      <View className="flex-row px-5 pb-3 pt-1">
        <Metric title="Duration" value={elapsedLabel} />

        <Metric title="Volume" value={volumeLabel} />

        <Metric title="Sets" value={String(completedSets)} />
      </View>
    </View>
  );
}
