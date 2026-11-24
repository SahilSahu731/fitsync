import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Txt } from "@/src/components/ui";

const SIZE = 300;
const C = SIZE / 2;
const R = 112;
const SEGMENTS = 7;
const GAP_DEG = 10;
const SPAN_DEG = 360 / SEGMENTS - GAP_DEG;

function polar(deg: number, r = R) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: C + r * Math.cos(rad), y: C + r * Math.sin(rad) };
}

function arc(index: number) {
  const start = index * (360 / SEGMENTS) + GAP_DEG / 2;
  const a = polar(start);
  const b = polar(start + SPAN_DEG);
  return `M${a.x.toFixed(2)} ${a.y.toFixed(2)}A${R} ${R} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

/**
 * Seven segments, one per day of the week. Segments are filled for each
 * training day the person chose. Static: no entrance animation of its own.
 */
export function CompletionIllustration({ trainingDays }: { trainingDays: number }) {
  const lit = Math.min(Math.max(Math.round(trainingDays), 0), SEGMENTS);
  const paths = useMemo(() => Array.from({ length: SEGMENTS }, (_, i) => arc(i)), []);

  return (
    <View className="aspect-square w-full items-center justify-center">
      <Svg width="100%" height="100%" viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle cx={C} cy={C} r={142} stroke="#FFFFFF" strokeOpacity={0.06} fill="none" />
        <Circle cx={C} cy={C} r={86} stroke="#FFFFFF" strokeOpacity={0.06} fill="none" />
        {paths.map((d, i) => (
          <Path
            key={i}
            d={d}
            stroke="#FFFFFF"
            strokeOpacity={i < lit ? 1 : 0.12}
            strokeWidth={16}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </Svg>

      <View className="absolute items-center">
        <Txt weight="semibold" className="text-[64px] leading-[68px] tracking-[-3px]">
          {lit}
        </Txt>
        <Txt className="mt-1 text-xs text-muted">{lit === 1 ? "day a week" : "days a week"}</Txt>
      </View>
    </View>
  );
}