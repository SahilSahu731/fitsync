import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { Icon, SmallButton } from "./visuals";
import {
  addDays,
  dateLabel,
  weightValue,
  type Goals,
  type Metric,
  type MetricEvent,
} from "./model";
import { change, type ProgressAnalytics } from "./analytics";
import { TrendChart } from "./charts";
import { ActivityHeatmap, HabitWeek } from "./insight-charts";
import { CumulativeChart, DurationBoxPlot, SessionScatter } from "./analytical-charts";
import { cumulativeActivity } from "./report";
import { ProgressRange } from "./progress-range";
import { exerciseTrend, trainingInsight } from "./insights";
import {
  AnalyticsCard,
  Choices,
  DataBars,
  MetricTile,
  EmptyInsight,
  ACCENTS,
  numberLabel,
} from "./dashboard-ui";
import { DeepAnalytics } from "./deep-analytics";
import { BodyAnalytics, RecoveryAnalytics } from "./health-panels";

type Props = {
  data: ProgressAnalytics;
  goals: Goals;
  hasGoals?: boolean;
  hasWorkoutHistory?: boolean;
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
const noop = () => {};

function DailyCell({
  title,
  metric,
  value,
  unit,
  color,
  onLog,
  onDetail,
  disabled,
}: {
  title: string;
  metric: Metric;
  value: number | null;
  unit: string;
  color: string;
  onLog: () => void;
  onDetail: () => void;
  disabled: boolean;
}) {
  return (
    <View className="min-w-0 flex-1 rounded-[20px] border border-white/5 bg-panel p-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${numberLabel(value)} ${unit}. View details`}
        onPress={onDetail}
      >
        <Txt className="text-[11px] text-muted">{title}</Txt>
        <Txt
          weight="medium"
          numberOfLines={1}
          adjustsFontSizeToFit
          className="mt-2 text-[25px] leading-9 tracking-[-0.7px]"
        >
          {numberLabel(value)}
          <Txt className="text-[10px] text-muted"> {unit}</Txt>
        </Txt>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Log ${metric}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onLog}
        className="-mb-1 mt-2 min-h-11 flex-row items-center gap-1.5"
      >
        <Icon name="plus-circle-outline" size={16} color={disabled ? C.muted : color} />
        <Txt weight="medium" className="text-[10px]" style={{ color: disabled ? C.muted : color }}>
          Add check-in
        </Txt>
      </Pressable>
    </View>
  );
}

export function ProgressOverview({
  data,
  goals,
  hasGoals = true,
  hasWorkoutHistory = Boolean(data.allTime.workouts),
  onGoals,
  unit,
  today,
  dateTitle,
  selectedDate = today,
  daily,
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
  const [sessionView, setSessionView] = useState<"workload" | "duration">("workload");
  const [topic, setTopic] = useState<"training" | "body" | "recovery">("training");
  const [rhythm, setRhythm] = useState<"calendar" | "weekdays">("calendar");
  const insight = trainingInsight(data);
  const cumulative = cumulativeActivity(data, chart, unit);
  const currentValue =
    chart === "volume" ? weightValue(data.current.volume, unit) : data.current[chart];
  const delta = canCompare ? change(data.current[chart], data.previous[chart]) : null;
  const chartUnit =
    chart === "workouts" ? "workouts" : chart === "minutes" ? "min" : `${unit} × reps`;
  const recentExercises = [...data.exercises]
    .filter((exercise) =>
      exercise.sessions.some((session) => session.date >= data.start && session.date <= today),
    )
    .sort((a, b) => b.sessions.at(-1)!.timestamp.localeCompare(a.sessions.at(-1)!.timestamp));
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
  const exercisePoints = exercise
    ? exerciseTrend(insight.selected, exercise.id).map((point) => ({
        ...point,
        value: key === "load" ? weightValue(point.value, unit) : point.value,
      }))
    : [];
  const water = daily("water");
  const oldWater = !isPro && selectedDate < addDays(today, -89);
  const waterDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(selectedDate, index - 6);
    return {
      date,
      value:
        data.metrics.find((entry) => entry.metric === "water" && entry.date === date)?.value ??
        null,
    };
  }).filter((day) => isPro || day.date >= addDays(today, -89));
  const healthProps = {
    data,
    unit,
    isPro: isPro && !billingChecking,
    daily,
    goals,
    canLog,
    onLog,
    onMetric,
    onNutrition,
  };
  return (
    <>
      <ProgressRange days={days} isPro={isPro} onChange={onRange} onPro={onPro} />
      <View className="mb-4 flex-row items-center justify-between gap-3">
        <Txt className="text-[10px] text-muted">
          {dateLabel(data.start)} – {dateLabel(today)}
        </Txt>
        <View className="flex-row items-center gap-1">
          <View className="h-1.5 w-1.5 rounded-full bg-brand" />
          <Txt className="text-[10px] text-muted">
            {isPro ? "Pro analytics" : "90 days included"}
          </Txt>
        </View>
      </View>

      <View className="overflow-hidden rounded-[28px] border border-brand/15 bg-[#12170D] p-5">
        <View className="flex-row items-center justify-between gap-3">
          <Txt weight="medium" className="text-[10px] tracking-[1.5px] text-brand">
            YOUR WORK, ADDING UP
          </Txt>
          <Icon name="chart-timeline-variant" color={C.brand} size={20} />
        </View>
        <View className="mt-3 flex-row items-end gap-3">
          <Txt weight="medium" className="text-[54px] leading-[66px] tracking-[-2px]">
            {trainingAvailable ? data.current.workouts : "—"}
          </Txt>
          <View className="flex-1 pb-2">
            <Txt weight="medium" className="text-sm">
              {data.current.workouts === 1 ? "session completed" : "sessions completed"}
            </Txt>
            <Txt className="mt-1 text-[10px] text-muted">in the last {days} days</Txt>
          </View>
        </View>
        <View className="mt-3 flex-row gap-3 border-t border-brand/10 pt-4">
          {[
            {
              label: "Training time",
              value: trainingAvailable ? numberLabel(data.current.minutes, 0) : "—",
              suffix: "min",
            },
            {
              label: "Working sets",
              value: trainingAvailable ? numberLabel(data.current.sets, 0) : "—",
              suffix: "sets",
            },
            {
              label: "Volume",
              value: trainingAvailable
                ? numberLabel(weightValue(data.current.volume, unit), 0)
                : "—",
              suffix: `${unit} × reps`,
            },
          ].map((item) => (
            <View key={item.label} className="min-w-0 flex-1">
              <Txt className="text-[9px] text-muted">{item.label}</Txt>
              <Txt weight="medium" numberOfLines={1} adjustsFontSizeToFit className="mt-1 text-xl">
                {item.value}
                <Txt className="text-[9px] text-muted"> {item.suffix}</Txt>
              </Txt>
            </View>
          ))}
        </View>
        <Txt className="mt-4 text-[10px] leading-5 text-muted">
          {!trainingAvailable
            ? "Your saved training is unavailable. Refresh to try again."
            : data.current.workouts
              ? `${insight.activeDays} training days. Every completed working set counts.`
              : hasWorkoutHistory
                ? "No completed sessions in this range. Your earlier work is still yours."
                : "Your first log sets your baseline. Finish a workout to start your story."}
        </Txt>
        {trainingAvailable && !data.current.workouts && (
          <View className="mt-3">
            <SmallButton
              label={hasWorkoutHistory ? "Back to Train" : "Start your first workout"}
              icon="arrow-right"
              color={C.brand}
              onPress={onTrain}
            />
          </View>
        )}
      </View>

      <View className="mt-6">
        <Choices
          options={[
            { id: "training", label: "Training" },
            { id: "body", label: "Body & food" },
            { id: "recovery", label: "Recovery" },
          ]}
          value={topic}
          onChange={setTopic}
        />
      </View>
      {topic === "training" && trainingAvailable && (
        <>
          <AnalyticsCard
            title="The bigger picture"
            subtitle="A running total of the work you completed in this range."
            icon="chart-line"
          >
            <Choices
              options={[
                { id: "workouts", label: "Workouts" },
                { id: "minutes", label: "Minutes" },
                { id: "volume", label: "Volume" },
              ]}
              value={chart}
              onChange={setChart}
            />
            <View className="mb-3 flex-row items-center justify-between gap-3">
              <Txt weight="medium" className="text-[30px] leading-[42px] tracking-[-1px]">
                {numberLabel(currentValue)}
                <Txt className="text-[10px] text-muted"> {chartUnit}</Txt>
              </Txt>
              {delta !== null && (
                <View className="rounded-full bg-white/5 px-3 py-2">
                  <Txt
                    weight="medium"
                    className="text-[10px]"
                    style={{ color: delta >= 0 ? C.brand : "#E5C58F" }}
                  >
                    {delta > 0 ? "+" : ""}
                    {numberLabel(delta)}%
                  </Txt>
                </View>
              )}
            </View>
            <CumulativeChart points={cumulative} unit={chartUnit} />
            <Txt className="mt-3 text-[10px] leading-5 text-muted">
              {!canCompare
                ? "Choose a shorter period or Pro to compare beyond your available history."
                : delta === null
                  ? "No earlier total is available for a percentage comparison."
                  : `Compared with the previous ${days} days.`}
              {chart === "volume"
                ? " Volume is external load × reps; bodyweight and timed work stay separate."
                : ""}
            </Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View training analytics"
              onPress={onTraining}
              className="mt-2 min-h-11 flex-row items-center justify-between"
            >
              <Txt weight="medium" className="text-xs text-brand">
                Explore training details
              </Txt>
              <Icon name="arrow-right" color={C.brand} size={17} />
            </Pressable>
          </AnalyticsCard>
          <View className="mt-4 flex-row gap-3">
            <MetricTile
              label="Average session"
              value={numberLabel(insight.averageDuration)}
              unit="min"
              icon="timer-outline"
              caption={`${insight.profile.points.length}/${insight.profile.totalSessions} sessions timed`}
            />
            <MetricTile
              label="Median session"
              value={numberLabel(insight.medianDuration)}
              unit="min"
              icon="chart-bell-curve-cumulative"
              caption="Middle recorded session length"
            />
          </View>
          <AnalyticsCard
            title="Your training rhythm"
            subtitle="Consistency is a pattern, one training day at a time."
            icon="calendar-check-outline"
          >
            <Choices
              options={[
                { id: "calendar", label: "Activity map" },
                { id: "weekdays", label: "By weekday" },
              ]}
              value={rhythm}
              onChange={setRhythm}
            />
            {rhythm === "calendar" ? (
              <ActivityHeatmap days={data.activity} />
            ) : (
              <DataBars
                rows={insight.weekdays.map((day) => ({ label: day.label, value: day.count }))}
                suffix="sessions"
              />
            )}
            <View className="mt-4 flex-row justify-between gap-4 border-t border-white/5 pt-4">
              <View className="flex-1">
                <Txt weight="medium" className="text-xl">
                  {numberLabel(insight.averageGap)}
                  <Txt className="text-[10px] text-muted"> days</Txt>
                </Txt>
                <Txt className="mt-1 text-[10px] text-muted">Average gap between training days</Txt>
              </View>
              <View className="flex-1">
                <Txt weight="medium" className="text-xl">
                  {hasGoals ? data.streak : "—"}
                  <Txt className="text-[10px] text-muted"> weeks</Txt>
                </Txt>
                <Txt className="mt-1 text-[10px] text-muted">
                  {hasGoals ? "Weekly goal run" : "Set a goal to track your run"}
                </Txt>
              </View>
            </View>
            {onGoals && (
              <Pressable
                accessibilityRole="button"
                onPress={onGoals}
                className="mt-2 min-h-11 justify-center"
              >
                <Txt className="text-xs text-brand">
                  {hasGoals ? "Review your goals" : "Set your weekly goal"}
                </Txt>
              </Pressable>
            )}
          </AnalyticsCard>
          <AnalyticsCard
            title="Exercise spotlight"
            subtitle="Compare the same movement across your recorded sessions."
            icon="dumbbell"
          >
            {exercise ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  <View className="flex-row gap-2">
                    {recentExercises.slice(0, 12).map((item) => (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: exercise.id === item.id }}
                        onPress={() => setExerciseId(item.id)}
                        className={`min-h-11 justify-center rounded-full px-4 ${exercise.id === item.id ? "bg-brand/10" : "bg-white/5"}`}
                      >
                        <Txt
                          className={`text-[10px] ${exercise.id === item.id ? "text-brand" : "text-muted"}`}
                        >
                          {item.name}
                        </Txt>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                <Txt weight="medium" className="mb-1 text-lg">
                  {exercise.name}
                </Txt>
                <Txt className="mb-4 text-[10px] text-muted">
                  {key === "load"
                    ? "Heaviest completed working set"
                    : key === "duration"
                      ? "Longest completed set"
                      : key === "distance"
                        ? "Farthest completed set"
                        : "Most reps in a completed set"}
                </Txt>
                <TrendChart points={exercisePoints} color={C.brand} unit={exerciseUnit} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${exercise.name} performance details`}
                  onPress={() => onExercise(exercise.id)}
                  className="mt-3 min-h-11 flex-row items-center justify-between"
                >
                  <Txt weight="medium" className="text-xs text-brand">
                    Session details & recent bests
                  </Txt>
                  <Icon name="arrow-right" color={C.brand} size={18} />
                </Pressable>
              </>
            ) : (
              <EmptyInsight
                title="Build your exercise history"
                detail="Finish a workout to see your lifts, reps and recorded bests here. A second session starts your comparison."
              />
            )}
          </AnalyticsCard>
          <AnalyticsCard
            title="Inside your sessions"
            subtitle={`${insight.profile.points.length} / ${insight.profile.totalSessions} sessions with recorded duration. Missing durations stay unrecorded.`}
            icon="chart-scatter-plot"
          >
            <Choices
              options={[
                { id: "workload", label: "Sets & duration" },
                { id: "duration", label: "Session length" },
              ]}
              value={sessionView}
              onChange={setSessionView}
            />
            {sessionView === "workload" ? (
              <SessionScatter points={insight.profile.points} />
            ) : (
              <DurationBoxPlot distribution={insight.profile.duration} />
            )}
          </AnalyticsCard>
          <DeepAnalytics
            data={data}
            unit={unit}
            isPro={isPro}
            checking={billingChecking}
            onPro={onPro}
            onExercise={onExercise}
          />
        </>
      )}
      {topic === "body" && <BodyAnalytics {...healthProps} />}
      {topic === "recovery" && <RecoveryAnalytics {...healthProps} />}

      <View className="mb-3 mt-8 flex-row items-center justify-between gap-3">
        <Txt accessibilityRole="header" weight="medium" className="text-xl tracking-[-0.5px]">
          Daily check-in
        </Txt>
        <Pressable
          accessibilityRole="button"
          onPress={onHealth}
          className="min-h-11 justify-center"
        >
          <Txt className="text-xs text-muted">All metrics ↗</Txt>
        </Pressable>
      </View>
      {dayPicker}
      <Txt className="-mt-2 mb-4 text-[10px] text-muted">
        {dateTitle} · Your entries, at your pace.
      </Txt>
      <View className="gap-3">
        <View className="flex-row gap-3">
          <DailyCell
            title="Body weight"
            metric="weight"
            value={daily("weight") === null ? null : weightValue(daily("weight")!, unit)}
            unit={unit}
            color={ACCENTS.body}
            disabled={!canLog}
            onLog={() => onLog("weight")}
            onDetail={() => onMetric("weight")}
          />
          <DailyCell
            title="Water"
            metric="water"
            value={water === null ? null : water / 1000}
            unit="L"
            color={ACCENTS.body}
            disabled={!canLog}
            onLog={() => onLog("water")}
            onDetail={() => onMetric("water")}
          />
        </View>
        <View className="flex-row gap-3">
          <DailyCell
            title="Sleep"
            metric="sleep"
            value={daily("sleep")}
            unit="hours"
            color={ACCENTS.recovery}
            disabled={!canLog}
            onLog={() => onLog("sleep")}
            onDetail={() => onMetric("sleep")}
          />
          <DailyCell
            title="Steps"
            metric="steps"
            value={daily("steps")}
            unit="steps"
            color={C.brand}
            disabled={!canLog}
            onLog={() => onLog("steps")}
            onDetail={() => onMetric("steps")}
          />
        </View>
      </View>
      <AnalyticsCard
        title="Hydration, one day at a time"
        subtitle="The seven days ending on your selected check-in date."
        icon="water-outline"
        color={ACCENTS.body}
      >
        {oldWater ? (
          <Pressable accessibilityRole="button" onPress={onPro} className="min-h-11 justify-center">
            <Txt className="text-xs text-brand">Older hydration trends require Pro</Txt>
          </Pressable>
        ) : (
          <HabitWeek days={waterDays} target={goals.water} />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add 250 milliliters of water"
          accessibilityState={{ disabled: !canLog || waterBusy, busy: waterBusy }}
          disabled={!canLog || waterBusy}
          onPress={onWater}
          className="mt-5 min-h-11 flex-row items-center justify-center gap-2 rounded-full bg-white/5"
        >
          <Icon name="water-plus-outline" color={ACCENTS.body} size={19} />
          <Txt weight="medium" className="text-xs" style={{ color: ACCENTS.body }}>
            {waterBusy ? "Saving…" : "Add 250 ml"}
          </Txt>
        </Pressable>
      </AnalyticsCard>
      <View className="mt-4 rounded-[24px] border border-white/5 bg-panel p-5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nutrition totals and nutrient tracking"
          onPress={onNutrition}
          className="flex-row items-center justify-between gap-3"
        >
          <View>
            <Txt weight="medium" className="text-sm">
              Nutrition totals
            </Txt>
            <Txt className="mt-2 text-xs text-muted">
              {numberLabel(daily("caloriesIn"), 0)} kcal · {numberLabel(daily("protein"))} g protein
            </Txt>
          </View>
          <Icon name="arrow-right" color={ACCENTS.nutrition} size={21} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log protein"
          disabled={!canLog}
          accessibilityState={{ disabled: !canLog }}
          onPress={() => onLog("protein")}
          className="mt-3 min-h-11 flex-row items-center gap-2"
        >
          <Icon name="plus-circle-outline" size={17} color={ACCENTS.nutrition} />
          <Txt weight="medium" className="text-xs" style={{ color: ACCENTS.nutrition }}>
            Log protein
          </Txt>
        </Pressable>
      </View>
      <View className="mt-6">
        <SmallButton label="Workout & check-in history" icon="history" onPress={onHistory} />
      </View>
    </>
  );
}
