import React from "react";
import { View } from "react-native";
import Svg, { Circle, ClipPath, Defs, Ellipse, Line, Path, Rect } from "react-native-svg";
import { Txt } from "@/src/components/ui";
import type { macroBreakdown } from "./chart-model";
import type { HealthPoint } from "./health-model";

export function StepOrbit({ ratio, children }: { ratio: number; children: React.ReactNode }) {
  const circumference = 2 * Math.PI * 52;
  return (
    <React.Fragment>
      <Svg width="100%" height={138} viewBox="0 0 160 138" accessible={false}>
        <Circle cx="80" cy="69" r="62" stroke="#FFB184" strokeOpacity="0.08" fill="none" />
        <Circle
          cx="80"
          cy="69"
          r="52"
          stroke="#FFB184"
          strokeOpacity="0.15"
          strokeWidth="9"
          fill="#160F0C"
        />
        <Circle
          cx="80"
          cy="69"
          r="52"
          stroke="#FFB184"
          strokeWidth="9"
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={circumference * (1 - Math.max(0, Math.min(1, ratio)))}
          strokeLinecap="round"
          rotation={-90}
          origin="80,69"
        />
        <Circle
          cx="80"
          cy="69"
          r="41"
          stroke="#FFB184"
          strokeOpacity="0.13"
          strokeDasharray="1 6"
          fill="none"
        />
      </Svg>
      {children}
    </React.Fragment>
  );
}
export function WaterGlass({ ratio, hasValue }: { ratio: number; hasValue: boolean }) {
  const level = hasValue ? 111 - Math.max(0.05, Math.min(1, ratio)) * 76 : 112;
  return (
    <Svg width="100%" height={132} viewBox="0 0 150 132" accessible={false}>
      <Defs>
        <ClipPath id="home-glass-clip">
          <Path d="M44 24H106L98 112H52Z" />
        </ClipPath>
      </Defs>
      <Ellipse cx="75" cy="119" rx="40" ry="5" fill="#80CBFF" opacity="0.07" />
      <Path
        d="M40 17H110L101 115H49Z"
        fill="#80CBFF"
        fillOpacity="0.06"
        stroke="#8CD5FF"
        strokeOpacity="0.65"
        strokeWidth="1.8"
      />
      <Path d="M44 24H106L98 112H52Z" fill="#80CBFF" fillOpacity="0.04" />
      {hasValue && (
        <React.Fragment>
          <Path
            d={`M40 ${level}Q58 ${level - 8} 75 ${level}T112 ${level}V120H40Z`}
            fill="#57ADFF"
            opacity="0.4"
            clipPath="url(#home-glass-clip)"
          />
          <Path
            d={`M40 ${level + 5}Q58 ${level + 13} 77 ${level + 4}T112 ${level + 5}V120H40Z`}
            fill="#80CBFF"
            clipPath="url(#home-glass-clip)"
          />
        </React.Fragment>
      )}
      <Path
        d="M48 26L55 105M48 22H102"
        stroke="#C4EBFF"
        strokeOpacity="0.5"
        strokeLinecap="round"
        fill="none"
      />
      {[43, 62, 81].map((y) => (
        <Line key={y} x1="91" x2="99" y1={y} y2={y} stroke="#B7E5FF" strokeOpacity="0.3" />
      ))}
    </Svg>
  );
}

/** Each square is a calendar day; future days stay unfilled. */
export function WorkoutHeatmap({
  days,
  today,
  loading,
}: {
  days: { date: string; count: number }[];
  today: string;
  loading: boolean;
}) {
  return (
    <View className="flex-row gap-1" accessible={false}>
      {days.map((day) => {
        const isFuture = day.date > today;
        const count = loading || isFuture ? 0 : day.count;
        const weekday = new Date(`${day.date}T12:00:00Z`).getUTCDay();
        return (
          <View key={day.date} className="min-w-0 flex-1 items-center gap-1.5">
            <View
              className="h-[13px] w-full rounded-[4px] border"
              style={{
                backgroundColor: count > 1 ? "#C1A9FF" : count === 1 ? "#8D72C6" : "#C1A9FF0C",
                borderColor: !loading && day.date === today ? "#D6C8FF" : "#C1A9FF14",
                opacity: isFuture ? 0.35 : 1,
              }}
            />
            <Txt className="text-[8px] text-[#A99BBF]" style={{ opacity: isFuture ? 0.4 : 1 }}>
              {["S", "M", "T", "W", "T", "F", "S"][weekday]}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}

/** A donut of logged macro energy (4/4/9), separate from the food-calorie total. */
export function MacroDonut({
  breakdown,
  size = 94,
}: {
  breakdown: ReturnType<typeof macroBreakdown>;
  size?: number;
}) {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const positive = breakdown.items.filter((item) => item.fraction > 0);
  return (
    <Svg width={size} height={size} viewBox="0 0 94 94" accessible={false}>
      <Circle cx="47" cy="47" r="44" stroke="#C5F460" strokeOpacity="0.07" fill="none" />
      <Circle
        cx="47"
        cy="47"
        r={radius}
        stroke="#C5F460"
        strokeOpacity="0.12"
        strokeWidth="10"
        fill="none"
      />
      {positive.map((item, index) => {
        const start =
          positive.slice(0, index).reduce((sum, entry) => sum + entry.fraction, 0) * circumference;
        const length = Math.max(0, item.fraction * circumference - (positive.length > 1 ? 3 : 0));
        return (
          <Circle
            key={item.key}
            cx="47"
            cy="47"
            r={radius}
            fill="none"
            stroke={item.color}
            strokeWidth="10"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-start}
            rotation={-90}
            origin="47,47"
          />
        );
      })}
    </Svg>
  );
}

export function MiniHistory({
  points,
  color,
  bars = false,
}: {
  points: HealthPoint[];
  color: string;
  bars?: boolean;
}) {
  const max = Math.max(1, ...points.flatMap((point) => (point.value == null ? [] : [point.value])));
  const min = bars
    ? 0
    : Math.min(max, ...points.flatMap((point) => (point.value == null ? [] : [point.value])));
  const x = (i: number) => 3 + (i / Math.max(1, points.length - 1)) * 114;
  const y = (v: number) => 27 - (max === min ? 0.5 : (v - min) / (max - min)) * 22;
  let path = "";
  let continuous = false;
  points.forEach((p, i) => {
    if (p.value == null) continuous = false;
    else {
      path += `${continuous ? "L" : "M"}${x(i)} ${y(p.value)} `;
      continuous = true;
    }
  });
  return (
    <Svg width="100%" height={32} viewBox="0 0 120 32" accessible={false}>
      {bars ? (
        points.map((point, i) => (
          <Rect
            key={point.date}
            x={i * 17 + 3}
            y={30 - Math.max(2, ((point.value ?? 0) / max) * 26)}
            width="9"
            height={Math.max(2, ((point.value ?? 0) / max) * 26)}
            rx="3"
            fill={color}
            opacity={point.value ? 0.85 : 0.15}
          />
        ))
      ) : (
        <React.Fragment>
          <Path
            d={path || "M0 30H120"}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            opacity={path ? 0.85 : 0.15}
          />
          {points.map((p, i) =>
            p.value != null ? (
              <Circle key={p.date} cx={x(i)} cy={y(p.value)} r="2.4" fill={color} />
            ) : null,
          )}
        </React.Fragment>
      )}
    </Svg>
  );
}
