import React from "react";
import { Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { WorkoutGlassSurface } from "./workout-glass";
import { workoutTime } from "../session-progress";

const TIMER_COLOR = "#de2525";
const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function RestTimer({
  remaining,
  duration,
  onExtend,
  onSkip,
}: {
  remaining: number;
  duration: number;
  onExtend: () => void;
  onSkip: () => void;
}) {
  const progress = Math.max(0, Math.min(1, remaining / Math.max(1, duration)));

  return (
    <View className="mx-4 mb-2 overflow-hidden rounded-2xl border border-[#de2525]/40">
      <WorkoutGlassSurface />
      <View className="flex-row items-center gap-3 px-3 py-3">
        <View pointerEvents="none" className="h-11 w-11 items-center justify-center">
          <Svg
            width={44}
            height={44}
            viewBox="0 0 44 44"
            accessible={false}
            style={{ position: "absolute" }}
          >
            <Circle
              cx={22}
              cy={22}
              r={RING_RADIUS}
              fill="none"
              stroke={TIMER_COLOR}
              strokeOpacity={0.18}
              strokeWidth={2.5}
            />
            {progress > 0 && (
              <Circle
                cx={22}
                cy={22}
                r={RING_RADIUS}
                fill="none"
                stroke={TIMER_COLOR}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
                rotation={-90}
                origin="22, 22"
              />
            )}
          </Svg>
          <MaterialCommunityIcons name="timer-outline" size={21} color={"white"} />
        </View>
        <View className="min-w-0 flex-1">
          <Txt className="text-[9px] text-white">REST & RECOVER</Txt>
          <Txt
            weight="semibold"
            className="text-2xl leading-8 text-white"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {workoutTime(remaining)}
          </Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add thirty seconds rest"
          onPress={onExtend}
          className="min-h-9 items-center justify-center rounded-xl border bg-white px-3"
        >
          <Txt weight="medium" className="text-xs text-black">
            +30s
          </Txt>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip rest timer"
          onPress={onSkip}
          className="min-h-9 flex-row border border-white/30 items-center justify-center gap-1 rounded-xl px-2"
        >
          <Txt weight="medium" className="text-xs text-ink">
            Skip
          </Txt>
          <MaterialCommunityIcons name="skip-next" size={17} color={C.ink} />
        </Pressable>
      </View>
    </View>
  );
}
