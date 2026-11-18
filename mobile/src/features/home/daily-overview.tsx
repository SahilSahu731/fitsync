import React from "react";
import { ActivityIndicator, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable, ProgressFill } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { dateLabel, weightValue, type Goals, type Metric } from "../progress/model";
import type { HomeSnapshot } from "./model";
import { HydrationMark, MovementMark } from "./daily-artwork";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
const format = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });
const goalRatio = (value: number | null, goal: number | null | undefined) =>
  value != null && goal != null && goal > 0 ? value / goal : 0;

export function DailyOverview({
  snapshot,
  today,
  goals,
  unit,
  loading,
  disabled,
  waterBusy,
  onLog,
  onWater,
  onNutrition,
}: {
  snapshot: HomeSnapshot;
  today: string;
  goals: Goals;
  unit: "kg" | "lb";
  loading: boolean;
  disabled: boolean;
  waterBusy: boolean;
  onLog: (metric: Metric) => void;
  onWater: () => void;
  onNutrition?: () => void;
}) {
  const blocked = disabled || loading;
  const value = (metric: Metric) => {
    const stored = snapshot.daily.find((entry) => entry.metric === metric)?.value;
    return stored != null && Number.isFinite(stored) ? stored : null;
  };
  const display = (amount: number | null) => (loading || amount == null ? "—" : format(amount));
  const log = (metric: Metric) => {
    if (!blocked) onLog(metric);
  };
  const water = value("water");
  const steps = value("steps");
  const calories = value("caloriesIn");
  const latestWeight = snapshot.weight;
  const bodyWeight =
    latestWeight?.value != null && Number.isFinite(latestWeight.value)
      ? weightValue(latestWeight.value, unit)
      : null;
  const goalCaption = (amount: number | null, goal: number | null, suffix: string) => {
    if (loading) return "Loading today…";
    if (goal == null || goal <= 0) return amount == null ? "Tap to log today" : "Logged today";
    return `of ${format(goal)} ${suffix}`;
  };
  const tiles: {
    metric: "water" | "steps";
    title: string;
    amount: number | null;
    suffix: string;
    goal: number | null;
    art: React.ReactNode;
  }[] = [
    {
      metric: "water",
      title: "Water",
      amount: water == null ? null : water / 1000,
      suffix: "L",
      goal: goals.water == null ? null : goals.water / 1000,
      art: <HydrationMark ratio={loading ? 0 : goalRatio(water, goals.water)} />,
    },
    {
      metric: "steps",
      title: "Steps",
      amount: steps,
      suffix: "steps",
      goal: goals.steps,
      art: <MovementMark ratio={loading ? 0 : goalRatio(steps, goals.steps)} />,
    },
  ];
  const checkIns: {
    metric: "sleep" | "weight";
    title: string;
    icon: IconName;
    amount: number | null;
    suffix: string;
    caption: string;
  }[] = [
    {
      metric: "sleep",
      title: "Sleep",
      icon: "weather-night",
      amount: value("sleep"),
      suffix: "hours",
      caption: goals.sleep ? `Goal ${format(goals.sleep)} h` : "Last night's rest",
    },
    {
      metric: "weight",
      title: "Body weight",
      icon: "scale-bathroom",
      amount: bodyWeight,
      suffix: unit,
      caption: latestWeight
        ? latestWeight.date === today
          ? "Logged today"
          : `Last · ${dateLabel(latestWeight.date)}`
        : "Your next check-in",
    },
  ];

  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        {tiles.map((tile) => (
          <View
            key={tile.metric}
            className="min-w-0 flex-1 overflow-hidden rounded-[28px] border border-white/5 bg-panel"
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Log ${tile.title.toLowerCase()}`}
              accessibilityState={{ disabled: blocked }}
              disabled={blocked}
              onPress={() => log(tile.metric)}
              className="px-4 pb-4 pt-4"
            >
              <View className="flex-row items-center justify-between gap-2">
                <Txt weight="medium" className="min-w-0 flex-1 text-xs">
                  {tile.title}
                </Txt>
                <MaterialCommunityIcons name="plus" size={17} color="#A3A3A3" />
              </View>
              <View className="my-1 items-center justify-center">{tile.art}</View>
              <Txt
                weight="medium"
                numberOfLines={1}
                adjustsFontSizeToFit
                className="text-[29px] leading-[39px] tracking-[-1px]"
              >
                {display(tile.amount)}
                {tile.metric === "water" && (
                  <Txt className="text-sm tracking-normal text-muted"> L</Txt>
                )}
              </Txt>
              <Txt className="mt-1 min-h-4 text-[10px] leading-4 text-muted">
                {goalCaption(tile.amount, tile.goal, tile.suffix)}
              </Txt>
            </Pressable>
            {tile.metric === "water" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add 250 millilitres of water to today"
                accessibilityState={{ disabled: blocked || waterBusy, busy: waterBusy }}
                disabled={blocked || waterBusy}
                onPress={() => {
                  if (!blocked && !waterBusy) onWater();
                }}
                className="min-h-12 flex-row items-center justify-center gap-1.5 border-t border-white/5 bg-white/5 px-2 py-2"
              >
                {waterBusy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
                )}
                <Txt weight="medium" className="text-[11px]">
                  {waterBusy ? "Saving…" : "250 ml"}
                </Txt>
              </Pressable>
            ) : (
              <View className="min-h-12 justify-center border-t border-white/5 px-4 py-2">
                <Txt className="text-[10px] leading-4 text-muted">
                  {loading
                    ? "Today's movement"
                    : steps == null
                      ? "Every step counts"
                      : "Today's movement"}
                </Txt>
              </View>
            )}
          </View>
        ))}
      </View>

      <View className="overflow-hidden rounded-[28px] border border-white/5 bg-panel p-4">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-white/5">
            <MaterialCommunityIcons name="silverware-fork-knife" size={20} color="#FFFFFF" />
          </View>
          <View className="min-w-0 flex-1">
            <Txt weight="medium" className="text-sm">
              Nutrition
            </Txt>
            <Txt className="mt-0.5 text-[10px] leading-4 text-muted">Logged daily totals</Txt>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={onNutrition ? "Open food diary" : "Log food calories"}
            accessibilityState={{ disabled: blocked }}
            disabled={blocked}
            onPress={() => {
              if (!blocked) (onNutrition ?? (() => onLog("caloriesIn")))();
            }}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/5"
          >
            <MaterialCommunityIcons
              name={onNutrition ? "arrow-top-right" : "plus"}
              size={21}
              color="#FFFFFF"
            />
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log food calories"
          accessibilityState={{ disabled: blocked }}
          disabled={blocked}
          onPress={() => log("caloriesIn")}
          className="min-h-20 justify-center pb-2 pt-2"
        >
          <View className="flex-row flex-wrap items-end gap-x-2 gap-y-1">
            <Txt weight="medium" className="text-[34px] leading-[44px] tracking-[-1px]">
              {display(calories)}
            </Txt>
            <Txt className="pb-2 text-xs text-muted">kcal</Txt>
          </View>
          <Txt className="mb-3 text-[10px] leading-4 text-muted">
            {loading
              ? "Loading today's nutrition…"
              : goals.caloriesIn != null && goals.caloriesIn > 0
                ? `Daily goal · ${format(goals.caloriesIn)} kcal`
                : calories == null
                  ? "Add food or log your daily totals"
                  : "Food calories logged today"}
          </Txt>
          {goals.caloriesIn != null && goals.caloriesIn > 0 && (
            <ProgressFill
              ratio={loading ? 0 : goalRatio(calories, goals.caloriesIn)}
              color="#FFFFFF"
              height={4}
            />
          )}
        </Pressable>
        <View className="mt-2 flex-row gap-2">
          {(
            [
              { metric: "protein", label: "Protein" },
              { metric: "carbs", label: "Carbs" },
              { metric: "fat", label: "Fat" },
            ] as const
          ).map((macro) => {
            const amount = value(macro.metric);
            return (
              <Pressable
                key={macro.metric}
                accessibilityRole="button"
                accessibilityLabel={`Log ${macro.label.toLowerCase()}`}
                accessibilityState={{ disabled: blocked }}
                disabled={blocked}
                onPress={() => log(macro.metric)}
                className="min-w-0 flex-1 rounded-[18px] bg-white/5 px-2.5 py-3"
              >
                <Txt className="text-[10px] leading-4 text-muted">{macro.label}</Txt>
                <Txt
                  weight="medium"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  className="mt-1 text-base leading-6"
                >
                  {display(amount)}
                  <Txt className="text-[10px] text-muted"> g</Txt>
                </Txt>
                {goals[macro.metric] != null && goals[macro.metric]! > 0 && (
                  <View className="mt-2">
                    <ProgressFill
                      ratio={loading ? 0 : goalRatio(amount, goals[macro.metric])}
                      color="#FFFFFF"
                      height={2}
                    />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="flex-row gap-3">
        {checkIns.map((item) => (
          <Pressable
            key={item.metric}
            accessibilityRole="button"
            accessibilityLabel={`Log ${item.title.toLowerCase()}`}
            accessibilityState={{ disabled: blocked }}
            disabled={blocked}
            onPress={() => log(item.metric)}
            className="min-w-0 flex-1 rounded-[24px] border border-white/5 bg-panel p-4"
          >
            <View className="flex-row items-center gap-2">
              <MaterialCommunityIcons name={item.icon} size={17} color="#A3A3A3" />
              <Txt className="min-w-0 flex-1 text-[10px] leading-4 text-muted">{item.title}</Txt>
            </View>
            <Txt
              weight="medium"
              numberOfLines={1}
              adjustsFontSizeToFit
              className="mt-2 text-xl leading-8"
            >
              {display(item.amount)}
              <Txt className="text-[10px] text-muted"> {item.suffix}</Txt>
            </Txt>
            <Txt className="mt-1 text-[9px] leading-4 text-muted">
              {loading ? "Loading…" : item.caption}
            </Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
