import test from "node:test";
import assert from "node:assert/strict";
import {
  buildExerciseProfiles,
  compareTrainingBlocks,
  compareTrainingRanges,
  estimateMuscleRecovery,
  insightSessions,
  previewSpecialisation,
  suggestWorkingSetTargets,
} from "../src/features/pro/companion-insights.ts";

const today = "2026-11-14";
const metadata = [
  {
    id: "bench",
    primaryMuscles: ["chest", "chest"],
    secondaryMuscles: ["chest", "triceps", "triceps"],
  },
];
const set = (id, date, changes = {}) => ({
  id,
  set_type: "normal",
  weight_kg: 60,
  reps: 8,
  duration_seconds: null,
  distance_meters: null,
  rpe: 8,
  rir: 2,
  completed_at: `${date}T10:10:00Z`,
  ...changes,
});
const workout = (id, date, changes = {}, exerciseChanges = {}, sets = [set(`${id}-s`, date)]) => ({
  id,
  name: id,
  status: "completed",
  started_at: `${date}T10:00:00Z`,
  finished_at: `${date}T11:00:00Z`,
  elapsed_seconds: 1200,
  workout_session_exercises: [
    {
      id: `${id}-e`,
      exercise_id: "bench",
      exercise_name: "Bench",
      tracking_type: "reps_weight",
      position: 0,
      workout_logged_sets: sets,
      ...exerciseChanges,
    },
  ],
  ...changes,
});
test("canonical insights deduplicate completed history and sets, ignore future/active workouts and warm-ups", () => {
  const row = workout("w", today, {}, {}, [
    set("s", today),
    set("s", today),
    set("warm", today, { set_type: "warmup", weight_kg: 1000 }),
    set("future", "2026-11-15"),
    set("uncomplete", today, { completed_at: null }),
  ]);
  const sessions = insightSessions(
    [row, row, workout("active", today, { status: "active" }), workout("future", "2026-11-15")],
    today,
    metadata,
  );
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].sets.length, 1);
  assert.equal(sessions[0].uncompletedSets, 1);
  assert.deepEqual(sessions[0].primaryMuscles, ["chest"]);
  assert.deepEqual(sessions[0].secondaryMuscles, ["triceps"]);
});
test("working-set targets use normal, same-type ordinal history with effort and actual units", () => {
  const workouts = [
    workout("first", "2026-11-07"),
    workout("last", "2026-11-13"),
    workout("different", today, {}, { tracking_type: "reps_assisted" }, [
      set("assisted", today, { weight_kg: 100, reps: 99 }),
    ]),
  ];
  const suggestion = suggestWorkingSetTargets(workouts, "bench", "reps_weight", today);
  assert.equal(suggestion.previousSessionId, "last");
  assert.equal(suggestion.targets[0].action, "increase_reps");
  assert.equal(suggestion.targets[0].suggested.reps, 9);
  assert.equal(suggestion.targets[0].suggested.weightKg, 60);
  assert.equal(suggestion.targets[0].previous.reps, 8);
  assert.equal(suggestion.confidence, "limited");
  assert.equal(suggestWorkingSetTargets(workouts, "other", "reps_weight", today).targets.length, 0);
});
test("suggestions repeat on missing effort, stale data, advanced sets and large increments", () => {
  const a = workout("a", "2026-11-01", {}, {}, [set("a-s", "2026-11-01", { reps: 12 })]);
  const b = workout("b", "2026-11-10", {}, {}, [set("b-s", "2026-11-10", { reps: 12 })]);
  assert.equal(
    suggestWorkingSetTargets([a, b], "bench", "reps_weight", today, 10).targets[0].action,
    "repeat",
  );
  const increasing = suggestWorkingSetTargets([a, b], "bench", "reps_weight", today);
  assert.equal(increasing.targets[0].action, "increase_load");
  assert.equal(increasing.targets[0].suggested.weightKg, 62.5);
  assert.equal(increasing.targets[0].suggested.reps, 10);
  const missingEffort = workout("b", "2026-11-10", {}, {}, [
    set("b-s", "2026-11-10", { rpe: null }),
  ]);
  assert.equal(
    suggestWorkingSetTargets([a, missingEffort], "bench", "reps_weight", today).targets[0].action,
    "repeat",
  );
  assert.equal(
    suggestWorkingSetTargets([workout("old", "2026-01-01")], "bench", "reps_weight", today)
      .targets[0].action,
    "repeat",
  );
  assert.equal(
    suggestWorkingSetTargets(
      [workout("drop", today, {}, {}, [set("drop", today, { set_type: "drop" })])],
      "bench",
      "reps_weight",
      today,
    ).targets.length,
    0,
  );
});
test("suggestions can offer a bounded optional reduction after repeated near-max effort and falling reps", () => {
  const a = workout("a", "2026-11-01", {}, {}, [set("a", "2026-11-01", { reps: 8, rpe: 10 })]);
  const b = workout("b", "2026-11-08", {}, {}, [set("b", "2026-11-08", { reps: 6, rpe: 10 })]);
  const s = suggestWorkingSetTargets([a, b], "bench", "reps_weight", today);
  assert.equal(s.targets[0].action, "reduce_load");
  assert.equal(s.targets[0].suggested.weightKg, 55);
});
test("plateau needs four distinct dates spanning 21 days and stable set counts", () => {
  const rows = ["2026-10-20", "2026-10-28", "2026-11-05", "2026-11-12"].map((date, i) =>
    workout(`w${i}`, date),
  );
  const p = buildExerciseProfiles(rows, today)[0];
  assert.equal(p.plateau, true);
  assert.equal(p.confidence, "moderate");
  assert.equal(p.evidence.length, 4);
  assert.match(p.recommendation, /do not establish/);
  assert.equal(buildExerciseProfiles(rows.slice(1), today)[0].plateau, false);
  const short = ["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"].map((date, i) =>
    workout(`short${i}`, date),
  );
  assert.equal(buildExerciseProfiles(short, today)[0].status, "insufficient");
  const changed = [
    ...rows.slice(0, -1),
    workout("different-count", "2026-11-12", {}, {}, [
      set("one", "2026-11-12"),
      set("two", "2026-11-12"),
    ]),
  ];
  assert.equal(buildExerciseProfiles(changed, today)[0].status, "insufficient");
});
test("exercise profiles expose uncompleted rows without inventing skipped intent or replacements", () => {
  const p = buildExerciseProfiles(
    [workout("missed", today, {}, {}, [set("s", today, { completed_at: null })])],
    today,
  )[0];
  assert.equal(p.sessions, 0);
  assert.equal(p.uncompletedAppearances, 1);
  assert.equal(p.replacementCount, null);
  assert.equal(p.confidence, "insufficient");
});

test("replacement profiles count canonical coaching swaps once without inventing workout removals", () => {
  const rows = [workout("logged", today)];
  const evidence = [
    { exerciseId: "bench", date: "2026-11-01", requestId: "first" },
    { exerciseId: "bench", date: "2026-11-01", requestId: "first" },
    { exerciseId: "bench", date: today, requestId: "second" },
    { exerciseId: "bench", date: "2026-11-15", requestId: "future" },
    { exerciseId: "bench", date: "2026-02-30", requestId: "invalid" },
    { exerciseId: "bench", date: today, requestId: "" },
    { exerciseId: "unlogged", date: today, requestId: "other" },
  ];
  const profiles = buildExerciseProfiles(rows, today, evidence);
  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].replacementCount, 2);
  assert.deepEqual(
    profiles[0].replacementEvents.map((event) => event.requestId),
    ["second", "first"],
  );
  assert.match(profiles[0].replacementNote, /Workout removals and reasons are not inferred/);
  assert.equal(buildExerciseProfiles(rows, today, [])[0].replacementCount, 0);
  assert.equal(buildExerciseProfiles(rows, today)[0].replacementCount, null);
});
test("block comparisons use exact date ranges, real RPE coverage and known planned dates", () => {
  const rows = [
    workout("old", "2026-10-01"),
    workout("recent", "2026-11-01", {}, {}, [set("s", "2026-11-01", { rpe: null })]),
  ];
  const result = compareTrainingBlocks(rows, [], 4, today, {
    plannedDates: ["2026-10-01", "2026-10-02", "2026-11-01", "2026-11-02", "2026-11-02"],
  });
  assert.equal(result.valid, true);
  assert.equal(result.baseline.workouts, 1);
  assert.equal(result.comparison.workouts, 1);
  assert.equal(result.baseline.days, 28);
  assert.equal(result.comparison.days, 28);
  assert.deepEqual(result.comparison.attendance, { completed: 1, planned: 2 });
  assert.equal(result.comparison.averageRpe, null);
  assert.equal(result.comparison.effortCoverage, 0);
  assert.equal(result.exercises[0].baselineSamples, 1);
  assert.match(result.notes.join(" "), /does not prove/);
  assert.equal(compareTrainingBlocks(rows, [], 8, today).comparison.attendance, null);
});

test("coaching replacement timestamps use the user's local date near midnight", (t) => {
  const previousZone = process.env.TZ;
  process.env.TZ = "Asia/Kolkata";
  t.after(() => {
    if (previousZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousZone;
  });
  const profiles = buildExerciseProfiles([workout("logged", today)], today, [
    { exerciseId: "bench", requestId: "near-midnight", date: "2026-11-13T23:30:00Z" },
    { exerciseId: "bench", requestId: "near-midnight", date: "2026-11-13T23:30:00.000+00:00" },
    { exerciseId: "bench", requestId: "next-local-day", date: "2026-11-14T23:30:00Z" },
    { exerciseId: "bench", requestId: "invalid-calendar", date: "2026-02-30T10:00:00Z" },
    { exerciseId: "bench", requestId: "invalid-time", date: "2026-11-14T99:00:00Z" },
  ]);
  assert.equal(profiles[0].replacementCount, 1);
  assert.equal(profiles[0].replacementEvents[0].date, today);
});
test("experiments reject future and invalid ranges and use corrected measurements without fill", () => {
  const range = { start: "2026-11-01", end: "2026-11-14" };
  assert.equal(
    compareTrainingRanges([], [], range, { start: "2026-11-15", end: "2026-11-20" }, today).valid,
    false,
  );
  assert.equal(
    compareTrainingRanges([], [], { start: "2026-02-30", end: "2026-03-01" }, range, today).valid,
    false,
  );
  const metric = (id, date, value, observedAt) => ({
    id,
    date,
    metric: "weight",
    value,
    observedAt,
    kind: "metric",
    source: "manual",
    notes: "",
  });
  const events = [
    metric("a", "2026-11-01", 80, "2026-11-01T10:00:00Z"),
    metric("b", "2026-11-01", 81, "2026-11-02T10:00:00Z"),
    metric("c", "2026-11-02", 90, "2026-11-02T10:00:00Z"),
    metric("d", "2026-11-02", null, "2026-11-03T10:00:00Z"),
  ];
  const result = compareTrainingRanges([], events, range, range, today);
  assert.deepEqual(result.baseline.measurementAverages.weight, { value: 81, days: 1 });
  assert.match(result.notes.join(" "), /overlap/);
});
test("recovery estimates use muscle metadata and fresh specific soreness without inventing recovery percentages", () => {
  const row = workout(
    "today",
    today,
    {},
    {},
    Array.from({ length: 8 }, (_, i) => set(`s${i}`, today)),
  );
  const r = estimateMuscleRecovery([row], metadata, today, {
    date: today,
    soreness: 5,
    muscleSoreness: { triceps: 4 },
  });
  const chest = r.muscles.find((m) => m.code === "chest");
  const triceps = r.muscles.find((m) => m.code === "triceps");
  assert.equal(chest.status, "higher_recent_load");
  assert.equal(chest.weightedRecentSets, 8);
  assert.equal(chest.soreness, null);
  assert.equal(triceps.status, "reported_sore");
  assert.equal(triceps.weightedRecentSets, 4);
  assert.equal(r.muscles.find((m) => m.code === "quads").status, "unknown");
  assert.equal(chest.recoveryPercent, undefined);
  assert.equal(
    estimateMuscleRecovery([row], metadata, today, {
      date: "2026-11-13",
      muscleSoreness: { chest: 5 },
    }).muscles.find((m) => m.code === "chest").soreness,
    null,
  );
  assert.equal(estimateMuscleRecovery([row], [], today).unknownSets, 8);
  const reportOnly = estimateMuscleRecovery([], metadata, today, {
    date: today,
    muscleSoreness: { chest: 5 },
  }).muscles.find((m) => m.code === "chest");
  assert.equal(reportOnly.status, "reported_sore");
  assert.equal(reportOnly.primarySets7d, 0);
  assert.equal(reportOnly.confidence, "limited");
});
test("muscle focus preview is bounded, preserves other work and uses a fixed four-week denominator", () => {
  const rows = [workout("one", today)];
  const p = previewSpecialisation(rows, metadata, "chest", today);
  assert.equal(p.averagePrimarySetsPerWeek, 0.25);
  assert.equal(p.extraSetsPerWeek, 1);
  assert.equal(p.suggestions[0].exerciseId, "bench");
  assert.equal(p.preserveOtherWork, true);
  assert.equal(p.confidence, "limited");
  assert.equal(previewSpecialisation(rows, metadata, "quads", today).extraSetsPerWeek, 0);
});
