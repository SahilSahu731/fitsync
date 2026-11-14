import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const jsx = (type, props) => ({ type, props });
function load(file, dependencies) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    Date,
    Intl,
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (!(name in dependencies)) throw Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}
function find(node, type) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((child) => find(child, type));
  return [...(node.type === type ? [node] : []), ...find(node.props?.children, type)];
}

test("the bar exposes only the five requested tabs in order", () => {
  const Tabs = Object.assign(() => null, { Screen: "Screen" });
  const calls = [];
  const exports = load("../src/app/(tabs)/_layout.tsx", {
    react: { useEffect() {}, useState: (value) => [value, () => {}] },
    "react-native": { View: "View" },
    "expo-router": { Tabs },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: 0 }) },
    "@/src/context/session": {
      useSession: () => ({ ready: true, user: { id: "athlete" }, profile: {} }),
    },
    "@/src/features/workouts/components/active-workout-bar": {
      ActiveWorkoutBar: "ActiveWorkoutBar",
    },
    "@/src/components/tab-bar-motion": {
      TabBarMotionProvider: "MotionProvider",
      useTabBarMotion: () => ({ expand: () => calls.push("expand") }),
    },
    "@/src/components/animated-tabs": { AnimatedTabBar: "TabBar", AnimatedTabButton: "TabButton" },
    "@/src/components/glass-tabs": { TabGlassProvider: "GlassProvider" },
    "@/src/features/experience/experience-context": {
      useExperience: () => ({ feedback: () => calls.push("feedback") }),
    },
    "@/src/constants/theme": { C: { bg: "#000000" } },
  });
  const tree = exports.default();
  const screens = find(tree, "Screen");
  assert.deepEqual(
    screens
      .filter((screen) => screen.props.options.href !== null)
      .map((screen) => screen.props.options.title),
    ["Home", "Train", "Progress", "Library", "Pro"],
  );
  assert.equal(
    screens.some((screen) => screen.props.name === "profile"),
    false,
  );
  // A restored navigation state may list routes in a different order.
  const state = {
    routes: ["stats", "pro", "library", "progress", "train", "index"].map((name) => ({
      name,
      key: name,
    })),
    index: 3,
  };
  let prevented = false;
  const navigation = {
    emit: () => ({ defaultPrevented: prevented }),
    navigate: (name) => calls.push(name),
  };
  const bar = find(tree, Tabs)[0].props.tabBar({ state, navigation });
  const rendered = bar.type(bar.props);
  const buttons = find(rendered, "TabButton");
  assert.deepEqual(
    buttons.map((button) => button.props.label),
    ["Home", "Train", "Progress", "Library", "Pro"],
  );
  assert.equal(find(rendered, "TabBar")[0].props.selectedIndex, 2);
  assert.equal(buttons[2].props.focused, true);
  assert.ok(buttons.every((button) => button.props.avatarUrl === undefined));
  buttons[3].props.onPress();
  assert.deepEqual(calls, ["expand", "feedback", "library"]);
  prevented = true;
  buttons[0].props.onPress();
  assert.equal(calls.length, 3, "prevented navigation stays on the current screen");
});

const model = load("../src/features/progress/model.ts", {});
const analytics = load("../src/features/progress/analytics.ts", { "./model": model });
const today = "2026-11-13";
function workout(id, date) {
  return {
    id,
    name: `Workout ${id}`,
    status: "completed",
    started_at: `${date}T09:00:00Z`,
    finished_at: `${date}T10:00:00Z`,
    elapsed_seconds: 1200,
    workout_session_exercises: [
      {
        exercise_id: "bench",
        exercise_name: "Bench press",
        tracking_type: "reps_weight",
        workout_logged_sets: [
          { completed_at: `${date}T09:30:00Z`, set_type: "normal", weight_kg: 60, reps: 10 },
        ],
      },
    ],
  };
}
function progressFixture() {
  const state = [];
  let cursor = 0;
  const calls = [];
  const session = { settings: { weightUnit: "kg" } };
  const progress = {
    journal: {
      workouts: [workout("recent", "2026-11-12"), workout("older", "2026-10-24")],
      workoutsUpdatedAt: today,
      events: [],
      pending: [],
    },
    goals: { weeklyWorkouts: 3 },
    loading: false,
    refreshing: false,
    storageError: "",
    workoutError: "",
    syncError: "",
    refresh: () => calls.push("refresh"),
  };
  const exports = load("../src/features/progress/dashboard.tsx", {
    react: {
      useMemo: (fn) => fn(),
      useRef: (value) => ({ current: value }),
      useState(initial) {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [
          state[index],
          (value) => {
            state[index] = typeof value === "function" ? value(state[index]) : value;
          },
        ];
      },
    },
    "react-native": {
      ActivityIndicator: "Loading",
      RefreshControl: "Refresh",
      View: "View",
      TextInput: "Input",
    },
    "expo-router": { useRouter: () => ({ push: (route) => calls.push(route) }) },
    "@/src/components/motion": { MotionPressable: "Pressable", ScreenEntrance: "Entrance" },
    "@/src/components/tab-bar-motion": { TabScrollView: "ScrollView" },
    "@/src/components/ui": { PageHeading: "Heading", Txt: "Txt" },
    "@/src/constants/theme": { C: { ink: "#FFFFFF", bg: "#000000" } },
    "@/src/context/session": { useSession: () => session },
    "./analytics": analytics,
    "./training-trends": { TrainingTrends: "Trends" },
    "./editors": { GoalsEditor: "Goals", MetricEditor: "Editor", Sheet: "Sheet" },
    "./consistency": { ConsistencySection: "Consistency" },
    "./metric-detail": { MetricDetail: "MetricDetail" },
    "./walk-counter": { WalkCounter: "WalkCounter" },
    "./plus": { PlusPreview: "PlusPreview" },
    "./model": { ...model, localDate: () => today },
    "./strength": { StrengthSection: "Strength" },
    "./tracking-cards": { compact: (value) => String(value), TrainingStats: "Totals" },
    "./use-progress": { useProgress: () => progress },
    "./visuals": { Icon: "Icon", PanelCard: "Panel", SectionTitle: "Title", SmallButton: "Button" },
  });
  return {
    progress,
    calls,
    session,
    render() {
      cursor = 0;
      return exports.ProgressDashboard();
    },
  };
}

test("Progress shares its date range and saved workouts with the merged Stats charts", () => {
  const fixture = progressFixture();
  let tree = fixture.render();
  assert.equal(find(tree, "Totals")[0].props.data.current.workouts, 2);
  assert.equal(find(tree, "Trends")[0].props.data.current.workouts, 2);
  find(tree, "Pressable")
    .find((button) => button.props.accessibilityLabel === "Last 7 days")
    .props.onPress();
  fixture.session.settings.weightUnit = "lb";
  tree = fixture.render();
  assert.equal(find(tree, "Totals")[0].props.data.current.workouts, 1);
  const trends = find(tree, "Trends")[0].props;
  assert.equal(trends.days, 7);
  assert.equal(trends.unit, "lb");
  assert.equal(trends.data.activity.length, 7);
  assert.equal(find(tree, "Totals")[0].props.data, trends.data);

  const walk = (node) => {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(walk);
    return [...(node.type?.name === "WorkoutRows" ? [node] : []), ...walk(node.props?.children)];
  };
  const historyTab = find(tree, "Pressable").find(
    (button) =>
      button.props.accessibilityRole === "tab" &&
      button.props.children.props.children === "History",
  );
  historyTab.props.onPress();
  tree = fixture.render();
  const historyRows = walk(tree)[0];
  assert.equal(
    historyRows.props.workouts.length,
    2,
    "full history is preserved across range changes",
  );
  const renderedRows = historyRows.type(historyRows.props);
  find(renderedRows, "Pressable")[0].props.onPress();
  assert.equal(fixture.calls[0].pathname, "/workout/history/[id]");
  assert.equal(fixture.calls[0].params.id, "recent");
  assert.ok(
    find(tree, "Input").some(
      (input) => input.props.accessibilityLabel === "Search saved metrics or notes",
    ),
  );
});

test("Progress retains Health and its check-in controls alongside the merged training view", () => {
  const fixture = progressFixture();
  const tree = fixture.render();
  find(tree, "Pressable")
    .find(
      (button) =>
        button.props.accessibilityRole === "tab" &&
        button.props.children.props.children === "Health",
    )
    .props.onPress();
  const health = fixture.render();
  assert.equal(find(health, "Trends").length, 0);
  assert.ok(
    find(health, "Input").some(
      (input) => input.props.accessibilityLabel === "Search all health metrics",
    ),
  );
  assert.ok(
    find(health, "Pressable").some(
      (button) => button.props.accessibilityLabel === "Log a health check-in",
    ),
  );
});

test("merged training distinguishes first sync, failures, cached data, and a real empty account", () => {
  const fixture = progressFixture();
  fixture.progress.journal = { workouts: [], events: [], pending: [] };
  fixture.progress.refreshing = true;
  assert.equal(find(fixture.render(), "Loading").length, 1);
  assert.equal(find(fixture.render(), "Trends").length, 0);
  fixture.progress.refreshing = false;
  fixture.progress.workoutError = "Offline";
  let tree = fixture.render();
  assert.equal(find(tree, "Totals").length, 0);
  find(tree, "Button")
    .find((button) => button.props.label === "Retry")
    .props.onPress();
  assert.deepEqual(fixture.calls, ["refresh"]);
  fixture.progress.journal = {
    workouts: [workout("cached", "2026-11-12")],
    events: [],
    pending: [],
    workoutsUpdatedAt: today,
  };
  assert.equal(find(fixture.render(), "Trends")[0].props.data.current.workouts, 1);
  fixture.progress.workoutError = "";
  fixture.progress.journal = { workouts: [], events: [], pending: [], workoutsUpdatedAt: today };
  tree = fixture.render();
  assert.equal(find(tree, "Totals")[0].props.data.current.workouts, 0);
  assert.equal(find(tree, "Trends")[0].props.data.current.workouts, 0);
});

function trendsFixture(workouts = [workout("recent", "2026-11-12")]) {
  const state = [];
  let cursor = 0;
  const exports = load("../src/features/progress/training-trends.tsx", {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [
          state[index],
          (value) => {
            state[index] = value;
          },
        ];
      },
    },
    "react-native": { View: "View" },
    "expo-router": { useRouter: () => ({ push() {} }) },
    "@/src/components/motion": { MotionPressable: "Pressable" },
    "@/src/components/ui": { Txt: "Txt" },
    "@/src/constants/theme": { C: { ink: "#FFFFFF", bg: "#000000" } },
    "./analytics": analytics,
    "./charts": { TrendChart: "Chart" },
    "./model": model,
    "./tracking-cards": { compact: String },
    "./visuals": { Icon: "Icon", PanelCard: "Panel", SectionTitle: "Title", SmallButton: "Button" },
  });
  return {
    render(unit = "kg") {
      cursor = 0;
      return exports.TrainingTrends({
        data: analytics.buildProgress(workouts, [], 7, today, 3),
        days: 7,
        unit,
      });
    },
  };
}

test("merged charts retain workout, volume, and duration series and convert weight units", () => {
  const fixture = trendsFixture();
  let tree = fixture.render();
  assert.equal(find(tree, "Chart")[0].props.points.length, 7);
  assert.equal(find(tree, "Chart")[0].props.unit, "workouts");
  find(tree, "Pressable")
    .find((button) => button.props.accessibilityLabel === "Show volume trend")
    .props.onPress();
  tree = fixture.render("lb");
  const chart = find(tree, "Chart")[0].props;
  assert.equal(chart.unit, "lb");
  assert.equal(
    chart.points.reduce((sum, point) => sum + point.value, 0),
    model.weightValue(600, "lb"),
  );
  find(tree, "Pressable")
    .find((button) => button.props.accessibilityLabel === "Show minutes trend")
    .props.onPress();
  tree = fixture.render();
  assert.equal(find(tree, "Chart")[0].props.unit, "min");
  assert.equal(
    find(tree, "Chart")[0].props.points.reduce((sum, point) => sum + point.value, 0),
    20,
  );
});

test("empty training trends offer a first workout without fabricating a chart", () => {
  const tree = trendsFixture([]).render();
  assert.equal(find(tree, "Chart").length, 0);
  assert.ok(find(tree, "Button").some((button) => button.props.label === "Go to training"));
});

test("legacy Stats links redirect into the unified Progress tab", () => {
  const exports = load("../src/app/stats.tsx", {
    react: {},
    "expo-router": { Redirect: "Redirect" },
  });
  assert.equal(exports.default().props.href, "/(tabs)/progress");
});
