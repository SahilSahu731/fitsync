import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {
  workoutMoment,
  weeklyMoment,
  missedMoment,
  nextTargets,
  canShowMoment,
  parseMomentHistory,
  firstEligibleMoment,
  recentWorkoutMoments,
} from "../src/features/billing/moments.ts";
import { trialReminderDate } from "../src/features/billing/trial-model.ts";
import { makeOffers } from "../src/features/billing/offers.ts";

const today = "2026-11-23";
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
const workout = (id, date, changes = {}, sets = [set(`${id}-s`, date)]) => ({
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
    },
  ],
  ...changes,
});
const first = workout("one", "2026-11-16"),
  second = workout("two", "2026-11-20"),
  third = workout("three", today);
test("workout three uses distinct completed workouts, real totals and the shared progression engine", () => {
  const moment = workoutMoment(
    third,
    [
      first,
      second,
      third,
      third,
      workout("active", today, { status: "active" }),
      workout("future", "2026-11-25"),
    ],
    today,
    "kg",
  );
  assert.equal(moment.source, "workout_three");
  assert.deepEqual(
    { workouts: moment.stats.workouts, sets: moment.stats.sets, minutes: moment.stats.minutes },
    { workouts: 3, sets: 3, minutes: 60 },
  );
  assert.equal(moment.targets[0].target.suggested.weightKg, 60);
  assert.equal(moment.targets[0].target.suggested.reps, 9);
  assert.equal(workoutMoment(second, [first], today, "kg"), null);
  assert.equal(
    workoutMoment(third, [first, second, workout("extra", "2026-11-21")], today, "kg"),
    null,
  );
  assert.equal(workoutMoment({ ...third, status: "active" }, [first, second], today, "kg"), null);
});
test("a real PR wins over workout three; equal loads and first exposure are not records", () => {
  const pr = workout("pr", today, {}, [set("pr-s", today, { weight_kg: 65 })]);
  assert.equal(workoutMoment(pr, [first, second], today, "kg").source, "personal_best");
  assert.equal(workoutMoment(pr, [], today, "kg"), null);
  assert.equal(workoutMoment(second, [first], today, "kg"), null);
  const warm = workout("warm", today, {}, [
    set("warm-s", today, { set_type: "warmup", weight_kg: 200 }),
  ]);
  const warmMoment = workoutMoment(warm, [first, second], today, "kg");
  assert.equal(warmMoment.source, "workout_three");
  assert.equal(warmMoment.targets[0].target.suggested.weightKg, 60);
});
test("target previews repeat honestly without effort; kg and lb increments use canonical stored weights", () => {
  const missing = workout("missing", today, {}, [
    set("missing-s", today, { rpe: null, rir: null }),
  ]);
  assert.equal(nextTargets([first, missing], today)[0].target.action, "repeat");
  const a = workout("a", "2026-11-20", {}, [set("a-s", "2026-11-20", { reps: 12 })]);
  const b = workout("b", today, {}, [set("b-s", today, { reps: 12 })]);
  assert.equal(nextTargets([a, b], today, "kg")[0].target.suggested.weightKg, 62.5);
  assert.ok(
    Math.abs(
      nextTargets([a, b], today, "lb")[0].target.suggested.weightKg - (60 + 5 * 0.45359237),
    ) < 0.001,
  );
  assert.deepEqual(
    nextTargets([workout("empty", today, {}, [set("x", today, { completed_at: null })])], today),
    [],
  );
});
test("after day seven the weekly preview includes only the completed signup week and real observations", () => {
  const createdAt = "2026-11-16T00:00:00Z";
  assert.equal(weeklyMoment([first, second], createdAt, "2026-11-22", "kg"), null);
  const moment = weeklyMoment([first, first, second, third], createdAt, today, "kg");
  assert.equal(moment.key, "weekly_review:2026-11-16");
  assert.match(moment.insights[0].text, /2 workouts.*2 training days.*2 working sets/);
  assert.match(moment.insights[1].text, /40 logged minutes/);
  assert.equal(moment.insights.length, 3);
  assert.equal(weeklyMoment([], createdAt, today, "kg"), null);
  assert.equal(weeklyMoment([first], "bad", today, "kg"), null);
  assert.match(weeklyMoment([first], createdAt, today, "kg").insights[0].text, /1 workout across/);
  assert.equal(weeklyMoment([first], createdAt, "2026-11-30", "kg"), null);
});
const day = (id, date, changes = {}) => ({
  id,
  date,
  name: "Strength A",
  status: "planned",
  workoutId: null,
  revision: 1,
  ...changes,
});
test("missed sessions require a real recent scheduled day and find a collision-free recovery date", () => {
  const plan = {
    timezone: "Asia/Kolkata",
    sessions: [day("missed", "2026-11-22"), day("occupied", "2026-11-24")],
  };
  const moment = missedMoment(plan, new Date("2026-11-23T10:00:00Z"));
  assert.equal(moment.source, "missed_session");
  assert.equal(moment.recovery.date, "2026-11-25");
  assert.equal(moment.recovery.day.id, "missed");
  for (const change of [
    { status: "completed" },
    { status: "active" },
    { workoutId: "w" },
    { date: "2026-11-01" },
    { date: today },
  ]) {
    assert.equal(
      missedMoment(
        { ...plan, sessions: [day("m", "2026-11-22", change)] },
        new Date("2026-11-23T10:00:00Z"),
      ),
      null,
    );
  }
  assert.equal(missedMoment({ ...plan, timezone: "bad" }), null);
  assert.equal(missedMoment(null), null);
});
test("missed status uses the plan timezone across midnight and daylight-saving changes", () => {
  const plan = { timezone: "America/Los_Angeles", sessions: [day("m", "2026-11-01")] };
  assert.equal(missedMoment(plan, new Date("2026-11-02T07:30:00Z")), null);
  assert.equal(missedMoment(plan, new Date("2026-11-02T08:30:00Z")).recovery.date, "2026-11-03");
});
test("proactive previews respect seen IDs, exactly 48 hours and a rolling two-per-week limit", () => {
  const now = Date.now(),
    hour = 3600_000,
    day = 24 * hour;
  assert.equal(canShowMoment({ seen: [], shown: [] }, "pr:1", now), true);
  assert.equal(canShowMoment({ seen: ["pr:1"], shown: [] }, "pr:1", now), false);
  assert.equal(canShowMoment({ seen: [], shown: [now - 48 * hour + 1] }, "pr:1", now), false);
  assert.equal(canShowMoment({ seen: [], shown: [now - 48 * hour] }, "pr:1", now), true);
  assert.equal(
    canShowMoment({ seen: [], shown: [now - 3 * day, now - 6 * day] }, "pr:1", now),
    false,
  );
  assert.equal(
    canShowMoment({ seen: [], shown: [now - 3 * day, now - 7 * day] }, "pr:1", now),
    true,
  );
  assert.deepEqual(parseMomentHistory("invalid"), { seen: [], shown: [] });
  assert.deepEqual(parseMomentHistory('{"seen":["a",3],"shown":[true,5]}'), {
    seen: ["a"],
    shown: [5],
  });
});
test("an already seen achievement cannot hide an eligible weekly review or recovery", () => {
  const achievement = workoutMoment(third, [first, second], today, "kg");
  const weekly = weeklyMoment([first, second], "2026-11-16T00:00:00Z", today, "kg");
  const now = Date.now();
  const history = { seen: [achievement.key], shown: [now - 4 * 86400_000] };
  assert.equal(firstEligibleMoment(history, [achievement, weekly], now), weekly);
  assert.equal(firstEligibleMoment({ ...history, shown: [now] }, [achievement, weekly], now), null);
});
test("completion moments survive midnight and delayed sync for at most 72 hours", () => {
  const history = [first, second, third];
  const finished = Date.parse(third.finished_at);
  assert.equal(
    recentWorkoutMoments(history, "2026-11-24", "kg", finished + 86400_000)[0].key,
    `workout_three:${third.id}`,
  );
  assert.equal(
    recentWorkoutMoments(history, "2026-11-26", "kg", finished + 72 * 3600_000).length,
    1,
  );
  assert.deepEqual(
    recentWorkoutMoments(history, "2026-11-26", "kg", finished + 72 * 3600_000 + 1),
    [],
  );
  assert.deepEqual(recentWorkoutMoments(history, today, "kg", finished - 1), []);
});
const phase = (amount, iso, count = 1) => ({
  price: { amountMicros: amount * 1e6, formatted: `₹${amount}`, currencyCode: "INR" },
  billingPeriod: {
    iso8601: iso,
    value: iso === "P1Y" ? 1 : 7,
    unit: iso === "P1Y" ? "YEAR" : "DAY",
  },
  billingCycleCount: count,
});
const packageWith = (phases) => ({
  identifier: "yearly",
  product: {
    identifier: "pro:yearly",
    subscriptionPeriod: "P1Y",
    price: 2400,
    priceString: "₹2400",
    defaultOption: { pricingPhases: phases, fullPricePhase: phase(2400, "P1Y") },
  },
});
test("only an exact eligible seven-day free phase drives the trial timeline", () => {
  for (const period of ["P7D", "P1W"])
    assert.equal(
      makeOffers([packageWith([phase(0, period), phase(2400, "P1Y")])], "android")[0].trialDays,
      7,
    );
  for (const phases of [
    [phase(2400, "P1Y")],
    [phase(0, "P3D"), phase(2400, "P1Y")],
    [phase(0, "P7D", 2), phase(2400, "P1Y")],
    [phase(5, "P7D"), phase(2400, "P1Y")],
    [phase(0, "P7D"), phase(20, "P1M"), phase(2400, "P1Y")],
  ]) {
    assert.equal(makeOffers([packageWith(phases)], "android")[0].trialDays, null);
  }
  assert.equal(
    makeOffers([packageWith([phase(0, "P7D"), phase(2400, "P1Y")])], "ios")[0].trialDays,
    null,
  );
});
const receipt = (changes = {}) => ({
  entitlements: {
    active: {
      pro: {
        isActive: true,
        willRenew: true,
        periodType: "TRIAL",
        productIdentifier: "pro",
        latestPurchaseDate: "2026-11-23T10:00:00Z",
        expirationDate: "2026-11-30T10:00:00Z",
        ...changes,
      },
    },
  },
});
test("Day 5 reminder is derived from the matching receipt and never from checkout time", () => {
  const now = Date.parse("2026-11-24T10:00:00Z");
  assert.equal(trialReminderDate(receipt(), "pro:yearly", now), Date.parse("2026-11-28T10:00:00Z"));
  for (const change of [
    { periodType: "NORMAL" },
    { willRenew: false },
    { isActive: false },
    { expirationDate: null },
    { expirationDate: "bad" },
    { expirationDate: "2026-12-23T10:00:00Z" },
    { productIdentifier: "other" },
  ])
    assert.equal(trialReminderDate(receipt(change), "pro", now), null);
  assert.equal(trialReminderDate(receipt(), "pro", Date.parse("2026-11-29T10:00:00Z")), null);
});
function reminderFixture() {
  const storage = new Map(),
    scheduled = new Map(),
    calls = [];
  const permission = { granted: true };
  const deps = {
    "@react-native-async-storage/async-storage": {
      getItem: async (k) => storage.get(k) ?? null,
      setItem: async (k, v) => storage.set(k, v),
      removeItem: async (k) => storage.delete(k),
    },
    "react-native": { Platform: { OS: "android" } },
    "./trial-model": { trialReminderDate },
    "expo-notifications": {
      AndroidImportance: { DEFAULT: 3 },
      SchedulableTriggerInputTypes: { DATE: "date" },
      getPermissionsAsync: async () => permission,
      requestPermissionsAsync: async () => {
        calls.push("permission");
        return permission;
      },
      setNotificationChannelAsync: async () => {},
      cancelScheduledNotificationAsync: async (id) => scheduled.delete(id),
      getAllScheduledNotificationsAsync: async () => [...scheduled.values()],
      scheduleNotificationAsync: async (request) => {
        scheduled.set(request.identifier, request);
      },
    },
  };
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL("../src/features/billing/trial-reminders.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const now = Date.parse("2026-11-23T12:00:00Z");
  vm.runInNewContext(code, {
    exports,
    Promise,
    Date: class extends Date {
      static now() {
        return now;
      }
    },
    require: (name) => deps[name],
  });
  // The pure model must use the same clock as the notification module.
  deps["./trial-model"].trialReminderDate = (info, product) =>
    trialReminderDate(info, product, now);
  return { ...exports, storage, scheduled, permission, calls };
}
test("trial reminders require explicit opt-in, cancel on receipt cancellation and clear on account switch", async () => {
  const f = reminderFixture();
  await f.setTrialReminderOwner("alice");
  await f.syncTrialReminder("alice", receipt(), { productId: "pro:yearly", enabled: false });
  assert.equal(f.scheduled.size, 0);
  await f.syncTrialReminder("alice", receipt(), { productId: "pro:yearly", enabled: true });
  assert.equal(f.scheduled.size, 1);
  assert.equal(
    [...f.scheduled.values()][0].trigger.date.getTime(),
    Date.parse("2026-11-28T10:00:00Z"),
  );
  assert.deepEqual(f.calls, []);
  await f.syncTrialReminder("alice", receipt({ willRenew: false }));
  assert.equal(f.scheduled.size, 0);
  await f.syncTrialReminder("alice", receipt(), { productId: "pro", enabled: true });
  await f.setTrialReminderOwner("bob");
  await f.syncTrialReminder("alice", receipt(), { productId: "pro", enabled: true });
  assert.equal(f.scheduled.size, 0);
  assert.equal(f.storage.size, 0);
});
test("notification denial never schedules or requests permission during reconciliation", async () => {
  const f = reminderFixture();
  f.permission.granted = false;
  await f.setTrialReminderOwner("alice");
  await f.syncTrialReminder("alice", receipt(), { productId: "pro", enabled: true });
  assert.equal(f.scheduled.size, 0);
  assert.deepEqual(f.calls, []);
  assert.equal(await f.requestTrialReminderPermission(), false);
  assert.deepEqual(f.calls, ["permission"]);
});

test("a newer cancellation cannot be undone by an older same-account receipt", async () => {
  const f = reminderFixture();
  await f.setTrialReminderOwner("alice");
  await f.syncTrialReminder(
    "alice",
    { ...receipt(), requestDate: "2026-11-23T10:00:00Z" },
    { productId: "pro", enabled: true },
  );
  await f.syncTrialReminder("alice", {
    ...receipt({ willRenew: false }),
    requestDate: "2026-11-23T12:00:00Z",
  });
  await f.syncTrialReminder("alice", { ...receipt(), requestDate: "2026-11-23T11:00:00Z" });
  assert.equal(f.scheduled.size, 0);
});
test("rapid cleanup and remount preserve the current account's reminder", async () => {
  const f = reminderFixture();
  await f.setTrialReminderOwner("alice");
  await f.syncTrialReminder("alice", receipt(), { productId: "pro", enabled: true });
  const cleanup = f.setTrialReminderOwner(null);
  const remount = f.setTrialReminderOwner("alice");
  await Promise.all([cleanup, remount]);
  assert.equal(f.scheduled.size, 1);
  await f.setTrialReminderOwner(null);
  assert.equal(f.scheduled.size, 0);
});

test("reconciliation restores a reminder cleared by the OS and validates tap ownership", async () => {
  const f = reminderFixture();
  await f.setTrialReminderOwner("alice");
  await f.syncTrialReminder("alice", receipt(), { productId: "pro", enabled: true });
  assert.equal(await f.ownsTrialReminder("alice"), true);
  assert.equal(await f.ownsTrialReminder("bob"), false);
  f.scheduled.clear();
  await f.syncTrialReminder("alice", receipt());
  assert.equal(f.scheduled.size, 1);
  await f.setTrialReminderOwner(null);
  assert.equal(await f.ownsTrialReminder("alice"), false);
});

function momentHookFixture() {
  const slots = [],
    layout = [],
    effects = [],
    storage = new Map(),
    events = [],
    appListeners = new Set();
  let cursor = 0,
    dirty = false,
    focused = true,
    args,
    result;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const effect = (queue) => (fn, deps) => {
    const index = cursor++,
      old = slots[index];
    if (old && same(old.deps, deps)) return;
    const next = { deps, cleanup: old?.cleanup };
    slots[index] = next;
    queue.push(() => {
      next.cleanup?.();
      next.cleanup = fn();
    });
  };
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [
        slots[i],
        (value) => {
          const next = typeof value === "function" ? value(slots[i]) : value;
          if (!Object.is(slots[i], next)) {
            slots[i] = next;
            dirty = true;
          }
        },
      ];
    },
    useRef(initial) {
      const i = cursor++;
      return (slots[i] ??= { current: initial });
    },
    useCallback(fn, deps) {
      const i = cursor++;
      if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { fn, deps };
      return slots[i].fn;
    },
    useEffect: effect(effects),
    useLayoutEffect: effect(layout),
  };
  const storageApi = {
    getItem: async (k) => storage.get(k) ?? null,
    setItem: async (k, v) => storage.set(k, v),
  };
  const deps = {
    react,
    "react-native": {
      AppState: {
        currentState: "active",
        addEventListener: (_name, callback) => {
          appListeners.add(callback);
          return { remove: () => appListeners.delete(callback) };
        },
      },
    },
    "expo-router": {
      useFocusEffect: (fn) => react.useEffect(() => (focused ? fn() : undefined), [focused, fn]),
    },
    "@react-native-async-storage/async-storage": storageApi,
    "@/src/services/telemetry": { trackEvent: (...event) => events.push(event) },
    "./moments": { firstEligibleMoment, parseMomentHistory },
  };
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL("../src/features/billing/use-moment.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  vm.runInNewContext(code, { exports, Promise, Date, require: (name) => deps[name] });
  function render(next = args) {
    args = next;
    dirty = false;
    cursor = 0;
    result = exports.useUpgradeMoment(...args);
    while (layout.length) layout.shift()();
    while (effects.length) effects.shift()();
    return result;
  }
  return {
    render,
    storage,
    events,
    storageApi,
    focus(value) {
      focused = value;
      render();
    },
    foreground(value) {
      appListeners.forEach((callback) => callback(value ? "active" : "background"));
      render();
    },
    async flush() {
      for (let i = 0; i < 6; i++) {
        await new Promise(setImmediate);
        if (dirty) render();
      }
      return result;
    },
  };
}
const candidate = () => workoutMoment(third, [first, second], today, "kg");
test("a background screen does not consume a prompt, and one committed prompt persists only once", async () => {
  const f = momentHookFixture();
  f.render(["alice", candidate(), true]);
  f.focus(false);
  await f.flush();
  assert.equal(f.storage.size, 0);
  f.focus(true);
  const shown = await f.flush();
  assert.equal(shown.moment.source, "workout_three");
  const stored = JSON.parse([...f.storage.values()][0]);
  assert.equal(stored.shown.length, 1);
  assert.equal(f.events.filter(([event]) => event === "upgrade_moment_viewed").length, 1);
  shown.dismiss();
  await f.flush();
  assert.equal(f.render().moment, null);
  assert.equal((await f.flush()).moment, null);
});
test("an account or entitlement change during storage lookup cannot expose the queued prompt", async () => {
  for (const change of ["account", "entitlement"]) {
    const f = momentHookFixture();
    let release;
    const blocked = new Promise((resolve) => {
      release = resolve;
    });
    let reading = false;
    const read = f.storageApi.getItem;
    f.storageApi.getItem = async (key) => {
      if (key.endsWith("alice")) {
        reading = true;
        await blocked;
      }
      return read(key);
    };
    f.render(["alice", candidate(), true]);
    // Commit focus, then let the serialized lookup begin.
    f.render();
    await new Promise(setImmediate);
    assert.equal(reading, true);
    f.render(change === "account" ? ["bob", candidate(), true] : ["alice", candidate(), false]);
    release();
    const shown = await f.flush();
    assert.equal(f.storage.has("fitsync.upgrade-moments.v1.alice"), false);
    if (change === "account") assert.equal(shown.moment.source, "workout_three");
    else assert.equal(shown.moment, null);
  }
});
test("the hook selects an unseen fallback and scopes session limits to the signed-in owner", async () => {
  const f = momentHookFixture();
  const achievement = candidate();
  const weekly = weeklyMoment([first, second], "2026-11-16T00:00:00Z", today, "kg");
  f.storage.set(
    "fitsync.upgrade-moments.v1.alice",
    JSON.stringify({ seen: [achievement.key], shown: [] }),
  );
  f.render(["alice", [achievement, weekly], true]);
  assert.equal((await f.flush()).moment.source, "weekly_review");
  f.render(["bob", [achievement, weekly], true]);
  assert.equal((await f.flush()).moment.source, "workout_three");
  assert.equal(JSON.parse(f.storage.get("fitsync.upgrade-moments.v1.bob")).shown.length, 1);
});
test("backgrounding before a card commits does not consume its session opportunity", async () => {
  const f = momentHookFixture();
  f.render(["alice", candidate(), true]);
  f.render();
  // Let lookup reserve a card without committing the queued React render.
  await new Promise(setImmediate);
  f.foreground(false);
  assert.equal((await f.flush()).moment, null);
  assert.equal(f.storage.size, 0);
  f.foreground(true);
  assert.equal((await f.flush()).moment.source, "workout_three");
  assert.equal(f.events.filter(([name]) => name === "upgrade_moment_viewed").length, 1);
});
