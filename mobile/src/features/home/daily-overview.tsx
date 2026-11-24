import React from "react";
import { ActivityIndicator, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { dateLabel, weightValue, type Goals } from "../progress/model";
import type { HomeSnapshot } from "./model";
import { healthFormat, healthHistory, metricToday, type HealthKind } from "./health-model";
import { macroBreakdown } from "./chart-model";
import { MacroDonut, MiniHistory, StepOrbit, WaterGlass, WorkoutHeatmap } from "./health-artwork";

export function DailyOverview({
  snapshot,
  today,
  goals,
  unit,
  loading,
  disabled,
  onOpen,
}: {
  snapshot: HomeSnapshot;
  today: string;
  goals: Goals;
  unit: "kg" | "lb";
  loading: boolean;
  disabled: boolean;
  onOpen: (kind: HealthKind) => void;
}) {
  const blocked = loading || disabled;
  const water = metricToday(snapshot, "water");
  const steps = metricToday(snapshot, "steps");
  const calories = metricToday(snapshot, "caloriesIn");
  const weight = snapshot.weight?.value;
  const macros = macroBreakdown(snapshot, today);
  const visibleMacros = loading
    ? { ...macros, items: macros.items.map((item) => ({ ...item, fraction: 0 })) }
    : macros;
  const ratio = (value: number | null, target: number | null) =>
    value != null && target != null && target > 0 ? value / target : 0;
  const display = (value: number | null | undefined, decimals = 1) =>
    loading || value == null ? "—" : healthFormat(value, decimals);
  const open = (kind: HealthKind) => {
    if (!blocked) onOpen(kind);
  };
  const caption = (value: number | null, goal: number | null, suffix: string) =>
    loading
      ? "Opening your day…"
      : goal && goal > 0
        ? `of ${healthFormat(goal)} ${suffix}`
        : value == null
          ? "No entry today"
          : "Logged today";
  const cardProps = (kind: HealthKind) => ({
    accessibilityRole: "button" as const,
    accessibilityLabel: `View ${kind === "weight" ? "body weight" : kind} details`,
    accessibilityState: { disabled: blocked },
    disabled: blocked,
    onPress: () => open(kind),
  });
  const arrow = (color: string) => (
    <MaterialCommunityIcons name="arrow-right" size={16} color={color} />
  );
  return (
    <View className="gap-3">
      {loading && (
        <View className="flex-row items-center gap-2 pb-1">
          <ActivityIndicator size="small" color="#C5F460" />
          <Txt className="text-xs text-muted">Opening your health overview…</Txt>
        </View>
      )}
      <View className="flex-row gap-3">
        <View className="min-w-0 flex-1 gap-3">
          <Pressable
            {...cardProps("steps")}
            className="min-h-[215px] overflow-hidden rounded-[28px] border border-[#FFB184]/10 bg-[#c64809] p-4"
          >
            <View className="flex-row items-center justify-between">
              <Txt className="text-sm text-white">Steps</Txt>
              {arrow("white")}
            </View>
            <View className="relative my-2 items-center justify-center">
              <StepOrbit ratio={loading ? 0 : ratio(steps, goals.steps)}>
                <View className="absolute inset-0 items-center justify-center px-2">
                  <MaterialCommunityIcons name="shoe-print" size={18} color="#FFB184" />
                  <Txt
                    weight="semibold"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    className="mt-1 text-[24px] leading-8 tracking-[-1px] text-[#FFE3D1]"
                  >
                    {display(steps, 0)}
                  </Txt>
                  <Txt className="text-[9px] text-[#BA9983]">Today</Txt>
                </View>
              </StepOrbit>
            </View>
            {/* <Txt className="mt-auto text-center text-[10px] text-[#BA9983]">
              {caption(steps, goals.steps, "steps")}
            </Txt> */}
          </Pressable>
          <Pressable
            {...cardProps("workouts")}
            accessibilityHint="A calendar heatmap shows workout days this week."
            className="min-h-[162px] rounded-[28px] border border-[#C1A9FF]/10 bg-[#4911cd] p-4"
          >
            <View className="flex-row items-center justify-between">
              <Txt weight="medium" className="text-sm text-white">
                Workouts
              </Txt>
              <MaterialCommunityIcons name="dumbbell" size={18} color="white" />
            </View>
            <View className="mt-3 flex-row items-baseline gap-1.5">
              <Txt weight="semibold" className="text-[28px] leading-8 tracking-[-1px]">
                {display(snapshot.weeklyCount, 0)}
              </Txt>
              <Txt className="text-[10px] text-white">this week</Txt>
            </View>
            <Txt className="mb-3 mt-1 text-[9px] text-[#A99BBF]">
              {loading
                ? "Opening your week…"
                : goals.weeklyWorkouts > 0
                  ? `of ${healthFormat(goals.weeklyWorkouts, 0)} weekly goal`
                  : "Your workout days"}
            </Txt>
            <View className="mt-auto">
              <WorkoutHeatmap days={snapshot.days} today={today} loading={loading} />
            </View>
          </Pressable>
        </View>
        <View className="min-w-0 flex-1 gap-3">
          <Pressable
            {...cardProps("weight")}
            className="min-h-[152px] rounded-[28px] border border-[#B6D5E5]/10 bg-[#f6da06] p-4"
          >
            <View className="flex-row items-center justify-between">
              <Txt weight="medium" className="text-sm text-black">
                Body weight
              </Txt>
              {arrow("black")}
            </View>
            <View className="mt-3 flex-row items-baseline gap-1.5">
              <Txt
                weight="semibold"
                numberOfLines={1}
                adjustsFontSizeToFit
                className="text-[32px] text-black leading-8 tracking-[-1px]"
              >
                {display(weight == null ? null : weightValue(weight, unit))}
              </Txt>
              <Txt className="text-[10px] text-[#191c1d]">{unit}</Txt>
            </View>
            <MiniHistory
              color="#000"
              points={loading ? [] : healthHistory(snapshot, "weight", today, 7, unit)}
            />
            <Txt numberOfLines={1} className="mt-auto text-[9px] text-[#0b0c0c]">
              {!loading && snapshot.weight
                ? snapshot.weight.date === today
                  ? "Today's check-in"
                  : `Last · ${dateLabel(snapshot.weight.date)}`
                : "No weigh-in yet"}
            </Txt>
          </Pressable>
          <Pressable
            {...cardProps("water")}
            className="min-h-[225px] overflow-hidden rounded-[28px] border border-[#80CBFF]/15 bg-[#022b48] p-4"
          >
            <View className="flex-row items-center justify-between">
              <Txt weight="medium" className="text-sm text-white">
                Water
              </Txt>
              {arrow("white")}
            </View>
            <View className="my-1">
              <WaterGlass
                ratio={loading ? 0 : ratio(water, goals.water)}
                hasValue={
                  !loading && water != null && water > 0 && goals.water != null && goals.water > 0
                }
              />
            </View>
            <View className="flex-row items-baseline justify-center gap-1">
              <Txt
                weight="semibold"
                className="text-[28px] leading-8 tracking-[-1px] text-[#D4EDFF]"
              >
                {display(water == null ? null : water / 1000, 2)}
              </Txt>
              <Txt className="text-xs text-[#8EB8D6]">L</Txt>
            </View>
            <Txt className="mt-2 text-center text-[10px] text-[#8EB8D6]">
              {caption(
                water == null ? null : water / 1000,
                goals.water == null ? null : goals.water / 1000,
                "L",
              )}
            </Txt>
          </Pressable>
        </View>
      </View>
      <Pressable
        {...cardProps("nutrition")}
        accessibilityHint="A donut shows the energy split of logged protein, carbs, and fat."
        className="overflow-hidden rounded-[28px] border border-[#C5F460]/10 bg-[#1C2818] p-5"
      >
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#C5F460]/10">
            <MaterialCommunityIcons name="silverware-fork-knife" size={21} color="#C5F460" />
          </View>
          <View className="flex-1">
            <Txt weight="medium" className="text-sm text-[#DBECCB]">
              Nutrition
            </Txt>
            <Txt className="mt-0.5 text-[10px] text-[#9AAA8D]">Today’s fuel, at a glance</Txt>
          </View>
          {arrow("#9AAA8D")}
        </View>
        <View className="mt-4 flex-row items-center gap-4">
          <View className="relative h-[94px] w-[94px] items-center justify-center">
            <MacroDonut breakdown={visibleMacros} />
            <View className="absolute inset-0 items-center justify-center">
              <MaterialCommunityIcons name="leaf" size={20} color="#C5F460" />
              <Txt className="mt-1 text-[7px] tracking-[0.7px] text-[#B7C8A7]">MACRO MIX</Txt>
            </View>
          </View>
          <View className="min-w-0 flex-1">
            <Txt className="text-[10px] text-[#9AAA8D]">Food energy</Txt>
            <View className="mt-0.5 flex-row items-baseline gap-1.5">
              <Txt
                weight="semibold"
                numberOfLines={1}
                adjustsFontSizeToFit
                className="min-w-0 shrink text-[30px] leading-10 tracking-[-1px]"
              >
                {display(calories, 0)}
              </Txt>
              <Txt className="text-[10px] text-[#9AAA8D]">kcal</Txt>
            </View>
            <Txt className="text-[10px] text-[#9AAA8D]">
              {goals.caloriesIn
                ? `Target ${healthFormat(goals.caloriesIn, 0)} kcal`
                : "No calorie target set"}
            </Txt>
          </View>
        </View>
        <View className="mt-4 flex-row gap-2 border-t border-[#C5F460]/10 pt-3">
          {macros.items.map((macro) => (
            <View key={macro.key} className="min-w-0 flex-1 flex-row items-center gap-1.5">
              <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: macro.color }} />
              <View className="min-w-0 flex-1">
                <Txt className="text-[9px] text-[#9AAA8D]">{macro.label}</Txt>
                <Txt weight="medium" className="mt-0.5 text-xs">
                  {display(macro.grams)}
                  <Txt className="text-[9px] text-[#9AAA8D]"> g</Txt>
                </Txt>
              </View>
            </View>
          ))}
        </View>
        <Txt className="mt-3 text-[9px] text-[#9AAA8D]">
          {loading
            ? "Opening today’s nutrition…"
            : macros.recorded === 0
              ? "Log macros to reveal your energy split."
              : !macros.complete
                ? `Partial macro log · ${macros.recorded} of 3 recorded`
                : macros.totalEnergy > 0
                  ? "Ring shows energy from logged macros."
                  : "Macros recorded · no macro energy logged"}
        </Txt>
      </Pressable>
    </View>
  );
}
