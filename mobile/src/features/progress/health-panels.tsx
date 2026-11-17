import React from "react";
import { View } from "react-native";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { TrendChart } from "./charts";
import { MacroRing } from "./insight-charts";
import { AnalyticsCard, MetricTile, ACCENTS, EmptyInsight, numberLabel } from "./dashboard-ui";
import { metricInsight } from "./insights";
import { weightValue, dateLabel, type Goals, type Metric } from "./model";
import type { ProgressAnalytics } from "./analytics";
import { Icon } from "./visuals";

type Props = {
  data: ProgressAnalytics;
  unit: "kg" | "lb";
  isPro: boolean;
  daily: (metric: Metric) => number | null;
  goals: Goals;
  canLog: boolean;
  onLog: (metric: Metric) => void;
  onMetric: (metric: Metric) => void;
  onNutrition: () => void;
};
export function BodyAnalytics({
  data,
  unit,
  isPro,
  daily,
  goals,
  canLog,
  onLog,
  onMetric,
  onNutrition,
}: Props) {
  const weight = metricInsight(data, "weight"),
    steps = metricInsight(data, "steps"),
    protein = metricInsight(data, "protein"),
    food = metricInsight(data, "caloriesIn");
  return (
    <>
      <AnalyticsCard
        title="Body weight"
        subtitle={
          weight.count
            ? `${weight.count} recorded days · ${dateLabel(weight.entries[0].date)} – ${dateLabel(weight.entries.at(-1)!.date)}`
            : "Your first log sets your baseline."
        }
        icon="scale-bathroom"
        color={ACCENTS.body}
      >
        <View className="mb-4 flex-row items-center justify-between gap-3">
          <View>
            <Txt weight="medium" className="text-[34px] tracking-[-1px]">
              {numberLabel(weight.count ? weightValue(weight.entries.at(-1)!.value!, unit) : null)}
              <Txt className="text-xs text-muted"> {unit}</Txt>
            </Txt>
            <Txt className="mt-1 text-[11px] text-muted">
              {weight.change === null
                ? "Add two dated entries to see a change."
                : `${weight.change > 0 ? "+" : ""}${numberLabel(weightValue(weight.change, unit))} ${unit} between first and latest log`}
            </Txt>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log body weight"
            disabled={!canLog}
            onPress={() => onLog("weight")}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/5"
          >
            <Icon name="plus" size={20} color={ACCENTS.body} />
          </Pressable>
        </View>
        <TrendChart
          points={weight.entries.map((entry) => ({
            date: entry.date,
            value: weightValue(entry.value!, unit),
          }))}
          unit={unit}
          color={ACCENTS.body}
        />
        {isPro && (
          <View className="mt-4 flex-row justify-between border-t border-white/5 pt-4">
            <Txt className="text-xs text-muted">Rate between logged dates · Pro</Txt>
            <Txt weight="medium" className="text-xs">
              {numberLabel(weight.perWeek === null ? null : weightValue(weight.perWeek, unit))}{" "}
              {unit}/week
            </Txt>
          </View>
        )}
      </AnalyticsCard>
      <View className="mt-4 flex-row gap-3">
        <MetricTile
          label="Average food intake"
          value={numberLabel(food.average, 0)}
          unit="kcal"
          icon="silverware-fork-knife"
          color={ACCENTS.nutrition}
          caption={`${food.count} logged days`}
          onPress={() => onMetric("caloriesIn")}
        />
        <MetricTile
          label="Average protein"
          value={numberLabel(protein.average, 0)}
          unit="g"
          icon="food-steak"
          color={ACCENTS.nutrition}
          caption={`${protein.count} logged days`}
          onPress={() => onMetric("protein")}
        />
      </View>
      <AnalyticsCard
        title="Your nutrition picture"
        subtitle="Energy share of the macros you logged for the selected check-in day."
        icon="food-apple-outline"
        color={ACCENTS.nutrition}
      >
        <View className="flex-row items-center gap-4">
          <MacroRing protein={daily("protein")} carbs={daily("carbs")} fat={daily("fat")} />
          <View className="flex-1 gap-3">
            {(
              [
                { metric: "protein", label: "Protein" },
                { metric: "carbs", label: "Carbs" },
                { metric: "fat", label: "Fat" },
              ] as const
            ).map((item) => (
              <View key={item.metric} className="flex-row items-center justify-between gap-2">
                <Txt className="text-xs text-muted">{item.label}</Txt>
                <Txt weight="medium" className="text-xs">
                  {numberLabel(daily(item.metric))} g
                </Txt>
              </View>
            ))}
          </View>
        </View>
        <Txt className="mt-3 text-[10px] leading-5 text-muted">
          Missing nutrients are unlogged. Macro energy does not replace your recorded food-calorie
          total.
        </Txt>
        <Pressable
          accessibilityRole="button"
          onPress={onNutrition}
          className="mt-3 min-h-11 flex-row items-center justify-between"
        >
          <Txt weight="medium" className="text-xs" style={{ color: ACCENTS.nutrition }}>
            Explore nutrition totals
          </Txt>
          <Icon name="arrow-right" color={ACCENTS.nutrition} size={18} />
        </Pressable>
      </AnalyticsCard>
      <AnalyticsCard
        title="Everyday movement"
        subtitle={`${steps.count} days logged · Missing days stay unlogged.`}
        icon="shoe-print"
        color={ACCENTS.body}
      >
        <View className="mb-3 flex-row gap-5">
          <View className="flex-1">
            <Txt className="text-[10px] text-muted">AVERAGE STEPS</Txt>
            <Txt weight="medium" className="mt-1 text-2xl">
              {numberLabel(steps.average, 0)}
            </Txt>
          </View>
          <View className="flex-1">
            <Txt className="text-[10px] text-muted">HIGHEST LOG</Txt>
            <Txt weight="medium" className="mt-1 text-2xl">
              {numberLabel(steps.maximum, 0)}
            </Txt>
          </View>
        </View>
        <TrendChart
          points={steps.entries.map((entry) => ({ date: entry.date, value: entry.value! }))}
          unit="steps"
          color={ACCENTS.body}
          format={(value) => numberLabel(value, 0)}
        />
        {goals.steps !== null && (
          <Txt className="mt-3 text-[11px] text-muted">
            {steps.entries.filter((entry) => entry.value! >= goals.steps!).length} / {steps.count}{" "}
            logged days reached your current step goal.
          </Txt>
        )}
      </AnalyticsCard>
      {isPro && (
        <AnalyticsCard
          title="Measurement changes"
          subtitle="First to latest log in this range, with no assumed values between them."
          icon="tape-measure"
          color={ACCENTS.body}
          pro
        >
          {(
            [
              { metric: "waist", label: "Waist", unit: "cm" },
              { metric: "bodyFat", label: "Body fat", unit: "percentage points" },
              { metric: "chest", label: "Chest", unit: "cm" },
              { metric: "upperArm", label: "Upper arm", unit: "cm" },
            ] as const
          ).map((item) => {
            const metric = metricInsight(data, item.metric);
            return (
              <Pressable
                key={item.metric}
                accessibilityRole="button"
                onPress={() => onMetric(item.metric)}
                className="flex-row items-center gap-3 border-b border-white/5 py-4"
              >
                <View className="flex-1">
                  <Txt className="text-xs">{item.label}</Txt>
                  <Txt className="mt-1 text-[10px] text-muted">{metric.count} recorded days</Txt>
                </View>
                <Txt weight="medium" className="text-xs">
                  {metric.change === null
                    ? "Need two logs"
                    : `${metric.change > 0 ? "+" : ""}${numberLabel(metric.change)} ${item.unit}`}
                </Txt>
              </Pressable>
            );
          })}
        </AnalyticsCard>
      )}
    </>
  );
}
export function RecoveryAnalytics({ data, isPro, goals, onMetric }: Props) {
  const sleep = metricInsight(data, "sleep"),
    water = metricInsight(data, "water");
  return (
    <>
      <View className="mt-4 flex-row gap-3">
        <MetricTile
          label="Average sleep"
          value={numberLabel(sleep.average)}
          unit="hours"
          icon="moon-waning-crescent"
          color={ACCENTS.recovery}
          caption={`${sleep.count} logged nights`}
          onPress={() => onMetric("sleep")}
        />
        <MetricTile
          label="Average hydration"
          value={numberLabel(water.average === null ? null : water.average / 1000)}
          unit="L"
          icon="water-outline"
          color={ACCENTS.body}
          caption={`${water.count} logged days`}
          onPress={() => onMetric("water")}
        />
      </View>
      <AnalyticsCard
        title="Your sleep rhythm"
        subtitle="Recorded sleep duration. This is a log of your rest, not a recovery score."
        icon="weather-night"
        color={ACCENTS.recovery}
      >
        <TrendChart
          points={sleep.entries.map((entry) => ({ date: entry.date, value: entry.value! }))}
          unit="hours"
          color={ACCENTS.recovery}
        />
        {goals.sleep !== null && (
          <Txt className="mt-4 text-[11px] leading-5 text-muted">
            {sleep.entries.filter((entry) => entry.value! >= goals.sleep!).length} of {sleep.count}{" "}
            logged nights reached your current {goals.sleep}-hour goal.
          </Txt>
        )}
      </AnalyticsCard>
      <AnalyticsCard
        title="How you’ve been feeling"
        subtitle="Average of your own 1–5 check-ins. Each measure keeps its own meaning."
        icon="heart-pulse"
        color={ACCENTS.recovery}
      >
        <View className="gap-1">
          {(
            [
              { metric: "energy", label: "Energy", icon: "lightning-bolt-outline" },
              { metric: "mood", label: "Mood", icon: "emoticon-outline" },
              { metric: "stress", label: "Stress", icon: "weather-cloudy" },
              { metric: "soreness", label: "Soreness", icon: "arm-flex-outline" },
            ] as const
          ).map((item) => {
            const metric = metricInsight(data, item.metric);
            return (
              <Pressable
                key={item.metric}
                accessibilityRole="button"
                onPress={() => onMetric(item.metric)}
                className="flex-row items-center gap-3 border-b border-white/5 py-4"
              >
                <Icon name={item.icon} size={20} color={ACCENTS.recovery} />
                <View className="flex-1">
                  <Txt className="text-xs">{item.label}</Txt>
                  <Txt className="mt-1 text-[10px] text-muted">{metric.count} check-ins</Txt>
                </View>
                <Txt weight="medium" className="text-lg">
                  {numberLabel(metric.average)}
                  <Txt className="text-[10px] text-muted"> / 5</Txt>
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </AnalyticsCard>
      {isPro && (
        <AnalyticsCard
          title="Your recovery signals"
          subtitle="Pro · Separate observations from the metrics you actually recorded."
          icon="chart-line"
          color={ACCENTS.recovery}
          pro
        >
          {sleep.count || water.count ? (
            <View className="gap-4">
              {[
                {
                  label: "Shortest / longest sleep",
                  value:
                    sleep.minimum === null
                      ? "—"
                      : `${numberLabel(sleep.minimum)} / ${numberLabel(sleep.maximum)} hours`,
                },
                {
                  label: "Lowest / highest hydration",
                  value:
                    water.minimum === null
                      ? "—"
                      : `${numberLabel(water.minimum / 1000)} / ${numberLabel(water.maximum! / 1000)} L`,
                },
                {
                  label: "Sleep logging coverage",
                  value: `${sleep.count} of ${data.activity.length} days`,
                },
                {
                  label: "Hydration logging coverage",
                  value: `${water.count} of ${data.activity.length} days`,
                },
              ].map((row) => (
                <View key={row.label} className="flex-row items-center gap-4">
                  <Txt className="flex-1 text-[11px] leading-5 text-muted">{row.label}</Txt>
                  <Txt weight="medium" className="max-w-[50%] text-right text-xs">
                    {row.value}
                  </Txt>
                </View>
              ))}
            </View>
          ) : (
            <EmptyInsight
              title="Your check-ins start the picture"
              detail="Log sleep and hydration across several days to explore ranges and coverage. Missing days are never counted as zero."
            />
          )}
        </AnalyticsCard>
      )}
    </>
  );
}
