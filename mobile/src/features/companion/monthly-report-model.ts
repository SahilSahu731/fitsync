import type { MonthlyReport } from "./api";
import { METRICS, type Metric } from "../progress/model";

export type ReportSummary = {
  workouts: number | null;
  trainingDays: number | null;
  minutes: number | null;
  workingSets: number | null;
  warmupSets: number | null;
  volumeKg: number | null;
  reps: number | null;
  averageRpe: number | null;
  effortRecordedSets: number | null;
};
export type ReportWorkout = { id: string; date: string; name: string; minutes: number | null };
export type ReportExercise = {
  exerciseId: string;
  name: string;
  trackingType: string;
  sessions: number | null;
  workingSets: number | null;
  bestWeightKg: number | null;
  bestReps: number | null;
};
export type ReportMeasurement = {
  metric: string;
  date: string;
  value: number;
  unit: string;
};
export type ReportView = {
  month: string;
  timezone: string | null;
  generatedAt: string | null;
  summary: ReportSummary;
  workouts: ReportWorkout[];
  exercises: ReportExercise[];
  measurements: ReportMeasurement[];
};
export type ReportWeek = { start: number; end: number; workouts: number; minutes: number | null };

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const nonnegative = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const count = (value: unknown) => {
  const valueNumber = nonnegative(value);
  return valueNumber !== null && Number.isInteger(valueNumber) ? valueNumber : null;
};
export function validReportMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && Number(value.slice(0, 4)) >= 2000;
}
export function monthDays(month: string) {
  if (!validReportMonth(month)) return 0;
  return new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
}
export function shiftReportMonth(month: string, offset: number) {
  if (!validReportMonth(month)) throw new Error("Choose a valid report month.");
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}
export function reportMonthLabel(month: string, short = false) {
  if (!validReportMonth(month)) return "Choose a month";
  return new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-US", {
    month: short ? "short" : "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
export function reportDayLabel(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
const validDay = (date: string, month: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  date.slice(0, 7) === month &&
  Number(date.slice(8)) >= 1 &&
  Number(date.slice(8)) <= monthDays(month);

/** Keep missing observations missing; the report never fills gaps with sample data. */
export function normalizeMonthlyReport(report: MonthlyReport, expectedMonth: string): ReportView {
  if (!validReportMonth(expectedMonth) || report.month !== expectedMonth)
    throw new Error("The report returned a different month. Please generate it again.");
  const raw = object(report.summary);
  const summary: ReportSummary = {
    workouts: count(raw.workouts),
    trainingDays: count(raw.trainingDays),
    minutes: nonnegative(raw.minutes),
    workingSets: count(raw.workingSets),
    warmupSets: count(raw.warmupSets),
    volumeKg: nonnegative(raw.volumeKg),
    reps: count(raw.reps),
    averageRpe:
      nonnegative(raw.averageRpe) !== null &&
      Number(raw.averageRpe) >= 1 &&
      Number(raw.averageRpe) <= 10
        ? Number(raw.averageRpe)
        : null,
    effortRecordedSets: count(raw.effortRecordedSets),
  };
  const seenWorkouts = new Set<string>();
  const workouts: ReportWorkout[] = [];
  for (const value of Array.isArray(report.workouts) ? report.workouts : []) {
    const item = object(value),
      id = text(item.id),
      date = text(item.date);
    if (!id || seenWorkouts.has(id) || !validDay(date, expectedMonth)) continue;
    seenWorkouts.add(id);
    workouts.push({
      id,
      date,
      name: text(item.name) || "Workout",
      minutes: nonnegative(item.minutes),
    });
  }
  workouts.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const exercises: ReportExercise[] = [];
  for (const value of Array.isArray(report.exercises) ? report.exercises : []) {
    const item = object(value),
      name = text(item.name),
      exerciseId = text(item.exerciseId);
    if (!name || !exerciseId) continue;
    exercises.push({
      exerciseId,
      name,
      trackingType: text(item.trackingType),
      sessions: count(item.sessions),
      workingSets: count(item.workingSets),
      bestWeightKg: nonnegative(item.bestWeightKg),
      bestReps: count(item.bestReps),
    });
  }
  exercises.sort(
    (a, b) => (b.workingSets ?? -1) - (a.workingSets ?? -1) || a.name.localeCompare(b.name),
  );
  const measurements: ReportMeasurement[] = [];
  for (const value of Array.isArray(report.measurements) ? report.measurements : []) {
    const item = object(value),
      metric = text(item.metric),
      date = text(item.date);
    const valueNumber = nonnegative(item.value);
    if (!metric || valueNumber === null || !validDay(date, expectedMonth)) continue;
    measurements.push({ metric, date, value: valueNumber, unit: text(item.unit) });
  }
  measurements.sort((a, b) => a.date.localeCompare(b.date) || a.metric.localeCompare(b.metric));
  return {
    month: expectedMonth,
    timezone: text(report.timezone) || null,
    generatedAt: Number.isFinite(Date.parse(report.generatedAt)) ? report.generatedAt : null,
    summary,
    workouts,
    exercises,
    measurements,
  };
}

/** Calendar weeks start Monday and are clipped to the selected month. */
export function reportWeeks(report: ReportView): ReportWeek[] {
  const days = monthDays(report.month);
  const offset = (new Date(`${report.month}-01T12:00:00Z`).getUTCDay() + 6) % 7;
  const weeks: ReportWeek[] = [];
  for (let day = 1; day <= days;) {
    const end = Math.min(days, day === 1 ? 7 - offset : day + 6);
    const sessions = report.workouts.filter((item) => {
      const value = Number(item.date.slice(8));
      return value >= day && value <= end;
    });
    weeks.push({
      start: day,
      end,
      workouts: sessions.length,
      minutes: sessions.some((item) => item.minutes === null)
        ? null
        : sessions.reduce((sum, item) => sum + item.minutes!, 0),
    });
    day = end + 1;
  }
  return weeks;
}
export function measurementRows(report: ReportView) {
  const groups = new Map<string, ReportMeasurement[]>();
  for (const item of report.measurements) {
    const key = `${item.metric}:${item.unit}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()]
    .map((items) => ({
      metric: items[0].metric,
      unit: items[0].unit,
      first: items[0],
      latest: items[items.length - 1],
      count: items.length,
    }))
    .sort((a, b) => metricLabel(a.metric).localeCompare(metricLabel(b.metric)));
}
export function metricLabel(metric: string) {
  return (
    METRICS[metric as Metric]?.label ??
    metric.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (letter) => letter.toUpperCase())
  );
}
export function reportNumber(value: number | null, digits = 1) {
  return value === null ? "—" : value.toLocaleString("en-US", { maximumFractionDigits: digits });
}
export const reportWeight = (kg: number | null, unit: "kg" | "lb") =>
  kg === null ? null : kg * (unit === "lb" ? 2.2046226218 : 1);
export function measurementValue(entry: ReportMeasurement, unit: "kg" | "lb") {
  return entry.metric === "weight" && entry.unit === "kg"
    ? { value: reportWeight(entry.value, unit)!, unit }
    : { value: entry.value, unit: entry.unit };
}
export type ReportShareKind = "summary" | "detailed";
export function monthlyReportShareText(
  report: ReportView,
  options: {
    kind: ReportShareKind;
    unit: "kg" | "lb";
    includeMeasurements: boolean;
  },
) {
  const { summary } = report;
  const number = reportNumber;
  const lines = [
    "FITSYNC / MONTHLY REPORT",
    reportMonthLabel(report.month),
    "────────────────────",
    `${number(summary.workouts)} workouts · ${number(summary.trainingDays)} training days`,
    `${number(summary.minutes)} minutes · ${number(summary.workingSets)} working sets`,
    `${number(reportWeight(summary.volumeKg, options.unit))} ${options.unit} training volume · ${number(summary.reps)} reps`,
    summary.averageRpe === null
      ? "Average effort: no RPE recorded"
      : `Average effort: ${number(summary.averageRpe)} / 10 (${number(summary.effortRecordedSets)} recorded sets)`,
  ];
  if (options.kind === "detailed") {
    lines.push("", "WEEKLY RHYTHM");
    for (const week of reportWeeks(report))
      lines.push(
        `${week.start}–${week.end}: ${week.workouts} workouts · ${number(week.minutes)} min`,
      );
    lines.push("", "WORKOUTS");
    if (!report.workouts.length) lines.push("No completed workouts recorded.");
    for (const workout of report.workouts)
      lines.push(
        `${reportDayLabel(workout.date)} | ${workout.name} | ${number(workout.minutes)} min`,
      );
    lines.push("", "EXERCISES", "Exercise | Sessions | Sets | Highest load | Highest reps");
    if (!report.exercises.length) lines.push("No completed exercise sets recorded.");
    for (const exercise of report.exercises)
      lines.push(
        `${exercise.name} | ${number(exercise.sessions)} | ${number(exercise.workingSets)} | ${exercise.bestWeightKg === null ? "—" : `${number(reportWeight(exercise.bestWeightKg, options.unit))} ${options.unit}`} | ${number(exercise.bestReps)}`,
      );
  }
  if (options.includeMeasurements) {
    lines.push("", "HEALTH & MEASUREMENTS");
    if (!report.measurements.length) lines.push("No measurements recorded.");
    for (const row of measurementRows(report)) {
      const first = measurementValue(row.first, options.unit),
        latest = measurementValue(row.latest, options.unit);
      lines.push(
        `${metricLabel(row.metric)} | ${reportDayLabel(row.first.date)}: ${number(first.value)} ${first.unit} → ${reportDayLabel(row.latest.date)}: ${number(latest.value)} ${latest.unit} | ${row.count} logs`,
      );
    }
  }
  lines.push(
    "",
    "Volume includes completed external-load working sets. Highest load and reps are separate monthly observations, not all-time records. Missing data is shown as —.",
  );
  if (report.timezone) lines.push(`Report timezone: ${report.timezone}`);
  if (report.generatedAt) lines.push(`Generated: ${report.generatedAt}`);
  return lines.join("\n");
}
