import React from "react";
import { View } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { Icon, SectionTitle, SmallButton, type IconName } from "./visuals";
import { compact, displayMetric } from "./tracking-cards";
import {
  addDays,
  dateLabel,
  weightValue,
  type Goals,
  type Metric,
  type MetricEvent,
} from "./model";
import type { ProgressAnalytics } from "./analytics";

const green = "#C5F460";
const blue = "#7DCFFF";
const peach = "#FFB38A";

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2)
    return (
      <View className="h-12 justify-center">
        <Txt className="text-[10px] text-muted">Log twice to see your trend</Txt>
      </View>
    );
  const low = Math.min(...values);
  const range = Math.max(...values) - low || 1;
  const points = values.map((value, index) => ({
    x: 4 + (index / (values.length - 1)) * 192,
    y: 40 - ((value - low) / range) * 32,
  }));
  return (
    <Svg
      width="100%"
      height={48}
      viewBox="0 0 200 48"
      accessibilityLabel="Weight trend; open weight for values and dates"
    >
      <Path
        d={points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ")}
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
      <Circle cx={points.at(-1)!.x} cy={points.at(-1)!.y} r={3} fill={color} />
    </Svg>
  );
}

function TrackCard({
  icon,
  title,
  value,
  unit,
  color,
  hint,
  onOpen,
  onLog,
  disabled,
  children,
}: {
  icon: IconName;
  title: string;
  value: string;
  unit: string;
  color: string;
  hint: string;
  onOpen: () => void;
  onLog: () => void;
  disabled: boolean;
  children?: React.ReactNode;
}) {
  return (
    <View className="min-w-0 flex-1 rounded-[22px] bg-panel p-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${value} ${unit}. View details`}
        onPress={onOpen}
      >
        <View className="min-h-11 flex-row items-center gap-2">
          <Icon name={icon} size={19} color={color} />
          <Txt weight="medium" className="flex-1 text-xs">
            {title}
          </Txt>
          <Icon name="chevron-right" size={14} color={C.muted} />
        </View>
        <Txt
          weight="semibold"
          className="mt-2 text-[25px] tracking-[-0.8px]"
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
          <Txt className="text-xs text-muted"> {unit}</Txt>
        </Txt>
        {children}
        <Txt className="mt-2 text-[10px] leading-4 text-muted">{hint}</Txt>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Log ${title.toLowerCase()}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onLog}
        className={`mt-3 min-h-11 flex-row items-center justify-center gap-1 rounded-full bg-elevated ${disabled ? "opacity-40" : ""}`}
      >
        <Icon name="plus" size={16} color={color} />
        <Txt weight="medium" className="text-xs">
          Log
        </Txt>
      </Pressable>
    </View>
  );
}

export function ProgressOverview({
  data,
  goals,
  hasGoals = true,
  onGoals,
  unit,
  today,
  dateTitle,
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
}: {
  data: ProgressAnalytics;
  goals: Goals;
  hasGoals?: boolean;
  onGoals?: () => void;
  unit: "kg" | "lb";
  today: string;
  dateTitle: string;
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
}) {
  const week = data.weeks.at(-1)!;
  const water = daily("water");
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(week.date, i);
    return { date, count: data.calendar.find((day) => day.date === date)?.workouts ?? 0 };
  });
  const recentExercises = [...data.exercises]
    .sort((a, b) => b.sessions.at(-1)!.timestamp.localeCompare(a.sessions.at(-1)!.timestamp))
    .slice(0, 3);
  return (
    <>
      {trainingAvailable && (
        <View className="mt-4 rounded-[26px] bg-panel p-5">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-2">
              <Icon name="dumbbell" color={green} size={20} />
              <Txt weight="medium" className="text-sm">
                This week
              </Txt>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View training analytics"
              onPress={onTraining}
              className="min-h-11 flex-row items-center gap-1"
            >
              <Txt className="text-xs text-muted">Analytics</Txt>
              <Icon name="arrow-top-right" size={16} color={C.muted} />
            </Pressable>
          </View>
          <View className="mt-2 flex-row items-end gap-2">
            <Txt weight="semibold" className="text-[42px] leading-[56px] tracking-[-2px]">
              {week.workouts}
            </Txt>
            <Txt className="mb-2 text-sm text-muted">
              {hasGoals ? `/ ${goals.weeklyWorkouts} workouts` : "workouts"}
            </Txt>
          </View>
          <Txt className="mt-1 text-xs leading-5 text-muted">
            {!hasGoals
              ? "Choose a goal that fits your week. Every session counts."
              : !data.allTime.workouts
                ? "Start with one workout. Your progress grows from there."
                : week.targetMet
                  ? "Weekly goal reached. Every session adds up."
                  : "One session at a time. Keep your week moving."}
          </Txt>
          <View className="mt-5 flex-row gap-2">
            {weekDays.map((day) => (
              <View
                key={day.date}
                className="flex-1 items-center gap-2"
                accessible
                accessibilityLabel={`${dateLabel(day.date)}, ${day.count} workouts${day.date > today ? ", upcoming" : ""}`}
              >
                <View
                  className="h-9 w-full items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: day.count ? green : C.elevated,
                    opacity: day.date > today ? 0.35 : 1,
                    borderWidth: day.date === today ? 1 : 0,
                    borderColor: green,
                  }}
                >
                  {day.count > 0 ? (
                    <Icon name="check" size={18} color={C.bg} />
                  ) : (
                    <View className="h-1 w-1 rounded-full bg-muted/40" />
                  )}
                </View>
                <Txt className="text-[10px] text-muted">
                  {dateLabel(day.date, { weekday: "short" }).slice(0, 1)}
                </Txt>
              </View>
            ))}
          </View>
          <View className="mt-5 flex-row items-center gap-4">
            <View className="flex-row items-center gap-1.5">
              <Icon name="timer-outline" size={16} color={blue} />
              <Txt className="text-xs text-muted">{week.minutes} min</Txt>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Icon name="layers-outline" size={16} color={peach} />
              <Txt className="text-xs text-muted">{week.sets} working sets</Txt>
            </View>
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
          {hasGoals && !data.allTime.workouts && (
            <View className="mt-4">
              <SmallButton label="Start your first workout" icon="arrow-right" onPress={onTrain} />
            </View>
          )}
        </View>
      )}
      <SectionTitle title="Daily check-in" action="More" onAction={onHealth} />
      {dayPicker}
      <View className="flex-row gap-3">
        <TrackCard
          icon="scale-bathroom"
          title="Weight"
          value={latestWeight ? displayMetric("weight", latestWeight.value, unit) : "—"}
          unit={unit}
          color={peach}
          hint={
            latestWeight
              ? `Last log · ${dateLabel(latestWeight.date)}`
              : "Your first log sets your baseline"
          }
          onOpen={() => onMetric("weight")}
          onLog={() => onLog("weight")}
          disabled={!canLog}
        >
          <Sparkline
            values={weights.map((entry) => weightValue(entry.value!, unit))}
            color={peach}
          />
        </TrackCard>
        <TrackCard
          icon="water-outline"
          title="Water"
          value={water === null ? "—" : compact(water)}
          unit="ml"
          color={blue}
          hint={
            goals.water
              ? `Goal ${compact(goals.water)} ml · ${dateTitle.toLowerCase()}`
              : `Daily total · ${dateTitle.toLowerCase()}`
          }
          onOpen={() => onMetric("water")}
          onLog={() => onLog("water")}
          disabled={!canLog}
        >
          <View className="h-12 justify-center">
            <View className="h-2 overflow-hidden rounded-full bg-elevated">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${goals.water ? Math.min(100, Math.max(0, ((water ?? 0) / goals.water) * 100)) : 0}%`,
                  backgroundColor: blue,
                }}
              />
            </View>
          </View>
        </TrackCard>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add 250 milliliters of water for ${dateTitle}`}
        accessibilityState={{ disabled: waterBusy || !canLog }}
        disabled={waterBusy || !canLog}
        onPress={onWater}
        className={`mt-2 min-h-11 flex-row items-center justify-end gap-1.5 ${waterBusy || !canLog ? "opacity-40" : ""}`}
      >
        <Icon name="water-plus-outline" size={17} color={blue} />
        <Txt className="text-xs" style={{ color: blue }}>
          {waterBusy ? "Saving…" : "+250 ml water"}
        </Txt>
      </Pressable>
      <View className="mt-1 rounded-[22px] bg-panel p-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nutrition totals and nutrient tracking"
          onPress={onNutrition}
          className="min-h-11 flex-row items-center gap-2"
        >
          <Icon name="silverware-fork-knife" color={green} size={20} />
          <Txt weight="medium" className="flex-1 text-sm">
            Nutrition
          </Txt>
          <Txt className="text-xs text-muted">{dateTitle}</Txt>
          <Icon name="chevron-right" color={C.muted} size={17} />
        </Pressable>
        <View className="mt-2 flex-row items-baseline gap-1">
          <Txt weight="semibold" className="text-[28px]">
            {displayMetric("caloriesIn", daily("caloriesIn"), unit)}
          </Txt>
          <Txt className="text-xs text-muted">kcal logged</Txt>
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
              className="min-h-14 min-w-0 flex-1 rounded-2xl bg-elevated p-3"
            >
              <Txt className="text-[10px] text-muted">{label}</Txt>
              <Txt weight="medium" className="mt-1 text-sm" style={{ color }}>
                {displayMetric(metric, daily(metric), unit)}
                <Txt className="text-[10px] text-muted"> g</Txt>
              </Txt>
            </Pressable>
          ))}
        </View>
        <View className="mt-4">
          <SmallButton
            label="Log nutrition"
            icon="plus"
            onPress={() => onLog("caloriesIn")}
            disabled={!canLog}
          />
        </View>
      </View>

      {trainingAvailable && (
        <>
          <SectionTitle
            title="Exercise progress"
            action="Explore"
            onAction={() => onExercise("")}
          />
          <Txt className="-mt-2 mb-4 text-xs leading-5 text-muted">
            Your recent exercises. Tap to compare sessions and see personal bests.
          </Txt>
          {recentExercises.length ? (
            <View className="rounded-[22px] bg-panel px-4">
              {recentExercises.map((exercise, index) => {
                const sessions = exercise.sessions;
                const latest = sessions.at(-1);
                const previous = sessions.at(-2);
                const key =
                  exercise.type === "reps_weight"
                    ? "load"
                    : exercise.type === "duration"
                      ? "duration"
                      : exercise.type === "distance_duration"
                        ? "distance"
                        : "reps";
                const measure =
                  key === "load"
                    ? unit
                    : key === "duration"
                      ? "sec"
                      : key === "distance"
                        ? "m"
                        : "reps";
                const convert = (n: number) => (key === "load" ? weightValue(n, unit) : n);
                const delta = latest && previous ? convert(latest[key] - previous[key]) : null;
                return (
                  <Pressable
                    key={exercise.id}
                    accessibilityRole="button"
                    onPress={() => onExercise(exercise.id)}
                    className="min-h-20 flex-row items-center gap-3 py-4"
                    style={{ borderTopWidth: index ? 1 : 0, borderColor: C.elevated }}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-elevated">
                      <Icon name="dumbbell" size={19} color={green} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Txt weight="medium" className="text-sm" numberOfLines={1}>
                        {exercise.name}
                      </Txt>
                      <Txt className="mt-1 text-[10px] text-muted">
                        {latest
                          ? `${compact(convert(latest[key]))} ${measure} · last session`
                          : "No sessions in this range"}
                      </Txt>
                    </View>
                    <View className="items-end">
                      <Icon
                        name={
                          delta === null || delta === 0
                            ? "minus"
                            : delta > 0
                              ? "trending-up"
                              : "trending-down"
                        }
                        color={delta !== null && delta > 0 ? green : C.muted}
                        size={20}
                      />
                      <Txt className="mt-1 text-[10px] text-muted">
                        {delta === null
                          ? "First log"
                          : `${delta > 0 ? "+" : ""}${compact(delta)} ${measure}`}
                      </Txt>
                    </View>
                    <Icon name="chevron-right" color={C.muted} size={16} />
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View className="rounded-[22px] bg-panel p-5">
              <Icon name="chart-line" color={green} size={26} />
              <Txt weight="medium" className="mt-3 text-sm">
                See what’s getting stronger
              </Txt>
              <Txt className="mt-2 text-xs leading-5 text-muted">
                Finish a workout to see your lifts, reps, and personal bests here. A second session
                starts your comparison.
              </Txt>
              <View className="mt-4">
                <SmallButton label="Go to Train" icon="arrow-right" onPress={onTrain} />
              </View>
            </View>
          )}
        </>
      )}
      <View className="mt-6">
        <SmallButton label="Workout & check-in history" icon="history" onPress={onHistory} />
      </View>
    </>
  );
}
