import React from "react";
import { View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { dateLabel } from "./model";
import { Icon } from "./visuals";

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
            fill={day.workouts > 1 ? "#F5F5F5" : day.workouts ? "#888888" : "#FFFFFF0C"}
          />
        ))}
      </Svg>
      <View className="mt-3 flex-row items-center justify-between">
        <Txt className="text-[10px] text-muted">{active} active days</Txt>
        <View className="flex-row items-center gap-1.5">
          <Txt className="mr-1 text-[9px] text-muted">Less</Txt>
          {["#FFFFFF0C", "#888888", "#F5F5F5"].map((color) => (
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
              stroke={["#F5F5F5", "#ACACAC", "#656565"][i]}
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
      <Icon name="silverware-fork-knife" size={24} color={total ? "#F5F5F5" : C.muted} />
    </View>
  );
}

/** A day is never treated as zero when it has no hydration log. */
export function HabitWeek({
  days,
  target,
}: {
  days: { date: string; value: number | null }[];
  target: number | null;
}) {
  return (
    <View className="flex-row justify-between gap-1">
      {days.map((day) => {
        const met = target !== null && target > 0 && day.value !== null && day.value >= target;
        const logged = day.value !== null;
        return (
          <View
            key={day.date}
            accessible
            accessibilityLabel={`${dateLabel(day.date)}: ${logged ? `${day.value} ml` : "not logged"}${target ? (met ? ", at current goal" : logged ? ", below current goal" : "") : ""}`}
            className="items-center gap-1.5"
            style={{ flex: 1 }}
          >
            <View
              className="h-5 w-5 items-center justify-center rounded-full border"
              style={{
                backgroundColor: met ? "#F5F5F5" : logged ? "#6B6B6B" : "transparent",
                borderColor: met ? "#F5F5F5" : logged ? "#6B6B6B" : "#414141",
              }}
            >
              {met && <Icon name="check" size={12} color="#111111" />}
              {!logged && <View className="h-0.5 w-1.5 rounded-full bg-white/20" />}
            </View>
            <Txt className="text-[9px] text-muted">
              {dateLabel(day.date, { weekday: "narrow" })}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}
