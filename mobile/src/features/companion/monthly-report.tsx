import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Share, Switch, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { MotionPressable } from "@/src/components/motion";
import { useSession } from "@/src/context/session";
import { Sheet } from "../progress/editors";
import { readJournal } from "../progress/journal";
import { localDate } from "../progress/model";
import { useProgress } from "../progress/use-progress";
import { useWorkout } from "../workouts/workout-context";
import { GlassCard, ProButton, ProPill, ProSection, PRO, type ProIcon } from "../pro/hub-ui";
import { useCompanion } from "./companion-context";
import {
  measurementRows,
  measurementValue,
  metricLabel,
  monthDays,
  monthlyReportShareText,
  normalizeMonthlyReport,
  reportDayLabel,
  reportMonthLabel,
  reportNumber,
  reportWeeks,
  reportWeight,
  shiftReportMonth,
  type ReportShareKind,
  type ReportView,
} from "./monthly-report-model";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: ProIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full bg-white/5"
      style={{ opacity: disabled ? 0.3 : 1 }}
    >
      <MaterialCommunityIcons name={icon} size={22} color="#FFFFFF" />
    </MotionPressable>
  );
}

export function MonthlyReportPanel() {
  const { user, settings } = useSession();
  // A different account gets a fresh report workspace, including its share preview.
  return (
    <AccountMonthlyReport
      key={user?.id ?? "signed-out"}
      ownerId={user?.id ?? ""}
      unit={settings?.weightUnit ?? "kg"}
    />
  );
}

function AccountMonthlyReport({ ownerId, unit }: { ownerId: string; unit: "kg" | "lb" }) {
  const companion = useCompanion(),
    progress = useProgress(),
    workout = useWorkout();
  const today = localDate(),
    currentMonth = today.slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [report, setReport] = useState<ReportView | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [picker, setPicker] = useState(false),
    [pickerYear, setPickerYear] = useState(Number(month.slice(0, 4)));
  const [sharing, setSharing] = useState(false);
  const request = useRef(0),
    locked = useRef(false);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  function chooseMonth(value: string) {
    if (locked.current) return;
    request.current++;
    setMonth(value);
    setReport(null);
    setError("");
    setPicker(false);
    setSharing(false);
  }
  async function generate() {
    if (!ownerId || locked.current) return;
    locked.current = true;
    const revision = ++request.current,
      selectedMonth = month;
    const active = () => request.current === revision;
    setBusy(true);
    setError("");
    try {
      await workout.ensureSynced();
      if (!active()) return;
      await progress.refresh();
      if (!active()) return;
      const journal = await readJournal(ownerId);
      if (!active()) return;
      if (journal.pending.length)
        throw new Error(
          "Some progress entries still need to sync. Reconnect, then try again. Your last report is kept.",
        );
      const response = await companion.api.report(selectedMonth);
      if (active()) setReport(normalizeMonthlyReport(response, selectedMonth));
    } catch (failure) {
      if (active())
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not generate your report. Please try again.",
        );
    } finally {
      if (active()) {
        locked.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <>
      <ProSection
        eyebrow="YOUR MONTHLY EDITION"
        title="The work adds up."
        description="Your training, brought into focus. Choose a month to build your report."
      />
      <View className="mb-5 flex-row items-center gap-2">
        <IconButton
          icon="chevron-left"
          label="Previous report month"
          disabled={busy || month <= "2000-01"}
          onPress={() => chooseMonth(shiftReportMonth(month, -1))}
        />
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel={`Choose report month. ${reportMonthLabel(month)}`}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() => {
            setPickerYear(Number(month.slice(0, 4)));
            setPicker(true);
          }}
          className="min-h-14 min-w-0 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-white/5 px-2"
        >
          <MaterialCommunityIcons name="calendar-month-outline" color="#FFFFFF" size={19} />
          <Txt weight="medium" className="text-sm">
            {reportMonthLabel(month)}
          </Txt>
          <MaterialCommunityIcons name="chevron-down" color={PRO.muted} size={17} />
        </MotionPressable>
        <IconButton
          icon="chevron-right"
          label="Next report month"
          disabled={busy || month >= currentMonth}
          onPress={() => chooseMonth(shiftReportMonth(month, 1))}
        />
      </View>
      {report ? (
        <>
          <ReportPreview report={report} unit={unit} today={today} />
          <View className="mt-6 gap-3">
            <ProButton title="Share your monthly report" onPress={() => setSharing(true)} />
            <ProButton
              title="Refresh report"
              secondary
              loading={busy}
              onPress={() => void generate()}
            />
          </View>
        </>
      ) : (
        <GlassCard className="px-5 pb-6 pt-7">
          <View className="mb-6 h-16 w-16 items-center justify-center rounded-[22px] bg-white/5">
            <MaterialCommunityIcons name="chart-box-outline" color="#FFFFFF" size={34} />
          </View>
          <Txt weight="medium" className="text-2xl tracking-[-0.7px]">
            A month worth seeing.
          </Txt>
          <Txt className="mb-6 mt-3 text-sm leading-6 text-muted">
            See your training rhythm, completed sets, exercise performance and health check-ins in
            one clear report.
          </Txt>
          <View className="mb-6 flex-row gap-2">
            {[
              ["chart-bar", "Training"],
              ["table", "Performance"],
              ["share-variant-outline", "Share"],
            ].map(([icon, label]) => (
              <View
                key={label}
                className="min-w-0 flex-1 items-center rounded-2xl bg-white/5 px-1 py-4"
              >
                <MaterialCommunityIcons name={icon as ProIcon} size={20} color="#FFFFFF" />
                <Txt className="mt-2 text-[11px] text-muted">{label}</Txt>
              </View>
            ))}
          </View>
          <ProButton
            title="Build monthly report"
            disabled={!ownerId}
            loading={busy}
            onPress={() => void generate()}
          />
          {!ownerId && (
            <Txt className="mt-3 text-xs leading-5 text-muted">
              Sign in to build a report from your saved records.
            </Txt>
          )}
        </GlassCard>
      )}
      {!!error && (
        <Txt accessibilityRole="alert" className="mt-4 text-xs leading-5 text-red-300">
          {error}
        </Txt>
      )}
      {busy && (
        <Txt accessibilityLiveRegion="polite" className="mt-3 text-xs leading-5 text-muted">
          Syncing your logs and preparing {reportMonthLabel(month)}…
        </Txt>
      )}
      <Txt className="mt-4 text-[11px] leading-5 text-muted">
        Reports use synced records.{" "}
        {month === currentMonth ? "This month is still in progress. " : ""}Private photos and
        check-in notes stay out of every report.
      </Txt>
      {picker && (
        <Sheet title="Choose a month" eyebrow="MONTHLY REPORT" onClose={() => setPicker(false)}>
          <View className="mb-5 flex-row items-center justify-between">
            <IconButton
              icon="chevron-left"
              label="Previous year"
              disabled={pickerYear <= 2000}
              onPress={() => setPickerYear((value) => value - 1)}
            />
            <Txt weight="medium" className="text-xl">
              {pickerYear}
            </Txt>
            <IconButton
              icon="chevron-right"
              label="Next year"
              disabled={pickerYear >= Number(currentMonth.slice(0, 4))}
              onPress={() => setPickerYear((value) => value + 1)}
            />
          </View>
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {MONTHS.map((label, index) => {
              const value = `${pickerYear}-${String(index + 1).padStart(2, "0")}`,
                selected = value === month,
                disabled = value > currentMonth;
              return (
                <MotionPressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={`${label} ${pickerYear}`}
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => chooseMonth(value)}
                  className="min-h-14 items-center justify-center rounded-2xl px-1"
                  style={{
                    width: "31%",
                    backgroundColor: selected ? "#FFFFFF" : "#FFFFFF08",
                    opacity: disabled ? 0.3 : 1,
                  }}
                >
                  <Txt
                    className="text-xs"
                    weight="medium"
                    style={{ color: selected ? "#000000" : "#FFFFFF" }}
                  >
                    {label.slice(0, 3)}
                  </Txt>
                </MotionPressable>
              );
            })}
          </View>
        </Sheet>
      )}
      {sharing && report && (
        <ReportShareSheet
          key={`${report.month}:${report.generatedAt}`}
          report={report}
          unit={unit}
          onClose={() => setSharing(false)}
        />
      )}
    </>
  );
}

function Stat({
  label,
  value,
  unit,
  large = false,
}: {
  label: string;
  value: number | null;
  unit?: string;
  large?: boolean;
}) {
  return (
    <View className="min-w-0 flex-1">
      <Txt className="text-[11px] text-muted">{label}</Txt>
      <View className="mt-2 flex-row flex-wrap items-baseline gap-x-1">
        <Txt
          accessibilityLabel={`${reportNumber(value)}${unit ? ` ${unit}` : ""}`}
          weight="medium"
          className={large ? "text-4xl tracking-[-1.2px]" : "text-2xl tracking-[-0.6px]"}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
          numberOfLines={1}
          style={{ lineHeight: large ? 48 : 34, flexShrink: 1 }}
        >
          {reportNumber(value)}
        </Txt>
        {!!unit && <Txt className="text-xs text-muted">{unit}</Txt>}
      </View>
    </View>
  );
}

export function ReportPreview({
  report,
  unit,
  today,
}: {
  report: ReportView;
  unit: "kg" | "lb";
  today: string;
}) {
  const { summary } = report;
  const [showExercises, setShowExercises] = useState(false),
    [showSessions, setShowSessions] = useState(false);
  const rows = measurementRows(report);
  return (
    <>
      <GlassCard className="p-5">
        <View className="mb-5 flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Txt className="text-[9px] tracking-[2px] text-muted">FITSYNC / MONTH IN REVIEW</Txt>
            <Txt weight="medium" className="mt-2 text-xl tracking-[-0.6px]">
              {reportMonthLabel(report.month)}
            </Txt>
          </View>
          <View className="h-12 w-12 items-center justify-center rounded-full bg-white">
            <MaterialCommunityIcons name="chart-timeline-variant" color="#000000" size={25} />
          </View>
        </View>
        <View className="flex-row gap-4">
          <Stat label="Completed workouts" value={summary.workouts} large />
          <Stat label="Training days" value={summary.trainingDays} large />
        </View>
        <View className="my-5 h-px bg-white/10" />
        <View className="flex-row gap-4">
          <Stat label="Time put in" value={summary.minutes} unit="min" />
          <Stat label="Working sets" value={summary.workingSets} />
        </View>
        <View className="mt-5 flex-row gap-4">
          <Stat
            label="External-load volume"
            value={reportWeight(summary.volumeKg, unit)}
            unit={unit}
          />
          <Stat label="Repetitions" value={summary.reps} />
        </View>
        <View className="mt-5 flex-row items-center gap-3 rounded-2xl bg-white/5 p-4">
          <MaterialCommunityIcons name="speedometer" color="#FFFFFF" size={23} />
          <View className="min-w-0 flex-1">
            <Txt weight="medium" className="text-sm">
              {summary.averageRpe === null
                ? "Effort not recorded"
                : `${reportNumber(summary.averageRpe)} / 10 average effort`}
            </Txt>
            <Txt className="mt-1 text-[11px] leading-5 text-muted">
              {summary.averageRpe === null
                ? "Log RPE on your sets to see it here."
                : `From ${reportNumber(summary.effortRecordedSets)} sets with RPE.`}
            </Txt>
          </View>
        </View>
      </GlassCard>
      <ProSection eyebrow="01 / YOUR CONSISTENCY" title="Find your rhythm." />
      <TrainingRhythm report={report} today={today} />
      <ProSection
        eyebrow="02 / EXERCISE PERFORMANCE"
        title="The sets behind the story."
        description="Highest loads and reps are separate observations from this month, rather than a single set or all-time records."
      />
      <GlassCard>
        {report.exercises.length ? (
          <>
            <View className="flex-row items-center justify-between px-5 pb-3 pt-5">
              <Txt className="text-xs text-muted">{report.exercises.length} exercises</Txt>
              <View className="flex-row items-center gap-1">
                <Txt className="text-[11px] text-muted">Swipe to explore</Txt>
                <MaterialCommunityIcons name="arrow-left-right" color={PRO.muted} size={15} />
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
              <View style={{ minWidth: 575 }}>
                <View className="flex-row bg-white/5 px-5 py-3">
                  <Txt className="text-[11px] text-muted" style={{ width: 185 }}>
                    Exercise
                  </Txt>
                  <TableCell width={65} header>
                    Sessions
                  </TableCell>
                  <TableCell width={55} header>
                    Sets
                  </TableCell>
                  <TableCell width={120} header>
                    Highest load
                  </TableCell>
                  <TableCell width={110} header>
                    Highest reps
                  </TableCell>
                </View>
                {(showExercises ? report.exercises : report.exercises.slice(0, 6)).map(
                  (exercise, index) => (
                    <View
                      key={`${exercise.exerciseId}:${exercise.trackingType}:${index}`}
                      className="flex-row items-center border-b border-white/5 px-5 py-4"
                    >
                      <View style={{ width: 185, paddingRight: 14 }}>
                        <Txt weight="medium" className="text-xs leading-5">
                          {exercise.name}
                        </Txt>
                        <Txt className="mt-1 text-[10px] leading-4 text-muted">
                          {exercise.trackingType.replace(/_/g, " ")}
                        </Txt>
                      </View>
                      <TableCell width={65}>{reportNumber(exercise.sessions)}</TableCell>
                      <TableCell width={55}>{reportNumber(exercise.workingSets)}</TableCell>
                      <TableCell width={120}>
                        {exercise.bestWeightKg === null
                          ? "—"
                          : `${reportNumber(reportWeight(exercise.bestWeightKg, unit))} ${unit}`}
                      </TableCell>
                      <TableCell width={110}>{reportNumber(exercise.bestReps)}</TableCell>
                    </View>
                  ),
                )}
              </View>
            </ScrollView>
            {report.exercises.length > 6 && (
              <ExpandButton
                expanded={showExercises}
                label={`all ${report.exercises.length} exercises`}
                onPress={() => setShowExercises((value) => !value)}
              />
            )}
          </>
        ) : (
          <ReportEmpty
            icon="dumbbell"
            title="No completed exercise sets"
            detail="Your exercise table appears when completed working sets are synced for this month."
          />
        )}
      </GlassCard>
      <ProSection
        eyebrow="03 / HEALTH & MEASUREMENTS"
        title="More than your workouts."
        description="The first and latest recorded value for each metric. Gaps stay empty; these values are not monthly averages."
      />
      <GlassCard>
        {rows.length ? (
          <>
            <View className="flex-row bg-white/5 px-5 py-3">
              <Txt className="flex-1 text-[11px] text-muted">Metric / logs</Txt>
              <Txt className="text-right text-[11px] text-muted" style={{ width: 75 }}>
                First
              </Txt>
              <Txt className="text-right text-[11px] text-muted" style={{ width: 85 }}>
                Latest
              </Txt>
            </View>
            {rows.map((row) => {
              const first = measurementValue(row.first, unit),
                latest = measurementValue(row.latest, unit);
              return (
                <View
                  key={`${row.metric}:${row.unit}`}
                  className="flex-row items-center border-b border-white/5 px-5 py-4"
                >
                  <View className="min-w-0 flex-1 pr-2">
                    <Txt weight="medium" className="text-xs leading-5">
                      {metricLabel(row.metric)}
                    </Txt>
                    <Txt className="mt-1 text-[10px] leading-4 text-muted">
                      {row.count} {row.count === 1 ? "log" : "logs"} · {latest.unit}
                    </Txt>
                  </View>
                  <View style={{ width: 75 }}>
                    <Txt className="text-right text-sm">{reportNumber(first.value)}</Txt>
                    <Txt className="mt-1 text-right text-[10px] text-muted">
                      {reportDayLabel(row.first.date)}
                    </Txt>
                  </View>
                  <View style={{ width: 85 }}>
                    <Txt weight="medium" className="text-right text-sm">
                      {reportNumber(latest.value)}
                    </Txt>
                    <Txt className="mt-1 text-right text-[10px] text-muted">
                      {reportDayLabel(row.latest.date)}
                    </Txt>
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          <ReportEmpty
            icon="heart-pulse"
            title="No health check-ins this month"
            detail="Body measurements, nutrition and recovery entries from Progress will appear here once synced."
          />
        )}
      </GlassCard>
      <ProSection eyebrow="04 / YOUR SESSION LOG" title="Every visit counts." />
      <GlassCard>
        {report.workouts.length ? (
          <>
            {(showSessions ? report.workouts : report.workouts.slice(0, 5)).map(
              (session, index) => (
                <View
                  key={session.id}
                  className="flex-row items-center gap-3 border-b border-white/5 px-5 py-4"
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-white/5">
                    <Txt className="text-xs text-muted">{String(index + 1).padStart(2, "0")}</Txt>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Txt weight="medium" className="text-sm leading-5">
                      {session.name}
                    </Txt>
                    <Txt className="mt-1 text-[11px] text-muted">
                      {reportDayLabel(session.date)}
                    </Txt>
                  </View>
                  <Txt className="text-xs text-muted">{reportNumber(session.minutes)} min</Txt>
                </View>
              ),
            )}
            {report.workouts.length > 5 && (
              <ExpandButton
                expanded={showSessions}
                label={`all ${report.workouts.length} sessions`}
                onPress={() => setShowSessions((value) => !value)}
              />
            )}
          </>
        ) : (
          <ReportEmpty
            icon="calendar-blank-outline"
            title="A quiet month on the log"
            detail="No completed workouts were recorded for this month. Your health entries are still included above."
          />
        )}
      </GlassCard>
      <Txt className="mt-4 text-[10px] leading-5 text-muted">
        {report.generatedAt
          ? `Snapshot generated ${new Date(report.generatedAt).toLocaleString()}. `
          : "Report snapshot. "}
        {report.timezone ? `Training dates use ${report.timezone}. ` : ""}Volume includes completed
        external-load working sets; warm-up sets are excluded.{" "}
        {summary.warmupSets === null
          ? "Warm-up set counts are unavailable."
          : `${reportNumber(summary.warmupSets)} warm-up sets were logged.`}
      </Txt>
    </>
  );
}

function TableCell({
  width,
  children,
  header = false,
}: {
  width: number;
  children: React.ReactNode;
  header?: boolean;
}) {
  return (
    <Txt
      className={`text-right ${header ? "text-[11px] text-muted" : "text-xs"}`}
      style={{ width, paddingRight: 8 }}
    >
      {children}
    </Txt>
  );
}
function ExpandButton({
  expanded,
  label,
  onPress,
}: {
  expanded: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={onPress}
      className="min-h-14 flex-row items-center justify-center gap-2 px-4"
    >
      <Txt className="text-xs">{expanded ? "Show less" : `Show ${label}`}</Txt>
      <MaterialCommunityIcons
        name={expanded ? "chevron-up" : "chevron-down"}
        size={18}
        color="#FFFFFF"
      />
    </MotionPressable>
  );
}
function ReportEmpty({ icon, title, detail }: { icon: ProIcon; title: string; detail: string }) {
  return (
    <View className="px-5 py-6">
      <MaterialCommunityIcons name={icon} size={28} color={PRO.muted} />
      <Txt weight="medium" className="mt-4 text-sm">
        {title}
      </Txt>
      <Txt className="mt-2 text-xs leading-5 text-muted">{detail}</Txt>
    </View>
  );
}

function TrainingRhythm({ report, today }: { report: ReportView; today: string }) {
  const [mode, setMode] = useState<"weeks" | "calendar">("weeks");
  const weeks = reportWeeks(report),
    maximum = Math.max(1, ...weeks.map((week) => week.workouts));
  const firstOffset = (new Date(`${report.month}-01T12:00:00Z`).getUTCDay() + 6) % 7;
  const activeDays = new Map<string, number>();
  for (const session of report.workouts)
    activeDays.set(session.date, (activeDays.get(session.date) ?? 0) + 1);
  const cells = Array.from(
    { length: Math.ceil((firstOffset + monthDays(report.month)) / 7) * 7 },
    (_, index) => index - firstOffset + 1,
  );
  return (
    <GlassCard className="p-5">
      <View className="mb-5 flex-row gap-2">
        <ProPill label="By week" selected={mode === "weeks"} onPress={() => setMode("weeks")} />
        <ProPill
          label="Calendar"
          selected={mode === "calendar"}
          onPress={() => setMode("calendar")}
        />
      </View>
      {mode === "weeks" ? (
        <>
          <View className="h-40 flex-row items-end gap-2">
            {weeks.map((week) => (
              <View key={week.start} className="h-full min-w-0 flex-1 items-center justify-end">
                <Txt className="mb-2 text-xs">{week.workouts}</Txt>
                <View
                  accessibilityLabel={`${week.start} to ${week.end}: ${week.workouts} completed workouts`}
                  className="w-full rounded-xl"
                  style={{
                    height: week.workouts ? Math.max(12, (week.workouts / maximum) * 112) : 3,
                    backgroundColor: week.workouts ? "#FFFFFF" : "#FFFFFF20",
                  }}
                />
                <Txt className="mt-3 text-[10px] text-muted">
                  {week.start}–{week.end}
                </Txt>
              </View>
            ))}
          </View>
          <Txt className="mt-5 text-[11px] leading-5 text-muted">
            Completed workouts by calendar week. Dates below each bar show the days of the month.
          </Txt>
        </>
      ) : (
        <>
          <View className="mb-2 flex-row">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
              <Txt
                key={index}
                className="text-center text-[10px] text-muted"
                style={{ width: "14.2857%" }}
              >
                {day}
              </Txt>
            ))}
          </View>
          <View className="flex-row flex-wrap">
            {cells.map((day, index) => {
              const valid = day > 0 && day <= monthDays(report.month),
                date = `${report.month}-${String(day).padStart(2, "0")}`,
                count = activeDays.get(date) ?? 0,
                future = date > today;
              return (
                <View key={index} style={{ width: "14.2857%", aspectRatio: 1, padding: 3 }}>
                  {valid && (
                    <View
                      accessible
                      accessibilityLabel={`${reportDayLabel(date)}: ${count} completed workouts${future ? ", future date" : ""}`}
                      className="flex-1 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: count ? "#FFFFFF" : "#FFFFFF08",
                        opacity: future ? 0.3 : 1,
                      }}
                    >
                      <Txt className="text-xs" style={{ color: count ? "#000000" : "#A3A3A3" }}>
                        {day}
                      </Txt>
                      {count > 1 && (
                        <View className="absolute bottom-1 h-1 w-1 rounded-full bg-black" />
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          <View className="mt-4 flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full bg-white" />
            <Txt className="text-[11px] text-muted">Training day</Txt>
            <View className="ml-3 h-1 w-1 rounded-full bg-white" />
            <Txt className="text-[11px] text-muted">Multiple sessions</Txt>
          </View>
        </>
      )}
    </GlassCard>
  );
}

function ReportShareSheet({
  report,
  unit,
  onClose,
}: {
  report: ReportView;
  unit: "kg" | "lb";
  onClose: () => void;
}) {
  const [kind, setKind] = useState<ReportShareKind>("summary");
  const [includeMeasurements, setIncludeMeasurements] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const active = useRef(true),
    locked = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const message = useMemo(
    () => monthlyReportShareText(report, { kind, unit, includeMeasurements }),
    [report, kind, unit, includeMeasurements],
  );
  async function share() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await Share.share(
        { title: `FitSync · ${reportMonthLabel(report.month)}`, message },
        {
          dialogTitle: "Share your FitSync report",
          subject: `FitSync monthly report · ${reportMonthLabel(report.month)}`,
        },
      );
    } catch (failure) {
      if (active.current)
        setError(
          failure instanceof Error ? failure.message : "Could not open sharing. Please try again.",
        );
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  }
  return (
    <Sheet
      title="Share your month"
      eyebrow="YOUR REPORT, YOUR CHOICE"
      subtitle="Preview exactly what will be shared."
      onClose={onClose}
      busy={busy}
      footer={<ProButton title="Open share options" loading={busy} onPress={() => void share()} />}
    >
      <View className="mb-4 flex-row gap-2">
        <ProPill
          label="Summary"
          selected={kind === "summary"}
          disabled={busy}
          onPress={() => setKind("summary")}
        />
        <ProPill
          label="Detailed report"
          selected={kind === "detailed"}
          disabled={busy}
          onPress={() => setKind("detailed")}
        />
      </View>
      <Txt className="mb-5 text-xs leading-5 text-muted">
        {kind === "summary"
          ? "A compact training recap to send to a friend or coach."
          : "Adds the weekly breakdown, every workout and your exercise performance table."}
      </Txt>
      <View className="mb-5 flex-row items-center gap-3 rounded-2xl bg-white/5 p-4">
        <View className="min-w-0 flex-1">
          <Txt weight="medium" className="text-sm">
            Include health & measurements
          </Txt>
          <Txt className="mt-1 text-[11px] leading-5 text-muted">
            Optional. Adds your body, nutrition and recovery values.
          </Txt>
        </View>
        <Switch
          accessibilityLabel="Include health and measurements in shared report"
          disabled={busy}
          value={includeMeasurements}
          onValueChange={setIncludeMeasurements}
          trackColor={{ false: "#333333", true: "#888888" }}
          thumbColor="#FFFFFF"
        />
      </View>
      <View className="rounded-[22px] bg-white/5 p-4">
        <Txt className="mb-4 text-[9px] tracking-[2px] text-muted">SHARE PREVIEW</Txt>
        <Txt selectable className="text-xs leading-6">
          {message}
        </Txt>
      </View>
      {!!error && (
        <Txt accessibilityRole="alert" className="mt-4 text-xs leading-5 text-red-300">
          {error}
        </Txt>
      )}
    </Sheet>
  );
}
