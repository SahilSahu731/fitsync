import assert from "node:assert/strict";
import test from "node:test";
import { categorySchema, routineSchema, programSchema, prescriptionSchema, daySchema } from "../src/modules/training-catalog/catalog.admin.schema.js";
const id = "a9e2a4fd-3b36-4065-b4a0-a1b96a97df46";
const base = { name: "Push Day", slug: "push-day", description: "Training", level: "beginner", goal: "muscle", equipment: "gym" };
test("new routines default to private drafts and reject invalid category IDs", () => {
  assert.equal(routineSchema.parse({ ...base, category_id: null, estimated_minutes: 45 }).published, false);
  assert.equal(routineSchema.safeParse({ ...base, category_id: "bad", estimated_minutes: 45 }).success, false);
});
test("prescriptions reject reversed rep ranges and invalid set counts", () => {
  const row = { exercise_id: id, position: 0, sets: 3, min_reps: 8, max_reps: 12, rest_seconds: 90 };
  assert.equal(prescriptionSchema.safeParse(row).success, true);
  assert.equal(prescriptionSchema.safeParse({ ...row, min_reps: 15 }).success, false);
  assert.equal(prescriptionSchema.safeParse({ ...row, sets: 0 }).success, false);
});
test("schedule accepts rest days and restricts day numbers", () => {
  assert.equal(daySchema.safeParse({ day_number: 7, routine_id: null, label: "Rest Day" }).success, true);
  assert.equal(daySchema.safeParse({ day_number: 8, routine_id: id, label: "Workout" }).success, false);
});
test("program duration, slugs and image URLs are validated", () => {
  assert.equal(programSchema.safeParse({ ...base, duration_weeks: 53, featured_rank: null }).success, false);
  assert.equal(categorySchema.safeParse({ name: "Gym", slug: "Gym!", position: 0 }).success, false);
  assert.equal(categorySchema.safeParse({ name: "Gym", slug: "gym", position: 0, image_url: "javascript:alert(1)" }).success, false);
});
