import { workoutControlsSnapshot } from "../src/features/companion/native-model.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { inputWeightKg, toKg, fromKg, weightText, weightIncrementKg } from "../src/lib/weight.ts";
import {
  workoutRecords,
  recordValue,
  workoutShareText,
} from "../src/features/workouts/achievements.ts";
import {
  canInviteToReview,
  reachedReviewMilestone,
  reviewPreference,
} from "../src/features/experience/review-model.ts";
import { safeProperties, safeScreen, scrubCrash } from "../src/services/telemetry-model.ts";

const exercise = (kg, patch = {}) => ({
  exercise_id: "bench",
  exercise_name: "Bench",
  tracking_type: "reps_weight",
  workout_logged_sets: [
    { weight_kg: kg, reps: 8, set_type: "normal", completed_at: "2026-11-22T10:00:00Z", ...patch },
  ],
});
const workout = (id, date, rows) => ({
  id,
  status: "completed",
  started_at: `${date}T10:00:00Z`,
  finished_at: `${date}T11:00:00Z`,
  elapsed_seconds: 3600,
  workout_session_exercises: rows,
});
test("lb entry and display preserve canonical kg without relabelling the stored number", () => {
  assert.ok(Math.abs(toKg(225, "lb") - 102.05828325) < 1e-9);
  assert.equal(fromKg(toKg(225, "lb"), "lb"), 225);
  assert.equal(weightText(100, "lb"), "220.46");
  assert.equal(weightText(100, "kg"), "100");
  assert.equal(inputWeightKg("220.46", 100, "lb"), 100);
  assert.equal(inputWeightKg("225", 100, "lb"), toKg(225, "lb"));
  assert.equal(weightIncrementKg("kg"), 2.5);
  assert.equal(fromKg(weightIncrementKg("lb"), "lb"), 5);
});
test("personal bests need prior comparable completed normal sets and a strict increase", () => {
  const current = workout("new", "2026-11-23", [exercise(65)]);
  const old = workout("old", "2026-11-20", [exercise(60)]);
  assert.equal(workoutRecords(current, []).length, 0);
  assert.equal(workoutRecords(current, [old]).length, 1);
  assert.equal(workoutRecords(current, [workout("equal", "2026-11-20", [exercise(65)])]).length, 0);
  assert.equal(
    workoutRecords(current, [workout("future", "2026-11-24", [exercise(60)])]).length,
    0,
  );
  assert.equal(
    workoutRecords(workout("warm", "2026-11-23", [exercise(100, { set_type: "warmup" })]), [old])
      .length,
    0,
  );
  assert.equal(
    workoutRecords(workout("drop", "2026-11-23", [exercise(100, { set_type: "drop" })]), [old])
      .length,
    0,
  );
  assert.equal(
    workoutRecords(workout("incomplete", "2026-11-23", [exercise(100, { completed_at: null })]), [
      old,
    ]).length,
    0,
  );
  assert.equal(
    workoutRecords(workout("duplicate", "2026-11-23", [exercise(65), exercise(70)]), [old]).length,
    1,
  );
  assert.equal(workoutRecords(workout("nan", "2026-11-23", [exercise(NaN)]), [old]).length, 0);
  assert.equal(recordValue(workoutRecords(current, [old])[0], "lb"), "143.3 lb");
});
test("sharing omits workout names, measurements and private notes", () => {
  const current = {
    ...workout("new", "2026-11-23", [exercise(65)]),
    name: "private name",
    notes: "private notes",
  };
  const message = workoutShareText(current, 1);
  assert.match(message, /60 min · 1 set · 1 personal best/);
  assert.doesNotMatch(message, /private|65|Bench/);
});
test("a review invitation needs three distinct saved workouts and one at least a week old", () => {
  const current = workout("new", "2026-11-25", []);
  const now = Date.parse(current.finished_at);
  const first = workout("one", "2026-11-18", []);
  const second = workout("two", "2026-11-22", []);
  assert.equal(reachedReviewMilestone(current, [current, first, second], now), true);
  assert.equal(reachedReviewMilestone(current, [first, first, current], now), false);
  assert.equal(
    reachedReviewMilestone(current, [first, { ...second, status: "active" }], now),
    false,
  );
  assert.equal(
    reachedReviewMilestone(current, [second, workout("three", "2026-11-19", [])], now),
    false,
  );
});
test("legacy review history keeps its 120-day cooldown and drops the stored workout IDs", () => {
  const day = 86_400_000;
  const old = reviewPreference(JSON.stringify({ workouts: ["workout-id"], lastAttemptAt: day }));
  assert.deepEqual(old, { lastAttemptAt: day, openedListing: false });
  assert.equal(canInviteToReview(old, 121 * day - 1), false);
  assert.equal(canInviteToReview(old, 121 * day), true);
  assert.equal(canInviteToReview({ ...old, openedListing: true }, 122 * day), false);
});
test("Play links fall back to the browser, allow retry, and silence future invitations after handoff", async () => {
  const code = ts.transpileModule(
    readFileSync(new URL("../src/features/experience/review-prompt.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const app = JSON.parse(readFileSync(new URL("../app.json", import.meta.url), "utf8"));
  const urls = [],
    events = [];
  let saved = JSON.stringify({ workouts: ["old-workout"], lastAttemptAt: null });
  let browserAvailable = false;
  const native = {
    AppState: { currentState: "background" },
    Platform: { OS: "android" },
    Linking: {
      openURL: async (url) => {
        urls.push(url);
        if (url.startsWith("market:") || !browserAvailable) throw new Error("No handler");
      },
    },
  };
  const dependencies = {
    "react-native": native,
    "@react-native-async-storage/async-storage": {
      getItem: async () => saved,
      setItem: async (_key, value) => {
        saved = value;
      },
    },
    "@/src/services/telemetry": { trackEvent: (event) => events.push(event) },
    "../../../app.json": app,
    "./review-model": { canInviteToReview, reviewPreference },
  };
  const service = {};
  vm.runInNewContext(code, { exports: service, require: (name) => dependencies[name] });
  await service.prepareReviewPreference();
  assert.equal(saved.includes("old-workout"), false);
  assert.equal(service.claimReviewInvitation(), false);
  native.AppState.currentState = "active";
  assert.equal(service.claimReviewInvitation(), true);
  assert.equal(service.claimReviewInvitation(), false);
  assert.deepEqual(urls, []);
  await assert.rejects(service.openPlayReviews("workout_summary"), /Google Play/);
  assert.equal(JSON.parse(saved).openedListing, false);
  assert.deepEqual(events, []);
  browserAvailable = true;
  await Promise.all([service.openPlayReviews("settings"), service.openPlayReviews("settings")]);
  assert.deepEqual(urls.slice(2), [
    "market://details?id=com.sahil.fitsync&showAllReviews=true",
    "https://play.google.com/store/apps/details?id=com.sahil.fitsync&showAllReviews=true",
  ]);
  assert.deepEqual(events, ["review_listing_opened"]);
  assert.equal(JSON.parse(saved).openedListing, true);
});
test("telemetry excludes identifiers, dynamic routes and health fields from outgoing metadata", () => {
  assert.deepEqual(
    safeProperties({
      source: "home",
      weight: 81,
      email: "a@b.com",
      step: 2,
      screen: "workout?id=private",
    }),
    { source: "home", step: 2 },
  );
  assert.equal(safeScreen(["workout", "history", "[id]"]), "workout/history/_detail");
  const event = scrubCrash({
    user: { email: "private@example.test" },
    request: { headers: { Authorization: "secret" } },
    message: "health=81kg",
    breadcrumbs: [{ message: "private notes" }],
    exception: {
      values: [
        {
          type: "TypeError",
          value: "81kg secret",
          stacktrace: {
            frames: [
              {
                filename: "/private/user/index.android.bundle?token=secret",
                lineno: 4,
                colno: 2,
                context_line: "private notes",
              },
            ],
          },
        },
      ],
    },
  });
  assert.doesNotMatch(JSON.stringify(event), /81kg|secret|private|example/);
  assert.equal(event.exception.values[0].stacktrace.frames[0].filename, "index.android.bundle");
});

test("companion workout controls use the preferred unit without changing stored values", () => {
  const current = workout("active", "2026-11-23", [exercise(100, { completed_at: null })]);
  current.status = "active";
  const controls = workoutControlsSnapshot("owner", current, null, undefined, "lb");
  assert.match(controls.nextSetLabel, /220.46 lb/);
  assert.equal(current.workout_session_exercises[0].workout_logged_sets[0].weight_kg, 100);
});
