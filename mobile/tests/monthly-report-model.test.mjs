import test from "node:test";
import assert from "node:assert/strict";
import {
  measurementRows,
  measurementValue,
  monthDays,
  monthlyReportShareText,
  normalizeMonthlyReport,
  reportNumber,
  reportWeeks,
  reportWeight,
  shiftReportMonth,
} from "../src/features/companion/monthly-report-model.ts";

const raw = (changes = {}) => ({
  month: "2026-11",
  timezone: "Asia/Kolkata",
  generatedAt: "2026-11-18T12:00:00Z",
  text: "Legacy text must not bypass privacy choices: body weight 80 kg",
  summary: {
    workouts: 3,
    trainingDays: 2,
    minutes: 120,
    workingSets: 20,
    warmupSets: 4,
    volumeKg: 1200,
    reps: 160,
    averageRpe: 7.5,
    effortRecordedSets: 6,
  },
  workouts: [
    { id: "a", date: "2026-11-01", name: "Upper day", minutes: 45 },
    { id: "b", date: "2026-11-02", name: "Lower day", minutes: 40 },
    { id: "c", date: "2026-11-02", name: "Evening", minutes: 35 },
  ],
  exercises: [
    {
      exerciseId: "bench",
      name: "Bench press",
      trackingType: "reps_weight",
      sessions: 2,
      workingSets: 6,
      bestWeightKg: 60,
      bestReps: 10,
    },
  ],
  measurements: [
    { metric: "weight", date: "2026-11-02", value: 80, unit: "kg" },
    { metric: "weight", date: "2026-11-15", value: 79.5, unit: "kg" },
    { metric: "protein", date: "2026-11-15", value: 0, unit: "g" },
  ],
  ...changes,
});

test("normalization preserves real zeroes and rejects missing or malformed observations", () => {
  const report = normalizeMonthlyReport(
    raw({
      summary: { workouts: 0, volumeKg: NaN, workingSets: -1, averageRpe: 15 },
      workouts: [
        { id: "a", date: "2026-11-02", name: "Upper", minutes: 0 },
        { id: "a", date: "2026-11-02", name: "Duplicate", minutes: 50 },
        { id: "b", date: "2026-10-31", name: "Other month", minutes: 50 },
        { id: "c", date: "2026-11-31", name: "Invalid date", minutes: 50 },
      ],
      measurements: [
        { metric: "protein", date: "2026-11-15", value: 0, unit: "g" },
        { metric: "weight", date: "2026-11-15", value: Infinity, unit: "kg" },
        { metric: "weight", date: "2026-12-01", value: 80, unit: "kg" },
      ],
    }),
    "2026-11",
  );
  assert.equal(report.summary.workouts, 0);
  assert.equal(report.summary.volumeKg, null);
  assert.equal(report.summary.minutes, null);
  assert.equal(report.summary.workingSets, null);
  assert.equal(report.summary.averageRpe, null);
  assert.equal(report.workouts.length, 1);
  assert.equal(report.workouts[0].minutes, 0);
  assert.equal(report.measurements.length, 1);
  assert.equal(report.measurements[0].value, 0);
  assert.equal(reportNumber(null), "—");
  assert.equal(reportNumber(0), "0");
});

test("legacy or partial reports remain displayable without invented analytics", () => {
  const report = normalizeMonthlyReport(
    raw({
      summary: null,
      workouts: undefined,
      exercises: undefined,
      measurements: null,
      generatedAt: "bad",
    }),
    "2026-11",
  );
  assert.equal(report.summary.workouts, null);
  assert.equal(report.summary.averageRpe, null);
  assert.equal(report.generatedAt, null);
  assert.deepEqual(report.exercises, []);
  assert.deepEqual(report.workouts, []);
  assert.deepEqual(report.measurements, []);
});

test("responses for another month cannot replace the selected report", () => {
  assert.throws(() => normalizeMonthlyReport(raw(), "2026-10"), /different month/);
});

test("Monday calendar week buckets clip boundaries and count each completed workout", () => {
  const weeks = reportWeeks(normalizeMonthlyReport(raw(), "2026-11"));
  assert.deepEqual(
    weeks.map(({ start, end }) => [start, end]),
    [
      [1, 1],
      [2, 8],
      [9, 15],
      [16, 22],
      [23, 29],
      [30, 30],
    ],
  );
  assert.equal(weeks[0].workouts, 1);
  assert.equal(weeks[1].workouts, 2);
  assert.equal(weeks[1].minutes, 75);
  assert.equal(
    weeks.reduce((sum, week) => sum + week.workouts, 0),
    3,
  );
});

test("month navigation crosses years and handles leap years", () => {
  assert.equal(shiftReportMonth("2026-01", -1), "2025-12");
  assert.equal(shiftReportMonth("2026-12", 1), "2027-01");
  assert.equal(monthDays("2024-02"), 29);
  assert.equal(monthDays("2026-02"), 28);
  assert.equal(monthDays("2026-13"), 0);
  assert.throws(() => shiftReportMonth("bad", 1), /valid/);
});

test("weekly durations do not infer zero when a session duration is missing", () => {
  const report = normalizeMonthlyReport(
    raw({
      workouts: [
        { id: "unknown", date: "2026-11-02", name: "Unknown duration", minutes: null },
        { id: "known", date: "2026-11-02", name: "Known duration", minutes: 30 },
      ],
    }),
    "2026-11",
  );
  assert.equal(reportWeeks(report)[1].minutes, null);
  const share = monthlyReportShareText(report, {
    kind: "detailed",
    unit: "kg",
    includeMeasurements: false,
  });
  assert.match(share, /2–8: 2 workouts · — min/);
});

test("health table uses chronological first/latest values and keeps different units separate", () => {
  const report = normalizeMonthlyReport(
    raw({
      measurements: [...raw().measurements]
        .reverse()
        .concat({ metric: "weight", date: "2026-11-16", value: 175, unit: "lb" }),
    }),
    "2026-11",
  );
  const rows = measurementRows(report),
    weight = rows.find((row) => row.metric === "weight" && row.unit === "kg");
  assert.equal(weight.first.value, 80);
  assert.equal(weight.latest.value, 79.5);
  assert.equal(weight.count, 2);
  assert.equal(rows.length, 3);
  assert.ok(Math.abs(measurementValue(weight.first, "lb").value - 176.3698) < 0.001);
  assert.equal(measurementValue(weight.first, "lb").unit, "lb");
  assert.equal(reportWeight(null, "lb"), null);
});

test("share summary excludes all health values by default and never reuses unfiltered server text", () => {
  const report = normalizeMonthlyReport(raw(), "2026-11");
  const text = monthlyReportShareText(report, {
    kind: "summary",
    unit: "kg",
    includeMeasurements: false,
  });
  assert.match(text, /3 workouts · 2 training days/);
  assert.match(text, /1,200 kg training volume/);
  assert.doesNotMatch(text, /body weight|protein|79\.5|80 kg|Legacy|Upper day|Bench press/i);
  assert.doesNotMatch(text, /personal record|previous month|% improvement/i);
});

test("detailed share includes sessions and performance plus explicitly opted-in measurements", () => {
  const report = normalizeMonthlyReport(raw(), "2026-11");
  const text = monthlyReportShareText(report, {
    kind: "detailed",
    unit: "lb",
    includeMeasurements: true,
  });
  assert.match(text, /WEEKLY RHYTHM/);
  assert.match(text, /Upper day \| 45 min/);
  assert.match(text, /Bench press \| 2 \| 6 \| 132\.3 lb \| 10/);
  assert.match(text, /HEALTH & MEASUREMENTS/);
  assert.match(text, /Body weight.*176\.4 lb.*175\.3 lb.*2 logs/);
  assert.match(text, /Protein.*0 g/);
  assert.match(text, /Asia\/Kolkata/);
});
