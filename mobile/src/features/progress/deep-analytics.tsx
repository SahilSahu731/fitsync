import React, { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { Icon } from "./visuals";
import { type ProgressAnalytics } from "./analytics";
import { weightValue, dateLabel } from "./model";
import { deepProgressInsight } from "./insights";
import {
  AnalyticsCard,
  Choices,
  DataBars,
  EmptyInsight,
  MetricTile,
  numberLabel,
} from "./dashboard-ui";

export function DeepAnalytics({
  data,
  unit,
  isPro,
  checking,
  onPro,
  onExercise,
}: {
  data: ProgressAnalytics;
  unit: "kg" | "lb";
  isPro: boolean;
  checking: boolean;
  onPro: () => void;
  onExercise: (id: string) => void;
}) {
  if (checking)
    return (
      <View className="mt-5 flex-row items-center gap-3 rounded-[24px] bg-panel p-5">
        <ActivityIndicator color={C.brand} />
        <Txt className="text-xs text-muted">Checking your deeper analytics…</Txt>
      </View>
    );
  if (isPro) return <MemberInsights data={data} unit={unit} onExercise={onExercise} />;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Explore Pro advanced analytics"
      onPress={onPro}
      className="mt-6 overflow-hidden rounded-[26px] border border-brand/20 bg-[#141A0E] p-5"
    >
      <View className="flex-row items-center gap-2">
        <Icon name="star-four-points" size={18} color={C.brand} />
        <Txt weight="medium" className="flex-1 text-[10px] tracking-[1.5px] text-brand">
          FITSYNC PRO
        </Txt>
        <Icon name="arrow-top-right" size={21} color={C.brand} />
      </View>
      <Txt weight="medium" className="mt-4 text-[23px] leading-8 tracking-[-0.6px]">
        Go deeper into your progress.
      </Txt>
      <Txt className="mt-2 text-xs leading-6 text-muted">
        Understand muscle workload, exercise progression, rep ranges and effort. Explore longer
        trends with your full saved history.
      </Txt>
      <View className="mt-4 flex-row flex-wrap gap-2">
        {["Muscle insights", "Rep ranges", "Progression"].map((label) => (
          <View key={label} className="rounded-full border border-brand/15 px-3 py-2">
            <Txt className="text-[9px] text-brand">{label}</Txt>
          </View>
        ))}
      </View>
      <Txt className="mt-4 text-[10px] leading-5 text-muted">
        Your last 90 days of standard analytics stay free.
      </Txt>
    </Pressable>
  );
}

function MemberInsights({
  data,
  unit,
  onExercise,
}: {
  data: ProgressAnalytics;
  unit: "kg" | "lb";
  onExercise: (id: string) => void;
}) {
  const [section, setSection] = useState<"workload" | "performance" | "effort">("workload");
  const insight = deepProgressInsight(data);
  const volume = insight.contributions.reduce((sum, item) => sum + item.volume, 0);
  const performanceUnit = (mode: string) =>
    mode === "e1rm" ? unit : mode === "duration" ? "sec" : mode === "distance" ? "m" : "reps";
  const performanceValue = (value: number, mode: string) =>
    mode === "e1rm" ? weightValue(value, unit) : value;
  return (
    <View className="mt-7">
      <View className="mb-3 flex-row items-center gap-2">
        <View className="h-7 w-7 items-center justify-center rounded-full bg-brand">
          <Icon name="star-four-points" color={C.bg} size={15} />
        </View>
        <Txt
          accessibilityRole="header"
          weight="medium"
          className="flex-1 text-xl tracking-[-0.5px]"
        >
          Deeper analytics
        </Txt>
        <Txt weight="semibold" className="text-[10px] text-brand">
          PRO
        </Txt>
      </View>
      <Txt className="mb-4 text-xs leading-5 text-muted">
        The details behind the work you put in.
      </Txt>
      <Choices
        options={[
          { id: "workload", label: "Workload" },
          { id: "performance", label: "Progression" },
          { id: "effort", label: "Reps & effort" },
        ]}
        value={section}
        onChange={setSection}
      />
      {section === "workload" && (
        <>
          <View className="flex-row gap-3">
            <MetricTile
              label="Average external load"
              value={numberLabel(
                insight.averageLoad === null ? null : weightValue(insight.averageLoad, unit),
              )}
              unit={unit}
              icon="weight-kilogram"
              caption={`${numberLabel(insight.weightedReps, 0)} weighted reps recorded`}
            />
            <MetricTile
              label="Volume / recorded minute"
              value={numberLabel(
                insight.volumePerMinute === null
                  ? null
                  : weightValue(insight.volumePerMinute, unit),
              )}
              unit={`${unit}×reps/min`}
              icon="timer-outline"
              caption={`${insight.timedSessions} sessions with duration`}
            />
          </View>
          <AnalyticsCard
            title="Weekly workload"
            subtitle="External load × reps. Partial weeks are marked; change compares the two latest complete weeks."
            icon="chart-bar"
            pro
          >
            <DataBars
              rows={insight.weeks.slice(-8).map((week) => ({
                label: `${dateLabel(week.date)}${week.complete ? "" : " · partial"}`,
                value: weightValue(week.volume, unit),
                detail: `${numberLabel(weightValue(week.volume, unit), 0)} ${unit} × reps · ${week.sessions} sessions`,
              }))}
            />
            <Txt className="mt-4 text-[11px] leading-5 text-muted">
              {insight.weeklyChange === null
                ? "Two complete weeks with earlier weighted volume are needed for a comparison."
                : `${insight.weeklyChange > 0 ? "+" : ""}${numberLabel(insight.weeklyChange)}% volume across the two latest complete weeks.`}
            </Txt>
          </AnalyticsCard>
          <AnalyticsCard
            title="Muscle workload"
            subtitle="Bars show primary sets; supporting sets are listed separately. Based on saved muscle labels."
            icon="human"
            pro
          >
            {insight.muscles.length ? (
              <DataBars
                rows={insight.muscles.slice(0, 8).map((muscle) => ({
                  label: muscle.name.replaceAll("-", " "),
                  value: muscle.primary,
                  detail: `${muscle.primary} primary · ${muscle.secondary} supporting`,
                }))}
              />
            ) : (
              <EmptyInsight
                title="Muscle labels are needed"
                detail="Complete exercises with muscle labels to see a real workload breakdown. No muscle groups are inferred from exercise names."
              />
            )}
            <Txt className="mt-4 text-[10px] leading-5 text-muted">
              {insight.mappedSets}/{insight.workingSets} working sets have muscle labels. A set can
              involve multiple muscles; these are involvement counts.
            </Txt>
          </AnalyticsCard>
          <AnalyticsCard
            title="Where your volume goes"
            subtitle="Top exercises by external weighted volume in this range."
            icon="chart-donut"
            pro
          >
            {volume > 0 ? (
              <DataBars
                maximum={volume}
                rows={insight.contributions.slice(0, 5).map((item) => ({
                  label: item.name,
                  value: item.volume,
                  detail: `${numberLabel((item.volume / volume) * 100, 0)}%`,
                  onPress: () => onExercise(item.id),
                }))}
              />
            ) : (
              <EmptyInsight
                title="Start with weighted working sets"
                detail="Bodyweight, timed and distance work stay separate from external load volume."
              />
            )}
          </AnalyticsCard>
        </>
      )}
      {section === "performance" && (
        <AnalyticsCard
          title="Exercise progression"
          subtitle="First to latest comparable session in this range. Weighted exercises use estimated 1RM from completed sets of 1–12 reps."
          icon="trending-up"
          pro
        >
          {insight.performance.length ? (
            insight.performance.slice(0, 12).map((exercise) => (
              <Pressable
                key={exercise.id}
                accessibilityRole="button"
                onPress={() => onExercise(exercise.id)}
                className="border-b border-white/5 py-4"
              >
                <View className="flex-row items-center gap-3">
                  <Txt weight="medium" className="min-w-0 flex-1 text-sm">
                    {exercise.name}
                  </Txt>
                  <Txt
                    weight="medium"
                    className="text-sm"
                    style={{
                      color:
                        exercise.mode === "duration" || exercise.mode === "distance"
                          ? "#9CCFF2"
                          : exercise.percent !== null && exercise.percent >= 0
                            ? C.brand
                            : "#DEC5A1",
                    }}
                  >
                    {exercise.percent === null
                      ? "—"
                      : `${exercise.percent > 0 ? "+" : ""}${numberLabel(exercise.percent)}%`}
                  </Txt>
                </View>
                <Txt className="mt-2 text-[11px] leading-5 text-muted">
                  {numberLabel(performanceValue(exercise.first, exercise.mode))} →{" "}
                  {numberLabel(performanceValue(exercise.last, exercise.mode))}{" "}
                  {performanceUnit(exercise.mode)} · {exercise.samples} sessions
                  {exercise.mode === "e1rm" ? " · estimated 1RM" : ""}
                </Txt>
                <Txt className="mt-1 text-[10px] text-muted">
                  {dateLabel(exercise.firstDate)} – {dateLabel(exercise.lastDate)}
                  {exercise.mode === "duration" || exercise.mode === "distance"
                    ? " · recorded change"
                    : ""}
                </Txt>
              </Pressable>
            ))
          ) : (
            <EmptyInsight
              title="Build a comparable training history"
              detail="Two sessions of the same exercise and tracking type are needed. Warm-ups and unfinished sets are excluded; these are range changes, not claims of new lifetime records."
            />
          )}
        </AnalyticsCard>
      )}
      {section === "effort" && (
        <>
          <AnalyticsCard
            title="Rep-range profile"
            subtitle="Completed rep-based working sets. External-load and other rep-based sets are counted separately."
            icon="counter"
            pro
          >
            <DataBars
              rows={insight.repRanges.map((range) => ({
                label: `${range.label} reps`,
                value: range.weighted + range.other,
                detail: `${range.weighted} weighted · ${range.other} other`,
              }))}
            />
          </AnalyticsCard>
          <View className="mt-4 flex-row gap-3">
            <MetricTile
              label="Average logged effort"
              value={numberLabel(insight.averageRpe)}
              unit="RPE"
              icon="gauge"
              caption={`${insight.ratedSets}/${insight.workingSets} working sets rated`}
            />
            <MetricTile
              label="Sets per session"
              value={numberLabel(insight.averageSets)}
              icon="format-list-checks"
              caption="Completed working sets"
            />
          </View>
          <AnalyticsCard
            title="Effort distribution"
            subtitle="Your recorded RPE, on a 1–10 scale. Unrated sets are not treated as zero effort."
            icon="speedometer"
            pro
          >
            {insight.ratedSets ? (
              <DataBars
                color="#C6B5EF"
                rows={insight.effort.map((range) => ({ label: range.label, value: range.count }))}
                suffix="sets"
              />
            ) : (
              <EmptyInsight
                title="No rated working sets yet"
                detail="Record RPE on completed sets to explore effort patterns. This describes your logs; it is not a recovery or injury-risk score."
              />
            )}
          </AnalyticsCard>
        </>
      )}
    </View>
  );
}
