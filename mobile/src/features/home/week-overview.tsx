import React from "react";
import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable, ProgressFill } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { dateLabel } from "../progress/model";
import type { HomeSnapshot } from "./model";

export function WeekOverview({
  snapshot,
  today,
  target,
  loading,
  onCalendar,
}: {
  snapshot: HomeSnapshot;
  today: string;
  target: number | null;
  loading: boolean;
  onCalendar: () => void;
}) {
  const hasTarget = target != null && Number.isFinite(target) && target > 0;
  return (
    <View className="overflow-hidden rounded-[28px] bg-brand p-5">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <MaterialCommunityIcons name="chart-timeline-variant" size={19} color={C.bg} />
          <Txt weight="semibold" className="flex-1 text-[10px] tracking-[1.5px] text-bg">
            YOUR WEEK IN MOTION
          </Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open training calendar"
          onPress={onCalendar}
          className="h-11 w-11 items-center justify-center rounded-full bg-black/10"
        >
          <MaterialCommunityIcons name="arrow-right" size={21} color={C.bg} />
        </Pressable>
      </View>
      <View className="mt-2 flex-row items-end justify-between gap-3">
        <View className="flex-1">
          <Txt weight="medium" className="text-[44px] leading-[56px] tracking-[-2px] text-bg">
            {loading ? "—" : snapshot.weeklyCount}
            {hasTarget && <Txt className="text-xl tracking-normal text-black/50"> / {target}</Txt>}
          </Txt>
          <Txt className="text-xs text-black/70">
            {hasTarget ? "of your weekly sessions" : "sessions completed"}
          </Txt>
        </View>
        <View className="items-end pb-1">
          <Txt weight="semibold" className="text-xl text-bg">
            {loading ? "—" : snapshot.weeklyMinutes}
            <Txt className="text-[11px] text-black/60"> min</Txt>
          </Txt>
          <Txt className="mt-1 text-[10px] text-black/60">recorded training</Txt>
        </View>
      </View>
      {hasTarget && !loading && (
        <View className="mt-5">
          <ProgressFill
            ratio={snapshot.weeklyCount / target}
            color={C.bg}
            trackColor="#00000020"
            height={4}
          />
        </View>
      )}
      <View className="mt-5 flex-row justify-between gap-1 border-t border-black/10 pt-4">
        {snapshot.days.map((day) => (
          <View
            key={day.date}
            className="items-center gap-2"
            style={{ opacity: day.date > today ? 0.4 : 1 }}
          >
            <Txt className="text-[10px] text-black/70">
              {dateLabel(day.date, { weekday: "narrow" })}
            </Txt>
            <View
              accessible
              accessibilityLabel={`${dateLabel(day.date, { weekday: "long", day: "numeric" })}: ${loading ? "loading" : `${day.count} completed sessions`}${day.date === today ? ", today" : ""}`}
              className={`h-7 w-7 items-center justify-center rounded-full ${day.count && !loading ? "bg-black" : day.date === today ? "border border-black/50" : "bg-black/10"}`}
            >
              {day.count && !loading ? (
                <MaterialCommunityIcons name="check" size={16} color={C.brand} />
              ) : (
                <Txt weight="medium" className="text-[11px] text-bg">
                  {dateLabel(day.date, { day: "numeric" })}
                </Txt>
              )}
            </View>
          </View>
        ))}
      </View>
      {hasTarget && !loading && snapshot.weeklyCount >= target && (
        <Txt weight="medium" className="mt-4 text-xs text-bg">
          Weekly goal reached. Every session counts.
        </Txt>
      )}
    </View>
  );
}
