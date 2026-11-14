import test from "node:test";
import assert from "node:assert/strict";
import { buildProAnalytics } from "../src/features/pro/analytics.ts";
import {
  calculateWarmup,
  assemblePlates,
  parsePlates,
  estimateOneRepMax,
} from "../src/features/pro/training-model.ts";
const today = "2026-11-14";
const set = (change = {}) => ({
  id: "set",
  set_type: "normal",
  completed_at: "2026-11-14T10:00:00Z",
  weight_kg: 60,
  reps: 5,
  duration_seconds: null,
  distance_meters: null,
  rpe: 8,
  rir: 2,
  ...change,
});
function workout(
  id,
  date,
  exercises = [
    {
      exercise_id: "bench",
      exercise_name: "Bench press",
      tracking_type: "reps_weight",
      workout_logged_sets: [set()],
    },
  ],
  change = {},
) {
  return {
    id,
    name: id,
    status: "completed",
    started_at: `${date}T10:00:00Z`,
    finished_at: `${date}T11:00:00Z`,
    elapsed_seconds: 1200,
    workout_session_exercises: exercises.map((e, i) => ({ id: `${id}-${i}`, position: i, ...e })),
    ...change,
  };
}
const metadata = [
  {
    id: "bench",
    primaryMuscles: ["chest", "chest"],
    secondaryMuscles: ["chest", "triceps", "triceps"],
  },
];
const build = (workouts, period = 30, events = []) =>
  buildProAnalytics(workouts, metadata, events, period, today);
test("analytics counts actual completed working sets, deduplicates workouts and excludes future/active history", () => {
  const row = workout("today", today, [
    {
      exercise_id: "bench",
      exercise_name: "Bench",
      tracking_type: "reps_weight",
      workout_logged_sets: [
        set(),
        set({ set_type: "warmup", weight_kg: 100, reps: 100 }),
        set({ completed_at: null, weight_kg: 500 }),
      ],
    },
  ]);
  const data = build([
    row,
    row,
    workout("future", "2026-11-15"),
    workout("active", today, [], { status: "active", finished_at: null }),
  ]);
  assert.equal(data.totals.workouts, 1);
  assert.equal(data.totals.sets, 1);
  assert.equal(data.totals.warmups, 1);
  assert.equal(data.totals.volume, 300);
  assert.equal(data.muscles.find((m) => m.code === "chest").primary, 1);
  assert.equal(data.muscles.find((m) => m.code === "chest").secondary, 0);
  assert.equal(data.muscles.find((m) => m.code === "triceps").secondary, 1);
  assert.equal(data.mappedSets, 1);
  assert.equal(data.unknownSets, 0);
});
test("a pre-period best prevents invented PRs, while all-time baselines remain visible", () => {
  const old = workout("old", "2020-01-01", [
    {
      exercise_id: "bench",
      exercise_name: "Bench",
      tracking_type: "reps_weight",
      workout_logged_sets: [set({ weight_kg: 100 })],
    },
  ]);
  const data = build([workout("recent", today), old]);
  assert.equal(data.records.length, 0);
  assert.equal(data.exercises[0].best.load.load, 100);
  assert.equal(data.exercises[0].sessions.length, 2);
  assert.equal(data.totals.workouts, 1);
  assert.equal(data.allTime.workouts, 2);
  const improved = build([
    old,
    workout("new", today, [
      {
        exercise_id: "bench",
        exercise_name: "Bench",
        tracking_type: "reps_weight",
        workout_logged_sets: [set({ weight_kg: 105 })],
      },
    ]),
  ]);
  assert.ok(
    improved.records.some(
      (r) => r.mode === "load" && r.previous === 100 && r.value === 105 && r.sessionId === "new",
    ),
  );
});
test("bodyweight, timed and distance records retain their own units and never invent e1RM", () => {
  const data = build([
    workout("mixed", today, [
      {
        exercise_id: "pull",
        exercise_name: "Pull up",
        tracking_type: "reps",
        workout_logged_sets: [set({ weight_kg: 90, reps: 10 })],
      },
      {
        exercise_id: "plank",
        exercise_name: "Plank",
        tracking_type: "duration",
        workout_logged_sets: [set({ duration_seconds: 60, weight_kg: null, reps: null })],
      },
      {
        exercise_id: "run",
        exercise_name: "Run",
        tracking_type: "distance_duration",
        workout_logged_sets: [
          set({ duration_seconds: 120, distance_meters: 500, weight_kg: null, reps: null }),
        ],
      },
    ]),
  ]);
  assert.equal(data.totals.volume, 0);
  assert.equal(data.unknownSets, 3);
  assert.equal(data.exercises.find((e) => e.exerciseId === "pull").best.e1rm, undefined);
  assert.equal(data.exercises.find((e) => e.exerciseId === "plank").best.duration.duration, 60);
  assert.equal(data.exercises.find((e) => e.exerciseId === "run").best.distance.distance, 500);
  assert.ok(data.exercises.every((e) => e.sessions[0].e1rm === null));
});
test("long-range week/month charts preserve every workout and include empty intervals", () => {
  for (const [period, expected] of [
    [7, "day"],
    [365, "week"],
    ["all", "month"],
  ]) {
    const data = build(
      [workout("old", "2010-01-01"), workout("now", today), workout("same-day", today)],
      period,
    );
    assert.equal(data.bucket, expected);
    assert.equal(
      data.activity.reduce((n, p) => n + p.workouts, 0),
      data.totals.workouts,
    );
    assert.equal(
      data.activity.reduce((n, p) => n + p.volume, 0),
      data.totals.volume,
    );
    assert.ok(data.activity.some((p) => p.workouts === 0));
    assert.equal(data.exercises[0].sessions.length, 3);
  }
});
test("measurements resolve corrections, clears and future dates without filling missing days", () => {
  const event = (id, date, metric, value, observedAt) => ({
    id,
    date,
    metric,
    value,
    observedAt,
    kind: "metric",
    source: "manual",
    notes: "",
  });
  const events = [
    event("a", today, "weight", 80, "2026-11-14T10:00:00Z"),
    event("b", today, "weight", 81, "2026-11-14T11:00:00Z"),
    event("c", "2026-11-13", "waist", 90, "2026-11-14T11:00:00Z"),
    event("d", "2026-11-13", "waist", null, "2026-11-14T12:00:00Z"),
    event("e", "2026-11-15", "weight", 99, "2026-11-14T13:00:00Z"),
  ];
  const data = build([], "all", events);
  const weight = data.measurementStats.find((m) => m.metric === "weight"),
    waist = data.measurementStats.find((m) => m.metric === "waist");
  assert.equal(weight.count, 1);
  assert.equal(weight.average, 81);
  assert.equal(weight.latest.value, 81);
  assert.equal(waist.count, 0);
  assert.equal(data.measurementStats.length, 31);
  assert.ok(data.muscles.every((m) => Number.isFinite(m.weeklySets)));
});
test("warm-up assembly finds bounded non-greedy plate combinations", () => {
  const result = assemblePlates(12, 0, [
    { weight: 4, count: 1 },
    { weight: 3, count: 2 },
  ]);
  assert.equal(result.actual, 12);
  assert.deepEqual(result.perSide, [{ weight: 3, count: 2 }]);
  const limited = assemblePlates(24, 0, [
    { weight: 4, count: 1 },
    { weight: 3, count: 2 },
  ]);
  assert.equal(limited.actual, 20);
  assert.equal(limited.residual, 4);
});
test("warm-ups stay below work weight, respect inventory and collapse duplicate loads", () => {
  const stock = parsePlates("20x2, 10x1, 5x1, 2.5x1, 1.25x1");
  for (let target = 21; target <= 220; target += 7.5) {
    const result = calculateWarmup(target, 20, stock, 2.5);
    assert.equal(new Set(result.sets.map((s) => s.actual)).size, result.sets.length);
    for (const s of result.sets) {
      assert.ok(s.actual < target && s.actual <= s.desired + 1e-8);
      assert.equal(s.actual, 20 + s.perSide.reduce((n, p) => n + p.weight * p.count * 2, 0));
      assert.ok(s.perSide.every((p) => p.count <= stock.find((x) => x.weight === p.weight).count));
    }
  }
  assert.equal(calculateWarmup(10, 20, stock, 2.5).noBar, true);
});
test("invalid warm-up and 1RM inputs fail explicitly", () => {
  for (const target of [0, -5, NaN, Infinity, 2201])
    assert.throws(() => calculateWarmup(target, 20, [{ weight: 5, count: 1 }], 2.5));
  for (const input of ["20", "-5x1", "20x0", "20x13", "20x1,20x1", "NaNx1"])
    assert.throws(() => parsePlates(input));
  for (const reps of [0, 13, 1.5, Infinity]) assert.throws(() => estimateOneRepMax(60, reps));
  assert.deepEqual(estimateOneRepMax(60, 1), { epley: 60, brzycki: 60 });
  assert.equal(estimateOneRepMax(60, 10).epley, 80);
});
