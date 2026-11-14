import React from "react";
import { View } from "react-native";
import { Txt } from "@/src/components/ui";
import type { SessionExercise } from "../api";
import { MuscleFocus } from "./muscle-focus";
import { WorkoutGlassSurface } from "./workout-glass";

export const SessionOverview = React.memo(function SessionOverview({
  name,
  completedSets,
  totalSets,
  volume,
  exercises = [],
  currentId,
}: {
  name: string;
  completedSets: number;
  totalSets: number;
  volume: number;
  exercises?: SessionExercise[] | null;
  currentId?: string;
}) {
  const progress = totalSets ? Math.round((completedSets / totalSets) * 100) : 0;
  return (
    <View className="mb-2 pt-2">
      <Txt weight="semibold" className="mb-2 text-[24px] leading-9 tracking-[-0.8px]">
        {name}
      </Txt>
      <View className="overflow-hidden rounded-3xl border border-white/10 p-4">
        <WorkoutGlassSurface />
        <View className="flex-row items-center gap-4">
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-2">
              <Txt className="text-[11px] text-muted">Sets logged</Txt>
              <Txt
                weight="semibold"
                className="min-w-0 flex-1 text-right text-lg"
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {completedSets}
                <Txt className="text-xs text-muted"> / {totalSets}</Txt>
              </Txt>
            </View>
            <View className="mt-2 flex-row items-center gap-2">
              <Txt className="text-[11px] text-muted">Volume</Txt>
              <Txt
                weight="semibold"
                className="min-w-0 flex-1 text-right text-lg"
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {Math.round(volume).toLocaleString()}
                <Txt className="text-[10px] text-muted"> kg</Txt>
              </Txt>
            </View>
            <View className="mb-2 mt-4 flex-row items-center justify-between gap-2">
              <Txt className="min-w-0 flex-1 text-[10px] text-muted">
                {totalSets > 0 && completedSets === totalSets
                  ? "All sets logged"
                  : "Session progress"}
              </Txt>
              <Txt weight="medium" className="text-[11px] text-ink">
                {progress}%
              </Txt>
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Sets logged"
              accessibilityValue={{ min: 0, max: Math.max(1, totalSets), now: completedSets }}
              className="h-1.5 overflow-hidden rounded-full bg-white/10"
            >
              <View className="h-full rounded-full bg-white/80" style={{ width: `${progress}%` }} />
            </View>
          </View>
          <View className="shrink-0 self-stretch justify-center border-l border-white/10 pl-3">
            <MuscleFocus exercises={exercises} currentId={currentId} />
          </View>
        </View>
      </View>
    </View>
  );
});
