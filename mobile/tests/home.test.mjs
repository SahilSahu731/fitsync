import test from "node:test";
import assert from "node:assert/strict";
import { homeSnapshot } from "../src/features/home/model.ts";

const workout = (id, date, extra = {}) => ({
  id,
  name: "Training",
  status: "completed",
  started_at: `${date}T09:00:00`,
  finished_at: `${date}T10:00:00`,
  elapsed_seconds: 1200,
  workout_session_exercises: [],
  ...extra,
});
const metric = (id, name, date, value, observedAt = "2026-11-17T12:00:00Z") => ({
  id,
  kind: "metric",
  metric: name,
  date,
  value,
  observedAt,
  source: "manual",
  notes: "",
});

test("Home counts the calendar week and excludes incomplete, invalid and future workouts", () => {
  const result = homeSnapshot(
    [
      workout("previous", "2026-11-15"),
      workout("monday", "2026-11-16"),
      workout("today", "2026-11-17"),
      workout("future", "2026-11-18"),
      workout("active", "2026-11-17", { status: "active" }),
      workout("unfinished", "2026-11-17", { finished_at: null }),
      workout("invalid", "2026-11-17", { finished_at: "invalid" }),
    ],
    [],
    "2026-11-17",
  );
  assert.equal(result.weeklyCount, 2);
  assert.equal(result.weeklyMinutes, 40);
  assert.equal(result.days[0].date, "2026-11-16");
  assert.equal(result.days[6].date, "2026-11-22");
  assert.deepEqual(
    result.days.map((day) => day.count),
    [1, 1, 0, 0, 0, 0, 0],
  );
  assert.deepEqual(
    result.recent.map((item) => item.id),
    ["today", "monday", "previous"],
  );
});

test("Home preserves explicit zero, corrections, deletion, and the date of the last weight", () => {
  const result = homeSnapshot(
    [],
    [
      metric("water", "water", "2026-11-17", 500),
      metric("water-edit", "water", "2026-11-17", 750, "2026-11-17T13:00:00Z"),
      metric("steps", "steps", "2026-11-17", 0),
      metric("sleep", "sleep", "2026-11-17", 8),
      metric("sleep-delete", "sleep", "2026-11-17", null, "2026-11-17T14:00:00Z"),
      metric("old-weight", "weight", "2026-11-12", 75),
      metric("new-weight", "weight", "2026-11-16", 74.5),
      metric("future-weight", "weight", "2026-11-18", 70),
    ],
    "2026-11-17",
  );
  assert.equal(result.daily.find((entry) => entry.metric === "steps").value, 0);
  assert.equal(result.daily.find((entry) => entry.metric === "water").value, 750);
  assert.equal(
    result.daily.some((entry) => entry.metric === "sleep"),
    false,
  );
  assert.equal(result.weight.value, 74.5);
  assert.equal(result.weight.date, "2026-11-16");
});

test("Sunday remains in the same week and Monday starts a fresh week", () => {
  const sessions = [workout("sunday", "2026-11-22")];
  assert.equal(homeSnapshot(sessions, [], "2026-11-22").weeklyCount, 1);
  assert.equal(homeSnapshot(sessions, [], "2026-11-23").weeklyCount, 0);
});

test("Missing or negative durations do not inflate training time", () => {
  const result = homeSnapshot(
    [
      workout("missing", "2026-11-17", { elapsed_seconds: null }),
      workout("negative", "2026-11-17", { elapsed_seconds: -120 }),
      workout("invalid", "2026-11-17", { elapsed_seconds: NaN }),
    ],
    [],
    "2026-11-17",
  );
  assert.equal(result.weeklyCount, 3);
  assert.equal(result.weeklyMinutes, 0);
});
