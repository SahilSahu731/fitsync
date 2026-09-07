import {
  Ionicons,
} from "@expo/vector-icons";

import * as Haptics
  from "expo-haptics";

import {
  useEffect,
  useState,
} from "react";

import {
  Pressable,
  Text,
  View,
} from "react-native";

import {
  formatDuration,
} from "../utils";


interface Props {
  seconds: number;

  onClose: () => void;
}


export function RestTimer({
  seconds,
  onClose,
}: Props) {
  const [
    remaining,
    setRemaining,
  ] = useState(
    seconds
  );

  useEffect(
    () => {
      if (
        remaining <=
        0
      ) {
        void Haptics
          .notificationAsync(
            Haptics
              .NotificationFeedbackType
              .Success,
          );

        return;
      }

      const timer =
        setTimeout(
          () => {
            setRemaining(
              (
                current,
              ) =>
                Math.max(
                  current - 1,
                  0,
                ),
            );
          },
          1_000,
        );

      return () => {
        clearTimeout(
          timer
        );
      };
    },
    [
      remaining,
    ],
  );

  return (
    <View className="absolute bottom-5 left-5 right-5 z-50 rounded-[24px] border border-brand-bright/30 bg-[#101A2E] p-4">
      <View className="flex-row items-center">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand/20">
          <Ionicons
            name="timer-outline"
            size={21}
            color="#60A5FA"
          />
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-bright">
            Rest timer
          </Text>

          <Text className="mt-1 text-[22px] font-extrabold text-white">
            {formatDuration(
              remaining
            )}
          </Text>
        </View>

        <Pressable
          onPress={() => {
            setRemaining(
              (
                current,
              ) =>
                current +
                30,
            );
          }}
          className="rounded-xl bg-white/[0.06] px-3 py-2"
        >
          <Text className="text-[12px] font-bold text-white">
            +30s
          </Text>
        </Pressable>

        <Pressable
          onPress={
            onClose
          }
          className="ml-2 h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]"
        >
          <Ionicons
            name="close"
            size={18}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      <View className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
        <View
          className="h-full rounded-full bg-brand-bright"
          style={{
            width:
              `${Math.max(
                0,
                Math.min(
                  100,
                  (
                    remaining /
                    seconds
                  ) *
                    100,
                ),
              )}%`,
          }}
        />
      </View>
    </View>
  );
}