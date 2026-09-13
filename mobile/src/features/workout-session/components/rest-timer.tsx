import { Ionicons } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import { useEffect, useMemo, useState } from "react";

import { Pressable, Text, View } from "react-native";

import { formatDuration } from "@/features/workouts/utils";

import { adjustRestEndsAt, remainingRestSeconds } from "../rest/rest-time";

interface Props {
  restEndsAt: string;

  exerciseName: string;

  onAdjust: (restEndsAt: string) => void;

  onClose: () => void;
}

export function RestTimer({
  restEndsAt,
  exerciseName,
  onAdjust,
  onClose,
}: Props) {
  const initial = remainingRestSeconds(restEndsAt);

  const [remaining, setRemaining] = useState(initial);

  const [startingSeconds, setStartingSeconds] = useState(Math.max(1, initial));

  const [notified, setNotified] = useState(false);

  useEffect(() => {
    const tick = () => {
      const next = remainingRestSeconds(restEndsAt);

      setRemaining(next);

      if (next <= 0 && !notified) {
        setNotified(true);

        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
    };

    tick();

    const interval = setInterval(tick, 500);

    return () => {
      clearInterval(interval);
    };
  }, [restEndsAt, notified]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const latest = remainingRestSeconds(restEndsAt);

      setStartingSeconds((current) => Math.max(current, latest));

      if (latest > 0) {
        setNotified(false);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [restEndsAt]);

  const progress = useMemo(
    () => (startingSeconds > 0 ? remaining / startingSeconds : 0),
    [remaining, startingSeconds],
  );

  function adjust(amount: number) {
    const next = adjustRestEndsAt(restEndsAt, amount);

    onAdjust(next);

    void Haptics.selectionAsync();
  }

  return (
    <View className="absolute bottom-4 left-4 right-4 z-50 overflow-hidden rounded-[22px] border border-brand-bright/25 bg-[#111827] shadow-2xl">
      <View className="flex-row items-center px-4 pt-4">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand/20">
          <Ionicons name="timer-outline" size={19} color="#60A5FA" />
        </View>

        <View className="ml-3 flex-1">
          <Text
            numberOfLines={1}
            className="text-[11px] font-semibold text-white/40"
          >
            {exerciseName}
          </Text>

          <Text className="mt-0.5 text-[22px] font-extrabold tracking-[-0.7px] text-white">
            {remaining === 0 ? "Rest complete" : formatDuration(remaining)}
          </Text>
        </View>

        <Pressable
          onPress={onClose}
          hitSlop={10}
          className="h-9 w-9 items-center justify-center rounded-full bg-white/[0.05]"
        >
          <Ionicons name="close" size={17} color="#FFFFFF" />
        </Pressable>
      </View>

      <View className="mx-4 mt-3 h-[3px] overflow-hidden rounded-full bg-white/10">
        <View
          className="h-full rounded-full bg-brand-bright"
          style={{
            width: `${Math.min(100, Math.max(0, progress * 100))}%`,
          }}
        />
      </View>

      <View className="mt-3 flex-row border-t border-white/[0.06]">
        <Pressable
          onPress={() => {
            adjust(-15);
          }}
          className="min-h-[47px] flex-1 items-center justify-center"
        >
          <Text className="text-[13px] font-bold text-white/60">−15s</Text>
        </Pressable>

        <View className="w-px bg-white/[0.06]" />

        <Pressable
          onPress={onClose}
          className="min-h-[47px] flex-1 items-center justify-center"
        >
          <Text className="text-[13px] font-bold text-brand-bright">Skip</Text>
        </Pressable>

        <View className="w-px bg-white/[0.06]" />

        <Pressable
          onPress={() => {
            adjust(15);
          }}
          className="min-h-[47px] flex-1 items-center justify-center"
        >
          <Text className="text-[13px] font-bold text-white/60">+15s</Text>
        </Pressable>
      </View>
    </View>
  );
}
