import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import * as reminderModel from "../src/features/companion/reminder-model.ts";
import {
  canCompleteControlSet,
  workoutControlsSnapshot,
} from "../src/features/companion/native-model.ts";

const root = path.resolve(import.meta.dirname, "..");
const prefs = {
  enabled: true,
  time: "18:00",
  days: [1, 2, 3, 4, 5],
  quietStart: "22:00",
  quietEnd: "08:00",
  snoozeMinutes: 30,
  timezone: "UTC",
};
const monday = Date.parse("2026-11-16T08:00:00Z");
function load(file, mocks, date = Date) {
  const source = fs.readFileSync(path.join(root, "src/features/companion", file), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports,
    Date: date,
    require: (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports;
}
function notifications() {
  const calls = [],
    scheduled = new Map(),
    presented = new Map(),
    storage = new Map();
  let granted = true,
    now = monday;
  class Clock extends Date {
    static now() {
      return now;
    }
  }
  const mock = {
    AndroidImportance: { LOW: 2, DEFAULT: 3 },
    DEFAULT_ACTION_IDENTIFIER: "default",
    SchedulableTriggerInputTypes: { DATE: "date", TIME_INTERVAL: "timeInterval" },
    getPermissionsAsync: async () => ({ granted, status: granted ? "granted" : "denied" }),
    requestPermissionsAsync: async () => {
      calls.push(["request"]);
      return { granted };
    },
    setNotificationChannelAsync: async (...args) => calls.push(["channel", ...args]),
    setNotificationCategoryAsync: async (...args) => calls.push(["category", ...args]),
    getAllScheduledNotificationsAsync: async () => [...scheduled.values()],
    getPresentedNotificationsAsync: async () => [...presented.values()],
    cancelScheduledNotificationAsync: async (id) => {
      calls.push(["cancel", id]);
      scheduled.delete(id);
    },
    dismissNotificationAsync: async (id) => {
      calls.push(["dismiss", id]);
      presented.delete(id);
    },
    scheduleNotificationAsync: async (item) => {
      calls.push(["schedule", item]);
      scheduled.set(item.identifier, item);
      return item.identifier;
    },
  };
  const mocks = {
    "expo-notifications": mock,
    "react-native": { Platform: { OS: "android" } },
    "@/src/features/workouts/notifications": { configureWorkoutNotifications: async () => {} },
    "./reminder-model": reminderModel,
    "@react-native-async-storage/async-storage": {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, value) => storage.set(key, value),
      removeItem: async (key) => storage.delete(key),
    },
  };
  return {
    api: load("reminders.ts", mocks, Clock),
    controls: load("native-controls.ts", mocks, Clock),
    calls,
    scheduled,
    presented,
    setGranted: (value) => {
      granted = value;
    },
    setNow: (value) => {
      now = value;
    },
  };
}

test("reminders use the chosen timezone, ISO weekdays, real plan rest days and completed sessions", () => {
  const sessions = [
    { id: "monday", title: "Upper", date: "2026-11-16" },
    { id: "wednesday", title: "Lower", date: "2026-11-18", completed: true },
  ];
  const value = reminderModel.planCompanionReminders({
    prefs: { ...prefs, timezone: "Asia/Kolkata" },
    sessions,
    completedDates: [],
    now: monday,
  });
  assert.equal(value.planned.length, 1);
  assert.equal(value.planned[0].at, Date.parse("2026-11-16T12:30:00Z"));
  assert.equal(value.planned[0].sessionId, "monday");
  assert.equal(
    reminderModel.planCompanionReminders({
      prefs,
      sessions,
      completedDates: ["2026-11-16"],
      now: monday,
    }).planned.length,
    0,
  );
});
test("nonexistent DST wall times are skipped and overnight quiet hours apply to reminders and snoozes", () => {
  assert.equal(reminderModel.reminderWallTime("2026-03-08", "02:30", "America/New_York"), null);
  assert.equal(
    reminderModel.reminderWallTime("2026-11-16", "18:00", "America/New_York"),
    Date.parse("2026-11-16T23:00:00Z"),
  );
  const result = reminderModel.planCompanionReminders({
    prefs: { ...prefs, time: "23:00" },
    sessions: [],
    completedDates: [],
    now: monday,
  });
  assert.equal(result.planned.length, 0);
  assert.equal(result.suppressedByQuietHours, 10);
  assert.equal(
    reminderModel.reminderSnoozeAt(Date.parse("2026-11-16T21:45:00Z"), prefs),
    Date.parse("2026-11-17T08:00:00Z"),
  );
});
test("reconciliation is idempotent and removes only companion reminders when ownership changes", async () => {
  const state = notifications();
  state.scheduled.set("fitsync-workout-rest", { identifier: "fitsync-workout-rest" });
  state.scheduled.set("program-push", { identifier: "program-push" });
  const input = {
    ownerId: "alice",
    prefs,
    sessions: [{ id: "planned", date: "2026-11-16", title: "Upper" }],
    completedDates: [],
    now: monday,
  };
  await state.api.reconcileCompanionReminders(input);
  await state.api.reconcileCompanionReminders(input);
  assert.equal(state.calls.filter((call) => call[0] === "schedule").length, 1);
  assert.equal(state.calls.filter((call) => call[0] === "request").length, 0);
  await state.api.reconcileCompanionReminders({ ...input, ownerId: "bob" });
  assert.equal(
    [...state.scheduled.keys()].some((id) => id.includes("alice")),
    false,
  );
  assert.ok(state.scheduled.has("fitsync-workout-rest"));
  assert.ok(state.scheduled.has("program-push"));
  assert.ok([...state.scheduled.keys()].some((id) => id.includes("bob")));
});
test("delivered reminders can snooze after foreground refresh, then completion cancels the snooze", async () => {
  const state = notifications();
  const input = {
    ownerId: "alice",
    prefs,
    sessions: [{ id: "planned", date: "2026-11-16", title: "Upper" }],
    completedDates: [],
    now: monday,
  };
  await state.api.reconcileCompanionReminders(input);
  const item = [...state.scheduled.values()][0];
  state.scheduled.delete(item.identifier);
  state.presented.set(item.identifier, { request: item });
  const after = Date.parse("2026-11-16T18:05:00Z");
  state.setNow(after);
  await state.api.reconcileCompanionReminders({ ...input, now: after });
  assert.equal(
    await state.api.handleCompanionReminderResponse(
      { actionIdentifier: state.api.COMPANION_SNOOZE_ACTION, notification: { request: item } },
      "alice",
      prefs,
    ),
    "snoozed",
  );
  assert.equal(
    [...state.scheduled.values()][0].trigger.date.getTime(),
    Date.parse("2026-11-16T18:35:00Z"),
  );
  await state.api.reconcileCompanionReminders({
    ...input,
    now: after,
    sessions: [{ ...input.sessions[0], completed: true }],
  });
  assert.equal(state.scheduled.size, 0);
});
test("permission denial clears pending reminders without prompting implicitly", async () => {
  const state = notifications();
  const input = { ownerId: "alice", prefs, sessions: [], completedDates: [], now: monday };
  await state.api.reconcileCompanionReminders(input);
  state.setGranted(false);
  const result = await state.api.reconcileCompanionReminders(input);
  assert.equal(result.permission, "denied");
  assert.equal(state.scheduled.size, 0);
  assert.equal(
    state.calls.some((call) => call[0] === "request"),
    false,
  );
  await state.api.requestCompanionReminderPermission();
  assert.ok(state.calls.some((call) => call[0] === "request"));
});
const set = {
  id: "s1",
  position: 0,
  set_type: "normal",
  weight_kg: 60,
  reps: 8,
  duration_seconds: null,
  distance_meters: null,
  rpe: null,
  rir: null,
  completed_at: null,
  notes: "",
};
test("notification controls use entered set values and reject stale owners, sessions and set IDs", () => {
  const state = notifications();
  const current = {
    ownerId: "alice",
    sessionId: "w1",
    title: "Upper",
    nextSetId: "s1",
    nextSetLabel: "Bench",
    canCompleteNextSet: true,
    rest: null,
  };
  const response = {
    actionIdentifier: state.controls.COMPANION_CONTROL_ACTIONS.complete,
    notification: {
      request: {
        identifier: "fitsync-companion-workout-controls",
        content: {
          data: {
            type: "companion-workout-controls",
            ownerId: "alice",
            sessionId: "w1",
            nextSetId: "s1",
          },
        },
      },
    },
  };
  assert.equal(state.controls.parseCompanionWorkoutControl(response, current).setId, "s1");
  assert.equal(
    state.controls.parseCompanionWorkoutControl(response, { ...current, ownerId: "bob" }),
    null,
  );
  assert.equal(
    state.controls.parseCompanionWorkoutControl(response, { ...current, sessionId: "w2" }),
    null,
  );
  assert.equal(
    state.controls.parseCompanionWorkoutControl(response, { ...current, nextSetId: "s2" }),
    null,
  );
  assert.equal(
    state.controls.parseCompanionWorkoutControl(response, {
      ...current,
      canCompleteNextSet: false,
    }),
    null,
  );
  assert.equal(canCompleteControlSet({ ...set, reps: null }, "reps_weight"), false);
  assert.equal(canCompleteControlSet({ ...set, reps: 0 }, "reps_weight"), false);
  assert.equal(canCompleteControlSet(set, "reps_weight"), true);
  assert.equal(canCompleteControlSet({ ...set, weight_kg: null }, "reps"), true);
  assert.equal(canCompleteControlSet(set, "unknown"), false);
  const snapshot = workoutControlsSnapshot(
    "alice",
    {
      id: "w1",
      status: "active",
      name: "Upper",
      workout_session_exercises: [
        {
          id: "e1",
          position: 0,
          exercise_name: "Bench",
          tracking_type: "reps_weight",
          workout_logged_sets: [set, { ...set, id: "s2", position: 1, reps: null }],
        },
      ],
    },
    null,
  );
  assert.equal(snapshot.nextSetId, "s1");
  assert.equal(snapshot.canCompleteNextSet, true);
});
test("widget bridge reports missing builds and serializes account replacement and clearing", async () => {
  const calls = [];
  const native = {
    publish: async (data) => calls.push(["publish", JSON.parse(data)]),
    clear: async () => calls.push(["clear"]),
    requestPin: async () => true,
  };
  const missing = load("widget.ts", {
    expo: { requireOptionalNativeModule: () => null },
    "react-native": { Platform: { OS: "android" } },
  });
  assert.equal(missing.getCompanionNativeAvailability().widgets, "requires-build");
  assert.equal(await missing.requestCompanionWidgetPin(), false);
  const api = load("widget.ts", {
    expo: { requireOptionalNativeModule: () => native },
    "react-native": { Platform: { OS: "android" } },
  });
  await Promise.all([
    api.publishCompanionWidget({
      ownerId: "alice",
      nextSessionTitle: "Upper",
      weeklyCompleted: 2,
      weeklyTarget: 3,
      updatedAt: "2026-11-16T08:00:00Z",
    }),
    api.clearCompanionWidget(),
  ]);
  assert.equal(calls[0][0], "publish");
  assert.equal(calls[1][0], "clear");
  assert.equal(api.getCompanionNativeAvailability().wearableControls, "notification-mirroring");
});
