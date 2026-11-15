import test from "node:test";
import assert from "node:assert/strict";
import { buildProgress } from "../src/features/progress/analytics.ts";
import { progressSources } from "../src/features/progress/access.ts";
import { cumulativeActivity, sessionProfile } from "../src/features/progress/report.ts";
import { weightValue } from "../src/features/progress/model.ts";

const loggedSet = (overrides = {}) => ({
  id: "set",
  set_type: "normal",
  weight_kg: 20,
  reps: 10,
  duration_seconds: null,
  distance_meters: null,
  rpe: null,
  rir: null,
  completed_at: "2026-11-15T10:00:00Z",
  ...overrides,
});
const workout = (id, date, seconds, sets = [loggedSet()], overrides = {}) => ({
  id,
  name: `Session ${id}`,
  status: "completed",
  started_at: `${date}T09:00:00Z`,
  finished_at: `${date}T10:00:00Z`,
  elapsed_seconds: seconds,
  workout_session_exercises: [
    {
      id: `row-${id}`,
      exercise_id: "bench",
      exercise_name: "Bench press",
      tracking_type: "reps_weight",
      position: 0,
      workout_logged_sets: sets,
    },
  ],
  ...overrides,
});
const progress = (workouts, days = 7) => buildProgress(workouts, [], days, "2026-11-15", 3);

test("cumulative totals include rest days and sum raw seconds before rounding", () => {
  const data = progress([
    workout("a", "2026-11-09", 24),
    workout("b", "2026-11-11", 24),
    workout("c", "2026-11-11", 24),
    workout("d", "2026-11-15", 24),
    workout("previous", "2026-11-08", 3600),
    workout("future", "2026-11-16", 3600),
  ]);
  assert.deepEqual(
    cumulativeActivity(data, "workouts", "kg").map((point) => point.value),
    [1, 1, 3, 3, 3, 3, 4],
  );
  const minutes = cumulativeActivity(data, "minutes", "kg");
  assert.equal(minutes[0].date, "2026-11-09");
  assert.deepEqual(
    minutes.map((point) => point.value),
    [0, 0, 1, 1, 1, 1, 2],
  );
  assert.equal(minutes.at(-1).value, data.current.minutes);
});

test("cumulative volume uses only completed external-load working sets and converts units", () => {
  const data = progress([
    workout("a", "2026-11-10", 600, [
      loggedSet(),
      loggedSet({ set_type: "warmup", weight_kg: 1000 }),
      loggedSet({ completed_at: null, weight_kg: 1000 }),
    ]),
    workout("b", "2026-11-15", 600, [loggedSet({ weight_kg: 30 })]),
  ]);
  assert.equal(cumulativeActivity(data, "volume", "kg").at(-1).value, 500);
  assert.equal(cumulativeActivity(data, "volume", "kg").at(-1).value, data.current.volume);
  assert.equal(cumulativeActivity(data, "volume", "lb").at(-1).value, weightValue(500, "lb"));
});

test("session points use exact recorded minutes, working sets, and chronological order", () => {
  const a = workout("a", "2026-11-09", 90, [
    loggedSet(),
    loggedSet({ set_type: "warmup" }),
    loggedSet({ completed_at: null }),
  ]);
  const b = workout("b", "2026-11-15", 450, [loggedSet(), loggedSet()]);
  const result = sessionProfile(progress([b, a]));
  assert.deepEqual(
    result.points.map(({ id, minutes, sets }) => ({ id, minutes, sets })),
    [
      { id: "a", minutes: 1.5, sets: 1 },
      { id: "b", minutes: 7.5, sets: 2 },
    ],
  );
  assert.equal(result.points[0].name, "Session a");
  assert.equal(result.totalSessions, 2);
  assert.equal(result.missingDurationCount, 0);
  assert.deepEqual(result.duration, { min: 1.5, q1: 3, median: 4.5, q3: 6, max: 7.5, count: 2 });
});

test("unknown and invalid durations do not turn into zero-minute observations", () => {
  const result = sessionProfile(
    progress([
      workout("null", "2026-11-10", null),
      workout("zero", "2026-11-11", 0),
      workout("negative", "2026-11-12", -600),
      workout("infinite", "2026-11-13", Infinity),
      workout("valid", "2026-11-14", 1200),
    ]),
  );
  assert.equal(result.totalSessions, 5);
  assert.equal(result.missingDurationCount, 4);
  assert.deepEqual(
    result.points.map((point) => point.id),
    ["valid"],
  );
  assert.deepEqual(result.duration, { min: 20, q1: 20, median: 20, q3: 20, max: 20, count: 1 });
});

test("distribution preserves outliers as min/max and interpolates quartiles", () => {
  const result = sessionProfile(
    progress(
      [10, 20, 30, 100].map((minutes, index) =>
        workout(String(index), `2026-11-${10 + index}`, minutes * 60),
      ),
    ),
  );
  assert.deepEqual(result.duration, {
    min: 10,
    q1: 17.5,
    median: 25,
    q3: 47.5,
    max: 100,
    count: 4,
  });
});

test("empty history has no fabricated duration distribution or session points", () => {
  const result = sessionProfile(progress([]));
  assert.deepEqual(result, {
    points: [],
    duration: null,
    totalSessions: 0,
    missingDurationCount: 0,
  });
  assert.ok(cumulativeActivity(progress([]), "workouts", "kg").every((point) => point.value === 0));
  const missing = sessionProfile(progress([workout("a", "2026-11-10", null)]));
  assert.equal(missing.duration, null);
  assert.equal(missing.missingDurationCount, 1);
});

test("analytics stay within the selected period and the supplied free-history boundary", () => {
  const raw = [workout("old", "2026-06-01", 6000), workout("recent", "2026-11-10", 600)];
  const source = progressSources(raw, [], "2026-11-15", false);
  const data = progress(source.workouts, 90);
  assert.deepEqual(
    sessionProfile(data).points.map((point) => point.id),
    ["recent"],
  );
  assert.equal(cumulativeActivity(data, "minutes", "kg").at(-1).value, 10);
  assert.equal(raw.length, 2);
});
