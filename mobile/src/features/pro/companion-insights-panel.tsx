import React, { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Txt } from "@/src/components/ui";
import { MotionPressable, ProgressFill } from "@/src/components/motion";
import {
  dateLabel,
  METRICS,
  weightValue,
  type Metric,
  type ProgressEvent,
  type ProgressWorkout,
} from "../progress/model";
import { pretty } from "../exercises/api";
import { MUSCLES, type MuscleMetadata } from "./analytics";
import {
  buildExerciseProfiles,
  compareTrainingBlocks,
  compareTrainingRanges,
  estimateMuscleRecovery,
  previewSpecialisation,
  type InsightExperiment,
  type InsightReadiness,
  type ReplacementEvidence,
} from "./companion-insights";
import { GlassCard, PRO, ProAction, ProPill, ProSection, ProStat, Reveal } from "./ui";

type Props = {
  workouts: ProgressWorkout[];
  metadata: MuscleMetadata[];
  events: ProgressEvent[];
  today: string;
  unit: "kg" | "lb";
  readiness?: InsightReadiness | null;
  plannedDates?: string[];
  experiments?: InsightExperiment[];
  replacementEvidence?: ReplacementEvidence[];
  onAddExperiment?: () => void;
  onSpecialise?: (muscleCode: string) => void;
};
const number = (value: number, digits = 1) =>
  value.toLocaleString(undefined, { maximumFractionDigits: digits });
const signed = (value: number | null) =>
  value === null ? "—" : `${value > 0 ? "+" : ""}${number(value)}%`;
const trendLabels = {
  insufficient: "Building a baseline",
  progressing: "Improving sample",
  stable: "Possible plateau signal",
  declining: "Lower recent performance",
  mixed: "Variable performance",
};
function Explanation({
  children,
  label = "Why this insight?",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View className="mt-3">
      <MotionPressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        className="min-h-11 justify-center"
      >
        <Txt className="text-xs" style={{ color: PRO.accent }}>
          {label} {open ? "−" : "+"}
        </Txt>
      </MotionPressable>
      {open && <View className="gap-2 rounded-2xl bg-black/15 p-3">{children}</View>}
    </View>
  );
}
const Note = ({ children }: { children: React.ReactNode }) => (
  <Txt className="text-[11px] leading-[18px] text-muted">{children}</Txt>
);

/** All panels derive from the same Progress history and journal as Home and the logger. */
export function CompanionInsightsPanel(props: Props) {
  const {
    workouts,
    metadata,
    events,
    today,
    unit,
    readiness,
    plannedDates,
    experiments = [],
    onAddExperiment,
    onSpecialise,
    replacementEvidence,
  } = props;
  const [view, setView] = useState<"performance" | "blocks" | "recovery" | "focus" | "experiments">(
    "performance",
  );
  const [weeks, setWeeks] = useState<4 | 8>(4);
  const [limit, setLimit] = useState(6);
  const [muscle, setMuscle] = useState<string>("chest");
  const profiles = useMemo(
    () => buildExerciseProfiles(workouts, today, replacementEvidence),
    [workouts, today, replacementEvidence],
  );
  const blocks = useMemo(
    () => compareTrainingBlocks(workouts, events, weeks, today, { plannedDates }),
    [workouts, events, weeks, today, plannedDates],
  );
  const recovery = useMemo(
    () => estimateMuscleRecovery(workouts, metadata, today, readiness),
    [workouts, metadata, today, readiness],
  );
  const focus = useMemo(
    () => previewSpecialisation(workouts, metadata, muscle, today),
    [workouts, metadata, muscle, today],
  );
  const selectedRecovery = recovery.muscles.find((m) => m.code === muscle);
  return (
    <>
      <ProSection
        eyebrow="Your training, explained"
        title="Insights with evidence"
        description="Comparable performances, transparent assumptions and useful next steps. Missing information stays visible."
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        <View className="flex-row gap-2">
          {(
            [
              ["performance", "Performance"],
              ["blocks", "Training blocks"],
              ["recovery", "Recovery estimate"],
              ["focus", "Muscle focus"],
              ["experiments", "Experiments"],
            ] as const
          ).map(([id, label]) => (
            <ProPill key={id} label={label} selected={view === id} onPress={() => setView(id)} />
          ))}
        </View>
      </ScrollView>
      <Reveal key={view}>
        {view === "performance" && (
          <View className="gap-3">
            {!profiles.length && (
              <GlassCard>
                <Txt weight="medium">Your baseline starts with a workout.</Txt>
                <Note>
                  Completed working sets build exercise profiles. Four comparable dates spanning
                  three weeks are needed before a possible plateau signal appears.
                </Note>
              </GlassCard>
            )}
            {profiles.slice(0, limit).map((profile) => (
              <GlassCard key={profile.id}>
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Txt weight="medium" className="text-base">
                      {profile.name}
                    </Txt>
                    <Txt
                      className="mt-1 text-[11px]"
                      style={{ color: profile.plateau ? PRO.gold : PRO.accent }}
                    >
                      {trendLabels[profile.status]}
                    </Txt>
                  </View>
                  <Txt className="text-[10px] text-muted">{profile.confidence} confidence</Txt>
                </View>
                <View className="my-4 flex-row gap-3">
                  <ProStat label="Completed appearances" value={profile.sessions} />
                  <ProStat
                    label="Recent sample change"
                    value={signed(profile.changePercent)}
                    detail={profile.scoreLabel}
                  />
                </View>
                <Note>{profile.recommendation}</Note>
                <Txt className="mt-3 text-[11px] text-muted">
                  Recorded coaching swaps: {profile.replacementCount ?? "not loaded"}
                </Txt>
                <Explanation>
                  <Note>
                    Only completed normal sets of the same exercise and tracking type contribute to
                    this strength comparison. Warm-ups and advanced methods are excluded.
                  </Note>
                  {profile.evidence.map((e) => (
                    <MotionPressable
                      key={`${e.workoutId}:${e.date}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Open workout from ${dateLabel(e.date)}`}
                      onPress={() =>
                        router.push({
                          pathname: "/workout/history/[id]",
                          params: { id: e.workoutId },
                        })
                      }
                      className="min-h-11 justify-center border-b border-white/5 py-2"
                    >
                      <Txt className="text-[11px]">
                        {dateLabel(e.date)} ·{" "}
                        {e.score === null
                          ? "—"
                          : number(
                              profile.trackingType === "reps_weight"
                                ? weightValue(e.score, unit)
                                : e.score,
                            )}{" "}
                        {profile.trackingType === "reps_weight" ? unit : "reps"} · {e.standardSets}{" "}
                        normal sets · RPE{" "}
                        {e.averageRpe === null ? "not logged" : number(e.averageRpe)}
                      </Txt>
                    </MotionPressable>
                  ))}
                  {profile.missing.map((note) => (
                    <Note key={note}>{note}</Note>
                  ))}
                  <Note>
                    {profile.uncompletedAppearances} appearances with unfinished sets and no
                    completed working sets. These logs cannot establish why they were uncompleted.{" "}
                    {profile.replacementNote}
                  </Note>
                  {profile.replacementEvents.length > 0 && (
                    <Note>
                      Saved swap dates:{" "}
                      {profile.replacementEvents.map((event) => dateLabel(event.date)).join(" · ")}
                    </Note>
                  )}
                </Explanation>
              </GlassCard>
            ))}
            {profiles.length > limit && (
              <ProAction
                icon="plus"
                title="More exercise profiles"
                subtitle={`${profiles.length - limit} remaining`}
                onPress={() => setLimit(limit + 6)}
              />
            )}
          </View>
        )}
        {view === "blocks" && (
          <View className="gap-3">
            <View className="mb-1 flex-row gap-2">
              <ProPill label="4-week blocks" selected={weeks === 4} onPress={() => setWeeks(4)} />
              <ProPill label="8-week blocks" selected={weeks === 8} onPress={() => setWeeks(8)} />
            </View>
            <ComparisonCard result={blocks} unit={unit} title="Previous block → current block" />
          </View>
        )}
        {(view === "recovery" || view === "focus") && (
          <View className="gap-3">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {MUSCLES.map((code) => (
                  <ProPill
                    key={code}
                    label={pretty(code)}
                    selected={muscle === code}
                    onPress={() => setMuscle(code)}
                  />
                ))}
              </View>
            </ScrollView>
            {view === "recovery" && selectedRecovery && (
              <GlassCard>
                <Txt weight="medium" className="text-lg">
                  {pretty(muscle)}
                </Txt>
                <Txt className="mt-2 text-sm" style={{ color: PRO.cyan }}>
                  {selectedRecovery.status === "unknown"
                    ? "No workload history"
                    : selectedRecovery.status === "reported_sore"
                      ? "High soreness reported"
                      : selectedRecovery.status === "higher_recent_load"
                        ? "Higher recent workload"
                        : selectedRecovery.status === "some_recent_load"
                          ? "Some recent workload"
                          : "Lower recent workload"}
                </Txt>
                <View className="my-5 flex-row gap-3">
                  <ProStat label="Primary sets · 7 days" value={selectedRecovery.primarySets7d} />
                  <ProStat
                    label="Secondary sets · 7 days"
                    value={selectedRecovery.secondarySets7d}
                  />
                  <ProStat label="Days since last work" value={selectedRecovery.daysSince ?? "—"} />
                </View>
                <Note>{recovery.disclaimer}</Note>
                <Explanation>
                  <Note>{selectedRecovery.reason}</Note>
                  <Note>
                    Confidence: {selectedRecovery.confidence}. This is confidence in the available
                    inputs, not a recovery percentage.
                  </Note>
                  {selectedRecovery.missing.map((note) => (
                    <Note key={note}>{note}</Note>
                  ))}
                  {recovery.generalSoreness !== null && (
                    <Note>
                      Today&apos;s general soreness: {recovery.generalSoreness}/5. This does not
                      identify which muscle is sore.
                    </Note>
                  )}
                  <Note>
                    {recovery.unknownSets} working sets in the last seven days have no muscle
                    mapping.
                  </Note>
                </Explanation>
              </GlassCard>
            )}
            {view === "focus" && (
              <GlassCard>
                <Txt weight="medium" className="text-lg">
                  {pretty(muscle)} focus preview
                </Txt>
                <View className="my-5 flex-row gap-3">
                  <ProStat label="Primary sets · 28 days" value={focus.primarySets} />
                  <ProStat
                    label="Average per week"
                    value={number(focus.averagePrimarySetsPerWeek)}
                  />
                  <ProStat label="Optional extra sets/week" value={`+${focus.extraSetsPerWeek}`} />
                </View>
                <Note>{focus.explanation}</Note>
                {focus.suggestions.map((s) => (
                  <View
                    key={s.exerciseId}
                    className="mt-3 flex-row justify-between rounded-xl bg-white/5 p-3"
                  >
                    <Txt className="flex-1 text-xs">{s.name}</Txt>
                    <Txt className="text-xs" style={{ color: PRO.accent }}>
                      +1 set / week
                    </Txt>
                  </View>
                ))}
                {onSpecialise && focus.suggestions.length > 0 && (
                  <View className="mt-4">
                    <ProAction
                      icon="calendar-edit"
                      title="Preview a focus plan"
                      subtitle="Review exact changes before applying"
                      onPress={() => onSpecialise(muscle)}
                    />
                  </View>
                )}
                <Explanation>
                  <Note>
                    Based on {dateLabel(focus.start)} – {dateLabel(focus.end)}. Confidence:{" "}
                    {focus.confidence}. A fixed four-week average includes unlogged days.
                  </Note>
                  {focus.limitations.map((note) => (
                    <Note key={note}>{note}</Note>
                  ))}
                </Explanation>
              </GlassCard>
            )}
          </View>
        )}
        {view === "experiments" && (
          <View className="gap-3">
            <GlassCard>
              <Txt weight="medium" className="text-base">
                Compare one training change at a time
              </Txt>
              <Note>
                Save a baseline and comparison date range. Review workout frequency, exercise
                selection, effort and measurements together. Observed changes do not prove that your
                experiment caused them.
              </Note>
            </GlassCard>
            {onAddExperiment && (
              <ProAction
                icon="flask-outline"
                title="Create a personal experiment"
                subtitle="Choose your change and two date ranges"
                onPress={onAddExperiment}
              />
            )}
            {experiments.map((experiment) => (
              <ComparisonCard
                key={experiment.id}
                title={experiment.title}
                experiment={experiment}
                unit={unit}
                result={compareTrainingRanges(
                  workouts,
                  events,
                  experiment.baseline,
                  experiment.comparison,
                  today,
                  { plannedDates },
                )}
              />
            ))}
            {!experiments.length && (
              <Note>
                No saved experiments yet. Training-block comparisons are available now from the same
                workout history.
              </Note>
            )}
          </View>
        )}
      </Reveal>
    </>
  );
}

export function ComparisonCard({
  result,
  unit,
  title,
  experiment,
}: {
  result: ReturnType<typeof compareTrainingRanges>;
  unit: "kg" | "lb";
  title: string;
  experiment?: InsightExperiment;
}) {
  const selectedMetric =
    experiment?.measurement && Object.hasOwn(METRICS, experiment.measurement)
      ? (experiment.measurement as Metric)
      : null;
  const focusedExercise = experiment?.exerciseId
    ? result.exercises.find((e) => e.id.startsWith(`${experiment.exerciseId}:`))
    : null;
  const focusLabel =
    experiment?.metric === "measurement"
      ? selectedMetric
        ? METRICS[selectedMetric].label
        : "Selected measurement"
      : experiment?.metric === "strength"
        ? (focusedExercise?.name ?? "Selected exercise strength")
        : experiment?.metric === "volume"
          ? "External-load training volume"
          : experiment?.metric === "sessions"
            ? "Completed workouts"
            : null;
  const context = (
    <>
      {focusLabel && (
        <Txt className="mt-3 text-xs" style={{ color: PRO.accent }}>
          Experiment focus: {focusLabel}
        </Txt>
      )}
      {!!experiment?.hypothesis && <Note>Hypothesis: {experiment.hypothesis}</Note>}
    </>
  );
  if (!result.valid)
    return (
      <GlassCard>
        <Txt weight="medium">{title}</Txt>
        {context}
        {result.notes.map((n) => (
          <Note key={n}>{n}</Note>
        ))}
      </GlassCard>
    );
  const a = result.baseline!,
    b = result.comparison!;
  const rows = [
    ["Completed workouts", number(a.workouts, 0), number(b.workouts, 0)],
    ["Workouts per week", number((a.workouts * 7) / a.days), number((b.workouts * 7) / b.days)],
    ["Working sets", number(a.workingSets, 0), number(b.workingSets, 0)],
    [
      `External-load volume (${unit})`,
      number(weightValue(a.volumeKg, unit), 0),
      number(weightValue(b.volumeKg, unit), 0),
    ],
    ["Recorded workout minutes", number(a.minutes, 0), number(b.minutes, 0)],
    [
      "Average logged RPE",
      a.averageRpe === null ? "—" : number(a.averageRpe),
      b.averageRpe === null ? "—" : number(b.averageRpe),
    ],
    [
      "RPE coverage",
      `${number(a.effortCoverage * 100, 0)}%`,
      `${number(b.effortCoverage * 100, 0)}%`,
    ],
    [
      "Planned-date attendance",
      a.attendance ? `${a.attendance.completed}/${a.attendance.planned}` : "Unavailable",
      b.attendance ? `${b.attendance.completed}/${b.attendance.planned}` : "Unavailable",
    ],
  ];
  if (experiment?.metric === "volume")
    rows.sort((left, right) =>
      left[0].startsWith("External-load volume")
        ? -1
        : right[0].startsWith("External-load volume")
          ? 1
          : 0,
    );
  const observedMetrics = new Set([
    ...Object.keys(a.measurementAverages),
    ...Object.keys(b.measurementAverages),
    ...(selectedMetric ? [selectedMetric] : []),
  ]);
  const measurementRows = (Object.keys(METRICS) as Metric[])
    .filter((metric) => observedMetrics.has(metric))
    .sort((left, right) => (left === selectedMetric ? -1 : right === selectedMetric ? 1 : 0));
  const measurements =
    measurementRows.length > 0 ? (
      <View className="mt-5 rounded-2xl bg-white/5 p-3">
        <Txt weight="medium" className="mb-2 text-sm">
          Recorded-day averages
        </Txt>
        <Note>
          Earlier block → later block. Averages use days with a saved reading; missing days stay
          missing. Coverage shows recorded days / block days.
        </Note>
        {measurementRows.map((metric) => {
          const spec = METRICS[metric],
            before = a.measurementAverages[metric],
            after = b.measurementAverages[metric];
          const metricUnit = spec.unit === "kg" ? unit : spec.unit;
          const displayed = (value: number | undefined) =>
            value === undefined
              ? "—"
              : number(spec.unit === "kg" ? weightValue(value, unit) : value, 2);
          return (
            <View
              key={metric}
              accessibilityLabel={`${spec.label} recorded-day averages`}
              className="mt-3 flex-row items-start gap-2 border-t border-white/5 pt-3"
            >
              <Txt
                className="flex-1 text-[11px] leading-4"
                style={metric === selectedMetric ? { color: PRO.accent } : undefined}
              >
                {spec.label} ({metricUnit}){metric === selectedMetric ? " · Focus" : ""}
              </Txt>
              <View className="w-20 items-end">
                <Txt accessibilityLabel={`${spec.label} earlier average`} className="text-xs">
                  {displayed(before?.value)}
                </Txt>
                <Txt
                  accessibilityLabel={`${spec.label} earlier coverage`}
                  className="mt-1 text-[9px] text-muted"
                >
                  {before?.days ?? 0}/{a.days} days
                </Txt>
              </View>
              <View className="w-20 items-end">
                <Txt
                  accessibilityLabel={`${spec.label} later average`}
                  className="text-xs"
                  style={{ color: PRO.accent }}
                >
                  {displayed(after?.value)}
                </Txt>
                <Txt
                  accessibilityLabel={`${spec.label} later coverage`}
                  className="mt-1 text-[9px] text-muted"
                >
                  {after?.days ?? 0}/{b.days} days
                </Txt>
              </View>
            </View>
          );
        })}
      </View>
    ) : null;
  return (
    <GlassCard>
      <Txt weight="medium" className="text-base">
        {title}
      </Txt>
      <Note>
        {dateLabel(a.start)} – {dateLabel(a.end)} → {dateLabel(b.start)} – {dateLabel(b.end)}
      </Note>
      {context}
      {selectedMetric && measurements}
      {experiment?.metric === "strength" && (
        <View className="mt-4 rounded-2xl bg-white/5 p-3">
          <Txt className="text-xs leading-5">
            {focusedExercise
              ? `${focusedExercise.name}: ${signed(focusedExercise.changePercent)} in average comparable score · ${focusedExercise.baselineSamples} → ${focusedExercise.comparisonSamples} samples · ${focusedExercise.confidence} confidence.`
              : "Not enough matching performances for the selected exercise in both blocks."}
          </Txt>
        </View>
      )}
      <View className="mt-4 gap-3">
        {rows.map(([label, before, after]) => (
          <View key={label} className="flex-row gap-3">
            <Txt className="flex-1 text-xs text-muted">{label}</Txt>
            <Txt className="w-20 text-right text-xs">{before}</Txt>
            <Txt className="w-20 text-right text-xs" style={{ color: PRO.accent }}>
              {after}
            </Txt>
          </View>
        ))}
      </View>
      {!selectedMetric && measurements}
      <View className="mt-4">
        <ProgressFill ratio={b.effortCoverage} height={3} color={PRO.cyan} />
      </View>
      <Explanation label="Matching exercises & comparison limits">
        {result.exercises.map((e) => (
          <Note key={e.id}>
            {e.name}: {signed(e.changePercent)} in average comparable score · {e.baselineSamples} →{" "}
            {e.comparisonSamples} samples · {e.confidence} confidence.
          </Note>
        ))}
        {!result.exercises.length && (
          <Note>
            No matching exercise and tracking-type performances are available in both blocks.
          </Note>
        )}
        {result.notes.map((note) => (
          <Note key={note}>{note}</Note>
        ))}
      </Explanation>
    </GlassCard>
  );
}
