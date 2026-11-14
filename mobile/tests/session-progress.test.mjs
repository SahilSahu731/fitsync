import test from "node:test";
import assert from "node:assert/strict";
import { nextWorkoutSet, workoutTime } from "../src/features/workouts/session-progress.ts";

const exercise = (id, position, completed) => ({
  id,
  position,
  workout_logged_sets: completed.map((done, index) => ({
    id: `${id}-${index}`,
    position: index,
    completed_at: done ? "2026-11-14T08:00:00Z" : null,
  })),
});

test("next set follows exercise and set order without changing the session", () => {
  const first = exercise("a", 0, [true, false, false]);
  first.workout_logged_sets.reverse();
  const rows = [exercise("b", 1, [false]), first];
  const before = JSON.stringify(rows);
  const next = nextWorkoutSet(rows);
  assert.equal(next.exercise.id, "a");
  assert.equal(next.set.id, "a-1");
  assert.equal(next.number, 2);
  assert.equal(JSON.stringify(rows), before);
});

test("next set continues the selected exercise, advances, then returns to skipped work", () => {
  const rows = [
    exercise("a", 0, [false]),
    exercise("b", 1, [true, false]),
    exercise("c", 2, [false]),
  ];
  assert.equal(nextWorkoutSet(rows, "b").set.id, "b-1");
  rows[1].workout_logged_sets[1].completed_at = "done";
  assert.equal(nextWorkoutSet(rows, "b").set.id, "c-0");
  rows[2].workout_logged_sets[0].completed_at = "done";
  assert.equal(nextWorkoutSet(rows, "b").set.id, "a-0");
  assert.equal(nextWorkoutSet(rows, "removed-exercise").set.id, "a-0");
});

test("empty exercises and fully logged sessions have no next set; undo returns it", () => {
  const done = exercise("a", 0, [true, true]);
  assert.equal(nextWorkoutSet([]), null);
  assert.equal(nextWorkoutSet([exercise("empty", 0, []), done]), null);
  done.workout_logged_sets[0].completed_at = null;
  assert.equal(nextWorkoutSet([done]).set.id, "a-0");
});

test("session and rest times stay readable across minutes and hours", () => {
  assert.equal(workoutTime(-10), "00:00");
  assert.equal(workoutTime(90), "01:30");
  assert.equal(workoutTime(3599), "59:59");
  assert.equal(workoutTime(3600), "1:00:00");
  assert.equal(workoutTime(7384), "2:03:04");
});
