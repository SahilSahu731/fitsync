import { Text, View } from "react-native";

import Svg, { Rect } from "react-native-svg";

import type { WeeklyProgressPoint, WeightUnit } from "../types";

import { formatNumber } from "../utils";

interface Props {
  points: WeeklyProgressPoint[];

  unit: WeightUnit;
}

export function VolumeChart({ points, unit }: Props) {
  const selected = points.slice(-12);

  const max = Math.max(...selected.map((point) => point.volume), 1);

  const width = 340;

  const height = 150;

  const gap = 6;

  const barWidth =
    (width - gap * (selected.length - 1)) / Math.max(selected.length, 1);

  const latest = selected[selected.length - 1];

  return (
    <View className="rounded-[24px] border border-white/[0.07] bg-white/[0.02] p-5">
      <View className="flex-row items-end">
        <View className="flex-1">
          <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-white/25">
            Training volume
          </Text>

          <Text className="mt-2 text-[20px] font-extrabold text-white">
            {latest ? `${formatNumber(latest.volume)} ${unit}` : "—"}
          </Text>
        </View>

        <Text className="text-[10px] text-white/25">Last 12 weeks</Text>
      </View>

      {selected.length === 0 ? (
        <View className="h-[150px] items-center justify-center">
          <Text className="text-[12px] text-white/25">
            No training volume yet.
          </Text>
        </View>
      ) : (
        <View className="mt-5 items-center">
          <Svg width={width} height={height}>
            {selected.map((point, index) => {
              const barHeight = Math.max(
                3,
                (point.volume / max) * (height - 8),
              );

              const x = index * (barWidth + gap);

              return (
                <Rect
                  key={point.week_start}
                  x={x}
                  y={height - barHeight}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  fill={
                    index === selected.length - 1
                      ? "#3B82F6"
                      : "rgba(255,255,255,.12)"
                  }
                />
              );
            })}
          </Svg>
        </View>
      )}
    </View>
  );
}
