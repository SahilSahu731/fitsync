import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as reminderModel from "../src/features/companion/reminder-model.ts";

const now = Date.parse("2026-11-16T08:00:00Z");
const preferences = {
  enabled: true,
  time: "18:00",
  days: [1, 2, 3, 4, 5],
  quietStart: "22:00",
  quietEnd: "08:00",
  snoozeMinutes: 30,
  timezone: "UTC",
};
const hydration = { hydration: { enabled: true, time: "15:00" } };

function fixture() {
  const storage = new Map(),
    scheduled = new Map(),
    presented = new Map(),
    cancelled = [];
  const notifications = {
    AndroidImportance: { DEFAULT: 3 },
    SchedulableTriggerInputTypes: { DATE: "date" },
    setNotificationChannelAsync: async () => {},
    setNotificationCategoryAsync: async () => {},
    getPermissionsAsync: async () => ({ granted: true, status: "granted" }),
    getAllScheduledNotificationsAsync: async () => [...scheduled.values()],
    getPresentedNotificationsAsync: async () => [...presented.values()],
    cancelScheduledNotificationAsync: async (id) => {
      cancelled.push(id);
      scheduled.delete(id);
    },
    dismissNotificationAsync: async (id) => presented.delete(id),
    scheduleNotificationAsync: async (item) => {
      scheduled.set(item.identifier, item);
      return item.identifier;
    },
  };
  const dependencies = {
    "expo-notifications": notifications,
    "react-native": { Platform: { OS: "android" } },
    "@/src/features/workouts/notifications": { configureWorkoutNotifications: async () => {} },
    "./reminder-model": reminderModel,
    "@react-native-async-storage/async-storage": {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, value) => storage.set(key, value),
      removeItem: async (key) => storage.delete(key),
    },
  };
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync(new URL("../src/features/companion/reminders.ts", import.meta.url), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      },
    ).outputText,
    {
      exports,
      Date,
      require: (name) => {
        assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
        return dependencies[name];
      },
    },
  );
  const input = { ownerId: "alice", prefs: preferences, sessions: [], completedDates: [], now };
  return { api: exports, input, scheduled, presented, cancelled, storage };
}
const training = (state) =>
  [...state.scheduled.values()].filter((item) => item.content?.data.kind === "training");

test("loading preferences retains the current account's schedule and clears another account only", async () => {
  const state = fixture();
  await state.api.reconcileCompanionReminders(state.input);
  const ids = [...state.scheduled.keys()];
  state.cancelled.length = 0;
  await state.api.retainCompanionRemindersForOwner("alice");
  assert.deepEqual([...state.scheduled.keys()], ids);
  assert.equal(state.cancelled.length, 0);
  state.scheduled.set("workout-rest", { identifier: "workout-rest" });
  await state.api.retainCompanionRemindersForOwner("bob");
  assert.deepEqual([...state.scheduled.keys()], ["workout-rest"]);
});

test("daily habits update while a missing training resource preserves its previous schedule", async () => {
  const state = fixture();
  await state.api.reconcileCompanionReminders(state.input);
  const previous = training(state);
  state.cancelled.length = 0;
  await state.api.reconcileCompanionReminders({
    ...state.input,
    prefs: { ...preferences, enabled: false, habits: hydration },
    preserveTraining: true,
  });
  assert.deepEqual(training(state), previous);
  assert.ok(previous.every((item) => !state.cancelled.includes(item.identifier)));
  assert.equal(
    [...state.scheduled.values()].filter((item) => item.content.data.kind === "hydration").length,
    14,
  );
  // A subsequent authoritative disabled workout preference can remove training.
  await state.api.reconcileCompanionReminders({
    ...state.input,
    prefs: { ...preferences, enabled: false, habits: hydration },
  });
  assert.equal(training(state).length, 0);
  assert.equal(state.scheduled.size, 14);
});

test("an unknown training schedule never creates generic workouts from an enabled preference", async () => {
  const state = fixture();
  await state.api.reconcileCompanionReminders({
    ...state.input,
    prefs: { ...preferences, habits: hydration },
    preserveTraining: true,
  });
  assert.equal(training(state).length, 0);
  assert.equal(state.scheduled.size, 14);
});

test("turning daily habits off does not discard future workout reminders while training is unknown", async () => {
  const state = fixture();
  await state.api.reconcileCompanionReminders(state.input);
  const previous = [...state.scheduled.keys()];
  await state.api.reconcileCompanionReminders({
    ...state.input,
    prefs: { ...preferences, enabled: false },
    preserveTraining: true,
  });
  assert.deepEqual([...state.scheduled.keys()], previous);
});

test("recovery retains today's delivered workout but removes older expired workout reminders", async () => {
  const state = fixture();
  await state.api.reconcileCompanionReminders(state.input);
  const first = training(state)[0];
  state.scheduled.delete(first.identifier);
  state.presented.set(first.identifier, { request: first });
  const deliveredAt = Date.parse("2026-11-16T18:05:00Z");
  await state.api.reconcileCompanionReminders({
    ...state.input,
    now: deliveredAt,
    preserveTraining: true,
  });
  assert.ok(state.presented.has(first.identifier));
  await state.api.reconcileCompanionReminders({
    ...state.input,
    now: Date.parse("2026-11-17T08:00:00Z"),
    preserveTraining: true,
  });
  assert.equal(state.presented.has(first.identifier), false);
  assert.ok(training(state).length > 0);
});

test("training recovery cannot carry the previous account's schedule into a new owner", async () => {
  const state = fixture();
  await state.api.reconcileCompanionReminders(state.input);
  await state.api.reconcileCompanionReminders({
    ...state.input,
    ownerId: "bob",
    prefs: { ...preferences, habits: hydration },
    preserveTraining: true,
  });
  assert.equal(training(state).length, 0);
  assert.ok([...state.scheduled.values()].every((item) => item.content.data.ownerId === "bob"));
});

test("a known completion cancels its workout reminder even while the plan cannot refresh", async () => {
  const state = fixture();
  await state.api.reconcileCompanionReminders(state.input);
  const first = training(state)[0];
  await state.api.reconcileCompanionReminders({
    ...state.input,
    completedDates: ["2026-11-16"],
    preserveTraining: true,
  });
  assert.equal(state.scheduled.has(first.identifier), false);
  assert.ok(training(state).length > 0);
});
