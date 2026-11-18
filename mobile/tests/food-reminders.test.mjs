import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { SLOT_LABELS, zeroNutrients } from "../src/features/nutrition/model.ts";

const source = fs.readFileSync(
  path.resolve(import.meta.dirname, "../src/features/nutrition/reminders.ts"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
const day = "2026-11-20";
const now = new Date(2026, 10, 20, 8).getTime();
const prefix = "fitsync-food-reminder-";
function food(overrides = {}) {
  return {
    id: "oats",
    date: day,
    meal: "breakfast",
    name: "Oats",
    quantity: 60,
    unit: "g",
    basisAmount: 100,
    nutrition: zeroNutrients(),
    status: "planned",
    time: "09:00",
    remind: true,
    note: "",
    ...overrides,
  };
}
function setup(platform = "android") {
  const calls = [],
    scheduled = new Map(),
    presented = new Map(),
    storage = new Map();
  let granted = true,
    failSchedule = false;
  const native = {
    AndroidImportance: { DEFAULT: 3 },
    IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 },
    DEFAULT_ACTION_IDENTIFIER: "default",
    SchedulableTriggerInputTypes: { DATE: "date" },
    getPermissionsAsync: async () => ({ granted, status: granted ? "granted" : "denied" }),
    requestPermissionsAsync: async () => {
      calls.push(["request"]);
      return { granted };
    },
    setNotificationChannelAsync: async (...args) => {
      calls.push(["channel", ...args]);
    },
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
      if (failSchedule) throw new Error("Native scheduling failed");
      calls.push(["schedule", item]);
      scheduled.set(item.identifier, item);
      return item.identifier;
    },
  };
  const mocks = {
    react: { useSyncExternalStore: (_subscribe, snapshot) => snapshot() },
    "react-native": { Platform: { OS: platform } },
    "expo-notifications": native,
    "@/src/features/workouts/notifications": { configureWorkoutNotifications: async () => {} },
    "./model": { SLOT_LABELS },
    "@react-native-async-storage/async-storage": {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, value) => {
        storage.set(key, value);
      },
      removeItem: async (key) => {
        storage.delete(key);
      },
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    Date,
    require: (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return {
    api: exports,
    native,
    calls,
    scheduled,
    presented,
    storage,
    allow: (value) => {
      granted = value;
    },
    failSchedule: (value) => {
      failSchedule = value;
    },
  };
}
const reconcile = (h, entries, extra = {}) =>
  h.api.reconcileFoodReminders({ ownerId: "owner-a", entries, enabled: true, now, ...extra });

test("meal reminders schedule only future planned, opted-in entries at device-local time", async () => {
  const h = setup();
  const status = await reconcile(h, [
    food(),
    food({ id: "eaten", status: "eaten" }),
    food({ id: "off", remind: false }),
    food({ id: "past", time: "07:00" }),
    food({ id: "invalid", date: "2026-02-30" }),
  ]);
  assert.equal(status.permission, "granted");
  assert.equal(status.scheduled, 1);
  const item = [...h.scheduled.values()][0];
  assert.equal(item.trigger.date.getTime(), new Date(2026, 10, 20, 9).getTime());
  assert.equal(item.trigger.channelId, "food-reminders-v1");
  assert.equal(item.content.data.ownerId, "owner-a");
  assert.equal(item.content.data.entryId, "oats");
  assert.match(item.content.body, /60 g/);
  assert.equal(
    h.calls.some(([kind]) => kind === "request"),
    false,
  );
});

function bridgeHarness(h, ownerId = "owner-a", pro = true) {
  const bridgeSource = fs.readFileSync(
    path.resolve(import.meta.dirname, "../src/features/nutrition/reminder-bridge.tsx"),
    "utf8",
  );
  const output = ts.transpileModule(bridgeSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;
  const effects = [],
    layouts = [],
    cleanups = [],
    diaryListeners = new Set(),
    foregrounds = new Set(),
    responses = new Set(),
    routes = [];
  let diary = { entries: [food()] },
    readCount = 0;
  const mocks = {
    react: {
      createElement: (type, props) => ({ type, props }),
      useRef: (value) => ({ current: value }),
      useLayoutEffect: (effect) => layouts.push(effect),
      useEffect: (effect) => effects.push(effect),
    },
    "react-native": {
      Platform: { OS: "android" },
      AppState: {
        addEventListener: (_name, fn) => {
          foregrounds.add(fn);
          return { remove: () => foregrounds.delete(fn) };
        },
      },
    },
    "expo-notifications": {
      ...h.native,
      addNotificationResponseReceivedListener: (fn) => {
        responses.add(fn);
        return { remove: () => responses.delete(fn) };
      },
      getLastNotificationResponseAsync: async () => null,
      clearLastNotificationResponseAsync: async () => {},
    },
    "expo-router": { router: { push: (route) => routes.push(route) } },
    "@/src/context/session": { useSession: () => ({ user: ownerId ? { id: ownerId } : null }) },
    "../billing/billing-context": { useBilling: () => ({ isPro: pro, loading: false }) },
    "./storage": {
      readFoodDiary: async () => {
        readCount++;
        return diary;
      },
      subscribeFoodDiary: (fn) => {
        diaryListeners.add(fn);
        return () => diaryListeners.delete(fn);
      },
    },
    "./reminders": h.api,
  };
  const exports = {};
  vm.runInNewContext(output, {
    exports,
    require: (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      throw new Error(`Unexpected bridge import ${name}`);
    },
  });
  const child = exports.FoodReminderBridge();
  child.type(child.props);
  for (const effect of [...layouts, ...effects]) {
    const cleanup = effect();
    if (cleanup) cleanups.push(cleanup);
  }
  return {
    routes,
    setEntries: (entries, publish = true) => {
      diary = { entries };
      if (publish) for (const listener of diaryListeners) listener(ownerId, diary);
    },
    foreground: () => {
      for (const listener of foregrounds) listener("active");
    },
    response: (response) => {
      for (const listener of responses) listener(response);
    },
    unmount: () => {
      for (const cleanup of cleanups) cleanup();
    },
    readCount: () => readCount,
    subscriptions: () => diaryListeners.size + foregrounds.size + responses.size,
  };
}
async function flush() {
  for (let i = 0; i < 12; i++) await new Promise((resolve) => setImmediate(resolve));
}

test("native bridge follows diary changes and foreground refresh, then cleans up on logout", async () => {
  const h = setup();
  // The bridge uses the real clock, so use an unambiguously future meal.
  const future = food({ date: "2099-11-20" });
  const bridge = bridgeHarness(h);
  bridge.setEntries([future]);
  await flush();
  assert.equal(h.scheduled.size, 1);
  bridge.setEntries([{ ...future, status: "eaten" }]);
  await flush();
  assert.equal(h.scheduled.size, 0);
  bridge.setEntries([future]);
  await flush();
  assert.equal(h.scheduled.size, 1);
  bridge.setEntries([], false);
  bridge.foreground();
  await flush();
  assert.equal(h.scheduled.size, 0);
  bridge.setEntries([future]);
  await flush();
  bridge.unmount();
  await flush();
  assert.equal(h.scheduled.size, 0);
  assert.equal(bridge.subscriptions(), 0);
});

test("native bridge denies Pro access and ignores duplicate or stale notification responses", async () => {
  const h = setup();
  const future = food({ date: "2099-11-20" });
  const bridge = bridgeHarness(h);
  bridge.setEntries([future]);
  await flush();
  const request = [...h.scheduled.values()][0];
  const response = { actionIdentifier: "default", notification: { request, date: 123 } };
  bridge.response(response);
  await flush();
  bridge.response(response);
  await flush();
  assert.equal(bridge.routes.length, 1);
  assert.equal(bridge.routes[0].pathname, "/nutrition");
  assert.equal(bridge.routes[0].params.date, future.date);
  bridge.setEntries([{ ...future, status: "eaten" }]);
  bridge.response({ ...response, notification: { request, date: 124 } });
  await flush();
  assert.equal(bridge.routes.length, 1);
  bridge.unmount();
  const free = bridgeHarness(h, "owner-a", false);
  free.setEntries([future]);
  await flush();
  assert.equal(h.scheduled.size, 0);
  assert.equal(free.readCount(), 0);
  free.response(response);
  await flush();
  assert.equal(free.routes.length, 0);
  free.unmount();
});

test("unchanged meals retain their schedule; edits update time and portion", async () => {
  const h = setup();
  await reconcile(h, [food()]);
  await reconcile(h, [food()]);
  assert.equal(h.calls.filter(([kind]) => kind === "schedule").length, 1);
  await reconcile(h, [food({ time: "10:30", quantity: 80 })]);
  assert.equal(h.calls.filter(([kind]) => kind === "schedule").length, 2);
  const item = [...h.scheduled.values()][0];
  assert.equal(item.trigger.date.getTime(), new Date(2026, 10, 20, 10, 30).getTime());
  assert.match(item.content.body, /80 g/);
});

test("eaten, disabled and deleted meals cancel scheduled and delivered notifications", async () => {
  for (const entries of [[food({ status: "eaten" })], [food({ remind: false })], []]) {
    const h = setup();
    await reconcile(h, [food()]);
    const item = [...h.scheduled.values()][0];
    h.presented.set(item.identifier, { request: item });
    const result = await reconcile(h, entries);
    assert.equal(result.scheduled, 0);
    assert.equal(h.scheduled.size, 0);
    assert.equal(h.presented.size, 0);
  }
});

test("account switch and Pro loss clear food notifications while preserving companion and rest timers", async () => {
  const h = setup();
  h.scheduled.set("fitsync-companion-reminder-owner-a-date", {
    identifier: "fitsync-companion-reminder-owner-a-date",
  });
  h.scheduled.set("fitsync-workout-rest", { identifier: "fitsync-workout-rest" });
  await reconcile(h, [food()]);
  await reconcile(h, [food({ id: "lunch" })], { ownerId: "owner-b" });
  assert.equal(h.api.foodReminderStatus("owner-a").scheduled, 0);
  assert.equal(
    [...h.scheduled.keys()].some((id) => id.startsWith(`${prefix}owner-a`)),
    false,
  );
  assert.equal(
    [...h.scheduled.keys()].some((id) => id.startsWith(`${prefix}owner-b`)),
    true,
  );
  await reconcile(h, [], { ownerId: "owner-b", enabled: false });
  assert.deepEqual([...h.scheduled.keys()].sort(), [
    "fitsync-companion-reminder-owner-a-date",
    "fitsync-workout-rest",
  ]);
});

test("logout cleans orphaned food schedules even when local reminder storage is absent", async () => {
  const h = setup();
  h.scheduled.set(`${prefix}old-owner-meal`, { identifier: `${prefix}old-owner-meal` });
  h.presented.set(`${prefix}another-meal`, { request: { identifier: `${prefix}another-meal` } });
  await h.api.clearFoodReminders();
  assert.equal(h.scheduled.size, 0);
  assert.equal(h.presented.size, 0);
});

test("denied permission cancels schedules without prompting and explicit permission request is separate", async () => {
  const h = setup();
  await reconcile(h, [food()]);
  h.allow(false);
  const value = await reconcile(h, [food()]);
  assert.equal(value.permission, "denied");
  assert.equal(value.scheduled, 0);
  assert.equal(h.scheduled.size, 0);
  assert.equal(
    h.calls.some(([kind]) => kind === "request"),
    false,
  );
  assert.equal(await h.api.requestFoodReminderPermission(), false);
  assert.equal(h.calls.filter(([kind]) => kind === "request").length, 1);
});

test("unsupported platforms do not call native APIs or promise reminder delivery", async () => {
  const h = setup("web");
  assert.equal((await reconcile(h, [food()])).permission, "unsupported");
  assert.equal(await h.api.requestFoodReminderPermission(), false);
  assert.equal(h.calls.length, 0);
});

test("failed scheduling is visible and a later reconciliation retries", async () => {
  const h = setup();
  h.failSchedule(true);
  const value = await reconcile(h, [food()]);
  assert.equal(value.scheduled, 0);
  assert.match(value.error, /could not update/);
  h.failSchedule(false);
  assert.equal((await reconcile(h, [food()])).scheduled, 1);
  assert.equal(h.api.foodReminderStatus("owner-a").error, null);
});

test("iOS uses remaining notification capacity for nearest meals and reports overflow", async () => {
  const h = setup("ios");
  for (let i = 0; i < 59; i++) h.scheduled.set(`other-${i}`, { identifier: `other-${i}` });
  const value = await reconcile(h, [
    food({ id: "later", time: "11:00" }),
    food({ id: "nearest", time: "09:00" }),
  ]);
  assert.equal(value.scheduled, 1);
  assert.match(value.error, /nearest meals/);
  assert.equal(
    [...h.scheduled.values()].find((item) => item.identifier.startsWith(prefix)).content.data
      .entryId,
    "nearest",
  );
});

test("stale account snapshots never recreate notifications after cleanup", async () => {
  const h = setup();
  await reconcile(h, [food()]);
  await h.api.clearFoodReminders("owner-a");
  await reconcile(h, [food()], { isCurrent: () => false });
  assert.equal(h.scheduled.size, 0);
});

test("notification responses open only a still-planned food belonging to the current account", async () => {
  const h = setup();
  await reconcile(h, [food()]);
  const request = [...h.scheduled.values()][0];
  const response = { actionIdentifier: "default", notification: { request } };
  assert.equal(h.api.foodReminderDestination(response, "owner-a", [food()]), day);
  assert.equal(h.api.foodReminderDestination(response, "owner-b", [food()]), null);
  assert.equal(h.api.foodReminderDestination(response, "owner-a", []), null);
  assert.equal(
    h.api.foodReminderDestination(response, "owner-a", [food({ status: "eaten" })]),
    null,
  );
  assert.equal(
    h.api.foodReminderDestination({ ...response, actionIdentifier: "other" }, "owner-a", [food()]),
    null,
  );
  assert.equal(
    h.api.foodReminderDestination(
      { ...response, notification: { request: { ...request, identifier: "other" } } },
      "owner-a",
      [food()],
    ),
    null,
  );
});

test("invalid dates, clock values and nonexistent local wall times never roll into another day", () => {
  const h = setup();
  assert.equal(h.api.foodReminderAt("2026-02-30", "12:00"), null);
  assert.equal(h.api.foodReminderAt(day, "24:00"), null);
  assert.equal(h.api.foodReminderAt(day, "9:00"), null);
  assert.equal(
    h.api.foodReminderAt("2026-11-20", "09:30"),
    new Date(2026, 10, 20, 9, 30).getTime(),
  );
});
