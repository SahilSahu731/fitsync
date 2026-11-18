import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { homeSnapshot } from "../src/features/home/model.ts";
import * as progressModel from "../src/features/progress/model.ts";
import * as programView from "../src/features/program-follow/program-view.ts";

const workout = (id, date, extra = {}) => ({
  id,
  name: "Training",
  status: "completed",
  started_at: `${date}T09:00:00`,
  finished_at: `${date}T10:00:00`,
  elapsed_seconds: 1200,
  workout_session_exercises: [],
  ...extra,
});
const metric = (id, name, date, value, observedAt = "2026-11-17T12:00:00Z") => ({
  id,
  kind: "metric",
  metric: name,
  date,
  value,
  observedAt,
  source: "manual",
  notes: "",
});

test("Home counts the calendar week and excludes incomplete, invalid and future workouts", () => {
  const result = homeSnapshot(
    [
      workout("previous", "2026-11-15"),
      workout("monday", "2026-11-16"),
      workout("today", "2026-11-17"),
      workout("future", "2026-11-18"),
      workout("active", "2026-11-17", { status: "active" }),
      workout("unfinished", "2026-11-17", { finished_at: null }),
      workout("invalid", "2026-11-17", { finished_at: "invalid" }),
    ],
    [],
    "2026-11-17",
  );
  assert.equal(result.weeklyCount, 2);
  assert.equal(result.weeklyMinutes, 40);
  assert.equal(result.days[0].date, "2026-11-16");
  assert.equal(result.days[6].date, "2026-11-22");
  assert.deepEqual(
    result.days.map((day) => day.count),
    [1, 1, 0, 0, 0, 0, 0],
  );
  assert.deepEqual(
    result.recent.map((item) => item.id),
    ["today", "monday", "previous"],
  );
});

test("Home preserves explicit zero, corrections, deletion, and the date of the last weight", () => {
  const result = homeSnapshot(
    [],
    [
      metric("water", "water", "2026-11-17", 500),
      metric("water-edit", "water", "2026-11-17", 750, "2026-11-17T13:00:00Z"),
      metric("steps", "steps", "2026-11-17", 0),
      metric("sleep", "sleep", "2026-11-17", 8),
      metric("sleep-delete", "sleep", "2026-11-17", null, "2026-11-17T14:00:00Z"),
      metric("old-weight", "weight", "2026-11-12", 75),
      metric("new-weight", "weight", "2026-11-16", 74.5),
      metric("future-weight", "weight", "2026-11-18", 70),
    ],
    "2026-11-17",
  );
  assert.equal(result.daily.find((entry) => entry.metric === "steps").value, 0);
  assert.equal(result.daily.find((entry) => entry.metric === "water").value, 750);
  assert.equal(
    result.daily.some((entry) => entry.metric === "sleep"),
    false,
  );
  assert.equal(result.weight.value, 74.5);
  assert.equal(result.weight.date, "2026-11-16");
});

test("Sunday remains in the same week and Monday starts a fresh week", () => {
  const sessions = [workout("sunday", "2026-11-22")];
  assert.equal(homeSnapshot(sessions, [], "2026-11-22").weeklyCount, 1);
  assert.equal(homeSnapshot(sessions, [], "2026-11-23").weeklyCount, 0);
});

test("Missing or negative durations do not inflate training time", () => {
  const result = homeSnapshot(
    [
      workout("missing", "2026-11-17", { elapsed_seconds: null }),
      workout("negative", "2026-11-17", { elapsed_seconds: -120 }),
      workout("invalid", "2026-11-17", { elapsed_seconds: NaN }),
    ],
    [],
    "2026-11-17",
  );
  assert.equal(result.weeklyCount, 3);
  assert.equal(result.weeklyMinutes, 0);
});

const jsx = (type, props = {}) => (typeof type === "function" ? type(props) : { type, props });
function nodes(node, predicate = () => true) {
  if (node == null || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((child) => nodes(child, predicate));
  return [...(predicate(node) ? [node] : []), ...nodes(node.props?.children, predicate)];
}
function text(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node !== "object") return String(node);
  if (Array.isArray(node)) return node.map(text).join(" ");
  return text(node.props?.children);
}
function component(tree, name) {
  const match = nodes(tree, (node) => node.type === name)[0];
  assert.ok(match, `Expected ${name}`);
  return match;
}
function button(tree, label) {
  const match = nodes(
    tree,
    (node) =>
      node.props?.accessibilityRole === "button" &&
      (node.props.accessibilityLabel === label || text(node) === label),
  )[0];
  assert.ok(match, `Expected button: ${label}`);
  return match;
}
const settle = () => new Promise((resolve) => setImmediate(resolve));
function homeFixture({ isPro = false, loading = false, storageError = "", increment } = {}) {
  const slots = [];
  let cursor = 0;
  const calls = { routes: [], water: [], logs: [] };
  const session = { user: { id: "alice", name: "Alex Rivera" }, settings: { weightUnit: "kg" } };
  const billing = { isPro, loading: false };
  const progress = {
    loading,
    refreshing: false,
    storageError,
    syncError: "",
    workoutError: "",
    hasGoals: true,
    goals: { steps: 8000, water: 2000, weeklyWorkouts: 3 },
    journal: { workouts: [], events: [] },
    refresh: async () => {},
    increment: async (...args) => {
      calls.water.push(args);
      await increment?.(...args);
    },
    log: async (...args) => calls.logs.push(args),
  };
  const workoutState = {
    session: null,
    loading: false,
    busy: false,
    pendingCompletion: false,
    refresh: async () => {},
    start: async () => {},
  };
  const program = { active: null, loading: false, error: "", refresh: async () => {} };
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [
        slots[index],
        (next) => {
          slots[index] = typeof next === "function" ? next(slots[index]) : next;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      return (slots[index] ??= { current: initial });
    },
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useEffect() {},
    useLayoutEffect() {},
  };
  class TestDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : ["2026-11-18T10:00:00"]));
    }
    static now() {
      return new TestDate().valueOf();
    }
  }
  const dependencies = {
    react,
    "react/jsx-runtime": {
      jsx: (type, props, key) => ({ ...jsx(type, props), ...(key == null ? {} : { key }) }),
      jsxs: (type, props, key) => ({ ...jsx(type, props), ...(key == null ? {} : { key }) }),
    },
    "react-native": {
      View: "View",
      Image: "Image",
      RefreshControl: "RefreshControl",
      ActivityIndicator: "Loading",
    },
    "expo-router": {
      useRouter: () => ({ push: (route) => calls.routes.push(route) }),
      useFocusEffect() {},
    },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/components/tab-bar-motion": { TabScrollView: "TabScrollView" },
    "@/src/components/motion": { MotionPressable: "Pressable", ScreenEntrance: "ScreenEntrance" },
    "@/src/components/ui": { SectionHeading: "SectionHeading", Txt: "Txt" },
    "@/src/constants/theme": { C: { brand: "white", ink: "white", muted: "gray" } },
    "@/src/context/session": { useSession: () => session },
    "@/src/features/billing/billing-context": { useBilling: () => billing },
    "@/src/features/progress/home-goals": { HomeGoals: "HomeGoals" },
    "@/src/features/progress/use-progress": { useProgress: () => progress },
    "@/src/features/progress/model": progressModel,
    "@/src/features/progress/editors": {
      MetricEditor: "MetricEditor",
      Sheet: (props) => ({
        type: "Sheet",
        props: { ...props, children: [props.children, props.footer] },
      }),
    },
    "@/src/features/workouts/workout-context": { useWorkout: () => workoutState },
    "@/src/features/workouts/components/workout-sync-notice": {
      WorkoutSyncNotice: "WorkoutSyncNotice",
    },
    "@/src/features/workouts/components/start-workout-dialog": {
      StartWorkoutDialog: "StartWorkoutDialog",
    },
    "@/src/features/companion/today-card": { TodayForYouCard: "TodayForYouCard" },
    "@/src/features/program-follow/program-context": { useProgram: () => program },
    "@/src/features/home/daily-overview": { DailyOverview: "DailyOverview" },
    "@/src/features/home/week-overview": { WeekOverview: "WeekOverview" },
    "@/src/features/home/workout-card": { HomeWorkoutCard: "HomeWorkoutCard" },
    "@/src/features/home/top-bar": { HomeTopBar: "HomeTopBar" },
    "@/src/features/home/reminder-sheet": { HomeReminderSheet: "HomeReminderSheet" },
    "@/src/features/home/quick-access": {
      HomeQuickLog: "HomeQuickLog",
      HomeEssentials: "HomeEssentials",
    },
    "@/src/features/home/model": { homeSnapshot },
  };
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL("../src/app/(tabs)/index.tsx", import.meta.url), "utf8"),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    Date: TestDate,
    Promise,
    Error,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return {
    calls,
    session,
    billing,
    progress,
    workout: workoutState,
    program,
    render() {
      cursor = 0;
      return exports.default();
    },
  };
}

test("Home sibling keys remain unique and account-owned widgets reset across accounts", () => {
  const ui = homeFixture();
  ui.session.user.id = "697f5e29-d216-4740-8073-f4e6e2261b55";
  function asElement(node) {
    if (Array.isArray(node)) return node.map(asElement);
    if (node == null || typeof node !== "object") return node;
    return React.createElement(
      typeof node.type === "string" ? node.type : "Component",
      node.key == null ? null : { key: node.key },
      asElement(node.props?.children),
    );
  }
  function checkSiblings(element) {
    if (!React.isValidElement(element)) return;
    const children = React.Children.toArray(element.props.children);
    const keys = children.filter(React.isValidElement).map((child) => child.key);
    assert.equal(new Set(keys).size, keys.length, "Sibling keys must be unique");
    children.forEach(checkSiblings);
  }
  let tree = ui.render();
  checkSiblings(asElement(tree));
  const originalHeaderKey = component(tree, "HomeTopBar").key;
  const originalWorkoutKey = component(tree, "HomeWorkoutCard").key;
  component(tree, "HomeTopBar").props.onReminders();
  component(tree, "HomeWorkoutCard").props.onStart();
  component(tree, "HomeQuickLog").props.onWater();
  tree = ui.render();
  component(tree, "HomeReminderSheet");
  component(tree, "StartWorkoutDialog");
  component(tree, "MetricEditor");
  checkSiblings(asElement(tree));
  ui.session.user = { id: "bob", name: "Bob" };
  tree = ui.render();
  checkSiblings(asElement(tree));
  assert.notEqual(component(tree, "HomeTopBar").key, originalHeaderKey);
  assert.notEqual(component(tree, "HomeWorkoutCard").key, originalWorkoutKey);
});

test("Home topbar opens Pro and profile, while the bell opens a local reminder dialog", () => {
  const ui = homeFixture();
  const header = component(ui.render(), "HomeTopBar").props;
  assert.equal(header.isPro, false);
  assert.equal(header.onSearch, undefined);
  header.onPro();
  header.onProfile();
  header.onReminders();
  assert.deepEqual(ui.calls.routes, ["/(tabs)/pro", "/profile"]);
  component(ui.render(), "HomeReminderSheet").props.onClose();
  assert.equal(nodes(ui.render(), (node) => node.type === "HomeReminderSheet").length, 0);
  ui.billing.isPro = true;
  const proHeader = component(ui.render(), "HomeTopBar").props;
  assert.equal(proHeader.isPro, true);
  proHeader.onPro();
  proHeader.onReminders();
  assert.equal(ui.calls.routes.at(-1), "/(tabs)/pro");
  assert.equal(ui.calls.routes.length, 3);
  component(ui.render(), "HomeReminderSheet");
});

test("Home closes the reminder dialog when the signed-in account changes", () => {
  const ui = homeFixture();
  component(ui.render(), "HomeTopBar").props.onReminders();
  component(ui.render(), "HomeReminderSheet");
  ui.session.user = { id: "bob", name: "Bob" };
  assert.equal(nodes(ui.render(), (node) => node.type === "HomeReminderSheet").length, 0);
});

test("Home quick logs keep free nutrition available, and Pro food opens today's diary", async () => {
  const ui = homeFixture();
  component(ui.render(), "HomeQuickLog").props.onSteps();
  let editor = component(ui.render(), "MetricEditor").props;
  assert.equal(editor.initialMetric, "steps");
  assert.equal(editor.date, "2026-11-18");
  await editor.onSave("steps", editor.date, 0, "Rest day");
  assert.deepEqual(ui.calls.logs, [["steps", "2026-11-18", 0, "Rest day"]]);
  editor.onClose();
  component(ui.render(), "HomeQuickLog").props.onFood();
  editor = component(ui.render(), "MetricEditor").props;
  assert.equal(editor.initialMetric, "caloriesIn");
  editor.onClose();
  ui.billing.isPro = true;
  component(ui.render(), "HomeQuickLog").props.onFood();
  assert.equal(ui.calls.routes.at(-1).pathname, "/nutrition");
  assert.equal(ui.calls.routes.at(-1).params.date, "2026-11-18");
});

test("Home does not open logs before the journal is ready, and account changes hide drawers", () => {
  const ui = homeFixture({ loading: true });
  assert.equal(component(ui.render(), "HomeQuickLog").props.disabled, true);
  component(ui.render(), "HomeQuickLog").props.onWater();
  assert.equal(nodes(ui.render(), (node) => node.type === "MetricEditor").length, 0);
  ui.progress.loading = false;
  component(ui.render(), "HomeQuickLog").props.onMore();
  assert.equal(component(ui.render(), "MetricEditor").props.startWithPicker, true);
  ui.session.user = { id: "bob", name: "Bob" };
  assert.equal(nodes(ui.render(), (node) => node.type === "MetricEditor").length, 0);
  assert.equal(nodes(ui.render(), (node) => node.type === "Sheet").length, 0);
  ui.progress.storageError = "Storage unavailable";
  assert.equal(component(ui.render(), "DailyOverview").props.disabled, true);
});

test("Water quick-add locks each account until its save finishes, including account switchbacks", async () => {
  const pending = [];
  const ui = homeFixture({ increment: () => new Promise((resolve) => pending.push(resolve)) });
  const addAlice = component(ui.render(), "DailyOverview").props.onWater;
  addAlice();
  addAlice();
  assert.equal(ui.calls.water.length, 1);
  assert.equal(component(ui.render(), "DailyOverview").props.waterBusy, true);
  ui.session.user = { id: "bob", name: "Bob" };
  component(ui.render(), "DailyOverview").props.onWater();
  assert.equal(ui.calls.water.length, 2);
  ui.session.user = { id: "alice", name: "Alex" };
  component(ui.render(), "DailyOverview").props.onWater();
  assert.equal(ui.calls.water.length, 2);
  pending[0]();
  await settle();
  assert.equal(component(ui.render(), "DailyOverview").props.waterBusy, false);
  assert.match(text(ui.render()), /250 ml added/);
  pending[1]();
  await settle();
  assert.doesNotMatch(text(ui.render()), /250 ml added/);
  assert.deepEqual(ui.calls.water[0], ["water", "2026-11-18", 250, "Added 250 ml of water."]);
});

test("A failed water save can be retried and never reports success", async () => {
  let attempts = 0;
  const ui = homeFixture({
    increment: async () => {
      if (++attempts === 1) throw new Error("Could not save water");
    },
  });
  component(ui.render(), "DailyOverview").props.onWater();
  await settle();
  assert.match(text(ui.render()), /Could not save water/);
  assert.doesNotMatch(text(ui.render()), /250 ml added/);
  assert.equal(component(ui.render(), "DailyOverview").props.waterBusy, false);
  component(ui.render(), "DailyOverview").props.onWater();
  await settle();
  assert.equal(attempts, 2);
  assert.match(text(ui.render()), /250 ml added/);
});

test("A manual workout start stays available during a program error and resumes active workouts", () => {
  const ui = homeFixture();
  ui.program.loading = true;
  ui.program.error = "Offline";
  component(ui.render(), "HomeWorkoutCard").props.onStart();
  component(ui.render(), "StartWorkoutDialog").props.onClose();
  ui.workout.session = { id: "active" };
  component(ui.render(), "HomeWorkoutCard").props.onStart();
  assert.deepEqual(ui.calls.routes, ["/workout"]);
  ui.workout.session = null;
  ui.workout.pendingCompletion = true;
  component(ui.render(), "HomeWorkoutCard").props.onStart();
  assert.equal(nodes(ui.render(), (node) => node.type === "StartWorkoutDialog").length, 0);
});

function heroFixture({ isPro = false, ensureSynced = async () => {} } = {}) {
  const slots = [];
  let cursor = 0;
  const calls = { routes: [], starts: 0, api: [], syncs: 0, refreshes: 0 };
  const session = { user: { id: "alice", name: "Alex" } };
  const billing = { isPro, loading: false };
  const workout = {
    session: null,
    loading: false,
    busy: false,
    pendingCompletion: false,
    ensureSynced: async () => {
      calls.syncs++;
      await ensureSynced();
    },
    refresh: async () => {
      calls.refreshes++;
    },
  };
  const program = { active: null, loading: false, error: "", refresh: async () => {} };
  const coaching = {
    data: null,
    loading: false,
    busy: false,
    error: "",
    refresh: async () => {},
    mutate: async (key, callback) => callback("request"),
    api: {
      start: async (...args) => {
        calls.api.push(args);
        return { status: "active" };
      },
    },
  };
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [
        slots[index],
        (next) => {
          slots[index] = typeof next === "function" ? next(slots[index]) : next;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      return (slots[index] ??= { current: initial });
    },
    useLayoutEffect: (effect) => {
      effect();
    },
    useImperativeHandle() {},
  };
  const dependencies = {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { View: "View", ActivityIndicator: "Loading" },
    "expo-router": { router: { push: (route) => calls.routes.push(route) } },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/components/ui": { Txt: "Txt" },
    "@/src/components/motion": { MotionPressable: "Pressable" },
    "@/src/constants/theme": { C: { bg: "black", ink: "white", muted: "gray" } },
    "@/src/context/session": { useSession: () => session },
    "../billing/billing-context": { useBilling: () => billing },
    "../coaching/use-coaching": { useCoaching: () => coaching },
    "../program-follow/program-context": { useProgram: () => program },
    "../program-follow/program-view": programView,
    "../program-follow/workout-action": { WorkoutAction: "WorkoutAction" },
    "../progress/model": progressModel,
    "../workouts/workout-context": { useWorkout: () => workout },
  };
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync(new URL("../src/features/home/workout-card.tsx", import.meta.url), "utf8"),
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      },
    ).outputText,
    {
      exports,
      Date,
      Error,
      Promise,
      require: (name) => {
        assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
        return dependencies[name];
      },
    },
  );
  return {
    calls,
    session,
    billing,
    workout,
    program,
    coaching,
    focus: exports.homeCoachingFocus,
    render() {
      cursor = 0;
      return exports.HomeWorkoutCard({ today: "2026-11-18", onStart: () => calls.starts++ });
    },
  };
}
const coachingDay = (id, date, status = "planned") => ({
  id,
  date,
  status,
  name: "Upper body",
  week: 1,
  day: 1,
  prescription: { minutes: 45, exercises: [{ name: "Bench press", exerciseId: "bench" }] },
});

test("An active workout stays resumable while membership and program data are loading", () => {
  const ui = heroFixture();
  ui.billing.loading = true;
  ui.program.loading = true;
  ui.workout.session = { id: "active", name: "My workout", workout_session_exercises: [] };
  const tree = ui.render();
  assert.match(text(tree), /WORKOUT IN PROGRESS/);
  assert.equal(button(tree, "Resume workout").props.disabled, false);
  button(tree, "Resume workout").props.onPress();
  assert.deepEqual(ui.calls.routes, ["/workout"]);
});

test("A queued completion offers sync rather than another workout start", async () => {
  const ui = heroFixture();
  ui.workout.pendingCompletion = true;
  const tree = ui.render();
  assert.doesNotMatch(text(tree), /Start a workout/);
  button(tree, "Sync workout").props.onPress();
  await settle();
  assert.equal(ui.calls.syncs, 1);
  assert.equal(ui.calls.refreshes, 1);
  assert.equal(ui.calls.starts, 0);
});

test("Free users start manual workouts despite unavailable program data", () => {
  const ui = heroFixture();
  ui.program.loading = true;
  ui.program.error = "Offline";
  ui.coaching.data = { plan: { sessions: [coachingDay("future", "2026-11-19")] } };
  button(ui.render(), "Start a workout").props.onPress();
  assert.equal(ui.calls.starts, 1);
  assert.equal(ui.calls.api.length, 0);
});

test("A future coaching session stays a preview on a rest day", () => {
  const ui = heroFixture({ isPro: true });
  const future = coachingDay("future", "2026-11-19");
  ui.coaching.data = { plan: { name: "Strength", sessions: [future] } };
  assert.equal(ui.focus(ui.coaching.data.plan, "2026-11-18").day, null);
  assert.equal(ui.focus(ui.coaching.data.plan, "2026-11-18").next.id, "future");
  const tree = ui.render();
  assert.match(text(tree), /Room to recover/);
  button(tree, "Start a workout").props.onPress();
  assert.equal(ui.calls.starts, 1);
  assert.equal(ui.calls.api.length, 0);
});

test("Today's coaching workout syncs first and prevents rapid duplicate starts", async () => {
  let resolveSync;
  const ui = heroFixture({
    isPro: true,
    ensureSynced: () =>
      new Promise((resolve) => {
        resolveSync = resolve;
      }),
  });
  ui.coaching.data = { plan: { name: "Strength", sessions: [coachingDay("today", "2026-11-18")] } };
  const start = button(ui.render(), "Start today’s workout").props.onPress;
  start();
  start();
  assert.equal(ui.calls.syncs, 1);
  assert.equal(ui.calls.api.length, 0);
  resolveSync();
  await settle();
  assert.deepEqual(ui.calls.api, [["today", "request"]]);
  assert.deepEqual(ui.calls.routes, ["/workout"]);
});

for (const change of ["account", "membership", "pending completion"]) {
  test(`A pending coaching start stops when ${change} changes during sync`, async () => {
    let resolveSync;
    const ui = heroFixture({
      isPro: true,
      ensureSynced: () =>
        new Promise((resolve) => {
          resolveSync = resolve;
        }),
    });
    ui.coaching.data = { plan: { sessions: [coachingDay("today", "2026-11-18")] } };
    button(ui.render(), "Start today’s workout").props.onPress();
    if (change === "account") ui.session.user = { id: "bob", name: "Bob" };
    if (change === "membership") ui.billing.isPro = false;
    if (change === "pending completion") ui.workout.pendingCompletion = true;
    ui.render();
    resolveSync();
    await settle();
    assert.equal(ui.calls.api.length, 0);
    assert.equal(ui.calls.routes.length, 0);
  });
}
