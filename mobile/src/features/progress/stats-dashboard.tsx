import React, { useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { MotionPressable, ScreenEntrance } from "@/src/components/motion";
import { TabScrollView } from "@/src/components/tab-bar-motion";
import { PageHeading, Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useSession } from "@/src/context/session";
import { buildProgress, change, summary, workoutDate } from "./analytics";
import { TrendChart } from "./charts";
import { dateLabel, localDate, weightValue } from "./model";
import { StrengthSection } from "./strength";
import { compact, TrainingStats } from "./tracking-cards";
import { useProgress } from "./use-progress";
import { Icon, PanelCard, SectionTitle, SmallButton } from "./visuals";

const PERIODS = [7, 30, 90, 365] as const;
const CHARTS = [
  { id: "workouts", label: "Workouts" },
  { id: "volume", label: "Volume" },
  { id: "minutes", label: "Minutes" },
] as const;
type ChartMetric = (typeof CHARTS)[number]["id"];

export function StatsDashboard() {
  const router = useRouter();
  const { settings } = useSession();
  const progress = useProgress();
  const [days, setDays] = useState<number>(30);
  const [chart, setChart] = useState<ChartMetric>("workouts");
  const [historyLimit, setHistoryLimit] = useState(5);
  const unit = settings?.weightUnit ?? "kg";
  const today = localDate();
  const data = useMemo(
    () => buildProgress(progress.journal.workouts, [], days, today, progress.goals.weeklyWorkouts),
    [progress.journal.workouts, days, today, progress.goals.weeklyWorkouts],
  );
  const workouts = useMemo(
    () => [...data.selected].sort((a, b) => b.finished_at!.localeCompare(a.finished_at!)),
    [data.selected],
  );
  const activeDays = data.activity.filter((day) => day.workouts > 0).length;
  const workoutChange = change(data.current.workouts, data.previous.workouts);
  const issue = progress.storageError || progress.workoutError;
  const hasHistory = Boolean(progress.journal.workoutsUpdatedAt || data.allTime.workouts);
  const initialLoading = progress.loading || (!hasHistory && progress.refreshing);
  const canShowStats = !initialLoading && (!issue || hasHistory);

  function openWorkout(id: string) {
    router.push({ pathname: "/workout/history/[id]", params: { id } });
  }

  return (
    <ScreenEntrance className="flex-1 bg-bg">
      <TabScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="w-full max-w-2xl self-center px-6 pt-6 pb-56"
        refreshControl={
          <RefreshControl
            refreshing={progress.refreshing && !progress.loading}
            onRefresh={() => void progress.refresh()}
            tintColor={C.ink}
          />
        }
      >
        <PageHeading
          eyebrow="Your training, in numbers"
          title="Your stats."
          subtitle="See the work you've put in, the habits you're building, and your personal bests."
        />

        <View className="mb-6 flex-row gap-2">
          {PERIODS.map((period) => (
            <MotionPressable
              key={period}
              accessibilityRole="button"
              accessibilityLabel={`Last ${period} days`}
              accessibilityState={{ selected: days === period }}
              onPress={() => {
                setDays(period);
                setHistoryLimit(5);
              }}
              className={`min-h-12 flex-1 items-center justify-center rounded-full ${days === period ? "bg-ink" : "bg-panel"}`}
            >
              <Txt
                weight="medium"
                className={`text-xs ${days === period ? "text-bg" : "text-muted"}`}
              >
                {period === 365 ? "1 year" : `${period} days`}
              </Txt>
            </MotionPressable>
          ))}
        </View>

        {initialLoading && (
          <ActivityIndicator
            accessibilityLabel="Loading workout statistics"
            color={C.ink}
            className="my-10"
          />
        )}

        {!!issue && (
          <PanelCard>
            <Txt weight="medium">
              {hasHistory ? "Couldn't refresh your stats" : "Couldn't load your stats"}
            </Txt>
            <Txt className="mb-4 mt-2 text-sm leading-6 text-muted">
              {hasHistory ? "Showing your saved workout history. " : ""}
              {issue}
            </Txt>
            <SmallButton
              label="Try again"
              icon="refresh"
              onPress={() => void progress.refresh()}
              disabled={progress.refreshing}
            />
          </PanelCard>
        )}

        {canShowStats && (
          <>
            <View className="overflow-hidden rounded-[28px] bg-ink p-6">
              <View className="flex-row items-center justify-between gap-3">
                <Txt weight="medium" className="flex-1 text-xs text-bg/70">
                  {dateLabel(data.start)} – {dateLabel(today)}
                </Txt>
                <Icon name="chart-bar" color={C.bg} size={25} />
              </View>
              <Txt
                weight="medium"
                className="mt-5 text-[64px] leading-[72px] tracking-[-2px] text-bg"
              >
                {data.current.workouts}
              </Txt>
              <Txt weight="medium" className="mt-1 text-base text-bg">
                Workouts completed
              </Txt>
              <Txt className="mt-3 text-xs leading-5 text-bg/70">
                {workoutChange === null
                  ? `No workouts in the previous ${days} days to compare.`
                  : `${workoutChange > 0 ? "+" : ""}${compact(workoutChange)}% compared with the previous ${days} days`}
              </Txt>
              <View className="mt-6 flex-row gap-5 border-t border-black/10 pt-4">
                <View className="flex-1">
                  <Txt weight="medium" className="text-xl text-bg">
                    {activeDays}
                  </Txt>
                  <Txt className="mt-1 text-xs text-bg/70">Active training days</Txt>
                </View>
                <View className="flex-1">
                  <Txt weight="medium" className="text-xl text-bg">
                    {data.current.workouts
                      ? Math.round(data.current.minutes / data.current.workouts)
                      : "—"}
                  </Txt>
                  <Txt className="mt-1 text-xs text-bg/70">Minutes per workout</Txt>
                </View>
              </View>
            </View>
            <TrainingStats data={data} unit={unit} />

            {data.current.workouts === 0 ? (
              <View className="mt-6 rounded-[28px] bg-panel p-6">
                <Icon name="dumbbell" size={28} />
                <Txt weight="medium" className="mt-4 text-xl">
                  {data.allTime.workouts ? "A fresh chapter." : "Your first session starts here."}
                </Txt>
                <Txt className="mb-5 mt-2 text-sm leading-6 text-muted">
                  {data.allTime.workouts
                    ? "No completed workouts in this range. Choose a longer period or make time for your next session."
                    : "Finish and save a workout to see your training trends and personal bests."}
                </Txt>
                <SmallButton
                  label="Go to training"
                  icon="arrow-right"
                  onPress={() => router.push("/(tabs)/train")}
                />
              </View>
            ) : (
              <>
                <SectionTitle title="Training trends" />
                <PanelCard>
                  <View className="mb-5 flex-row gap-2">
                    {CHARTS.map((metric) => (
                      <MotionPressable
                        key={metric.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Show ${metric.label.toLowerCase()} trend`}
                        accessibilityState={{ selected: chart === metric.id }}
                        onPress={() => setChart(metric.id)}
                        className={`min-h-11 flex-1 items-center justify-center rounded-full ${chart === metric.id ? "bg-ink" : "bg-elevated"}`}
                      >
                        <Txt
                          weight="medium"
                          className={`text-xs ${chart === metric.id ? "text-bg" : "text-muted"}`}
                        >
                          {metric.label}
                        </Txt>
                      </MotionPressable>
                    ))}
                  </View>
                  <TrendChart
                    key={`${days}:${chart}`}
                    points={data.activity.map((day) => ({
                      date: day.date,
                      value: chart === "volume" ? weightValue(day.volume, unit) : day[chart],
                    }))}
                    color={C.ink}
                    unit={chart === "volume" ? unit : chart === "minutes" ? "min" : "workouts"}
                    format={compact}
                  />
                  <Txt className="mt-4 text-[11px] leading-5 text-muted">
                    {chart === "volume"
                      ? "Daily volume is external weight × reps from completed working sets. Warm-ups are excluded."
                      : "Daily totals from completed workouts. Tap a chart point to see its value."}
                  </Txt>
                </PanelCard>
              </>
            )}

            <StrengthSection data={data} unit={unit} />

            {workouts.length > 0 && (
              <>
                <SectionTitle title="Recent workouts" />
                <View className="gap-3">
                  {workouts.slice(0, historyLimit).map((workout) => {
                    const stats = summary([workout]);
                    return (
                      <MotionPressable
                        key={workout.id}
                        accessibilityRole="button"
                        accessibilityLabel={`View ${workout.name}, ${dateLabel(workoutDate(workout))}`}
                        onPress={() => openWorkout(workout.id)}
                        className="min-h-20 flex-row items-center gap-4 rounded-[22px] bg-panel p-5"
                      >
                        <View className="min-w-0 flex-1">
                          <Txt weight="medium" className="text-sm" numberOfLines={1}>
                            {workout.name}
                          </Txt>
                          <Txt className="mt-1 text-xs text-muted">
                            {dateLabel(workoutDate(workout))} · {stats.minutes} min · {stats.sets}{" "}
                            sets
                          </Txt>
                        </View>
                        <Icon name="chevron-right" color={C.muted} size={20} />
                      </MotionPressable>
                    );
                  })}
                </View>
                {workouts.length > historyLimit && (
                  <View className="mt-4">
                    <SmallButton
                      label="Show more workouts"
                      icon="chevron-down"
                      onPress={() => setHistoryLimit((limit) => limit + 10)}
                    />
                  </View>
                )}
              </>
            )}
          </>
        )}
      </TabScrollView>
    </ScreenEntrance>
  );
}
