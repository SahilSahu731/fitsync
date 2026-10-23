import test from "node:test";
import assert from "node:assert/strict";
import { optimisticSet, replaceSet } from "../../mobile/src/features/workouts/set-state.ts";
import { updateSetSchema } from "../src/modules/workouts/workout.schema.js";
import type { WorkoutSession, WorkoutSet } from "../../mobile/src/features/workouts/api.ts";
const base: WorkoutSet = { id: "a", position: 0, set_type: "normal", weight_kg: 10, reps: 8, duration_seconds: null, distance_meters: null, rpe: null, rir: null, completed_at: null, notes: "Keep stable" };
test("optimistic completion preserves notes and effort; undo clears completion", () => {
  const completed = optimisticSet(base, { completed: true, reps: 10, rpe: 8 });
  assert.ok(completed.completed_at);
  assert.equal(completed.notes, "Keep stable");
  assert.equal(completed.reps, 10);
  assert.equal(completed.rpe, 8);
  assert.equal(optimisticSet(completed, { completed: false }).completed_at, null);
  assert.equal(base.completed_at, null);
});
test("two independently saved rows merge without overwriting each other", () => {
  const other = { ...base, id: "b" };
  const initial = { id: "session", notes: "Workout notes", workout_session_exercises: [{ id: "exercise", workout_logged_sets: [base, other] }] } as WorkoutSession;
  const first = replaceSet(initial, "a", { ...base, reps: 12 });
  const second = replaceSet(first, "b", { ...other, weight_kg: 25 });
  assert.equal(second.workout_session_exercises[0].workout_logged_sets[0].reps, 12);
  assert.equal(second.workout_session_exercises[0].workout_logged_sets[1].weight_kg, 25);
  assert.equal(second.notes, "Workout notes");
  assert.equal(initial.workout_session_exercises[0].workout_logged_sets[0].reps, 8);
});
test("logging accepts timed/distance sets and validates effort and notes", () => {
  assert.equal(updateSetSchema.safeParse({ durationSeconds: 60, distanceMeters: 250, rpe: 7.5, rir: 2, notes: "Steady pace", completed: true }).success, true);
  for (const input of [{ rpe: 11 }, { rir: -1 }, { durationSeconds: -5 }, { reps: 2.5 }, { notes: "x".repeat(1001) }]) assert.equal(updateSetSchema.safeParse(input).success, false);
});
