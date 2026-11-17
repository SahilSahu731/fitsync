import React from "react";
import { ActivityIndicator, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable, ProgressFill } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { dateLabel, weightValue, type Goals, type Metric } from "../progress/model";
import type { HomeSnapshot } from "./model";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
const format = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });

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
}) {
  const value = (metric: Metric) =>
    snapshot.daily.find((entry) => entry.metric === metric)?.value ?? null;
  const cards: {
    metric: Metric;
    title: string;
    icon: IconName;
    value: number | null;
    unit: string;
    caption: string;
    target?: number | null;
  }[] = [
    {
      metric: "steps",
      title: "Steps",
      icon: "shoe-print",
      value: value("steps"),
      unit: "steps",
      caption: goals.steps ? `Goal ${format(goals.steps)}` : "Your movement today",
      target: goals.steps,
    },
    {
      metric: "water",
      title: "Water",
      icon: "water-outline",
      value: value("water") == null ? null : value("water")! / 1000,
      unit: "litres",
      caption: goals.water ? `Goal ${format(goals.water / 1000)} L` : "Keep hydration in view",
      target: goals.water == null ? null : goals.water / 1000,
    },
    {
      metric: "sleep",
      title: "Sleep",
      icon: "moon-waning-crescent",
      value: value("sleep"),
      unit: "hours",
      caption: goals.sleep ? `Goal ${format(goals.sleep)} hours` : "Rest is part of the work",
      target: goals.sleep,
    },
    {
      metric: "weight",
      title: "Body weight",
      icon: "scale-bathroom",
      value: snapshot.weight ? weightValue(snapshot.weight.value!, unit) : null,
      unit,
      caption: snapshot.weight
        ? snapshot.weight.date === today
          ? "Recorded today"
          : `Last log · ${dateLabel(snapshot.weight.date)}`
        : "Add your first check-in",
    },
  ];
  return (
    <View className="gap-3">
      {[cards.slice(0, 2), cards.slice(2, 4)].map((row, index) => (
        <View key={index} className="flex-row gap-3">
          {row.map((card) => (
            <View
              key={card.metric}
              className="min-w-0 flex-1 overflow-hidden rounded-[24px] border border-white/5 bg-panel"
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Log ${card.title.toLowerCase()}${card.value == null ? "" : `, ${format(card.value)} ${card.unit}`}`}
                accessibilityState={{ disabled }}
                disabled={disabled}
                onPress={() => onLog(card.metric)}
                className="px-4 pb-4 pt-5"
              >
                <View className="flex-row items-center justify-between gap-2">
                  <MaterialCommunityIcons name={card.icon} size={21} color={C.brand} />
                  <MaterialCommunityIcons name="plus" size={17} color={C.muted} />
                </View>
                <Txt weight="medium" className="mt-4 text-xs text-muted">
                  {card.title}
                </Txt>
                <Txt
                  weight="medium"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  className="mt-1 text-[30px] leading-[39px] tracking-[-1px]"
                >
                  {loading || card.value == null ? "—" : format(card.value)}
                  <Txt className="text-[11px] tracking-normal text-muted"> {card.unit}</Txt>
                </Txt>
                <Txt numberOfLines={2} className="mt-1 min-h-8 text-[10px] leading-4 text-muted">
                  {loading ? "Loading your journal…" : card.caption}
                </Txt>
                {card.target != null && card.target > 0 && card.value != null && !loading && (
                  <View className="mt-2">
                    <ProgressFill ratio={card.value / card.target} color={C.brand} height={3} />
                  </View>
                )}
              </Pressable>
              {card.metric === "water" && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add 250 millilitres of water to today"
                  accessibilityState={{ disabled: disabled || waterBusy, busy: waterBusy }}
                  disabled={disabled || waterBusy}
                  onPress={onWater}
                  className="min-h-11 flex-row items-center justify-center gap-1.5 border-t border-white/5 bg-white/5 px-2"
                >
                  {waterBusy ? (
                    <ActivityIndicator size="small" color={C.brand} />
                  ) : (
                    <MaterialCommunityIcons name="plus" size={16} color={C.brand} />
                  )}
                  <Txt weight="medium" className="text-[11px] text-brand">
                    {waterBusy ? "Saving…" : "250 ml"}
                  </Txt>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ))}
      <View className="flex-row overflow-hidden rounded-[22px] border border-white/5 bg-panel">
        {(
          [
            { metric: "caloriesIn", label: "Food", unit: "kcal", icon: "silverware-fork-knife" },
            { metric: "protein", label: "Protein", unit: "g", icon: "food-steak" },
          ] as const
        ).map((item, index) => (
          <Pressable
            key={item.metric}
            accessibilityRole="button"
            accessibilityLabel={`Log ${item.label.toLowerCase()}`}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => onLog(item.metric)}
            className={`min-w-0 flex-1 p-4 ${index ? "border-l border-white/5" : ""}`}
          >
            <View className="flex-row items-center gap-2">
              <MaterialCommunityIcons name={item.icon} size={16} color={C.muted} />
              <Txt className="flex-1 text-[11px] text-muted">{item.label}</Txt>
              <MaterialCommunityIcons name="plus" size={14} color={C.muted} />
            </View>
            <Txt weight="medium" numberOfLines={1} adjustsFontSizeToFit className="mt-3 text-xl">
              {loading || value(item.metric) == null ? "—" : format(value(item.metric)!)}
              <Txt className="text-[10px] text-muted"> {item.unit}</Txt>
            </Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
