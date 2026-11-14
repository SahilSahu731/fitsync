import React, { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Txt } from "@/src/components/ui";
import { MotionPressable, ProgressFill } from "@/src/components/motion";
import { TrendChart } from "../progress/charts";
import { HistoryChart } from "./history-chart";
import { MetricDetail } from "../progress/metric-detail";
import { MetricEditor } from "../progress/editors";
import {
  METRICS,
  METRIC_GROUPS,
  dateLabel,
  weightValue,
  type Metric,
  type MetricGroup,
} from "../progress/model";
import { compact, displayMetric, displayUnit } from "../progress/tracking-cards";
import { Body } from "../workouts/components/muscle-focus";
import { pretty } from "../exercises/api";
import type { useProgress } from "../progress/use-progress";
import { modesFor, type ProAnalytics, type RecordMode } from "./analytics";
import { GlassCard, ProPill, ProSection, ProStat, ProAction, PRO, Reveal } from "./ui";

export type AnalyticsView = "training" | "muscles" | "records" | "body";
const MODE_LABELS: Record<RecordMode, string> = {
  load: "Heaviest set",
  reps: "Most set reps",
  e1rm: "Estimated 1RM",
  volume: "Session volume",
  duration: "Longest set",
  distance: "Farthest set",
};
const openWorkout = (id: string) =>
  router.push({ pathname: "/workout/history/[id]", params: { id } });
const recordUnit = (mode: RecordMode, unit: "kg" | "lb") =>
  ["load", "e1rm", "volume"].includes(mode)
    ? unit
    : mode === "duration"
      ? "sec"
      : mode === "distance"
        ? "m"
        : "reps";
const convert = (n: number, mode: RecordMode, unit: "kg" | "lb") =>
  ["load", "e1rm", "volume"].includes(mode) ? weightValue(n, unit) : n;

export function AnalyticsPanels({
  data,
  unit,
  progress,
  view,
  onView,
  metadataError,
  onRetryMetadata,
}: {
  data: ProAnalytics;
  unit: "kg" | "lb";
  progress: ReturnType<typeof useProgress>;
  view: AnalyticsView;
  onView: (value: AnalyticsView) => void;
  metadataError: string;
  onRetryMetadata: () => void;
}) {
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
        <View className="flex-row gap-2">
          {(
            [
              ["training", "Training"],
              ["muscles", "Muscles"],
              ["records", "PRs & exercises"],
              ["body", "Measurements"],
            ] as const
          ).map(([id, label]) => (
            <ProPill key={id} label={label} selected={view === id} onPress={() => onView(id)} />
          ))}
        </View>
      </ScrollView>
      <Reveal key={view}>
        {view === "training" ? (
          <TrainingPanel data={data} unit={unit} />
        ) : view === "muscles" ? (
          <MusclePanel data={data} unit={unit} error={metadataError} retry={onRetryMetadata} />
        ) : view === "records" ? (
          <RecordsPanel data={data} unit={unit} />
        ) : (
          <MeasurementsPanel data={data} unit={unit} progress={progress} />
        )}
      </Reveal>
    </>
  );
}
function TrainingPanel({ data, unit }: { data: ProAnalytics; unit: "kg" | "lb" }) {
  const charts = [
    "workouts",
    "volume",
    "sets",
    "minutes",
    "reps",
    "distance",
    "timedSeconds",
    "averageRpe",
  ] as const;
  type Chart = (typeof charts)[number];
  const [chart, setChart] = useState<Chart>("volume");
  const names: Record<Chart, string> = {
    workouts: "Workouts",
    volume: "Volume",
    sets: "Working sets",
    minutes: "Minutes",
    reps: "Repetitions",
    distance: "Distance",
    timedSeconds: "Timed work",
    averageRpe: "Set RPE",
  };
  const chartUnit =
    chart === "volume"
      ? unit
      : chart === "minutes"
        ? "min"
        : chart === "distance"
          ? "m"
          : chart === "timedSeconds"
            ? "sec"
            : chart === "averageRpe"
              ? "RPE"
              : chart === "sets"
                ? "sets"
                : chart === "reps"
                  ? "reps"
                  : "sessions";
  const points = data.activity
    .filter((d) => chart !== "averageRpe" || d.averageRpe !== null)
    .map((d) => ({
      date: d.date,
      value: chart === "volume" ? weightValue(d.volume, unit) : (d[chart] ?? 0),
    }));
  const previous = data.previous?.[chart];
  const current = data.totals[chart];
  const delta =
    typeof previous === "number" && previous > 0 && typeof current === "number"
      ? ((current - previous) / previous) * 100
      : null;
  return (
    <>
      <GlassCard accent>
        <View className="mb-5 flex-row gap-4">
          <ProStat
            label="WORKOUTS"
            value={data.totals.workouts}
            detail={`${data.activeDays} active days`}
          />
          <ProStat
            label="WORKING SETS"
            value={compact(data.totals.sets)}
            detail={`${compact(data.totals.warmups)} warm-up sets separately`}
          />
        </View>
        <View className="flex-row gap-4">
          <ProStat label="TIME TRAINING" value={compact(data.totals.minutes)} unit="min" />
          <ProStat
            label="EXTERNAL VOLUME"
            value={compact(weightValue(data.totals.volume, unit))}
            unit={unit}
          />
        </View>
      </GlassCard>
      <ProSection
        eyebrow="Your training archive"
        title="Every session. One picture."
        description={`${dateLabel(data.start)} – ${dateLabel(data.today)} · ${data.bucket === "day" ? "daily" : data.bucket === "week" ? "weekly" : "monthly"} chart totals. All saved history remains available.`}
      />
      <GlassCard>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
          <View className="flex-row gap-2">
            {charts.map((id) => (
              <ProPill
                key={id}
                label={names[id]}
                selected={chart === id}
                onPress={() => setChart(id)}
              />
            ))}
          </View>
        </ScrollView>
        {data.totals.workouts ? (
          <HistoryChart
            key={chart + data.start}
            points={points}
            color={PRO.accent}
            unit={chartUnit}
            format={compact}
          />
        ) : (
          <Txt className="py-8 text-sm leading-6 text-muted">
            Finish and save a workout to start your training graphs.
          </Txt>
        )}
        <Txt className="mt-4 text-xs leading-5 text-muted">
          {delta !== null
            ? `${delta > 0 ? "+" : ""}${compact(delta)}% ${names[chart].toLowerCase()} versus the previous equal-length period. `
            : data.previous === null
              ? "Your entire saved history, with no date cutoff. "
              : "A previous nonzero period is needed for a percentage comparison. "}
          {chart === "volume"
            ? "Volume is external weight × reps; warm-ups and bodyweight load are excluded."
            : chart === "averageRpe"
              ? "RPE averages use completed working sets with recorded effort only."
              : "Only completed workouts and completed working sets count."}
        </Txt>
      </GlassCard>
      <ProSection title="The details behind the work" />
      <GlassCard>
        <View className="flex-row gap-4">
          <ProStat label="REPETITIONS" value={compact(data.totals.reps)} />
          <ProStat
            label="AVG. WORKOUT"
            value={data.averageMinutes === null ? "—" : compact(data.averageMinutes)}
            unit="min"
          />
        </View>
        <View className="mt-6 flex-row gap-4">
          <ProStat label="TIMED SETS" value={compact(data.totals.timedSeconds / 60)} unit="min" />
          <ProStat label="SET DISTANCE" value={compact(data.totals.distance / 1000)} unit="km" />
        </View>
        <View className="mt-6 flex-row gap-4">
          <ProStat
            label="RECORDED SET RPE"
            value={data.totals.averageRpe === null ? "—" : data.totals.averageRpe.toFixed(1)}
          />
          <ProStat
            label="RECORD IMPROVEMENTS"
            value={data.records.length}
            detail="May include several records in one session"
          />
        </View>
      </GlassCard>
    </>
  );
}
function MusclePanel({
  data,
  unit,
  error,
  retry,
}: {
  data: ProAnalytics;
  unit: "kg" | "lb";
  error: string;
  retry: () => void;
}) {
  const [selected, setSelected] = useState("chest");
  const muscle = data.muscles.find((m) => m.code === selected) ?? data.muscles[0];
  const maximum = Math.max(1, ...data.muscles.map((m) => m.primary));
  const trained = data.muscles.filter((m) => m.primary > 0).map((m) => m.code);
  const exercises = data.exercises.filter((e) => muscle?.exerciseIds.includes(e.id));
  const [showBack, setShowBack] = useState(false);
  const selectMuscle = (code: string) => {
    setSelected(code);
    if (
      [
        "lats",
        "upper-back",
        "lower-back",
        "rear-delts",
        "traps",
        "triceps",
        "glutes",
        "hamstrings",
      ].includes(code)
    )
      setShowBack(true);
    else if (!["calves", "forearms"].includes(code)) setShowBack(false);
  };
  return (
    <>
      <GlassCard accent>
        <Txt weight="medium" className="text-[27px] leading-8 tracking-[-.8px]">
          Know where the work goes.
        </Txt>
        <Txt className="mt-3 text-xs leading-5 text-muted">
          {trained.length} muscle groups with primary work. Tap any group below for its details.
        </Txt>
        <View className="mt-4 flex-row items-center justify-center gap-4">
          <Body
            muscles={trained}
            back={showBack}
            size={130}
            selected={selected}
            intensity={Object.fromEntries(data.muscles.map((m) => [m.code, m.primary / maximum]))}
            onSelect={selectMuscle}
          />
          <View className="gap-3">
            <ProPill label="Front" selected={!showBack} onPress={() => setShowBack(false)} />
            <ProPill label="Back" selected={showBack} onPress={() => setShowBack(true)} />
          </View>
        </View>
        <Txt className="mt-2 text-[10px] leading-4 text-muted">
          Color shows recorded primary work; the outline shows your selected muscle. Tap the map or
          a group below. This is not a recovery or growth score.
        </Txt>
      </GlassCard>
      {!!error && (
        <View className="mt-4">
          <ProAction icon="refresh" title="Retry muscle labels" subtitle={error} onPress={retry} />
        </View>
      )}
      <ProSection
        eyebrow="Every muscle group"
        title="Your workload distribution"
        description={`${data.mappedSets} of ${data.totals.sets} working sets have primary muscle labels. ${data.unknownSets} sets are unclassified. Primary and supporting involvement are shown separately; one set can involve several muscles.`}
      />
      <GlassCard>
        <View className="gap-4">
          {data.muscles.map((m) => (
            <MotionPressable
              key={m.code}
              className="min-h-11 justify-center"
              accessibilityRole="button"
              accessibilityState={{ selected: selected === m.code }}
              accessibilityLabel={`${pretty(m.code)}: ${m.primary} primary and ${m.secondary} supporting sets. View insights.`}
              onPress={() => selectMuscle(m.code)}
            >
              <View className="mb-2 flex-row justify-between">
                <Txt
                  weight={selected === m.code ? "semibold" : "regular"}
                  className="text-xs"
                  style={{ color: selected === m.code ? PRO.accent : "#E0E5EB" }}
                >
                  {pretty(m.code)}
                </Txt>
                <Txt className="text-[10px] text-muted">
                  {m.primary} primary · {m.secondary} supporting
                </Txt>
              </View>
              <ProgressFill
                ratio={m.primary / maximum}
                color={selected === m.code ? PRO.accent : "#687D6B"}
                trackColor="#FFFFFF08"
                height={5}
              />
            </MotionPressable>
          ))}
        </View>
      </GlassCard>
      {muscle && (
        <>
          <ProSection title={`${pretty(muscle.code)}, in detail`} />
          <GlassCard accent>
            <View className="flex-row gap-4">
              <ProStat label="PRIMARY SETS" value={muscle.primary} />
              <ProStat label="SUPPORTING SETS" value={muscle.secondary} />
            </View>
            <View className="mt-6 flex-row gap-4">
              <ProStat label="TRAINING DAYS" value={muscle.dates.length} />
              <ProStat
                label="PRIMARY SETS / WEEK"
                value={compact(muscle.weeklySets)}
                detail="Average across this range"
              />
            </View>
            <View className="mt-6 flex-row gap-4">
              <ProStat label="EXERCISES" value={muscle.exerciseIds.length} />
              <ProStat
                label="EXTERNAL VOLUME"
                value={compact(weightValue(muscle.volume, unit))}
                unit={unit}
              />
            </View>
            <Txt className="mt-5 text-xs leading-5 text-muted">
              {muscle.lastDate
                ? `Last trained ${dateLabel(muscle.lastDate)}. `
                : "No labeled work in this range. "}
              Supporting sets are not converted into fractional primary sets. Volume can overlap
              between primary muscles.
            </Txt>
          </GlassCard>
          <View className="mt-3 gap-2">
            {exercises.map((e) => (
              <ProAction
                key={e.id}
                icon="dumbbell"
                title={e.name}
                subtitle={`${e.sessions.filter((s) => s.date >= data.start).length} sessions in this range · ${e.type.replaceAll("_", " + ")}`}
                onPress={() =>
                  openWorkout(e.sessions.filter((s) => s.date >= data.start).at(-1)!.id)
                }
              />
            ))}
          </View>
        </>
      )}
    </>
  );
}
function RecordsPanel({ data, unit }: { data: ProAnalytics; unit: "kg" | "lb" }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [mode, setMode] = useState<RecordMode>("load");
  const [limit, setLimit] = useState(15);
  const exercises = data.exercises.filter((e) =>
    e.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const exercise = exercises.find((e) => e.id === selected) ?? exercises[0];
  const modes = modesFor(exercise?.type ?? "reps_weight");
  const active = modes.includes(mode) ? mode : modes[0];
  const sessions = exercise?.sessions.filter((s) => s.date >= data.start) ?? [];
  const best = exercise?.best[active];
  const records = data.records.filter((r) => !exercise || r.exerciseId === exercise.id);
  return (
    <>
      <GlassCard accent>
        <Txt className="text-[10px] tracking-[2px]" style={{ color: PRO.accent }}>
          PERSONAL RECORDS
        </Txt>
        <Txt weight="medium" className="mt-2 text-[32px] tracking-[-1px]">
          Your work. Your bests.
        </Txt>
        <Txt className="mt-2 text-xs leading-5 text-muted">
          All-time records stay saved. The selected date range controls graphs, session history and
          record improvements.
        </Txt>
        <TextInput
          accessibilityLabel="Search Pro exercise records"
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setLimit(15);
          }}
          maxLength={120}
          placeholder="Find an exercise…"
          placeholderTextColor={PRO.muted}
          className="mt-5 min-h-14 rounded-2xl bg-white/5 px-4 font-poppins-regular text-sm text-ink"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
          <View className="flex-row gap-2">
            {exercises.map((e) => (
              <ProPill
                key={e.id}
                label={e.name}
                selected={exercise?.id === e.id}
                onPress={() => {
                  setSelected(e.id);
                  setLimit(15);
                }}
              />
            ))}
          </View>
        </ScrollView>
      </GlassCard>
      {!exercise ? (
        <Txt className="py-10 text-sm text-muted">
          {query
            ? "No logged exercises match that search."
            : "Your first completed working set establishes a baseline. Improvements appear after you beat it."}
        </Txt>
      ) : (
        <>
          <ProSection
            title={exercise.name}
            description="Choose a measure to explore your entire exercise history."
          />
          <GlassCard>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
              <View className="flex-row gap-2">
                {modes.map((m) => (
                  <ProPill
                    key={m}
                    label={MODE_LABELS[m]}
                    selected={m === active}
                    onPress={() => setMode(m)}
                  />
                ))}
              </View>
            </ScrollView>
            <View className="mb-5 flex-row gap-4">
              <ProStat
                label={`ALL-TIME ${MODE_LABELS[active].toUpperCase()}`}
                value={
                  best && best[active] !== null
                    ? compact(convert(best[active]!, active, unit))
                    : "—"
                }
                unit={recordUnit(active, unit)}
                detail={best ? dateLabel(best.date) : "Not recorded"}
              />
              <ProStat
                label="LOGGED SESSIONS"
                value={sessions.length}
                detail={`${sessions.reduce((n, s) => n + s.sets, 0)} working sets in range`}
              />
            </View>
            <HistoryChart
              key={exercise.id + active + data.start}
              points={sessions
                .filter((s) => s[active] !== null)
                .map((s, i) => ({
                  date: s.date,
                  value: convert(s[active]!, active, unit),
                  label: `Session ${i + 1}`,
                }))}
              color={PRO.cyan}
              unit={recordUnit(active, unit)}
              format={compact}
              onSelect={(p) => {
                const row = sessions[Number(p.label?.split(" ")[1]) - 1];
                if (row) openWorkout(row.id);
              }}
            />
            <Txt className="mt-4 text-[11px] leading-5 text-muted">
              {active === "e1rm"
                ? "Estimated using Epley's equation on completed sets of 1–12 reps. This is an estimate, not a tested maximum."
                : active === "reps"
                  ? "Most reps in a single completed working set; loads and difficulty may differ between sessions."
                  : active === "volume"
                    ? "External load × repetitions across completed working sets. More volume alone does not establish greater strength."
                    : "Warm-ups and unfinished sets are excluded. Tap a value to open the workout."}
            </Txt>
          </GlassCard>
          <ProSection
            title="Record improvements"
            description="The first recorded result is a baseline. Only subsequent higher results appear here."
          />
          <GlassCard>
            {records.length ? (
              <View className="gap-4">
                {records.slice(0, limit).map((r) => (
                  <MotionPressable
                    key={r.id}
                    accessibilityRole="button"
                    onPress={() => openWorkout(r.sessionId)}
                    className="min-h-11 flex-row items-center justify-between gap-3"
                  >
                    <View className="flex-1">
                      <Txt weight="medium" className="text-sm">
                        {MODE_LABELS[r.mode]}
                      </Txt>
                      <Txt className="mt-1 text-[10px] text-muted">
                        {dateLabel(r.date)} · previous {compact(convert(r.previous, r.mode, unit))}
                      </Txt>
                    </View>
                    <Txt weight="medium" className="text-lg" style={{ color: PRO.accent }}>
                      {compact(convert(r.value, r.mode, unit))}
                      <Txt className="text-[10px] text-muted"> {recordUnit(r.mode, unit)}</Txt>
                    </Txt>
                  </MotionPressable>
                ))}
              </View>
            ) : (
              <Txt className="text-sm leading-6 text-muted">
                No new bests in this range. Your saved baseline and all-time records remain above.
              </Txt>
            )}
          </GlassCard>
          <ProSection title="Session history" />
          <View className="gap-2">
            {[...sessions]
              .reverse()
              .slice(0, limit)
              .map((s) => (
                <ProAction
                  key={s.id}
                  icon="history"
                  title={s.name}
                  subtitle={`${dateLabel(s.date)} · ${s.sets} sets · ${s.rpe === null ? "RPE not logged" : `avg. RPE ${s.rpe.toFixed(1)}`}`}
                  onPress={() => openWorkout(s.id)}
                />
              ))}
          </View>
          {Math.max(sessions.length, records.length) > limit && (
            <View className="mt-4">
              <ProPill
                label="Load more history"
                selected={false}
                onPress={() => setLimit((n) => n + 20)}
              />
            </View>
          )}
        </>
      )}
    </>
  );
}
function MeasurementsPanel({
  data,
  unit,
  progress,
}: {
  data: ProAnalytics;
  unit: "kg" | "lb";
  progress: ReturnType<typeof useProgress>;
}) {
  const [group, setGroup] = useState<MetricGroup>("body");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Metric | null>(null);
  const [editor, setEditor] = useState<{ metric: Metric; date: string } | null>(null);
  const rows = data.measurementStats.filter((m) =>
    query.trim()
      ? METRICS[m.metric].label.toLowerCase().includes(query.trim().toLowerCase())
      : (METRIC_GROUPS[group].metrics as readonly Metric[]).includes(m.metric),
  );
  return (
    <>
      <GlassCard accent>
        <Txt className="text-[10px] tracking-[2px]" style={{ color: PRO.accent }}>
          YOUR WHOLE PICTURE
        </Txt>
        <Txt weight="medium" className="mt-2 text-[29px] leading-9 tracking-[-1px]">
          Every measurement.{`\n`}Every check-in.
        </Txt>
        <Txt className="mt-3 text-xs leading-5 text-muted">
          All {Object.keys(METRICS).length} existing metrics. Daily values, long-term trends and
          corrections stay connected to your private journal.
        </Txt>
        <TextInput
          accessibilityLabel="Search Pro measurements"
          value={query}
          onChangeText={setQuery}
          maxLength={120}
          placeholder="Weight, waist, sleep, steps…"
          placeholderTextColor={PRO.muted}
          className="mt-5 min-h-14 rounded-2xl bg-white/5 px-4 font-poppins-regular text-sm text-ink"
        />
      </GlassCard>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="my-5">
        <View className="flex-row gap-2">
          {(Object.keys(METRIC_GROUPS) as MetricGroup[]).map((key) => (
            <ProPill
              key={key}
              label={METRIC_GROUPS[key].label}
              selected={key === group}
              onPress={() => {
                setGroup(key);
                setQuery("");
              }}
            />
          ))}
        </View>
      </ScrollView>
      <View className="gap-3">
        {rows.map((row) => (
          <GlassCard key={row.metric}>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Txt className="text-xs text-muted">{METRICS[row.metric].label}</Txt>
                <Txt weight="medium" className="mt-2 text-[28px] tracking-[-1px]">
                  {row.latest ? displayMetric(row.metric, row.latest.value!, unit) : "—"}
                  <Txt className="text-xs tracking-normal text-muted">
                    {" "}
                    {displayUnit(row.metric, unit)}
                  </Txt>
                </Txt>
                <Txt className="mt-1 text-[10px] text-muted">
                  {row.latest
                    ? `Latest ${dateLabel(row.latest.date)} · ${row.count} days logged`
                    : "No entries in this range"}
                </Txt>
              </View>
              <ProPill
                label="Log"
                selected={false}
                disabled={progress.loading || !!progress.storageError}
                onPress={() => setEditor({ metric: row.metric, date: data.today })}
              />
            </View>
            {row.rows.length > 1 && (
              <View className="mt-3">
                <TrendChart
                  points={row.rows.slice(-60).map((r) => ({
                    date: r.date,
                    value: row.metric === "weight" ? weightValue(r.value!, unit) : r.value!,
                  }))}
                  color={PRO.violet}
                  unit={displayUnit(row.metric, unit)}
                  compact
                />
              </View>
            )}
            <View className="mt-4">
              <ProPill
                label="Explore full trend"
                selected={false}
                onPress={() => setDetail(row.metric)}
              />
            </View>
          </GlassCard>
        ))}
      </View>
      {!rows.length && (
        <Txt className="py-8 text-sm text-muted">No measurements match that search.</Txt>
      )}
      <Txt className="mt-5 text-[11px] leading-5 text-muted">
        Missing values stay missing. Averages use recorded days only. Circumferences use cm; only
        body weight switches between kg and lb. Ordinary logging and history remain free in
        Progress.
      </Txt>
      {detail && (
        <MetricDetail
          initialMetric={detail}
          metrics={data.metrics}
          start={data.start}
          end={data.today}
          days={data.days}
          unit={unit}
          paged
          onClose={() => setDetail(null)}
          onEdit={(metric, date) => {
            setDetail(null);
            setEditor({ metric, date });
          }}
        />
      )}
      {editor && (
        <MetricEditor
          initialMetric={editor.metric}
          date={editor.date}
          events={data.metrics}
          unit={unit}
          onClose={() => setEditor(null)}
          onSave={async (metric, date, value, notes) => {
            await progress.log(metric, date, value, notes);
            setEditor(null);
          }}
        />
      )}
    </>
  );
}
