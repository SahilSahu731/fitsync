import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { Icon, SectionTitle, SmallButton } from "./visuals";
import { compact, displayMetric } from "./tracking-cards";
import {
  addDays,
  dateLabel,
  weightValue,
  type Goals,
  type Metric,
  type MetricEvent,
} from "./model";
import { change, type ProgressAnalytics } from "./analytics";
import { Ring, TrendChart } from "./charts";
import { ActivityBars, ActivityHeatmap, MacroRing } from "./insight-charts";
import { ProgressRange } from "./progress-range";
import { AdvancedInsights } from "./advanced-insights";

type Props = {
  data: ProgressAnalytics;
  goals: Goals;
  hasGoals?: boolean;
  onGoals?: () => void;
  unit: "kg" | "lb";
  today: string;
  dateTitle: string;
  selectedDate?: string;
  daily: (metric: Metric) => number | null;
  latestWeight?: MetricEvent;
  weights: MetricEvent[];
  canLog: boolean;
  trainingAvailable: boolean;
  waterBusy: boolean;
  onLog: (metric: Metric) => void;
  onMetric: (metric: Metric) => void;
  onNutrition: () => void;
  onHealth: () => void;
  onTraining: () => void;
  onExercise: (id: string) => void;
  onTrain: () => void;
  onHistory: () => void;
  onWater: () => void;
  dayPicker: React.ReactNode;
  days?: number;
  isPro?: boolean;
  billingChecking?: boolean;
  canCompare?: boolean;
  onRange?: (days: number) => void;
  onPro?: () => void;
};
const green = "#C5F460",
  blue = "#7DCFFF",
  peach = "#FFB38A";
const noop = () => {};
export function ProgressOverview({
  data,
  goals,
  hasGoals = true,
  onGoals,
  unit,
  today,
  dateTitle,
  selectedDate = today,
  daily,
  latestWeight,
  weights,
  canLog,
  trainingAvailable,
  waterBusy,
  onLog,
  onMetric,
  onNutrition,
  onHealth,
  onTraining,
  onExercise,
  onTrain,
  onHistory,
  onWater,
  dayPicker,
  days = 30,
  isPro = false,
  billingChecking = false,
  canCompare = false,
  onRange = noop,
  onPro = noop,
}: Props) {
  const [chart, setChart] = useState<"workouts" | "minutes" | "volume">("workouts");
  const [exerciseId, setExerciseId] = useState("");
  const color = chart === "workouts" ? green : chart === "minutes" ? blue : peach;
  const chartUnit =
    chart === "workouts" ? "workouts" : chart === "minutes" ? "min" : `${unit} × reps`;
  const bucketSize = Math.max(1, Math.ceil(data.activity.length / 13));
  const buckets = Array.from(
    { length: Math.ceil(data.activity.length / bucketSize) },
    (_, index) => {
      const rows = data.activity.slice(index * bucketSize, (index + 1) * bucketSize);
      const value = rows.reduce((sum, row) => sum + row[chart], 0);
      return {
        date: rows[0].date,
        end: rows.at(-1)!.date,
        value: chart === "volume" ? weightValue(value, unit) : value,
      };
    },
  );
  const delta = canCompare ? change(data.current[chart], data.previous[chart]) : null;
  const currentValue =
    chart === "volume" ? weightValue(data.current.volume, unit) : data.current[chart];
  const activeDays = data.activity.filter((day) => day.workouts > 0).length;
  const water = daily("water");
  const recentExercises = [...data.exercises].sort((a, b) =>
    b.sessions.at(-1)!.timestamp.localeCompare(a.sessions.at(-1)!.timestamp),
  );
  const exercise = recentExercises.find((item) => item.id === exerciseId) ?? recentExercises[0];
  const key =
    exercise?.type === "reps_weight"
      ? "load"
      : exercise?.type === "duration"
        ? "duration"
        : exercise?.type === "distance_duration"
          ? "distance"
          : "reps";
  const exerciseUnit =
    key === "load" ? unit : key === "duration" ? "sec" : key === "distance" ? "m" : "reps";
  const exerciseLabel =
    key === "load"
      ? "Heaviest working set"
      : key === "duration"
        ? "Longest set"
        : key === "distance"
          ? "Farthest set"
          : "Most set reps";
  const exercisePoints =
    exercise?.sessions
      .filter((session) => session.date >= data.start && session.date <= today)
      .map((session, index) => ({
        date: session.date,
        label: `Session ${index + 1}`,
        value: key === "load" ? weightValue(session[key], unit) : session[key],
      })) ?? [];
  const firstWeight = weights[0]?.value;
  const lastWeight = weights.at(-1)?.value;
  const weightChange =
    firstWeight != null && lastWeight != null && weights.length > 1
      ? weightValue(lastWeight - firstWeight, unit)
      : null;
  const waterDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(selectedDate, i - 6);
    return {
      date,
      value:
        data.metrics.find((entry) => entry.metric === "water" && entry.date === date)?.value ??
        null,
    };
  });
  const waterMax = Math.max(goals.water ?? 0, 1, ...waterDays.map((day) => day.value ?? 0));
  return (
    <>
      <ProgressRange days={days} isPro={isPro} onChange={onRange} onPro={onPro} />
      <View className="mb-4 flex-row items-center justify-between">
        <Txt className="text-[10px] text-muted">
          {dateLabel(data.start)} – {dateLabel(today)}
        </Txt>
        <View className="flex-row items-center gap-1">
          <Icon
            name={isPro ? "star-four-points" : "check-circle-outline"}
            size={12}
            color={isPro ? "#D4B5FF" : green}
          />
          <Txt className="text-[10px] text-muted">
            {isPro ? "Pro analytics" : "90 days included"}
          </Txt>
        </View>
      </View>
      {trainingAvailable && (
        <>
          <View
            className="overflow-hidden rounded-[28px] border bg-panel p-5"
            style={{ borderColor: `${color}25` }}
          >
            <View className="flex-row items-center justify-between">
              <Txt weight="medium" className="text-base">
                Your momentum
              </Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View training analytics"
                onPress={onTraining}
                className="h-11 w-11 items-center justify-center rounded-full bg-elevated"
              >
                <Icon name="arrow-top-right" size={20} color={color} />
              </Pressable>
            </View>
            <View className="mt-2 flex-row items-baseline gap-2">
              <Txt
                weight="semibold"
                className="text-[44px] leading-[58px] tracking-[-1.7px]"
                style={{ color }}
              >
                {compact(currentValue)}
              </Txt>
              <Txt className="text-sm text-muted">{chartUnit}</Txt>
            </View>
            <Txt className="mb-3 text-[10px] leading-5 text-muted">
              {delta !== null
                ? `${delta > 0 ? "+" : ""}${delta.toFixed(0)}% vs previous ${days} days`
                : data.current.workouts
                  ? `${activeDays} active days · completed sessions only`
                  : "Start with one workout. Your progress grows from there."}
            </Txt>
            <View className="flex-row gap-2">
              {(
                [
                  ["workouts", "Workouts"],
                  ["minutes", "Time"],
                  ["volume", "Volume"],
                ] as const
              ).map(([id, label]) => (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: chart === id }}
                  onPress={() => setChart(id)}
                  className="min-h-11 flex-1 items-center justify-center rounded-full"
                  style={{ backgroundColor: chart === id ? `${color}18` : C.elevated }}
                >
                  <Txt
                    weight="medium"
                    className="text-[11px]"
                    style={{ color: chart === id ? color : C.muted }}
                  >
                    {label}
                  </Txt>
                </Pressable>
              ))}
            </View>
            <ActivityBars
              key={`${days}:${chart}`}
              points={buckets}
              color={color}
              unit={chartUnit}
            />
            <View className="mt-5 flex-row border-t border-white/5 pt-4">
              {[
                { label: "Workouts", value: data.current.workouts, color: green },
                { label: "Minutes", value: data.current.minutes, color: blue },
                { label: "Working sets", value: data.current.sets, color: peach },
              ].map((stat) => (
                <View key={stat.label} className="flex-1">
                  <Txt weight="semibold" className="text-lg" style={{ color: stat.color }}>
                    {compact(stat.value)}
                  </Txt>
                  <Txt className="mt-1 text-[10px] text-muted">{stat.label}</Txt>
                </View>
              ))}
            </View>
            {!hasGoals && onGoals && (
              <View className="mt-4">
                <SmallButton
                  label="Set my goals"
                  icon="bullseye-arrow"
                  color={green}
                  onPress={onGoals}
                />
              </View>
            )}
            {!data.allTime.workouts && (
              <View className="mt-3">
                <SmallButton
                  label="Start your first workout"
                  icon="arrow-right"
                  onPress={onTrain}
                />
              </View>
            )}
          </View>
          <View className="mt-4 rounded-[26px] bg-panel p-5">
            <View className="mb-4 flex-row items-center gap-2">
              <Icon name="calendar-check-outline" size={18} color={green} />
              <Txt weight="medium" className="flex-1 text-sm">
                Consistency, at a glance
              </Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open consistency calendar"
                onPress={onTraining}
                className="h-11 w-11 items-center justify-center"
              >
                <Icon name="chevron-right" size={18} color={C.muted} />
              </Pressable>
            </View>
            <ActivityHeatmap days={data.activity} />
            <Txt className="mt-4 text-[10px] leading-5 text-muted">
              Every square is a day. Brighter squares mark more completed sessions.
            </Txt>
          </View>
        </>
      )}

      <SectionTitle title="Body & daily habits" action="All metrics" onAction={onHealth} />
      <View className="rounded-[26px] bg-panel p-5">
        <View className="flex-row items-center gap-2">
          <Icon name="scale-bathroom" size={20} color={peach} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View weight trend"
            onPress={() => onMetric("weight")}
            className="min-h-11 flex-1 justify-center"
          >
            <Txt weight="medium" className="text-sm">
              Body weight
            </Txt>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log weight"
            disabled={!canLog}
            onPress={() => onLog("weight")}
            className="h-11 w-11 items-center justify-center rounded-full bg-elevated"
          >
            <Icon name="plus" size={20} color={peach} />
          </Pressable>
        </View>
        <View className="mt-2 flex-row items-baseline gap-2">
          <Txt weight="semibold" className="text-[32px]">
            {latestWeight ? displayMetric("weight", latestWeight.value, unit) : "—"}
          </Txt>
          <Txt className="text-xs text-muted">{unit}</Txt>
          {weightChange !== null && (
            <Txt className="ml-auto text-xs" style={{ color: peach }}>
              {weightChange > 0 ? "+" : ""}
              {weightChange.toFixed(1)} {unit} in range
            </Txt>
          )}
        </View>
        <Txt className="mb-4 mt-1 text-[10px] text-muted">
          {latestWeight
            ? `Last log · ${dateLabel(latestWeight.date)}`
            : "Your first log sets your baseline"}
        </Txt>
        <TrendChart
          points={weights.map((entry) => ({
            date: entry.date,
            value: weightValue(entry.value!, unit),
          }))}
          color={peach}
          unit={unit}
          compact
        />
        <Txt className="mt-3 text-[10px] text-muted">
          {weights.length} logged days in this range · changes are shown neutrally.
        </Txt>
      </View>
      <View className="mb-3 mt-5 flex-row items-center justify-between">
        <Txt weight="medium" className="text-sm">
          Daily check-in
        </Txt>
        <Txt className="text-[10px] text-muted">Tap + to log</Txt>
      </View>
      {dayPicker}
      <View className="rounded-[26px] bg-panel p-5">
        <View className="flex-row items-center gap-2">
          <Icon name="water-outline" size={20} color={blue} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Water, ${water ?? "no log"} ml. View details`}
            onPress={() => onMetric("water")}
            className="min-h-11 flex-1 justify-center"
          >
            <Txt weight="medium" className="text-sm">
              Hydration
            </Txt>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log water"
            disabled={!canLog}
            onPress={() => onLog("water")}
            className="h-11 w-11 items-center justify-center rounded-full bg-elevated"
          >
            <Icon name="plus" size={20} color={blue} />
          </Pressable>
        </View>
        <View className="mt-3 flex-row items-center gap-5">
          <Ring value={water ?? 0} target={goals.water} color={blue} size={116}>
            <Txt weight="semibold" className="text-xl">
              {water === null ? "—" : compact(water)}
            </Txt>
            <Txt className="text-[10px] text-muted">ml</Txt>
          </Ring>
          <View className="min-w-0 flex-1">
            <Txt weight="medium" className="text-sm">
              {dateTitle}
            </Txt>
            <Txt className="mt-1 text-[10px] leading-5 text-muted">
              {goals.water ? `Goal ${compact(goals.water)} ml` : "Track freely · no target set"}
            </Txt>
            <View className="mt-3 h-10 flex-row items-end gap-1.5">
              {waterDays.map((day) => (
                <View
                  key={day.date}
                  className="flex-1 rounded-t"
                  style={{
                    height: day.value === null ? 3 : Math.max(3, (day.value / waterMax) * 40),
                    backgroundColor: day.value === null ? C.elevated : blue,
                    opacity: day.date === selectedDate ? 1 : 0.45,
                  }}
                />
              ))}
            </View>
            <Txt className="mt-2 text-[9px] text-muted">
              {waterDays.filter((day) => day.value !== null).length} of 7 days logged
            </Txt>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add 250 milliliters of water for ${dateTitle}`}
          disabled={waterBusy || !canLog}
          onPress={onWater}
          className={`mt-4 min-h-11 flex-row items-center justify-center gap-2 rounded-full bg-elevated ${waterBusy || !canLog ? "opacity-40" : ""}`}
        >
          <Icon name="water-plus-outline" size={18} color={blue} />
          <Txt weight="medium" className="text-xs" style={{ color: blue }}>
            {waterBusy ? "Saving…" : "+250 ml water"}
          </Txt>
        </Pressable>
      </View>

      <View className="mt-4 rounded-[26px] bg-panel p-5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nutrition totals and nutrient tracking"
          onPress={onNutrition}
          className="min-h-11 flex-row items-center gap-2"
        >
          <Icon name="silverware-fork-knife" size={20} color={green} />
          <Txt weight="medium" className="flex-1 text-sm">
            Nutrition
          </Txt>
          <Txt className="text-[10px] text-muted">{dateTitle}</Txt>
          <Icon name="chevron-right" size={18} color={C.muted} />
        </Pressable>
        <View className="mt-3 flex-row items-center gap-5">
          <MacroRing protein={daily("protein")} carbs={daily("carbs")} fat={daily("fat")} />
          <View className="flex-1">
            <Txt weight="semibold" className="text-[28px]">
              {displayMetric("caloriesIn", daily("caloriesIn"), unit)}
            </Txt>
            <Txt className="text-[10px] text-muted">kcal logged</Txt>
            <Pressable
              accessibilityRole="button"
              disabled={!canLog}
              onPress={() => onLog("caloriesIn")}
              className="mt-2 min-h-11 flex-row items-center gap-1"
            >
              <Icon name="plus" size={16} color={green} />
              <Txt className="text-xs" style={{ color: green }}>
                Log nutrition
              </Txt>
            </Pressable>
          </View>
        </View>
        <View className="mt-4 flex-row gap-2">
          {(
            [
              ["protein", "Protein", green],
              ["carbs", "Carbs", blue],
              ["fat", "Fat", peach],
            ] as const
          ).map(([metric, label, color]) => (
            <Pressable
              key={metric}
              accessibilityRole="button"
              accessibilityLabel={`Log ${label.toLowerCase()}`}
              disabled={!canLog}
              onPress={() => onLog(metric)}
              className="min-w-0 flex-1 rounded-2xl bg-elevated p-3"
            >
              <View className="mb-2 h-1 w-5 rounded-full" style={{ backgroundColor: color }} />
              <Txt className="text-[10px] text-muted">{label}</Txt>
              <Txt weight="medium" className="mt-1 text-sm">
                {displayMetric(metric, daily(metric), unit)}
                <Txt className="text-[10px] text-muted"> g</Txt>
              </Txt>
            </Pressable>
          ))}
        </View>
        <Txt className="mt-3 text-[9px] leading-4 text-muted">
          Ring shows energy from your logged macros. Missing logs stay empty.
        </Txt>
      </View>

      {trainingAvailable && (
        <>
          <SectionTitle
            title="Exercise progress"
            action="Explore"
            onAction={() => onExercise("")}
          />
          <View className="rounded-[26px] bg-panel p-5">
            {exercise ? (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                  className="mb-4"
                >
                  {recentExercises.slice(0, 6).map((item) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: item.id === exercise.id }}
                      onPress={() => setExerciseId(item.id)}
                      className="min-h-11 justify-center rounded-full px-4"
                      style={{
                        backgroundColor: item.id === exercise.id ? "#C5F46018" : C.elevated,
                      }}
                    >
                      <Txt
                        className="text-[11px]"
                        style={{ color: item.id === exercise.id ? green : C.muted }}
                      >
                        {item.name}
                      </Txt>
                    </Pressable>
                  ))}
                </ScrollView>
                <Txt weight="medium" className="text-base">
                  {exercise.name}
                </Txt>
                <Txt className="mb-4 mt-1 text-[10px] text-muted">
                  {exerciseLabel} · {exerciseUnit}
                </Txt>
                <TrendChart
                  points={exercisePoints}
                  color={green}
                  unit={exerciseUnit}
                  format={compact}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${exercise.name} performance details`}
                  onPress={() => onExercise(exercise.id)}
                  className="mt-3 min-h-11 flex-row items-center justify-between"
                >
                  <Txt className="text-xs" style={{ color: green }}>
                    Session details & recent bests
                  </Txt>
                  <Icon name="arrow-top-right" size={18} color={green} />
                </Pressable>
              </>
            ) : (
              <>
                <Icon name="chart-line" color={green} size={28} />
                <Txt weight="medium" className="mt-3 text-base">
                  See what’s getting stronger
                </Txt>
                <Txt className="mt-2 text-xs leading-5 text-muted">
                  Finish a workout to see your lifts, reps, and personal bests here. A second
                  session starts your comparison.
                </Txt>
                <View className="mt-4">
                  <SmallButton label="Go to Train" icon="arrow-right" onPress={onTrain} />
                </View>
              </>
            )}
          </View>
          <AdvancedInsights
            isPro={isPro}
            checking={billingChecking}
            data={data}
            unit={unit}
            onOpen={onPro}
          />
        </>
      )}
      <View className="mt-6">
        <SmallButton label="Workout & check-in history" icon="history" onPress={onHistory} />
      </View>
    </>
  );
}
