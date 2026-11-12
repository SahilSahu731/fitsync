import test from "node:test";
import assert from "node:assert/strict";
import {
  workoutSummary,
  completedWorkout,
  trainingWeek,
} from "../src/features/workouts/summary.ts";

test("summary counts performed sets and exercises without counting unlogged targets as volume", () => {
  const session = {
    workout_session_exercises: [
      {
        tracking_type: "reps_weight",
        workout_logged_sets: [
          { weight_kg: 20, reps: 10, completed_at: "done" },
          { weight_kg: 100, reps: 10, completed_at: null },
        ],
      },
      { workout_logged_sets: [{ duration_seconds: 60, completed_at: "done" }] },
      { workout_logged_sets: [] },
    ],
  };
  assert.deepEqual(workoutSummary(session), {
    exercises: 3,
    completedExercises: 2,
    completedSets: 2,
    totalSets: 3,
    volume: 200,
  });
  assert.equal(workoutSummary(null).completedSets, 0);
});

test("an offline completion freezes the session time and preserves its recorded data", () => {
  const session = {
    id: "workout",
    status: "active",
    started_at: "2026-11-12T08:00:00Z",
    notes: "Great session",
    workout_session_exercises: [],
  };
  const result = completedWorkout(session, 1800);
  assert.equal(result.finished_at, "2026-11-12T08:30:00.000Z");
  assert.equal(result.elapsed_seconds, 1800);
  assert.equal(result.status, "completed");
  assert.equal(result.notes, session.notes);
  assert.equal(session.status, "active");
});

test("the local Monday-based training week counts active days once and excludes earlier/future workouts", () => {
  const now = new Date(2026, 10, 12, 18);
  const item = (day, hour, seconds) => ({
    started_at: new Date(2026, 10, day, hour).toISOString(),
    elapsed_seconds: seconds,
  });
  const history = [
    item(8, 10, 6000),
    item(9, 10, 1800),
    item(12, 10, 900),
    item(12, 12, 600),
    item(13, 10, 6000),
  ];
  assert.deepEqual(trainingWeek(history, now), { workouts: 3, minutes: 55, days: 2 });
});

test("strength volume matches Progress and excludes warm-ups, bodyweight load, and unfinished sets", () => {
  const logged = { set_type: "normal", weight_kg: 20, reps: 10, completed_at: "done" };
  const session = {
    workout_session_exercises: [
      {
        tracking_type: "reps_weight",
        workout_logged_sets: [
          logged,
          { ...logged, set_type: "warmup" },
          { ...logged, completed_at: null },
        ],
      },
      { tracking_type: "reps", workout_logged_sets: [logged] },
    ],
  };
  assert.equal(workoutSummary(session).volume, 200);
  assert.equal(workoutSummary(session).completedSets, 3);
});

test("weekly totals use completion day for a session crossing the Monday boundary", () => {
  const result = trainingWeek(
    [
      {
        started_at: new Date(2026, 10, 8, 23, 45).toISOString(),
        finished_at: new Date(2026, 10, 9, 0, 15).toISOString(),
        elapsed_seconds: 1800,
      },
    ],
    new Date(2026, 10, 9, 12),
  );
  assert.equal(result.workouts, 1);
  assert.equal(result.minutes, 30);
});
