import { Ionicons } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import { useEffect, useState } from "react";

import { Pressable, Text, View } from "react-native";

import { formatDuration } from "@/features/workouts/utils";

import { adjustRestEndsAt, remainingRestSeconds } from "../rest/rest-time";

interface Props {
  restEndsAt: string;

  exerciseName: string;

  onAdjust: (value: string) => void;

  onClose: () => void;
}

export function RestTimer({
  restEndsAt,
  exerciseName,
  onAdjust,
  onClose,
}: Props) {
  const [remaining, setRemaining] = useState(remainingRestSeconds(restEndsAt));

  const [announced, setAnnounced] = useState(false);

  useEffect(() => {
    const tick = () => {
      const next = remainingRestSeconds(restEndsAt);

      setRemaining(next);

      if (next === 0 && !announced) {
        setAnnounced(true);

        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }

      if (next > 0 && announced) {
        setAnnounced(false);
      }
    };

    tick();

    const id = setInterval(tick, 500);

    return () => {
      clearInterval(id);
    };
  }, [restEndsAt, announced]);

  function adjust(seconds: number) {
    onAdjust(adjustRestEndsAt(restEndsAt, seconds));

    void Haptics.selectionAsync();
  }

  return (
    <View className="absolute bottom-3 left-3 right-3 z-50 overflow-hidden rounded-[20px] border border-brand-bright/20 bg-[#121722] shadow-2xl">
      <View className="flex-row items-center px-4 py-3">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand/15">
          <Ionicons
            name={remaining > 0 ? "timer-outline" : "checkmark"}
            size={18}
            color="#60A5FA"
          />
        </View>

        <View className="ml-3 flex-1">
          <Text
            numberOfLines={1}
            className="text-[10px] font-semibold text-white/35"
          >
            {exerciseName}
          </Text>

          <Text className="mt-0.5 text-[20px] font-extrabold text-white">
            {remaining > 0 ? formatDuration(remaining) : "Rest complete"}
          </Text>
        </View>

        <Pressable
          onPress={() => {
            adjust(-15);
          }}
          className="h-10 min-w-[52px] items-center justify-center rounded-xl bg-white/[0.05]"
        >
          <Text className="text-[12px] font-bold text-white/55">−15</Text>
        </Pressable>

        <Pressable
          onPress={onClose}
          className="ml-2 h-10 min-w-[52px] items-center justify-center rounded-xl bg-brand/15"
        >
          <Text className="text-[12px] font-bold text-brand-bright">Skip</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            adjust(15);
          }}
          className="ml-2 h-10 min-w-[52px] items-center justify-center rounded-xl bg-white/[0.05]"
        >
          <Text className="text-[12px] font-bold text-white/55">+15</Text>
        </Pressable>
      </View>
    </View>
  );
}
