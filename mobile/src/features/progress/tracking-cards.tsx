import React from "react";
import { View } from "react-native";
import { MotionPressable, ProgressFill } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { TrendChart } from "./charts";
import { Icon, PanelCard, type IconName } from "./visuals";
import {
  METRICS,
  RATING_LABELS,
  dateLabel,
  weightValue,
  type Goals,
  type Metric,
  type MetricEvent,
} from "./model";
import type { ProgressAnalytics } from "./analytics";

export const compact = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });
export const METRIC_ICONS: Record<Metric, IconName> = {
  steps: "shoe-print",
  caloriesIn: "silverware-fork-knife",
  caloriesActive: "fire",
  weight: "scale-bathroom",
  water: "water-outline",
  sleep: "weather-night",
  protein: "food-steak",
  carbs: "barley",
  fat: "water-percent",
  waist: "tape-measure",
  bodyFat: "human",
  restingHeartRate: "heart-pulse",
  distance: "map-marker-distance",
  activeMinutes: "timer-outline",
  floors: "stairs",
  fiber: "leaf",
  sugar: "cube-outline",
  sodium: "shaker-outline",
  caffeine: "coffee-outline",
  chest: "tape-measure",
  hips: "tape-measure",
  upperArm: "arm-flex-outline",
  thigh: "tape-measure",
  calf: "tape-measure",
  neck: "tape-measure",
  sleepQuality: "sleep",
  energy: "lightning-bolt-outline",
  mood: "emoticon-happy-outline",
  stress: "head-heart-outline",
  soreness: "human-handsup",
  hrv: "pulse",
};
export function displayMetric(metric: Metric, value: number | null, unit: "kg" | "lb") {
  if (value === null) return "—";
  return compact(
    metric === "weight" ? weightValue(value, unit) : metric === "water" ? value / 1000 : value,
  );
}
export function displayUnit(metric: Metric, unit: "kg" | "lb") {
  return metric === "weight" ? unit : metric === "water" ? "L" : METRICS[metric].unit;
}

export function TrainingHero({
  data,
  days,
  target,
  onGoals,
  onDay,
}: {
  data: ProgressAnalytics;
  days: number;
  target: number;
  onGoals: () => void;
  onDay: (date: string) => void;
}) {
  const recent = data.activity.slice(-7);
  const maximum = Math.max(1, ...recent.map((day) => day.workouts));
  const currentWeek = data.weeks.at(-1)!;
  return (
    <View className="overflow-hidden rounded-[28px] bg-ink p-5">
      <View className="flex-row items-center justify-between">
        <Txt
          weight="semibold"
          className="text-sm text-bg"
        >{`Your last ${days === 365 ? "year" : `${days} days`}`}</Txt>
        <View className="rounded-full bg-bg/10 px-3 py-1.5">
          <Txt weight="semibold" className="text-[11px] text-bg">
            {dateLabel(data.start)} – {dateLabel(data.today)}
          </Txt>
        </View>
      </View>
      <View className="mt-5 flex-row items-end justify-between gap-4">
        <View className="flex-1">
          <Txt weight="medium" className="text-[56px] leading-[62px] text-bg">
            {data.current.workouts}
          </Txt>
          <Txt weight="medium" className="mt-1 text-sm text-bg">
            Workouts completed
          </Txt>
        </View>
        <View
          style={{ flexDirection: "row", gap: 7, alignItems: "flex-end", height: 103, flex: 1 }}
        >
          {recent.map((day) => (
            <MotionPressable
              key={day.date}
              accessibilityRole="button"
              accessibilityLabel={`${dateLabel(day.date)}: ${day.workouts} workouts. Open daily history.`}
              onPress={() => onDay(day.date)}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "flex-end",
                height: "100%",
                minWidth: 14,
              }}
            >
              <View
                style={{
                  width: "100%",
                  maxWidth: 23,
                  height: day.workouts ? 15 + (day.workouts / maximum) * 61 : 6,
                  borderRadius: 7,
                  backgroundColor: day.workouts ? C.bg : "#00000025",
                }}
              />
              <Txt weight="medium" style={{ fontSize: 10, color: C.bg, marginTop: 10 }}>
                {dateLabel(day.date, { weekday: "narrow" })}
              </Txt>
            </MotionPressable>
          ))}
        </View>
      </View>
      <Txt className="mt-2 self-end text-[11px] text-bg/70">Daily activity · last 7 days</Txt>
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel="Edit weekly workout goal"
        onPress={onGoals}
        className="mt-4 rounded-2xl bg-bg/10 p-3.5"
      >
        <View className="mb-2 flex-row items-center justify-between">
          <Txt weight="semibold" className="text-xs text-bg">
            Weekly goal
          </Txt>
          <View className="flex-row items-center gap-1">
            <Txt weight="semibold" className="text-xs text-bg">
              {currentWeek.workouts} / {target} workouts
            </Txt>
            <Icon name="chevron-right" color={C.bg} size={15} />
          </View>
        </View>
        <ProgressFill
          ratio={currentWeek.workouts / target}
          color={C.bg}
          trackColor="#00000018"
          height={4}
        />
      </MotionPressable>
    </View>
  );
}

export function TrainingStats({ data, unit }: { data: ProgressAnalytics; unit: "kg" | "lb" }) {
  const shortNumber = (value: number) =>
    value.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 1 });
  const stats = [
    { label: "Minutes", value: shortNumber(data.current.minutes), icon: "clock-outline" as const },
    { label: "Working sets", value: shortNumber(data.current.sets), icon: "dumbbell" as const },
    {
      label: `Volume · ${unit} × reps`,
      value: shortNumber(weightValue(data.current.volume, unit)),
      icon: "weight-kilogram" as const,
    },
  ];
  return (
    <View className="mb-2 mt-3 flex-row gap-2">
      {stats.map((stat) => (
        <View key={stat.label} className="min-w-0 flex-1 rounded-[22px] bg-panel p-4">
          <Icon name={stat.icon} size={18} color={C.muted} />
          <Txt weight="medium" className="mt-3 text-[22px] leading-8 tracking-[-0.5px]">
            {stat.value}
          </Txt>
          <Txt className="mt-1 text-[11px] text-muted">{stat.label}</Txt>
        </View>
      ))}
    </View>
  );
}

export function DailyMetricGrid({
  metrics,
  daily,
  goals,
  unit,
  onLog,
  onDetail,
  disabled = false,
}: {
  metrics: readonly Metric[];
  daily: (metric: Metric) => number | null;
  goals: Goals;
  unit: "kg" | "lb";
  onLog: (metric: Metric) => void;
  onDetail: (metric: Metric) => void;
  disabled?: boolean;
}) {
  const rows = Array.from({ length: Math.ceil(metrics.length / 2) }, (_, index) =>
    metrics.slice(index * 2, index * 2 + 2),
  );
  return (
    <View className="gap-3">
      {rows.map((row, index) => (
        <View key={index} className="flex-row gap-3">
          {row.map((metric) => {
            const value = daily(metric);
            const target = metric in goals ? goals[metric as keyof Goals] : null;
            return (
              <View
                key={metric}
                className="min-w-0 flex-1 rounded-[24px] border border-white/5 bg-panel"
              >
                <View className="flex-row items-center justify-between pl-4 pr-1 pt-2">
                  <Icon name={METRIC_ICONS[metric]} size={22} color={C.ink} />
                  <MotionPressable
                    accessibilityRole="button"
                    accessibilityLabel={`Log ${METRICS[metric].label}`}
                    accessibilityState={{ disabled }}
                    disabled={disabled}
                    onPress={() => {
                      if (!disabled) onLog(metric);
                    }}
                    className="h-11 w-11 items-center justify-center"
                  >
                    <Icon name="plus" size={20} color={disabled ? "#555555" : C.muted} />
                  </MotionPressable>
                </View>
                <MotionPressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${METRICS[metric].label} history`}
                  onPress={() => onDetail(metric)}
                  className="px-4 pb-4"
                >
                  <Txt weight="medium" className="mt-1 text-xs leading-5">
                    {METRICS[metric].label}
                  </Txt>
                  <Txt
                    weight="medium"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                    className="mt-3 text-[28px] leading-[40px] tracking-[-0.8px]"
                    style={{ includeFontPadding: false }}
                  >
                    {displayMetric(metric, value, unit)}
                  </Txt>
                  <Txt className="text-[11px] leading-5 text-muted">
                    {displayUnit(metric, unit)}
                  </Txt>
                  {!!target && (
                    <View className="mt-3">
                      <ProgressFill
                        ratio={target ? (value ?? 0) / target : 0}
                        color={C.ink}
                        height={3}
                      />
                    </View>
                  )}
                  <Txt className="mt-2 text-[10px] leading-5 text-muted">
                    {target
                      ? `Goal ${displayMetric(metric, target, unit)} ${displayUnit(metric, unit)}`
                      : value === null
                        ? "Not logged · tap +"
                        : (RATING_LABELS[metric]?.[value - 1] ?? "View history")}
                  </Txt>
                </MotionPressable>
              </View>
            );
          })}
          {row.length === 1 && <View className="flex-1" />}
        </View>
      ))}
    </View>
  );
}

export function MetricList({
  metrics,
  daily,
  goals,
  unit,
  onLog,
  onDetail,
  disabled = false,
}: {
  metrics: readonly Metric[];
  daily: (metric: Metric) => number | null;
  goals: Goals;
  unit: "kg" | "lb";
  onLog: (metric: Metric) => void;
  onDetail: (metric: Metric) => void;
  disabled?: boolean;
}) {
  return (
    <View className="overflow-hidden rounded-[28px] bg-panel">
      {metrics.map((metric) => {
        const value = daily(metric);
        const target = metric in goals ? goals[metric as keyof Goals] : null;
        return (
          <View key={metric} className="flex-row items-center px-4">
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel={`View ${METRICS[metric].label} trends`}
              onPress={() => onDetail(metric)}
              className="min-h-20 min-w-0 flex-1 flex-row items-center gap-3 py-4"
            >
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-elevated">
                <Icon name={METRIC_ICONS[metric]} color={C.ink} size={21} />
              </View>
              <View className="min-w-0 flex-1">
                <Txt weight="semibold" className="text-sm leading-6">
                  {METRICS[metric].label}
                </Txt>
                <Txt className="mt-1 text-[11px] leading-5 text-muted">
                  {value === null
                    ? "Not logged"
                    : (RATING_LABELS[metric]?.[value - 1] ??
                      (target
                        ? `Goal ${displayMetric(metric, target, unit)} ${displayUnit(metric, unit)}`
                        : "View trend"))}
                </Txt>
              </View>
              <View className="max-w-[35%] items-end">
                <Txt
                  weight="semibold"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  className="text-lg leading-7"
                >
                  {displayMetric(metric, value, unit)}
                </Txt>
                <Txt className="text-[11px] leading-5 text-muted">{displayUnit(metric, unit)}</Txt>
              </View>
            </MotionPressable>
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel={`Log ${METRICS[metric].label}`}
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => {
                if (!disabled) onLog(metric);
              }}
              className="ml-1 h-11 w-11 items-center justify-center"
            >
              <Icon
                name={value === null ? "plus-circle-outline" : "pencil-outline"}
                size={20}
                color={C.muted}
              />
            </MotionPressable>
          </View>
        );
      })}
    </View>
  );
}

export function WeightCard({
  latest,
  weights,
  unit,
  onLog,
  onDetail,
  disabled = false,
}: {
  latest?: MetricEvent;
  weights: MetricEvent[];
  unit: "kg" | "lb";
  onLog: () => void;
  onDetail: () => void;
  disabled?: boolean;
}) {
  const first = weights[0];
  const last = weights.at(-1);
  const difference =
    first && last && weights.length > 1 ? weightValue(last.value! - first.value!, unit) : null;
  return (
    <PanelCard>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Icon name="scale-bathroom" color={C.ink} />
          <Txt weight="semibold" className="text-base">
            Body weight
          </Txt>
        </View>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Log body weight"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => {
            if (!disabled) onLog();
          }}
          className="h-11 w-11 items-center justify-center rounded-full bg-elevated"
        >
          <Icon name="plus" size={20} />
        </MotionPressable>
      </View>
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel="Explore body weight trends"
        onPress={onDetail}
      >
        <View className="mb-4 mt-3 flex-row flex-wrap items-end justify-between gap-3">
          <View className="min-w-0 flex-1">
            <View className="flex-row flex-wrap items-baseline gap-x-2">
              <Txt
                weight="medium"
                className="text-[36px] leading-[52px] tracking-[-1px]"
                style={{ includeFontPadding: false }}
              >
                {latest ? weightValue(latest.value!, unit).toFixed(1) : "—"}
              </Txt>
              <Txt className="text-base leading-6 text-muted">{unit}</Txt>
            </View>
            <Txt className="mt-1 text-[11px] leading-5 text-muted">
              {latest
                ? `Latest check-in · ${dateLabel(latest.date)}`
                : "Add your first measurement"}
            </Txt>
          </View>
          {difference !== null && (
            <View className="rounded-full bg-elevated px-3 py-2">
              <Txt weight="medium" className="text-xs">
                {difference > 0 ? "+" : ""}
                {difference.toFixed(1)} {unit}
              </Txt>
            </View>
          )}
        </View>
        <TrendChart
          points={weights.map((entry) => ({
            date: entry.date,
            value: weightValue(entry.value!, unit),
          }))}
          color={C.ink}
          unit={unit}
          compact
        />
      </MotionPressable>
    </PanelCard>
  );
}
