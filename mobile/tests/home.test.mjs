
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { homeSnapshot } from "../src/features/home/model.ts";
import * as progressModel from "../src/features/progress/model.ts";
import * as programView from "../src/features/program-follow/program-view.ts";

const workout = (id, date, extra = {}) => ({
  id, name: "Training", status: "completed", started_at: `${date}T09:00:00`,
  finished_at: `${date}T10:00:00`, elapsed_seconds: 1200,
  workout_session_exercises: [], ...extra,
});

const metric = (id, metric, date, value, observedAt = "2026-11-17T12:00:00Z") => ({
  id, kind: "metric", metric, date, value, observedAt, source: "manual", notes: "",
});

// Pure business rules do not need React mocks.
test("Home counts only valid completed workouts this week", () => {
  const result = homeSnapshot([
    workout("previous", "2026-11-15"), workout("monday", "2026-11-16"),
    workout("today", "2026-11-17"), workout("future", "2026-11-18"),
    workout("active", "2026-11-17", { status: "active" }),
    workout("unfinished", "2026-11-17", { finished_at: null }),
    workout("invalid", "2026-11-17", { finished_at: "invalid" }),
  ], [], "2026-11-17");

  assert.equal(result.weeklyCount, 2);
  assert.equal(result.weeklyMinutes, 40);
  assert.equal(result.days[0].date, "2026-11-16");
  assert.equal(result.days[6].date, "2026-11-22");
  assert.deepEqual(result.days.map((d) => d.count), [1, 1, 0, 0, 0, 0, 0]);
  assert.deepEqual(result.recent.map((w) => w.id), ["today", "monday", "previous"]);
});

test("Home respects zero, corrected values, deleted metrics, and latest weight", () => {
  const result = homeSnapshot([], [
    metric("water", "water", "2026-11-17", 500),
    metric("water-edit", "water", "2026-11-17", 750, "2026-11-17T13:00:00Z"),
    metric("steps", "steps", "2026-11-17", 0),
    metric("sleep", "sleep", "2026-11-17", 8),
    metric("sleep-delete", "sleep", "2026-11-17", null, "2026-11-17T14:00:00Z"),
    metric("old-weight", "weight", "2026-11-12", 75),
    metric("new-weight", "weight", "2026-11-16", 74.5),
    metric("future-weight", "weight", "2026-11-18", 70),
  ], "2026-11-17");

  assert.equal(result.daily.find((v) => v.metric === "steps").value, 0);
  assert.equal(result.daily.find((v) => v.metric === "water").value, 750);
  assert.equal(result.daily.some((v) => v.metric === "sleep"), false);
  assert.deepEqual([result.weight.value, result.weight.date], [74.5, "2026-11-16"]);
});

test("Sunday belongs to the current week; Monday starts the next", () => {
  const sessions = [workout("sunday", "2026-11-22")];
  assert.equal(homeSnapshot(sessions, [], "2026-11-22").weeklyCount, 1);
  assert.equal(homeSnapshot(sessions, [], "2026-11-23").weeklyCount, 0);
});

test("Missing, negative and invalid durations cannot inflate minutes", () => {
  const result = homeSnapshot([
    workout("missing", "2026-11-17", { elapsed_seconds: null }),
    workout("negative", "2026-11-17", { elapsed_seconds: -120 }),
    workout("invalid", "2026-11-17", { elapsed_seconds: NaN }),
  ], [], "2026-11-17");

  assert.equal(result.weeklyCount, 3);
  assert.equal(result.weeklyMinutes, 0);
});

// Minimal component harness: test behavior, not Tailwind classes or animations.
const jsx = (type, props = {}) => typeof type === "function" ? type(props) : { type, props };
const childrenOf = (node) => node?.props?.children;

function nodes(node, match = () => true) {
  if (Array.isArray(node)) return node.flatMap((item) => nodes(item, match));
  if (!node || typeof node !== "object") return [];
  return [...(match(node) ? [node] : []), ...nodes(childrenOf(node), match)];
}

function text(node) {
  if (node == null || typeof node === "boolean") return "";
  if (Array.isArray(node)) return node.map(text).join(" ");
  return typeof node === "object" ? text(childrenOf(node)) : String(node);
}

function component(tree, name) {
  const found = nodes(tree, (n) => n.type === name)[0];
  assert.ok(found, `Expected component: ${name}`);
  return found;
}

function button(tree, label) {
  const found = nodes(tree, (n) => n.props?.accessibilityRole === "button" &&
    (n.props.accessibilityLabel === label || text(n) === label))[0];
  assert.ok(found, `Expected button: ${label}`);
  return found;
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

function hooks(runLayout = false) {
  const values = [];
  let index = 0;

  return {
    reset() { index = 0; },
    react: {
      useState(initial) {
        const i = index++;
        if (!(i in values)) values[i] = typeof initial === "function" ? initial() : initial;
        return [values[i], (next) => {
          values[i] = typeof next === "function" ? next(values[i]) : next;
        }];
      },
      useRef(initial) {
        const i = index++;
        return (values[i] ??= { current: initial });
      },
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
      useEffect() {},
      useLayoutEffect(effect) { if (runLayout) effect(); },
      useImperativeHandle() {},
    },
  };
}

function loadSource(file, dependencies, globals = {}) {
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;

  const exports = {};

  vm.runInNewContext(code, {
    exports, Promise, Error, Date,
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    ...globals,
  });

  return exports;
}

const runtime = { jsx, jsxs: jsx };

// Home screen fixture
function homeFixture({ isPro = false, loading = false, storageError = "", increment } = {}) {
  const h = hooks();
  const calls = { routes: [], water: [], logs: [] };

  const session = {
    user: { id: "alice", name: "Alex Rivera" },
    settings: { weightUnit: "kg" },
  };

  const billing = { isPro, loading: false };

  const progress = {
    loading, refreshing: false, storageError, syncError: "", workoutError: "",
    hasGoals: true,
    goals: { steps: 8000, water: 2000, weeklyWorkouts: 3 },
    journal: { workouts: [], events: [] },
    refresh: async () => {},
    increment: async (...args) => {
      calls.water.push(args);
      await increment?.(...args);
    },
    log: async (...args) => { calls.logs.push(args); },
  };

  const workoutState = {
    session: null, loading: false, busy: false,
    pendingCompletion: false,
    refresh: async () => {},
    start: async () => {},
  };

  const program = {
    active: null, loading: false, error: "", refresh: async () => {},
  };

  class TestDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : ["2026-11-18T10:00:00"]));
    }
    static now() { return new TestDate().valueOf(); }
  }

  const dependencies = {
    react: h.react,
    "react/jsx-runtime": {
      jsx: (type, props, key) => ({ ...jsx(type, props), key }),
      jsxs: (type, props, key) => ({ ...jsx(type, props), key }),
    },
    "react-native": {
      View: "View", Image: "Image",
      RefreshControl: "RefreshControl", ActivityIndicator: "Loading",
    },
    "expo-router": {
      useRouter: () => ({ push: (route) => calls.routes.push(route) }),
      useFocusEffect() {},
    },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/components/tab-bar-motion": { TabScrollView: "TabScrollView" },
    "@/src/components/motion": {
      MotionPressable: "Pressable", ScreenEntrance: "ScreenEntrance",
    },
    "@/src/components/ui": { SectionHeading: "SectionHeading", Txt: "Txt" },
    "@/src/constants/theme": { C: { brand: "white", ink: "white", muted: "gray" } },
    "@/src/context/session": { useSession: () => session },
    "@/src/features/billing/billing-context": { useBilling: () => billing },
    "@/src/features/progress/home-goals": { HomeGoals: "HomeGoals" },
    "@/src/features/progress/use-progress": { useProgress: () => progress },
    "@/src/features/progress/model": progressModel,
    "@/src/features/progress/editors": {
      MetricEditor: "MetricEditor",
      Sheet: (props) => jsx("Sheet", {
        ...props, children: [props.children, props.footer],
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
      HomeQuickLog: "HomeQuickLog", HomeEssentials: "HomeEssentials",
    },
    "@/src/features/home/model": { homeSnapshot },
    "@/src/features/home/promo-slide": { PromoSlide: "PromoSlide" },
    "@/src/features/home/hero-carousel": {
      HomeHeroCarousel: (props) =>
        jsx("HomeHeroCarousel", { ...props, children: props.slides }),
    },
    "@/src/features/home/pro-promo-card": { ProPromoCard: "ProPromoCard" },
    "@/src/features/home/streak-card": {
      StreakCard: "StreakCard",
      computeStreak: () => ({ count: 0, doneToday: false, week: [] }),
    },
  };

  const exports = loadSource("../src/app/(tabs)/index.tsx", dependencies, {
    Date: TestDate,
  });

  return {
    calls, session, billing, progress, workout: workoutState, program,
    render() {
      h.reset();
      return exports.default();
    },
  };
}

// Workout card fixture
function heroFixture({ isPro = false, ensureSynced = async () => {} } = {}) {
  const h = hooks(true);
  const calls = { routes: [], starts: 0, api: [], syncs: 0, refreshes: 0 };
  const session = { user: { id: "alice", name: "Alex" } };
  const billing = { isPro, loading: false };

  const workout = {
    session: null, loading: false, busy: false, pendingCompletion: false,
    ensureSynced: async () => { calls.syncs++; await ensureSynced(); },
    refresh: async () => { calls.refreshes++; },
  };

  const program = {
    active: null, loading: false, error: "", refresh: async () => {},
  };

  const coaching = {
    data: null, loading: false, busy: false, error: "", refresh: async () => {},
    mutate: async (_, callback) => callback("request"),
    api: {
      start: async (...args) => {
        calls.api.push(args);
        return { status: "active" };
      },
    },
  };

  const dependencies = {
    react: h.react,
    "react/jsx-runtime": runtime,
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

    "./workout-card-ui": {
      WorkoutShell: ({ eyebrow, title, description, children }) =>
        jsx("WorkoutShell", {
          children: [eyebrow, title, description, children],
        }),

      HomeButton: ({ title, onPress, disabled, loading }) =>
        jsx("Pressable", {
          accessibilityRole: "button",
          accessibilityLabel: title,
          accessibilityState: { disabled: !!(disabled || loading) },
          disabled: !!(disabled || loading),
          onPress,
          children: title,
        }),

      SecondaryLink: ({ title, onPress, disabled }) =>
        jsx("Pressable", {
          accessibilityRole: "button",
          accessibilityLabel: title,
          disabled: !!disabled,
          onPress,
          children: title,
        }),
    },
  };

  const exports = loadSource("../src/features/home/workout-card.tsx", dependencies);

  return {
    calls, session, billing, workout, program, coaching,
    focus: exports.homeCoachingFocus,
    render() {
      h.reset();
      return exports.HomeWorkoutCard({
        today: "2026-11-18",
        onStart: () => calls.starts++,
      });
    },
  };
}

const coachingDay = (id, date, status = "planned") => ({
  id, date, status, name: "Upper body", week: 1, day: 1,
  prescription: {
    minutes: 45,
    exercises: [{ name: "Bench press", exerciseId: "bench" }],
  },
});

// Home screen behavior
test("Home keeps account-owned UI distinct after account switching", () => {
  const ui = homeFixture();
  const before = ui.render();
  const headerKey = component(before, "HomeTopBar").key;
  const workoutKey = component(before, "HomeWorkoutCard").key;

  ui.session.user = { id: "bob", name: "Bob" };
  const after = ui.render();

  assert.notEqual(component(after, "HomeTopBar").key, headerKey);
  assert.notEqual(component(after, "HomeWorkoutCard").key, workoutKey);
});

test("Home navigation, membership and reminder dialog", () => {
  const ui = homeFixture();
  const header = component(ui.render(), "HomeTopBar").props;

  assert.equal(header.isPro, false);
  header.onPro();
  header.onProfile();
  header.onReminders();

  assert.deepEqual(ui.calls.routes, ["/(tabs)/pro", "/profile"]);

  component(ui.render(), "HomeReminderSheet").props.onClose();
  assert.equal(nodes(ui.render(), (n) => n.type === "HomeReminderSheet").length, 0);

  ui.billing.isPro = true;
  const pro = component(ui.render(), "HomeTopBar").props;

  assert.equal(pro.isPro, true);
  pro.onPro();
  pro.onReminders();

  assert.equal(ui.calls.routes.at(-1), "/(tabs)/pro");
  assert.equal(ui.calls.routes.length, 3);
  component(ui.render(), "HomeReminderSheet");
});

test("Home closes reminders when the account changes", () => {
  const ui = homeFixture();
  component(ui.render(), "HomeTopBar").props.onReminders();
  component(ui.render(), "HomeReminderSheet");

  ui.session.user = { id: "bob", name: "Bob" };
  assert.equal(nodes(ui.render(), (n) => n.type === "HomeReminderSheet").length, 0);
});

test("Home logging supports free nutrition and Pro food diary", async () => {
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

test("Home blocks logging before data loads and clears dialogs across accounts", () => {
  const ui = homeFixture({ loading: true });

  assert.equal(component(ui.render(), "HomeQuickLog").props.disabled, true);
  component(ui.render(), "HomeQuickLog").props.onWater();
  assert.equal(nodes(ui.render(), (n) => n.type === "MetricEditor").length, 0);

  ui.progress.loading = false;
  component(ui.render(), "HomeQuickLog").props.onMore();
  assert.equal(component(ui.render(), "MetricEditor").props.startWithPicker, true);

  ui.session.user = { id: "bob", name: "Bob" };
  assert.equal(nodes(ui.render(), (n) => n.type === "MetricEditor").length, 0);
  assert.equal(nodes(ui.render(), (n) => n.type === "Sheet").length, 0);

  ui.progress.storageError = "Storage unavailable";
  assert.equal(component(ui.render(), "DailyOverview").props.disabled, true);
});

test("Water quick-add prevents duplicates and protects account switches", async () => {
  const pending = [];
  const ui = homeFixture({
    increment: () => new Promise((resolve) => pending.push(resolve)),
  });

  const add = component(ui.render(), "DailyOverview").props.onWater;
  add();
  add();

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
  assert.deepEqual(ui.calls.water[0], [
    "water", "2026-11-18", 250, "Added 250 ml of water.",
  ]);
});

test("A failed water save shows failure and allows retry", async () => {
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

test("Manual workout starts work through program errors; active sessions resume", () => {
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

  assert.equal(nodes(ui.render(), (n) => n.type === "StartWorkoutDialog").length, 0);
});

// Workout card behavior
test("An active workout stays resumable while membership and program load", () => {
  const ui = heroFixture();
  ui.billing.loading = true;
  ui.program.loading = true;
  ui.workout.session = {
    id: "active", name: "My workout", workout_session_exercises: [],
  };

  const tree = ui.render();

  assert.match(text(tree), /WORKOUT IN PROGRESS/);
  assert.equal(button(tree, "Resume workout").props.disabled, false);

  button(tree, "Resume workout").props.onPress();
  assert.deepEqual(ui.calls.routes, ["/workout"]);
});

test("Pending completion offers sync, never another workout start", async () => {
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

test("Free users can start manual workouts while programs are unavailable", () => {
  const ui = heroFixture();
  ui.program.loading = true;
  ui.program.error = "Offline";
  ui.coaching.data = {
    plan: { sessions: [coachingDay("future", "2026-11-19")] },
  };

  button(ui.render(), "Start a workout").props.onPress();

  assert.equal(ui.calls.starts, 1);
  assert.equal(ui.calls.api.length, 0);
});

test("Future coaching session remains a preview on rest days", () => {
  const ui = heroFixture({ isPro: true });
  ui.coaching.data = {
    plan: {
      name: "Strength",
      sessions: [coachingDay("future", "2026-11-19")],
    },
  };

  const focus = ui.focus(ui.coaching.data.plan, "2026-11-18");
  assert.equal(focus.day, null);
  assert.equal(focus.next.id, "future");

  const tree = ui.render();

  assert.match(text(tree), /Room to recover/);
  button(tree, "Start a workout").props.onPress();

  assert.equal(ui.calls.starts, 1);
  assert.equal(ui.calls.api.length, 0);
});

test("Coaching workout syncs first and prevents duplicate starts", async () => {
  let resolveSync;
  const ui = heroFixture({
    isPro: true,
    ensureSynced: () => new Promise((resolve) => { resolveSync = resolve; }),
  });

  ui.coaching.data = {
    plan: {
      name: "Strength",
      sessions: [coachingDay("today", "2026-11-18")],
    },
  };

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
  test(`Pending coaching start stops when ${change} changes during sync`, async () => {
    let resolveSync;
    const ui = heroFixture({
      isPro: true,
      ensureSynced: () => new Promise((resolve) => { resolveSync = resolve; }),
    });

    ui.coaching.data = {
      plan: {
        sessions: [coachingDay("today", "2026-11-18")],
      },
    };

    button(ui.render(), "Start today’s workout").props.onPress();

    if (change === "account") {
      ui.session.user = { id: "bob", name: "Bob" };
    }
    if (change === "membership") {
      ui.billing.isPro = false;
    }
    if (change === "pending completion") {
      ui.workout.pendingCompletion = true;
    }

    ui.render();
    resolveSync();
    await settle();

    assert.equal(ui.calls.api.length, 0);
    assert.equal(ui.calls.routes.length, 0);
  });
}
