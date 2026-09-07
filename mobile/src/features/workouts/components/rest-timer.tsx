import {
  Ionicons,
} from "@expo/vector-icons";

import * as Haptics
  from "expo-haptics";

import {
  useEffect,
  useMemo,
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

  exerciseName: string;

  onClose: () => void;
}


export function RestTimer({
  seconds,
  exerciseName,
  onClose,
}: Props) {
  const [
    total,
    setTotal,
  ] = useState(
    seconds
  );

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

      const timeout =
        setTimeout(
          () => {
            setRemaining(
              (
                current,
              ) =>
                Math.max(
                  current -
                    1,
                  0,
                ),
            );
          },
          1000,
        );

      return () =>
        clearTimeout(
          timeout
        );
    },
    [
      remaining,
    ],
  );


  const progress =
    useMemo(
      () =>
        total > 0
          ? remaining /
            total
          : 0,
      [
        remaining,
        total,
      ],
    );


  function adjust(
    amount: number,
  ) {
    setRemaining(
      (
        current,
      ) =>
        Math.max(
          0,
          current +
            amount,
        ),
    );

    if (
      amount >
      0
    ) {
      setTotal(
        (
          current,
        ) =>
          current +
          amount,
      );
    }

    void Haptics
      .selectionAsync();
  }


  return (
    <View className="absolute bottom-4 left-4 right-4 z-50 overflow-hidden rounded-[22px] border border-brand-bright/25 bg-[#111827] shadow-2xl">
      <View className="flex-row items-center px-4 pt-4">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand/20">
          <Ionicons
            name="timer-outline"
            size={19}
            color="#60A5FA"
          />
        </View>

        <View className="ml-3 flex-1">
          <Text
            numberOfLines={
              1
            }
            className="text-[11px] font-semibold text-white/40"
          >
            {exerciseName}
          </Text>

          <Text className="mt-0.5 text-[22px] font-extrabold tracking-[-0.7px] text-white">
            {remaining ===
            0
              ? "Rest complete"
              : formatDuration(
                  remaining
                )}
          </Text>
        </View>

        <Pressable
          onPress={
            onClose
          }
          hitSlop={10}
          className="h-9 w-9 items-center justify-center rounded-full bg-white/[0.05]"
        >
          <Ionicons
            name="close"
            size={17}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      <View className="mx-4 mt-3 h-[3px] overflow-hidden rounded-full bg-white/10">
        <View
          className="h-full rounded-full bg-brand-bright"
          style={{
            width:
              `${Math.min(
                100,
                Math.max(
                  0,
                  progress *
                    100,
                ),
              )}%`,
          }}
        />
      </View>

      <View className="mt-3 flex-row border-t border-white/[0.06]">
        <Pressable
          onPress={() => {
            adjust(
              -15
            );
          }}
          className="min-h-[47px] flex-1 items-center justify-center"
        >
          <Text className="text-[13px] font-bold text-white/60">
            −15s
          </Text>
        </Pressable>

        <View className="w-px bg-white/[0.06]" />

        <Pressable
          onPress={
            onClose
          }
          className="min-h-[47px] flex-1 items-center justify-center"
        >
          <Text className="text-[13px] font-bold text-brand-bright">
            Skip
          </Text>
        </Pressable>

        <View className="w-px bg-white/[0.06]" />

        <Pressable
          onPress={() => {
            adjust(
              15
            );
          }}
          className="min-h-[47px] flex-1 items-center justify-center"
        >
          <Text className="text-[13px] font-bold text-white/60">
            +15s
          </Text>
        </Pressable>
      </View>
    </View>
  );
}