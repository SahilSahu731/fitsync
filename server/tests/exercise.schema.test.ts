
import assert from "node:assert/strict";
import test from "node:test";

import {
  exerciseInputSchema,
  exercisePatchSchema,
  exerciseListSchema,
  mediaMetadataSchema
} from "../src/modules/exercises/exercise.schema.js";

const validExercise = {
  slug: "incline-dumbbell-press",
  name: "Incline Dumbbell Press",
  description: "Incline pressing movement.",

  category: "strength",
  activityType: "weight-training",
  bodyRegion: "upper-body",

  difficulty: "beginner",
  trackingType: "reps_weight",
  movementPattern: "push",

  primaryMuscles: ["chest"],
  secondaryMuscles: ["triceps"],
  equipment: ["dumbbell", "bench"],

  instructions: [
    "Sit on an incline bench.",
    "Press the dumbbells upward under control."
  ],

  tips: [],
  mistakes: [],
  safetyNotes: [],
  breathingTip: "",

  status: "draft"
};

test("accepts a valid exercise", () => {
  const result = exerciseInputSchema.safeParse(validExercise);

  assert.equal(result.success, true);
});

test("rejects a missing exercise name", () => {
  const result = exerciseInputSchema.safeParse({
    ...validExercise,
    name: ""
  });

  assert.equal(result.success, false);
});

test("rejects an unsafe slug", () => {
  const result = exerciseInputSchema.safeParse({
    ...validExercise,
    slug: "Incline Dumbbell Press!"
  });

  assert.equal(result.success, false);
});

test("rejects overlapping primary and secondary muscles", () => {
  const result = exerciseInputSchema.safeParse({
    ...validExercise,
    secondaryMuscles: ["chest"]
  });

  assert.equal(result.success, false);
});

test("rejects duplicate equipment", () => {
  const result = exerciseInputSchema.safeParse({
    ...validExercise,
    equipment: ["dumbbell", "dumbbell"]
  });

  assert.equal(result.success, false);
});

test("supports partial exercise updates", () => {
  const result = exercisePatchSchema.safeParse({
    name: "Updated Exercise Name"
  });

  assert.equal(result.success, true);
});

test("limits pagination size", () => {
  const result = exerciseListSchema.safeParse({
    page: "1",
    pageSize: "1000"
  });

  assert.equal(result.success, false);
});

test("requires usage rights on media uploads", () => {
  const result = mediaMetadataSchema.safeParse({
    license: ""
  });

  assert.equal(result.success, false);
});
