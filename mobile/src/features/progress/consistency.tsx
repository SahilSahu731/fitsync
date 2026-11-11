import { MotionPressable as Pressable } from "@/src/components/motion";
import React, { useState } from "react";
import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import type { ProgressAnalytics } from "./analytics";
import { addDays, dateLabel } from "./model";

export function ConsistencySection({
  data,
  target,
  selectedDate,
  onDate,
}: {
  data: ProgressAnalytics;
  target: number;
  selectedDate: string;
  onDate: (date: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const currentWeek = data.weeks.at(-1)!;
  const heatStart = addDays(data.weeks.at(-13)!.date, 0);
  const activity = data.calendar;
  return (
    <View style={{ padding: 21, borderRadius: 28, marginTop: 24, backgroundColor: C.panel }}>
      <View className="flex-row items-start justify-between">
        <View>
          <Txt weight="semibold" className="mt-2 text-[24px]">
            Consistency
          </Txt>
        </View>
        <MaterialCommunityIcons name="calendar-check-outline" size={28} color="#FFFFFF" />
      </View>
      <View className="my-5 flex-row gap-3">
        <View className="flex-1">
          <Txt weight="semibold" className="text-[38px]" style={{ color: "#FFFFFF" }}>
            {currentWeek.workouts}
            <Txt className="text-lg text-muted"> / {target}</Txt>
          </Txt>
          <Txt className="text-xs text-muted">Workouts this week</Txt>
        </View>
        <View style={{ width: 1, backgroundColor: "#FFFFFF20" }} />
        <View className="flex-1 pl-3">
          <Txt weight="semibold" className="text-[38px]">
            {data.streak}
            <Txt className="text-sm text-muted"> wk</Txt>
          </Txt>
          <Txt className="text-xs text-muted">Weekly goal streak</Txt>
        </View>
      </View>
      <View className="flex-row gap-1.5">
        {Array.from({ length: target }, (_, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              height: 7,
              borderRadius: 9,
              backgroundColor: index < currentWeek.workouts ? "#FFFFFF" : "#FFFFFF18",
            }}
          />
        ))}
      </View>
      <Txt className="mb-5 mt-3 text-[11px] leading-4 text-muted">
        Monday–Sunday weeks, measured against your current target. An unfinished current week
        preserves your earned streak; recovery days do not break it.
      </Txt>
      <View className="mb-2 flex-row">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
          <View key={i} style={{ width: `${100 / 7}%`, alignItems: "center" }}>
            <Txt className="text-[11px] text-muted">{day}</Txt>
          </View>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {activity.map((day) => (
          <View key={day.date} style={{ width: `${100 / 7}%`, padding: 3 }}>
            <Pressable
              disabled={day.future}
              accessibilityRole="button"
              accessibilityLabel={`${dateLabel(day.date)}: ${day.future ? "future day" : `${day.workouts} completed workouts`}`}
              accessibilityState={{ selected: day.date === selectedDate }}
              onPress={() => onDate(day.date)}
              style={{
                height: 24,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: day.date === selectedDate ? "#FFFFFF" : "transparent",
                backgroundColor: day.future
                  ? "transparent"
                  : day.workouts > 1
                    ? "#FFFFFF"
                    : day.workouts
                      ? "#A3A3A3"
                      : "#FFFFFF07",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Txt
                className="text-[11px]"
                style={{ color: day.workouts ? "#000000" : day.future ? "#FFFFFF15" : "#FFFFFF55" }}
              >
                {Number(day.date.slice(-2))}
              </Txt>
            </Pressable>
          </View>
        ))}
      </View>
      <View className="mt-2 flex-row items-center justify-between">
        <Txt className="text-[11px] text-muted">
          {dateLabel(heatStart)} — {dateLabel(data.today)}
        </Txt>
        <Txt className="text-[11px] text-muted">Rest ▪ One session ▪ 2+</Txt>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)}
        className="mt-4 flex-row items-center justify-between rounded-xl bg-white/5 p-3"
      >
        <Txt weight="semibold" className="text-xs">
          Weekly breakdown · last 13 weeks
        </Txt>
        <MaterialCommunityIcons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color="#FFFFFF"
        />
      </Pressable>
      {expanded &&
        [...data.weeks]
          .slice(-13)
          .reverse()
          .map((week) => (
            <View key={week.date} className="flex-row items-center justify-between py-3">
              <View>
                <Txt className="text-xs">
                  {dateLabel(week.date)}
                  {week.current ? " · in progress" : ""}
                </Txt>
                <Txt className="mt-1 text-[11px] text-muted">
                  {week.sets} sets · {week.minutes} min
                </Txt>
              </View>
              <Txt
                weight="semibold"
                className="text-xs"
                style={{ color: week.targetMet ? "#FFFFFF" : C.muted }}
              >
                {week.workouts}/{target} {week.targetMet ? "✓" : ""}
              </Txt>
            </View>
          ))}
    </View>
  );
}
