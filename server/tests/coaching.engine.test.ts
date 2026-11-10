import test from "node:test";
import assert from "node:assert/strict";
import { compatible, generatePlan, adaptPrescription, estimatedMinutes, progressPrescription, weeklyReview, type Exercise, type Profile, type Prescription, type History, type MetricEvent } from "../src/modules/coaching/coaching.engine.js";
import { createPlanSchema, adaptSchema, progressionSchema, rescheduleSchema, startSchema } from "../src/modules/coaching/coaching.schema.js";

const profile: Profile = { goal: "muscle", experience: "beginner", trainingDays: 3, minutesPerWorkout: 45, equipment: "gym" };
const catalog: Exercise[] = ["squat", "push", "pull", "hinge", "lunge", "rotation", "carry"].flatMap((pattern, index) => [
  { id: `bar-${index}`, name: `Barbell ${pattern}`, tracking_type: "reps_weight", movement_pattern: pattern, difficulty: "beginner", equipment: ["barbell"], primary_muscles: ["back"], status: "published" },
  { id: `db-${index}`, name: `Dumbbell ${pattern}`, tracking_type: "reps_weight", movement_pattern: pattern, difficulty: "beginner", equipment: ["dumbbell"], primary_muscles: ["back"], status: "published" },
  { id: `body-${index}`, name: `Bodyweight ${pattern}`, tracking_type: "reps", movement_pattern: pattern, difficulty: "beginner", equipment: ["bodyweight"], primary_muscles: ["back"], status: "published" },
]);
catalog.push({ id: "walk", name: "Comfortable walking", tracking_type: "distance_duration", movement_pattern: "locomotion", difficulty: "beginner", equipment: ["none"], primary_muscles: [], status: "published" });
const prescription: Prescription = { minutes: 45, equipment: "gym", effort: "normal", explanation: [], exercises: [
  { exerciseId: "bar-0", name: "Squat", pattern: "squat", trackingType: "reps_weight", sets: 3, repsMin: 8, repsMax: 12, weightKg: 50, durationSeconds: null, restSeconds: 120, reason: "Baseline" },
  { exerciseId: "bar-1", name: "Press", pattern: "push", trackingType: "reps_weight", sets: 3, repsMin: 8, repsMax: 12, weightKg: 30, durationSeconds: null, restSeconds: 120, reason: "Baseline" },
] };
const now = new Date("2026-11-07T12:00:00Z");
const visit = (date: string, extra: Record<string, unknown> = {}): History => ({ id: date, status: "completed", finished_at: `${date}T10:00:00Z`, elapsed_seconds: 1800, workout_session_exercises: [{ exercise_id: "bar-0", exercise_name: "Squat", tracking_type: "reps_weight", workout_logged_sets: Array.from({ length: 3 }, () => ({ set_type: "normal", weight_kg: 50, reps: 12, rpe: 7, rir: 3, completed_at: `${date}T09:59:00Z`, ...extra })) }] });

test("all profile goals and equipment produce executable published four-week plans without guessed loads", () => {
  for (const goal of ["muscle", "strength", "fat_loss", "fitness"] as const) for (const equipment of ["gym", "dumbbells", "bodyweight"] as const) {
    const plan = generatePlan({ ...profile, goal, equipment }, catalog, "2026-11-07");
    assert.equal(plan.sessions.length, 12);
    assert.equal(new Set(plan.sessions.map(s => s.date)).size, 12);
    assert.deepEqual(plan.sessions.slice(0, 3).map(s => s.date), ["2026-11-07", "2026-11-09", "2026-11-11"]);
    assert.ok(plan.sessions.every(s => s.prescription.exercises.every(e => e.weightKg === (e.trackingType === "reps" ? 0 : null) && catalog.some(c => c.id === e.exerciseId && compatible(c, equipment)))));
    assert.ok(plan.sessions.every(s => estimatedMinutes(s.prescription.exercises) <= plan.minutesPerWorkout));
    assert.ok(plan.sessions.filter(s => s.week === 4).every(s => s.prescription.effort === "easy"));
    assert.ok(plan.sessions[0].prescription.exercises.every((e, i) => e.sets >= plan.sessions[9].prescription.exercises[i].sets));
    assert.ok(plan.sessions[0].prescription.exercises.some((e, i) => e.sets > plan.sessions[9].prescription.exercises[i].sets));
    if (goal === "fat_loss" || goal === "fitness") assert.ok(plan.sessions[0].prescription.exercises.some(e => e.pattern === "locomotion"));
    if (goal === "strength" && equipment !== "bodyweight") assert.equal(plan.sessions[0].prescription.exercises[0].repsMax, 8);
  }
});
test("available days include recovery and sparse catalogs do not silently invent exercises", () => {
  const plan = generatePlan({ ...profile, trainingDays: 7 }, catalog, "2026-11-07");
  assert.equal(plan.trainingDays, 3); assert.match(plan.explanation.join(" "), /other days|walking|recovery/i);
  assert.throws(() => generatePlan(profile, catalog.filter(c => c.movement_pattern === "squat" && c.id.startsWith("bar")), "2026-11-07"), /not yet have enough/);
  const incomplete = generatePlan(profile, catalog.filter(c => !["pull", "rotation", "carry"].includes(c.movement_pattern)), "2026-11-07");
  assert.match(incomplete.sessions[0].prescription.explanation.join(" "), /pull.*omitted/);
});
test("four-day experienced plans alternate upper and lower rather than consecutive full-body sessions", () => {
  const plan = generatePlan({ ...profile, experience: "intermediate", trainingDays: 6 }, catalog, "2026-11-07");
  assert.equal(plan.trainingDays, 4); assert.equal(plan.sessions.length, 16);
  assert.match(plan.sessions[0].name, /Upper/); assert.match(plan.sessions[1].name, /Lower/);
  assert.ok(plan.sessions[0].prescription.exercises.slice(0, 2).every(e => ["push", "pull"].includes(e.pattern)));
  assert.ok(plan.sessions[1].prescription.exercises.slice(0, 2).every(e => ["squat", "hinge", "lunge"].includes(e.pattern)));
});
test("bodyweight/dumbbell setup does not assume a bench, bar, band, or arbitrary equipment", () => {
  assert.equal(compatible({ ...catalog[0], equipment: ["dumbbell", "bench"] }, "dumbbells"), false);
  assert.equal(compatible({ ...catalog[0], equipment: ["pull-up-bar"] }, "bodyweight"), false);
  assert.equal(compatible({ ...catalog[0], equipment: ["other"] }, "gym"), false);
  assert.equal(compatible({ ...catalog[0], equipment: [], status: "draft" }, "bodyweight"), false);
  assert.equal(compatible({ ...catalog[0], equipment: ["none", "yoga-mat"] }, "bodyweight"), true);
});
test("equipment adaptation preserves movement patterns and resets exercise-specific loads", () => {
  const adapted = adaptPrescription(prescription, profile, catalog, { equipment: "bodyweight", minutes: 15 });
  assert.equal(adapted.exercises.length, 2);
  assert.deepEqual(adapted.exercises.map(e => e.pattern), ["squat", "push"]);
  assert.ok(adapted.exercises.every(e => e.weightKg === 0 && e.trackingType === "reps"));
  assert.ok(estimatedMinutes(adapted.exercises) <= 15);
  assert.equal(prescription.exercises[0].weightKg, 50);
  assert.throws(() => adaptPrescription(prescription, profile, catalog.filter(c => c.id.startsWith("bar")), { equipment: "bodyweight" }), /enough suitable/);
});
test("easy requests reduce once and swaps never substitute an unrelated movement", () => {
  const easy = adaptPrescription(prescription, profile, catalog, { effort: "easy" });
  assert.equal(easy.exercises[0].weightKg, 45); assert.equal(easy.exercises[0].sets, 2);
  const repeat = adaptPrescription(easy, profile, catalog, { effort: "easy" });
  assert.equal(repeat.exercises[0].weightKg, 45); assert.equal(repeat.exercises[0].sets, 2);
  const swap = adaptPrescription(prescription, profile, catalog, { swapExerciseId: "bar-0" });
  assert.equal(swap.exercises[0].pattern, "squat"); assert.notEqual(swap.exercises[0].exerciseId, "bar-0");
  assert.throws(() => adaptPrescription(prescription, profile, catalog.filter(c => c.id === "bar-0" || c.movement_pattern === "pull"), { swapExerciseId: "bar-0" }), /No suitable published alternative/);
});
test("progression needs two separate recent completed comparable performances with manageable effort", () => {
  const increased = progressPrescription(prescription, [visit("2026-11-06"), visit("2026-11-03")], 2.5, now);
  assert.equal(increased.exercises[0].weightKg, 52.5); assert.match(increased.exercises[0].reason, /two recent comparable/i);
  assert.equal(increased.exercises[1].weightKg, 30); assert.match(increased.exercises[1].reason, /no recent/);
  for (const rows of [
    [visit("2026-11-06")],
    [visit("2026-11-06", { rpe: null, rir: null }), visit("2026-11-03")],
    [visit("2026-11-06", { rpe: 9 }), visit("2026-11-03")],
    [visit("2026-11-06", { reps: 10 }), visit("2026-11-03")],
    [visit("2026-11-06", { completed_at: null }), visit("2026-11-03")],
    [{ ...visit("2026-11-06"), status: "active" }, visit("2026-11-03")],
    [visit("2026-11-06"), visit("2026-09-01")],
  ]) assert.equal(progressPrescription(prescription, rows, 2.5, now).exercises[0].weightKg, 50);
  assert.equal(prescription.exercises[0].weightKg, 50);
});
test("progression ignores warmups and mixed loads, refuses excessive available increments, and preserves easier weeks", () => {
  const first = visit("2026-11-06"); first.workout_session_exercises[0].workout_logged_sets.push({ set_type: "warmup", weight_kg: 20, reps: 5, rpe: null, rir: null, completed_at: "2026-11-06T09:50:00Z" });
  assert.equal(progressPrescription(prescription, [first, visit("2026-11-03")], 2.5, now).exercises[0].weightKg, 52.5);
  assert.equal(progressPrescription(prescription, [first, visit("2026-11-03")], 5, now).exercises[0].weightKg, 50);
  first.workout_session_exercises[0].workout_logged_sets[1].weight_kg = 45;
  assert.match(progressPrescription(prescription, [first, visit("2026-11-03")], 2.5, now).exercises[0].reason, /Mixed loads/);
  assert.equal(progressPrescription({ ...prescription, effort: "easy" }, [visit("2026-11-06"), visit("2026-11-03")], 2.5, now).exercises[0].weightKg, 50);
});
test("weekly review compares real comparable exercise reps and offers actionable attendance guidance", () => {
  const result = weeklyReview([visit("2026-11-06"), visit("2026-10-29", { reps: 10 })], profile, [], now, "Asia/Kolkata");
  assert.equal(result.metrics.workouts, 1); assert.equal(result.metrics.completedSets, 3);
  assert.deepEqual(result.period, { start: "2026-11-01", end: "2026-11-07" });
  assert.match(result.observations.join(" "), /Squat: 30 → 36/);
  assert.match(result.actions.join(" "), /schedule 2 sessions/);
  assert.match(result.dataNotes.join(" "), /No synced health/);
});
test("health corrections and tombstones are resolved before sleep averages; missing days are not zero", () => {
  const event = (id: string, day: string, value: number | null, observed: string): MetricEvent => ({ id, observed_at: observed, payload: { kind: "metric", metric: "sleep", date: day, value } });
  const result = weeklyReview([], { ...profile, goal: "fat_loss" }, [
    event("a", "2026-11-02", 1, "2026-11-02T00:00:00Z"), event("b", "2026-11-02", 6, "2026-11-03T00:00:00Z"),
    event("c", "2026-11-03", 6, "2026-11-03T00:00:00Z"), event("d", "2026-11-04", 6, "2026-11-04T00:00:00Z"),
    event("e", "2026-11-05", 1, "2026-11-05T00:00:00Z"), event("f", "2026-11-05", null, "2026-11-06T00:00:00Z"),
  ], now);
  assert.match(result.observations.join(" "), /6.0 hours across 3 recorded days/);
  assert.match(result.actions.join(" "), /consistent sleep opportunity/);
  assert.match(result.observations.join(" "), /too few weight/);
});
test("request validation rejects forged entitlement, bad timezones, malformed dates and unreasonable overrides", () => {
  const requestId = "00000000-0000-4000-8000-000000000001";
  assert.ok(createPlanSchema.safeParse({ requestId, startDate: "2026-11-07", timezone: "Asia/Kolkata" }).success);
  assert.equal(createPlanSchema.safeParse({ requestId, startDate: "2026-02-30", timezone: "Asia/Kolkata" }).success, false);
  assert.equal(createPlanSchema.safeParse({ requestId, startDate: "2026-11-07", timezone: "Invalid/Zone" }).success, false);
  assert.equal(startSchema.safeParse({ requestId, userId: requestId }).success, false);
  assert.equal(adaptSchema.safeParse({ requestId, expectedRevision: 0, minutes: 1 }).success, false);
  assert.equal(adaptSchema.safeParse({ requestId, expectedRevision: 0, pro: true, minutes: 30 }).success, false);
  assert.equal(progressionSchema.safeParse({ requestId, expectedRevision: 0, incrementKg: 100 }).success, false);
  assert.equal(rescheduleSchema.safeParse({ requestId, expectedRevision: -1, date: "2026-11-07" }).success, false);
});
