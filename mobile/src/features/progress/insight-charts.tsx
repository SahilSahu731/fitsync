import React, { useId, useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Rect, Stop } from "react-native-svg";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { dateLabel } from "./model";
import { Icon } from "./visuals";

export type ActivityPoint = { date: string; end: string; value: number };
export function ActivityBars({
  points,
  color,
  unit,
}: {
  points: ActivityPoint[];
  color: string;
  unit: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const id = useId().replace(/:/g, "");
  const index = Math.min(selected ?? points.length - 1, points.length - 1);
  const active = points[index];
  const max = Math.max(1, ...points.map((point) => point.value));
  const width = 552 / Math.max(1, points.length);
  const format = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return (
    <View>
      <View className="mb-3 min-h-11 flex-row items-center gap-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous chart interval"
          disabled={index <= 0}
          onPress={() => setSelected(index - 1)}
          className="h-11 w-9 items-center justify-center"
        >
          <Icon name="chevron-left" size={18} color={index <= 0 ? C.border : C.muted} />
        </Pressable>
        <View className="flex-1" accessibilityLiveRegion="polite">
          <Txt className="text-[10px] text-muted">
            {active
              ? `${dateLabel(active.date)}${active.end !== active.date ? ` – ${dateLabel(active.end)}` : ""}`
              : "No training yet"}
          </Txt>
          <Txt weight="medium" className="mt-0.5 text-xs" style={{ color }}>
            {format(active?.value ?? 0)} {unit}
          </Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next chart interval"
          disabled={index >= points.length - 1}
          onPress={() => setSelected(index + 1)}
          className="h-11 w-9 items-center justify-center"
        >
          <Icon
            name="chevron-right"
            size={18}
            color={index >= points.length - 1 ? C.border : C.muted}
          />
        </Pressable>
      </View>
      <Svg
        width="100%"
        height={148}
        viewBox="0 0 600 180"
        accessibilityLabel={`${unit} by interval. ${points.map((point) => `${dateLabel(point.date)}: ${format(point.value)}`).join("; ")}`}
      >
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="1" stopColor={color} stopOpacity={0.35} />
          </LinearGradient>
        </Defs>
        {[20, 90, 160].map((y) => (
          <Line key={y} x1={24} x2={576} y1={y} y2={y} stroke="#FFFFFF0D" strokeDasharray="4 6" />
        ))}
        {points.map((point, i) => (
          <Rect
            key={point.date}
            x={24 + i * width + width * 0.15}
            width={width * 0.7}
            y={point.value ? 160 - (point.value / max) * 136 : 158}
            height={point.value ? (point.value / max) * 136 : 2}
            rx={Math.min(8, width * 0.25)}
            fill={point.value ? `url(#${id})` : "#FFFFFF20"}
            opacity={i === index ? 1 : 0.5}
            onPress={() => setSelected(i)}
          />
        ))}
      </Svg>
      <View className="mt-1 flex-row justify-between">
        <Txt className="text-[10px] text-muted">{points[0] ? dateLabel(points[0].date) : ""}</Txt>
        <Txt className="text-[10px] text-muted">
          {points.at(-1) ? dateLabel(points.at(-1)!.end) : ""}
        </Txt>
      </View>
    </View>
  );
}
export function ActivityHeatmap({ days }: { days: { date: string; workouts: number }[] }) {
  const leading = days.length ? (new Date(`${days[0].date}T12:00:00Z`).getUTCDay() + 6) % 7 : 0;
  const compact = days.length <= 30;
  const horizontal = days.length <= 7;
  const columns = horizontal
    ? Math.max(1, days.length)
    : compact
      ? 7
      : Math.max(1, Math.ceil((days.length + leading) / 7));
  const rows = horizontal ? 1 : compact ? Math.ceil((days.length + leading) / 7) : 7;
  const active = days.filter((day) => day.workouts > 0).length;
  return (
    <View>
      <Svg
        width="100%"
        height={horizontal ? 36 : 125}
        preserveAspectRatio="none"
        viewBox={`0 0 ${columns * 19} ${rows * 18}`}
        accessibilityLabel={`${active} active days out of ${days.length} days in this range`}
      >
        {days.map((day, i) => (
          <Rect
            key={day.date}
            x={(horizontal ? i : compact ? (i + leading) % 7 : Math.floor((i + leading) / 7)) * 19}
            y={(horizontal ? 0 : compact ? Math.floor((i + leading) / 7) : (i + leading) % 7) * 18}
            width={14}
            height={14}
            rx={4}
            fill={day.workouts > 1 ? "#C5F460" : day.workouts ? "#6C873A" : "#FFFFFF0C"}
          />
        ))}
      </Svg>
      <View className="mt-3 flex-row items-center justify-between">
        <Txt className="text-[10px] text-muted">{active} active days</Txt>
        <View className="flex-row items-center gap-1.5">
          <Txt className="mr-1 text-[9px] text-muted">Less</Txt>
          {["#FFFFFF0C", "#6C873A", "#C5F460"].map((color) => (
            <View
              key={color}
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ backgroundColor: color }}
            />
          ))}
          <Txt className="ml-1 text-[9px] text-muted">More</Txt>
        </View>
      </View>
    </View>
  );
}
export function MacroRing({
  protein,
  carbs,
  fat,
}: {
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}) {
  const values = [(protein ?? 0) * 4, (carbs ?? 0) * 4, (fat ?? 0) * 9];
  const total = values.reduce((a, b) => a + b, 0);
  const circumference = 2 * Math.PI * 39;
  let offset = 0;
  return (
    <View className="h-28 w-28 items-center justify-center">
      <Svg
        width={112}
        height={112}
        viewBox="0 0 112 112"
        style={{ position: "absolute" }}
        accessibilityLabel={
          total
            ? `Logged macro energy: protein ${Math.round((values[0] / total) * 100)}%, carbs ${Math.round((values[1] / total) * 100)}%, fat ${Math.round((values[2] / total) * 100)}%`
            : "Log macros to see their energy split"
        }
      >
        <Circle cx={56} cy={56} r={39} stroke="#FFFFFF0D" strokeWidth={11} fill="none" />
        {values.map((value, i) => {
          const portion = total ? (value / total) * circumference : 0;
          const start = offset;
          offset += portion;
          return portion ? (
            <Circle
              key={i}
              cx={56}
              cy={56}
              r={39}
              stroke={["#C5F460", "#7DCFFF", "#FFB38A"][i]}
              strokeWidth={11}
              fill="none"
              strokeDasharray={`${Math.max(0, portion - 2)} ${circumference}`}
              strokeDashoffset={-start}
              rotation={-90}
              origin="56, 56"
            />
          ) : null;
        })}
      </Svg>
      <Icon name="silverware-fork-knife" size={24} color={total ? "#C5F460" : C.muted} />
    </View>
  );
}
