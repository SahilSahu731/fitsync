import React from "react";
import { View } from "react-native";
import { MotionPressable, ProgressFill } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { TrendChart } from "./charts";
import { Icon, PanelCard, type IconName } from "./visuals";
import { METRICS, RATING_LABELS, dateLabel, weightValue, type Goals, type Metric, type MetricEvent } from "./model";
import type { ProgressAnalytics } from "./analytics";

export const compact = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });
export const METRIC_ICONS: Record<Metric, IconName> = {
  steps: "shoe-print", caloriesIn: "silverware-fork-knife", caloriesActive: "fire", weight: "scale-bathroom",
  water: "water-outline", sleep: "weather-night", protein: "food-steak", carbs: "barley", fat: "water-percent",
  waist: "tape-measure", bodyFat: "human", restingHeartRate: "heart-pulse", distance: "map-marker-distance",
  activeMinutes: "timer-outline", floors: "stairs", fiber: "leaf", sugar: "cube-outline", sodium: "shaker-outline",
  caffeine: "coffee-outline", chest: "tape-measure", hips: "tape-measure", upperArm: "arm-flex-outline",
  thigh: "tape-measure", calf: "tape-measure", neck: "tape-measure", sleepQuality: "sleep",
  energy: "lightning-bolt-outline", mood: "emoticon-happy-outline", stress: "head-heart-outline",
  soreness: "human-handsup", hrv: "pulse",
};
export function displayMetric(metric: Metric, value: number | null, unit: "kg" | "lb") {
  if (value === null) return "—";
  return compact(metric === "weight" ? weightValue(value, unit) : metric === "water" ? value / 1000 : value);
}
export function displayUnit(metric: Metric, unit: "kg" | "lb") {
  return metric === "weight" ? unit : metric === "water" ? "L" : METRICS[metric].unit;
}

export function TrainingHero({ data, days, target, onGoals, onDay }: { data: ProgressAnalytics; days: number; target: number; onGoals: () => void; onDay: (date: string) => void }) {
  const recent = data.activity.slice(-7);
  const maximum = Math.max(1, ...recent.map(day => day.workouts));
  const currentWeek = data.weeks.at(-1)!;
  return <View className="overflow-hidden rounded-[28px] bg-brand p-5">
    <View className="flex-row items-center justify-between">
      <Txt weight="semibold" className="text-sm text-bg">{`Your last ${days === 365 ? "year" : `${days} days`}`}</Txt>
      <View className="rounded-full bg-bg/10 px-3 py-1.5"><Txt weight="semibold" className="text-[11px] text-bg">{dateLabel(data.start)} – {dateLabel(data.today)}</Txt></View>
    </View>
    <View className="mt-5 flex-row items-end justify-between gap-4">
      <View className="flex-1"><Txt weight="extra" className="text-[56px] leading-[62px] text-bg">{data.current.workouts}</Txt><Txt weight="medium" className="mt-1 text-sm text-bg">Workouts completed</Txt></View>
      <View style={{ flexDirection: "row", gap: 7, alignItems: "flex-end", height: 103, flex: 1 }}>
        {recent.map(day => <MotionPressable key={day.date} accessibilityRole="button" accessibilityLabel={`${dateLabel(day.date)}: ${day.workouts} workouts. Open daily history.`} onPress={() => onDay(day.date)} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%", minWidth: 14 }}>
          <View style={{ width: "100%", maxWidth: 23, height: day.workouts ? 15 + day.workouts / maximum * 61 : 6, borderRadius: 7, backgroundColor: day.workouts ? C.bg : "#10101125" }} />
          <Txt weight="medium" style={{ fontSize: 10, color: C.bg, marginTop: 10 }}>{dateLabel(day.date, { weekday: "narrow" })}</Txt>
        </MotionPressable>)}
      </View>
    </View>
    <Txt className="mt-2 self-end text-[10px] text-bg/70">Daily activity · last 7 days</Txt>
    <MotionPressable accessibilityRole="button" accessibilityLabel="Edit weekly workout goal" onPress={onGoals} className="mt-4 rounded-2xl bg-bg/10 p-3.5">
      <View className="mb-2 flex-row items-center justify-between"><Txt weight="semibold" className="text-xs text-bg">Weekly goal</Txt><View className="flex-row items-center gap-1"><Txt weight="semibold" className="text-xs text-bg">{currentWeek.workouts} / {target} workouts</Txt><Icon name="chevron-right" color={C.bg} size={15} /></View></View>
      <ProgressFill ratio={currentWeek.workouts / target} color={C.bg} trackColor="#10101118" height={4} />
    </MotionPressable>
  </View>;
}

export function TrainingStats({ data, unit }: { data: ProgressAnalytics; unit: "kg" | "lb" }) {
  const shortNumber = (value: number) => value.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 1 });
  const stats = [
    { label: "Minutes", value: shortNumber(data.current.minutes), icon: "clock-outline" as const },
    { label: "Working sets", value: shortNumber(data.current.sets), icon: "dumbbell" as const },
    { label: `Volume · ${unit}`, value: shortNumber(weightValue(data.current.volume, unit)), icon: "weight-kilogram" as const },
  ];
  return <View className="mb-2 mt-3 flex-row gap-2">
    {stats.map(stat => <View key={stat.label} style={{ flex: 1, padding: 15, borderRadius: 20, backgroundColor: C.panel }}><Icon name={stat.icon} size={18} color={C.muted} /><Txt weight="bold" style={{ fontSize: 22, marginTop: 12 }}>{stat.value}</Txt><Txt style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{stat.label}</Txt></View>)}
  </View>;
}

export function DailyMetricGrid({ metrics, daily, goals, unit, onLog, onDetail }: { metrics: readonly Metric[]; daily: (metric: Metric) => number | null; goals: Goals; unit: "kg" | "lb"; onLog: (metric: Metric) => void; onDetail: (metric: Metric) => void }) {
  const rows = Array.from({ length: Math.ceil(metrics.length / 2) }, (_, index) => metrics.slice(index * 2, index * 2 + 2));
  return <View style={{ gap: 12 }}>{rows.map((row, index) => <View key={index} style={{ flexDirection: "row", gap: 12 }}>
    {row.map(metric => {
      const value = daily(metric);
      const target = metric in goals ? goals[metric as keyof Goals] : null;
      return <View key={metric} style={{ flex: 1, borderRadius: 22, backgroundColor: C.panel, overflow: "hidden" }}>
        <View className="flex-row items-center justify-between pl-4 pr-1 pt-1"><Icon name={METRIC_ICONS[metric]} size={22} color={C.brand} /><MotionPressable accessibilityRole="button" accessibilityLabel={`Log ${METRICS[metric].label}`} onPress={() => onLog(metric)} className="h-11 w-11 items-center justify-center"><Icon name="plus" size={20} color={C.muted} /></MotionPressable></View>
        <MotionPressable accessibilityRole="button" accessibilityLabel={`View ${METRICS[metric].label} history`} onPress={() => onDetail(metric)} className="px-4 pb-4">
          <Txt weight="bold" className="mt-1 text-[28px]">{displayMetric(metric, value, unit)}<Txt className="text-xs text-muted"> {displayUnit(metric, unit)}</Txt></Txt>
          <Txt weight="medium" className="mt-1 text-sm">{METRICS[metric].label}</Txt>
          <View className="mt-3"><ProgressFill ratio={target ? (value ?? 0) / target : 0} color={C.brand} height={3} /></View>
          <Txt className="mt-2 text-[11px] text-muted">{target ? `Goal ${displayMetric(metric, target, unit)} ${displayUnit(metric, unit)}` : value === null ? "Tap + to log" : "View history"}</Txt>
        </MotionPressable>
      </View>;
    })}
    {row.length === 1 && <View className="flex-1" />}
  </View>)}</View>;
}

export function MetricList({ metrics, daily, goals, unit, onLog, onDetail }: { metrics: readonly Metric[]; daily: (metric: Metric) => number | null; goals: Goals; unit: "kg" | "lb"; onLog: (metric: Metric) => void; onDetail: (metric: Metric) => void }) {
  return <View style={{ borderRadius: 24, backgroundColor: C.panel, overflow: "hidden" }}>{metrics.map((metric, index) => {
    const value = daily(metric);
    const target = metric in goals ? goals[metric as keyof Goals] : null;
    return <View key={metric} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, borderTopWidth: index ? 1 : 0, borderTopColor: "#FFFFFF07" }}>
      <MotionPressable accessibilityRole="button" accessibilityLabel={`View ${METRICS[metric].label} trends`} onPress={() => onDetail(metric)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 82, paddingVertical: 12 }}>
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-elevated"><Icon name={METRIC_ICONS[metric]} color={C.brand} size={21} /></View>
        <View className="flex-1"><Txt weight="semibold" className="text-sm">{METRICS[metric].label}</Txt><Txt className="mt-1 text-[11px] text-muted">{value === null ? "Not logged" : RATING_LABELS[metric]?.[value - 1] ?? (target ? `Goal ${displayMetric(metric, target, unit)} ${displayUnit(metric, unit)}` : "View trend")}</Txt></View>
        <Txt weight="semibold" className="text-lg">{displayMetric(metric, value, unit)}<Txt className="text-[11px] text-muted"> {displayUnit(metric, unit)}</Txt></Txt>
      </MotionPressable>
      <MotionPressable accessibilityRole="button" accessibilityLabel={`Log ${METRICS[metric].label}`} onPress={() => onLog(metric)} className="ml-1 h-11 w-11 items-center justify-center"><Icon name={value === null ? "plus-circle-outline" : "pencil-outline"} size={20} color={C.muted} /></MotionPressable>
    </View>;
  })}</View>;
}

export function WeightCard({ latest, weights, unit, onLog, onDetail }: { latest?: MetricEvent; weights: MetricEvent[]; unit: "kg" | "lb"; onLog: () => void; onDetail: () => void }) {
  const first = weights[0]; const last = weights.at(-1);
  const difference = first && last && weights.length > 1 ? weightValue(last.value! - first.value!, unit) : null;
  return <PanelCard>
    <View className="flex-row items-center justify-between"><View className="flex-row items-center gap-2"><Icon name="scale-bathroom" color={C.brand} /><Txt weight="semibold" className="text-base">Body weight</Txt></View><MotionPressable accessibilityRole="button" accessibilityLabel="Log body weight" onPress={onLog} className="h-11 w-11 items-center justify-center rounded-full bg-elevated"><Icon name="plus" size={20} /></MotionPressable></View>
    <MotionPressable accessibilityRole="button" accessibilityLabel="Explore body weight trends" onPress={onDetail}>
      <View className="mb-4 mt-3 flex-row items-end justify-between"><View><Txt weight="bold" className="text-[36px]">{latest ? weightValue(latest.value!, unit).toFixed(1) : "—"}<Txt className="text-base text-muted"> {unit}</Txt></Txt><Txt className="mt-1 text-[11px] text-muted">{latest ? `Latest check-in · ${dateLabel(latest.date)}` : "Add your first measurement"}</Txt></View>{difference !== null && <View className="rounded-full bg-elevated px-3 py-2"><Txt weight="medium" className="text-xs">{difference > 0 ? "+" : ""}{difference.toFixed(1)} {unit}</Txt></View>}</View>
      <TrendChart points={weights.map(entry => ({ date: entry.date, value: weightValue(entry.value!, unit) }))} color={C.brand} unit={unit} compact />
    </MotionPressable>
  </PanelCard>;
}
