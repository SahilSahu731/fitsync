import React, { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable, ProgressFill } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { Sheet } from "../progress/editors";
import { dateLabel, localDate, weightValue, type Goals, type Metric } from "../progress/model";
import type { HomeSnapshot } from "./model";
import {
  HEALTH,
  healthFormat,
  healthGoal,
  healthHistory,
  healthSummary,
  type HealthKind,
} from "./health-model";

import { HealthHistoryChart } from "./health-charts";
import { macroBreakdown } from "./chart-model";

export function HealthDetailSheet({
  kind,
  snapshot,
  today,
  goals,
  unit,
  isPro,
  waterBusy,
  activeWorkout = false,
  workoutBlocked = false,
  message,
  onClose,
  initialDate,
  onLog,
  onWater,
  onFood,
  onWorkout,
  onGoals,
}: {
  kind: HealthKind;
  snapshot: HomeSnapshot;
  today: string;
  goals: Goals;
  unit: "kg" | "lb";
  isPro: boolean;
  waterBusy: boolean;
  activeWorkout?: boolean;
  workoutBlocked?: boolean;
  message?: string;
  initialDate?: string;
  onClose: () => void;
  onLog: (metric: Metric, date: string) => void;
  onWater: () => void;
  onFood: (date: string) => void;
  onWorkout: () => void;
  onGoals: () => void;
}) {
  const [days, setDays] = useState<7 | 30>(
    initialDate && Date.parse(today) - Date.parse(initialDate) > 6 * 86400000 ? 30 : 7,
  );
  const [selectedDate, setSelectedDate] = useState(initialDate ?? today);
  const meta = HEALTH[kind];
  const suffix = kind === "weight" ? unit : meta.unit;
  const points = healthHistory(snapshot, kind, today, days, unit);
  const found = points.findIndex((point) => point.date === selectedDate);
  const selected = found < 0 ? points.length - 1 : found;
  const active = points.find((point) => point.date === selectedDate) ?? points.at(-1)!;
  const current = points.at(-1)!.value;
  const macros = kind === "nutrition" ? macroBreakdown(snapshot, active.date) : null;
  const summary = healthSummary(points);
  const goal = healthGoal(kind, goals, unit);
  const show = (value: number | null) =>
    value == null
      ? "—"
      : healthFormat(
          value,
          kind === "steps" || kind === "workouts" || kind === "nutrition" ? 0 : 2,
        );
  const todayWorkouts = snapshot.completed.filter(
    (workout) => localDate(new Date(workout.finished_at!)) === today,
  );
  const todayMinutes = todayWorkouts.every(
    (workout) => workout.elapsed_seconds != null && Number.isFinite(workout.elapsed_seconds),
  )
    ? Math.round(
        todayWorkouts.reduce((sum, workout) => sum + Math.max(0, workout.elapsed_seconds!), 0) / 60,
      )
    : null;
  const action = () => {
    if (meta.metric) {
      if (kind === "nutrition" && isPro) onFood(active.date);
      else onLog(meta.metric, active.date);
    } else onWorkout();
  };
  return (
    <Sheet
      title={meta.title}
      subtitle={meta.subtitle}
      onClose={onClose}
      footer={
        <View className="gap-3">
          {!!message && (
            <Txt accessibilityLiveRegion="polite" className="text-xs leading-5 text-muted">
              {message}
            </Txt>
          )}
          <View className="flex-row gap-3">
            {kind === "water" && active.date === today && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add 250 millilitres of water to today"
                disabled={waterBusy}
                accessibilityState={{ disabled: waterBusy, busy: waterBusy }}
                onPress={() => {
                  if (!waterBusy) onWater();
                }}
                className="min-h-14 flex-row items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5"
              >
                {waterBusy ? (
                  <ActivityIndicator color={meta.color} size="small" />
                ) : (
                  <MaterialCommunityIcons name="plus" size={17} color={meta.color} />
                )}
                <Txt weight="medium" className="text-xs">
                  250 ml
                </Txt>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                kind === "workouts"
                  ? "Open workout options"
                  : kind === "nutrition" && isPro
                    ? "Open food diary"
                    : `Log ${meta.title.toLowerCase()}`
              }
              disabled={kind === "workouts" && workoutBlocked}
              accessibilityState={{ disabled: kind === "workouts" && workoutBlocked }}
              onPress={() => {
                if (kind !== "workouts" || !workoutBlocked) action();
              }}
              className="min-h-14 flex-1 flex-row items-center justify-center gap-2 rounded-full px-4"
              style={{
                backgroundColor: meta.color,
                opacity: kind === "workouts" && workoutBlocked ? 0.45 : 1,
              }}
            >
              <MaterialCommunityIcons
                name={kind === "workouts" ? "dumbbell" : "plus"}
                size={18}
                color="#101510"
              />
              <Txt weight="semibold" className="text-xs text-[#101510]">
                {kind === "workouts"
                  ? activeWorkout
                    ? "Resume workout"
                    : "Start a workout"
                  : kind === "nutrition" && isPro
                    ? "Open food diary"
                    : `Log ${kind === "nutrition" ? "nutrition" : meta.title.toLowerCase()}`}
              </Txt>
            </Pressable>
          </View>
          {active.date !== today && meta.metric && (
            <Txt className="text-center text-[10px] text-muted">
              Logging for {dateLabel(active.date)} · select Today on the graph to switch back.
            </Txt>
          )}
        </View>
      }
    >
      <View
        className="mb-5 rounded-[26px] border border-white/[0.06] p-5"
        style={{ backgroundColor: `${meta.color}0C` }}
      >
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons name={meta.icon} size={18} color={meta.color} />
          <Txt
            weight="medium"
            className="text-[10px] tracking-[1.5px]"
            style={{ color: meta.color }}
          >
            TODAY
          </Txt>
          <View className="flex-1" />
          {goal != null && (
            <Txt className="text-[10px] text-muted">
              Target {show(goal)} {suffix}
            </Txt>
          )}
        </View>
        <View className="mt-3 flex-row items-baseline gap-2">
          <Txt weight="semibold" className="text-[42px] leading-[52px] tracking-[-1.5px]">
            {show(current)}
          </Txt>
          <Txt className="text-sm text-muted">
            {current === 1 && kind === "workouts" ? "session" : suffix}
          </Txt>
        </View>
        <Txt className="mt-1 text-[11px] leading-5 text-muted">
          {kind === "workouts"
            ? `${todayMinutes == null ? "Time not recorded" : `${todayMinutes} minutes completed`} · ${snapshot.weeklyCount} sessions this week`
            : current == null
              ? kind === "weight"
                ? "No weigh-in today"
                : "Nothing logged today yet"
              : "Your saved total for today"}
        </Txt>
        {kind === "weight" && current == null && snapshot.weight?.value != null && (
          <Txt className="mt-1 text-[10px] text-muted">
            Last recorded: {healthFormat(weightValue(snapshot.weight.value, unit))} {unit} ·{" "}
            {dateLabel(snapshot.weight.date)}
          </Txt>
        )}
        {goal != null && kind !== "weight" && (
          <View className="mt-4">
            <ProgressFill
              ratio={current == null ? 0 : current / goal}
              color={meta.color}
              height={5}
            />
          </View>
        )}
        {goal == null && kind !== "workouts" && (
          <Pressable
            accessibilityRole="button"
            onPress={onGoals}
            className="mt-2 min-h-11 flex-row items-center gap-2"
          >
            <Txt className="text-xs" style={{ color: meta.color }}>
              Set a personal target
            </Txt>
            <MaterialCommunityIcons name="arrow-right" size={14} color={meta.color} />
          </Pressable>
        )}
      </View>
      <View className="rounded-[26px] border border-white/[0.06] bg-white/[0.025] p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Txt weight="medium" className="text-sm">
            {
              {
                water: "Hydration trend",
                steps: "Daily steps",
                workouts: "Training calendar",
                nutrition: "Nutrition breakdown",
                weight: "Weight trend",
              }[kind]
            }
          </Txt>
          <View className="flex-row rounded-full bg-white/5 p-1">
            {([7, 30] as const).map((range) => (
              <Pressable
                key={range}
                accessibilityRole="button"
                accessibilityLabel={`Show ${range} days`}
                accessibilityState={{ selected: days === range }}
                onPress={() => {
                  setDays(range);
                  setSelectedDate(today);
                }}
                className="min-h-10 min-w-14 items-center justify-center rounded-full px-3"
                style={{ backgroundColor: days === range ? `${meta.color}26` : "transparent" }}
              >
                <Txt
                  weight="medium"
                  className="text-[10px]"
                  style={{ color: days === range ? meta.color : "#969C96" }}
                >
                  {range}D
                </Txt>
              </Pressable>
            ))}
          </View>
        </View>
        <View className="mb-3 flex-row items-center gap-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous day"
            disabled={selected === 0}
            onPress={() => setSelectedDate(points[Math.max(0, selected - 1)].date)}
            className="h-11 w-11 items-center justify-center"
            style={{ opacity: selected === 0 ? 0.25 : 1 }}
          >
            <MaterialCommunityIcons name="chevron-left" size={21} color={meta.color} />
          </Pressable>
          <View className="flex-1">
            <Txt className="text-[10px] text-muted">
              {active.date === today ? "Today" : dateLabel(active.date)}
            </Txt>
            <Txt weight="semibold" className="mt-1 text-xl" style={{ color: meta.color }}>
              {active.value == null
                ? kind === "nutrition"
                  ? "No calorie entry"
                  : "No entry"
                : `${show(active.value)} ${suffix}`}
            </Txt>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next day"
            disabled={selected === points.length - 1}
            onPress={() => setSelectedDate(points[Math.min(points.length - 1, selected + 1)].date)}
            className="h-11 w-11 items-center justify-center"
            style={{ opacity: selected === points.length - 1 ? 0.25 : 1 }}
          >
            <MaterialCommunityIcons name="chevron-right" size={21} color={meta.color} />
          </Pressable>
        </View>
        <HealthHistoryChart
          snapshot={snapshot}
          goal={goal}
          unit={suffix}
          points={points}
          kind={kind}
          selected={selected}
          onSelect={(index) => setSelectedDate(points[index].date)}
        />
        <Txt className="mt-4 text-[10px] leading-5 text-muted">
          {kind === "nutrition"
            ? "Macro bars show energy from recorded protein, carbs and fat. The average below uses your food-calorie logs."
            : summary.recorded === 0
              ? "Your first entry will start the chart."
              : kind === "workouts"
                ? "Completed sessions by day. Rest days are part of your rhythm."
                : kind === "weight"
                  ? "Each dot is a weigh-in. Gaps remain unconnected; short-term changes are normal."
                  : "Gaps mean no entry. Only logged days contribute to your average."}
        </Txt>
      </View>
      <View className="my-4 flex-row gap-3">
        {[
          {
            label:
              kind === "workouts"
                ? "Sessions in range"
                : kind === "weight"
                  ? "Change in range"
                  : kind === "nutrition"
                    ? "Average food calories"
                    : "Average logged day",
            value:
              kind === "workouts"
                ? summary.total
                : kind === "weight"
                  ? summary.change
                  : summary.average,
          },
          {
            label:
              kind === "workouts"
                ? "Days you trained"
                : kind === "nutrition"
                  ? "Food-calorie days"
                  : "Days recorded",
            value:
              kind === "workouts"
                ? points.filter((point) => (point.value ?? 0) > 0).length
                : summary.recorded,
          },
        ].map((stat) => (
          <View key={stat.label} className="min-w-0 flex-1 rounded-[20px] bg-white/[0.035] p-4">
            <Txt className="text-[10px] text-muted">{stat.label}</Txt>
            <Txt weight="semibold" className="mt-2 text-xl">
              {show(stat.value)}
              {kind === "weight" && stat.label === "Change in range" && stat.value != null ? (
                <Txt className="text-xs text-muted"> {unit}</Txt>
              ) : null}
            </Txt>
          </View>
        ))}
      </View>
      {macros && (
        <View className="mb-4 flex-row gap-2">
          {macros.items.map((macro) => (
            <Pressable
              key={macro.key}
              accessibilityRole="button"
              accessibilityLabel={`Log ${macro.key}`}
              onPress={() => onLog(macro.key, active.date)}
              className="min-h-14 flex-1 rounded-[20px] border border-white/5 p-3"
            >
              <Txt className="text-[10px]" style={{ color: macro.color }}>
                Log {macro.label.toLowerCase()}
              </Txt>
              <Txt weight="medium" className="mt-2 text-base">
                {macro.grams == null ? "—" : healthFormat(macro.grams)}
                <Txt className="text-[10px] text-muted"> g</Txt>
              </Txt>
            </Pressable>
          ))}
        </View>
      )}
      {kind === "workouts" ? (
        <View className="gap-3">
          <Txt weight="medium" className="text-sm">
            Recent sessions
          </Txt>
          {snapshot.recent.length ? (
            snapshot.recent.map((session) => (
              <View
                key={session.id}
                className="flex-row items-center gap-3 rounded-2xl bg-white/[0.035] p-4"
              >
                <MaterialCommunityIcons name="check-circle-outline" size={19} color={meta.color} />
                <View className="flex-1">
                  <Txt weight="medium" className="text-xs">
                    {session.name}
                  </Txt>
                  <Txt className="mt-1 text-[10px] text-muted">
                    {dateLabel(localDate(new Date(session.finished_at!)))}
                  </Txt>
                </View>
                <Txt className="text-xs text-muted">
                  {session.elapsed_seconds == null
                    ? "—"
                    : Math.round(Math.max(0, session.elapsed_seconds) / 60)}{" "}
                  min
                </Txt>
              </View>
            ))
          ) : (
            <Txt className="text-xs leading-5 text-muted">
              Your first completed session will appear here.
            </Txt>
          )}
        </View>
      ) : (
        <View className="gap-3">
          <Txt weight="medium" className="text-sm">
            {kind === "nutrition" ? "Recent food-calorie entries" : "Recent entries"}
          </Txt>
          {points
            .filter((point) => point.value != null)
            .slice(-5)
            .reverse()
            .map((point) => (
              <Pressable
                key={point.date}
                accessibilityRole="button"
                accessibilityLabel={`Inspect ${dateLabel(point.date)}`}
                onPress={() => setSelectedDate(point.date)}
                className="min-h-12 flex-row items-center justify-between border-b border-white/5 px-1"
              >
                <Txt className="text-xs text-muted">
                  {point.date === today ? "Today" : dateLabel(point.date)}
                </Txt>
                <Txt weight="medium" className="text-xs">
                  {show(point.value)} {suffix}
                </Txt>
              </Pressable>
            ))}
          {summary.recorded === 0 && (
            <Txt className="text-xs leading-5 text-muted">
              {kind === "nutrition"
                ? `No food-calorie totals in these ${days} days.`
                : `No entries in these ${days} days. Add a check-in whenever you’re ready.`}
            </Txt>
          )}
        </View>
      )}
    </Sheet>
  );
}
