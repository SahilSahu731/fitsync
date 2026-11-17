import test from "node:test";
import assert from "node:assert/strict";
import { buildProgress, setVolume } from "../src/features/progress/analytics.ts";
import {
  deepProgressInsight,
  exerciseTrend,
  metricInsight,
  trainingInsight,
} from "../src/features/progress/insights.ts";

const set = (extra = {}) => ({
  id: "set",
  set_type: "normal",
  weight_kg: 50,
  reps: 8,
  duration_seconds: null,
  distance_meters: null,
  rpe: 8,
  rir: null,
  completed_at: "2026-11-17T09:00:00Z",
  ...extra,
});
const workout = (id, date, sets = [set()], extra = {}) => ({
  id,
  name: "Training",
  status: "completed",
  started_at: `${date}T09:00:00`,
  finished_at: `${date}T10:00:00`,
  elapsed_seconds: 1200,
  workout_session_exercises: [
    {
      id: "row",
      exercise_id: "bench",
      exercise_name: "Bench",
      tracking_type: "reps_weight",
      position: 0,
      workout_logged_sets: sets,
    },
  ],
  ...extra,
});
const metric = (id, name, date, value, observedAt = "2026-11-17T12:00:00Z") => ({
  id,
  metric: name,
  kind: "metric",
  date,
  value,
  observedAt,
  notes: "",
  source: "manual",
});

test("analytics use distinct completed sessions and only applicable completed working sets", () => {
  const good = workout("good", "2026-11-17", [
    set(),
    set({ set_type: "warmup", weight_kg: 500 }),
    set({ completed_at: null, weight_kg: 500 }),
  ]);
  const result = deepProgressInsight(
    buildProgress(
      [
        good,
        good,
        workout("active", "2026-11-17", [set()], { status: "active" }),
        workout("future", "2026-11-18"),
        workout("invalid", "2026-11-17", [set()], { finished_at: "invalid" }),
      ],
      [],
      30,
      "2026-11-17",
      3,
    ),
  );
  assert.equal(result.selected.length, 1);
  assert.equal(result.workingSets, 1);
  assert.equal(result.weightedReps, 8);
  assert.equal(result.weightedVolume, 400);
  assert.equal(result.averageLoad, 50);
  assert.equal(result.volumePerMinute, 20);
  assert.equal(result.ratedSets, 1);
  assert.equal(setVolume(set({ weight_kg: -5 }), "reps_weight"), 0);
});
test("weekly workload compares complete calendar weeks and labels partial edges", () => {
  const result = deepProgressInsight(
    buildProgress(
      [
        workout("old", "2026-11-04", [set({ weight_kg: 50, reps: 10 })]),
        workout("last", "2026-11-11", [set({ weight_kg: 100, reps: 10 })]),
        workout("partial", "2026-11-17", [set({ weight_kg: 500, reps: 10 })]),
      ],
      [],
      17,
      "2026-11-17",
      3,
    ),
  );
  assert.equal(result.weeks[0].complete, false);
  assert.equal(result.weeks.at(-1).complete, false);
  assert.equal(result.weeklyChange, 100);
  assert.equal(result.completeWeeks, 2);
});
test("the current calendar week stays partial on Sunday and never changes the complete-week comparison", () => {
  const result = deepProgressInsight(
    buildProgress(
      [
        workout("earlier", "2026-11-04", [set({ weight_kg: 50, reps: 10 })]),
        workout("latest", "2026-11-11", [set({ weight_kg: 100, reps: 10 })]),
        workout("ongoing", "2026-11-22", [set({ weight_kg: 500, reps: 10 })]),
      ],
      [],
      21,
      "2026-11-22",
      3,
    ),
  );
  assert.equal(result.weeks.at(-1).date, "2026-11-16");
  assert.equal(result.weeks.at(-1).complete, false);
  assert.equal(result.weeklyChange, 100);
  assert.equal(result.completeWeeks, 2);
});
test("rep profiles separate weighted work, bodyweight work, and invalid reps", () => {
  const body = workout("body", "2026-11-17", [set({ reps: 15, weight_kg: 500 })]);
  body.workout_session_exercises[0].tracking_type = "reps";
  const timed = workout("timed", "2026-11-17", [set({ reps: 15, duration_seconds: 60 })]);
  timed.workout_session_exercises[0].tracking_type = "duration";
  const result = deepProgressInsight(
    buildProgress(
      [
        workout("load", "2026-11-17", [
          set({ reps: 5 }),
          set({ reps: 8 }),
          set({ reps: 0 }),
          set({ reps: 1.5 }),
          set({ reps: 13, rpe: null }),
        ]),
        body,
        timed,
      ],
      [],
      7,
      "2026-11-17",
      3,
    ),
  );
  assert.deepEqual(
    result.repRanges.map((row) => [row.weighted, row.other]),
    [
      [1, 0],
      [1, 0],
      [1, 1],
    ],
  );
  assert.equal(result.weightedReps, 26);
  assert.equal(result.weightedVolume, 1300);
});
test("missing duration, missing check-ins, and absent baselines never invent values", () => {
  const result = deepProgressInsight(
    buildProgress(
      [workout("missing", "2026-11-17", [set({ rpe: null })], { elapsed_seconds: null })],
      [],
      7,
      "2026-11-17",
      3,
    ),
  );
  assert.equal(result.averageDuration, null);
  assert.equal(result.averageRpe, null);
  assert.equal(result.volumePerMinute, null);
  assert.equal(result.averageGap, null);
  assert.equal(result.weeklyChange, null);
  assert.equal(metricInsight(buildProgress([], [], 30, "2026-11-17", 3), "weight").perWeek, null);
});
test("exercise trends omit unlogged measurements while retaining recorded zero load", () => {
  const run = (id, date, distance) => {
    const session = workout(id, date, [set({ distance_meters: distance, duration_seconds: 600 })]);
    session.workout_session_exercises[0].tracking_type = "distance_duration";
    return session;
  };
  const data = buildProgress(
    [
      run("logged", "2026-11-10", 1000),
      run("missing", "2026-11-17", null),
      workout("zero-load", "2026-11-17", [set({ weight_kg: 0 })]),
    ],
    [],
    30,
    "2026-11-17",
    3,
  );
  assert.deepEqual(
    exerciseTrend(data.selected, "bench:distance_duration").map((point) => point.value),
    [1000],
  );
  assert.deepEqual(
    exerciseTrend(data.selected, "bench:reps_weight").map((point) => point.value),
    [0],
  );
});
test("metric trends honor zero, corrections, tombstones, future dates, and logged-day denominators", () => {
  const data = buildProgress(
    [],
    [
      metric("zero", "water", "2026-11-10", 0),
      metric("water", "water", "2026-11-12", 2000),
      metric("edit", "water", "2026-11-12", 2500, "2026-11-17T13:00:00Z"),
      metric("deleted", "water", "2026-11-14", 1000),
      metric("delete", "water", "2026-11-14", null, "2026-11-17T14:00:00Z"),
      metric("future", "water", "2026-11-18", 8000),
      metric("weight1", "weight", "2026-11-10", 80),
      metric("weight2", "weight", "2026-11-17", 79),
    ],
    30,
    "2026-11-17",
    3,
  );
  const water = metricInsight(data, "water");
  assert.equal(water.count, 2);
  assert.equal(water.average, 1250);
  assert.equal(metricInsight(data, "weight").perWeek, -1);
});
test("performance comparisons keep exercise identity and tracking type separate", () => {
  const weighted = [
    workout("a", "2026-11-10", [set({ weight_kg: 50, reps: 6 })]),
    workout("b", "2026-11-17", [set({ weight_kg: 60, reps: 6 })]),
  ];
  const body = workout("body", "2026-11-17", [set({ weight_kg: 200, reps: 40 })]);
  body.workout_session_exercises[0].tracking_type = "reps";
  const result = deepProgressInsight(buildProgress([...weighted, body], [], 30, "2026-11-17", 3));
  assert.equal(result.performance.length, 1);
  assert.equal(result.performance[0].id, "bench:reps_weight");
  assert.equal(result.performance[0].samples, 2);
  assert.ok(Math.abs(result.performance[0].percent - 20) < 0.000001);
  assert.equal(result.performance[0].firstDate, "2026-11-10");
  assert.equal(result.performance[0].lastDate, "2026-11-17");
});
test("muscle labels are deduplicated and unknown sets stay unclassified", () => {
  const labelled = workout("labelled", "2026-11-17");
  labelled.workout_session_exercises[0].exercises = {
    exercise_muscles: [
      { role: "primary", exercise_muscle_groups: { code: "chest" } },
      { role: "primary", exercise_muscle_groups: { code: "chest" } },
      { role: "secondary", exercise_muscle_groups: { code: "triceps" } },
    ],
  };
  const result = deepProgressInsight(
    buildProgress([labelled, workout("unknown", "2026-11-17")], [], 7, "2026-11-17", 3),
  );
  assert.equal(result.mappedSets, 1);
  assert.equal(result.muscles.find((row) => row.name === "chest").primary, 1);
  assert.equal(result.muscles.find((row) => row.name === "triceps").secondary, 1);
  assert.equal(trainingInsight(buildProgress([], [], 7, "2026-11-17", 3)).averageSets, null);
  const warmups = workout("warmups", "2026-11-17", [set({ set_type: "warmup" })]);
  warmups.workout_session_exercises[0].exercises = labelled.workout_session_exercises[0].exercises;
  assert.deepEqual(
    deepProgressInsight(buildProgress([warmups], [], 7, "2026-11-17", 3)).muscles,
    [],
  );
});
