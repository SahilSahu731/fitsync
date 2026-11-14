import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { MotionPressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { change, type ProgressAnalytics } from "./analytics";
import { TrendChart } from "./charts";
import { weightValue } from "./model";
import { compact } from "./tracking-cards";
import { Icon, PanelCard, SectionTitle, SmallButton } from "./visuals";

const CHARTS = [
  { id: "workouts", label: "Workouts" },
  { id: "volume", label: "Volume" },
  { id: "minutes", label: "Minutes" },
] as const;
type ChartMetric = (typeof CHARTS)[number]["id"];

export function TrainingTrends({
  data,
  days,
  unit,
}: {
  data: ProgressAnalytics;
  days: number;
  unit: "kg" | "lb";
}) {
  const router = useRouter();
  const [chart, setChart] = useState<ChartMetric>("workouts");
  const workoutChange = change(data.current.workouts, data.previous.workouts);
  const activeDays = data.activity.filter((day) => day.workouts > 0).length;

  return (
    <>
      <SectionTitle title="Training trends" />
      <PanelCard>
        <Txt className="mb-4 text-xs leading-5 text-muted">
          {workoutChange === null
            ? `No workouts in the previous ${days} days to compare.`
            : `${workoutChange > 0 ? "+" : ""}${compact(workoutChange)}% workouts compared with the previous ${days} days.`}
        </Txt>
        <View className="mb-5 flex-row gap-4">
          <View className="flex-1">
            <Txt weight="medium" className="text-xl">
              {activeDays}
            </Txt>
            <Txt className="mt-1 text-xs text-muted">Active training days</Txt>
          </View>
          <View className="flex-1">
            <Txt weight="medium" className="text-xl">
              {data.current.workouts
                ? Math.round(data.current.minutes / data.current.workouts)
                : "—"}
            </Txt>
            <Txt className="mt-1 text-xs text-muted">Minutes per workout</Txt>
          </View>
        </View>
        {data.current.workouts === 0 ? (
          <>
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
          </>
        ) : (
          <>
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
          </>
        )}
      </PanelCard>
    </>
  );
}
