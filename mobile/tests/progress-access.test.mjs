import test from "node:test";
import assert from "node:assert/strict";
import {
  progressDays,
  progressSources,
  canCompareProgress,
} from "../src/features/progress/access.ts";
import { addDays } from "../src/features/progress/model.ts";
import { buildProgress } from "../src/features/progress/analytics.ts";
import { progressShareSummary } from "../src/features/progress/share-summary.ts";
const today = "2026-11-15";
const workout = (id, date) => ({
  id,
  name: id,
  status: "completed",
  started_at: `${date}T10:00:00`,
  finished_at: `${date}T11:00:00`,
  elapsed_seconds: 3600,
  workout_session_exercises: [
    {
      exercise_id: id,
      exercise_name: id,
      tracking_type: "reps_weight",
      workout_logged_sets: [
        { completed_at: `${date}T10:30:00`, set_type: "normal", weight_kg: 50, reps: 10 },
      ],
    },
  ],
});
const metric = (id, date, value) => ({
  id,
  kind: "metric",
  metric: "weight",
  date,
  value,
  observedAt: `${date}T12:00:00Z`,
  source: "manual",
  notes: "",
});
test("the free boundary includes exactly the last 90 local dates without changing stored logs", () => {
  const earliest = addDays(today, -89);
  const workouts = [
    workout("now", today),
    workout("boundary", earliest),
    workout("old", addDays(earliest, -1)),
  ];
  const events = [
    metric("new-weight", today, 75),
    metric("old-weight", addDays(earliest, -1), 80),
    { id: "goals", kind: "goals", observedAt: "2025-01-01T12:00:00Z", goals: {} },
  ];
  const free = progressSources(workouts, events, today, false);
  assert.equal(free.earliest, earliest);
  assert.deepEqual(
    free.workouts.map((w) => w.id),
    ["now", "boundary"],
  );
  assert.deepEqual(
    free.events.map((e) => e.id),
    ["new-weight", "goals"],
  );
  assert.equal(workouts.length, 3);
  assert.equal(events.length, 3);
  const data = buildProgress(free.workouts, free.events, progressDays(365, false), today, 3);
  assert.equal(data.activity.length, 90);
  assert.equal(data.allTime.workouts, 2);
  assert.equal(
    data.exercises.some((e) => e.name === "old"),
    false,
  );
  assert.match(progressShareSummary(data, "kg").message, /Workouts: 2 completed/);
});
test("Pro can use old history while unsupported saved ranges clamp immediately after downgrade", () => {
  const workouts = [workout("old", "2026-01-01")];
  const events = [metric("old", "2026-01-01", 80)];
  const pro = progressSources(workouts, events, today, true);
  assert.equal(pro.workouts, workouts);
  assert.equal(pro.events, events);
  assert.equal(pro.earliest, null);
  assert.equal(progressDays(365, true), 365);
  assert.equal(progressDays(365, false), 90);
  for (const days of [7, 30, 90]) assert.equal(progressDays(days, false), days);
});
test("comparisons are allowed only when both complete periods fall inside the available window", () => {
  const earliest = addDays(today, -89);
  assert.equal(canCompareProgress(addDays(today, -29), 30, earliest), true);
  assert.equal(canCompareProgress(earliest, 90, earliest), false);
  assert.equal(canCompareProgress(earliest, 90, null), true);
});
