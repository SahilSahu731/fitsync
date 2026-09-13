import { Pressable, Text } from "react-native";

import type { ExerciseTrackingType } from "@/features/exercises/types";

import { formatPreviousSetMetrics } from "@/features/workouts/set-display";

import type { PreviousSet } from "@/features/workouts/types";

interface Props {
  trackingType: ExerciseTrackingType;

  previous: PreviousSet | undefined;

  onCopy: () => void;
}

export function PreviousSetCell({ trackingType, previous, onCopy }: Props) {
  return (
    <Pressable
      disabled={!previous}
      onPress={onCopy}
      className="w-[82px] items-center justify-center px-1"
      style={{
        opacity: previous ? 1 : 0.45,
      }}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        className="text-center text-[10px] font-semibold text-white/35"
      >
        {previous ? formatPreviousSetMetrics(trackingType, previous) : "—"}
      </Text>
    </Pressable>
  );
}
