import React from "react";
import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { dateLabel } from "../progress/model";
import type { HomeSnapshot } from "./model";
import { weekInsight } from "./week-insight";

export function WeekOverview({
  snapshot,
  today,
  target,
  loading,
  onCalendar,
  onGoals,
}: {
  snapshot: HomeSnapshot;
  today: string;
  target: number | null;
  loading: boolean;
  onCalendar: () => void;
  onGoals?: () => void;
}) {
  const hasTarget = target != null && Number.isFinite(target) && target > 0;
  const reached = hasTarget && !loading && snapshot.weeklyCount >= target;
  const insight = weekInsight(snapshot, today, target);
  return (
    <View className="rounded-[28px] border border-white/5 bg-panel p-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Txt className="text-[9px] tracking-[1.8px] text-muted">LITTLE BY LITTLE</Txt>
          <Txt
            accessibilityRole="header"
            weight="medium"
            className="mt-1 text-xl tracking-[-0.5px]"
          >
            Your weekly rhythm
          </Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open training calendar"
          onPress={onCalendar}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/5"
        >
          <MaterialCommunityIcons name="calendar-blank-outline" size={21} color="#FFFFFF" />
        </Pressable>
      </View>
      <View className="mt-5 flex-row items-baseline gap-2">
        <Txt weight="medium" className="text-[32px] leading-[42px] tracking-[-1px]">
          {loading ? "—" : snapshot.weeklyCount}
          {hasTarget && <Txt className="text-lg tracking-normal text-muted"> / {target}</Txt>}
        </Txt>
        <Txt className="min-w-0 flex-1 text-[11px] text-muted">sessions this week</Txt>
        <Txt className="text-[11px] text-muted">{loading ? "—" : snapshot.weeklyMinutes} min</Txt>
      </View>
      <View className="mb-5 mt-2 flex-row items-center gap-2">
        <MaterialCommunityIcons
          name={loading ? "calendar-blank-outline" : insight.icon}
          size={14}
          color="#A3A3A3"
          accessible={false}
        />
        <Txt className="min-w-0 flex-1 text-[11px] leading-[17px] text-muted">
          {loading ? "Loading your weekly rhythm…" : insight.text}
        </Txt>
      </View>
      <View className="flex-row gap-1.5">
        {snapshot.days.map((day) => {
          const completed = !loading && day.count > 0;
          const isToday = day.date === today;
          return (
            <View key={day.date} className="min-w-0 flex-1 items-center gap-2">
              <Txt className="text-[10px] text-muted">
                {dateLabel(day.date, { weekday: "narrow" })}
              </Txt>
              <View
                accessible
                accessibilityLabel={`${dateLabel(day.date, { weekday: "long", day: "numeric" })}: ${loading ? "loading" : `${day.count} completed sessions`}${isToday ? ", today" : ""}`}
                className={`w-full items-center justify-center rounded-full ${completed ? "bg-white" : isToday ? "border border-white/60 bg-white/5" : "bg-white/5"}`}
                style={{ aspectRatio: 1, opacity: day.date > today ? 0.35 : 1 }}
              >
                {completed ? (
                  <MaterialCommunityIcons name="check" size={17} color="#000000" />
                ) : (
                  <Txt weight="medium" className="text-[11px]">
                    {dateLabel(day.date, { day: "numeric" })}
                  </Txt>
                )}
              </View>
              <View className={`h-1 w-1 rounded-full ${isToday ? "bg-white" : "bg-transparent"}`} />
            </View>
          );
        })}
      </View>
      <View className="mt-4 flex-row items-center gap-3 border-t border-white/5 pt-2">
        <View className="min-w-0 flex-1">
          <Txt className="text-[10px] leading-5 text-muted">
            {reached
              ? "Weekly goal reached. Keep your own pace."
              : hasTarget
                ? "Every session is a step forward."
                : "Set a weekly goal that works for you."}
          </Txt>
        </View>
        {onGoals && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Manage your goals"
            onPress={onGoals}
            className="min-h-11 flex-row items-center gap-1.5"
          >
            <Txt weight="medium" className="text-[11px]">
              {hasTarget ? "Goals" : "Set goal"}
            </Txt>
            <MaterialCommunityIcons name="arrow-right" size={14} color="#FFFFFF" />
          </Pressable>
        )}
      </View>
    </View>
  );
}
