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
    ["Home", "Train", "Stats", "Progress", "Library"],
  );
  assert.equal(
    screens.some((screen) => screen.props.name === "profile"),
    false,
  );
  // A restored navigation state may list routes in a different order.
  const state = {
    routes: ["profile", "library", "progress", "stats", "train", "index"].map((name) => ({
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
    ["Home", "Train", "Stats", "Progress", "Library"],
  );
  assert.equal(find(rendered, "TabBar")[0].props.selectedIndex, 2);
  assert.equal(buttons[2].props.focused, true);
  assert.ok(buttons.every((button) => button.props.avatarUrl === undefined));
  buttons[4].props.onPress();
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
function statsFixture() {
  const state = [];
  let cursor = 0;
  const calls = [];
  const session = { settings: { weightUnit: "kg" } };
  const progress = {
    journal: {
      workouts: [workout("recent", "2026-11-12"), workout("older", "2026-10-24")],
      workoutsUpdatedAt: today,
    },
    goals: { weeklyWorkouts: 3 },
    loading: false,
    refreshing: false,
    storageError: "",
    workoutError: "",
    refresh: () => calls.push("refresh"),
  };
  const exports = load("../src/features/progress/stats-dashboard.tsx", {
    react: {
      useMemo: (fn) => fn(),
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
    "react-native": { ActivityIndicator: "Loading", RefreshControl: "Refresh", View: "View" },
    "expo-router": { useRouter: () => ({ push: (route) => calls.push(route) }) },
    "@/src/components/motion": { MotionPressable: "Pressable", ScreenEntrance: "Entrance" },
    "@/src/components/tab-bar-motion": { TabScrollView: "ScrollView" },
    "@/src/components/ui": { PageHeading: "Heading", Txt: "Txt" },
    "@/src/constants/theme": { C: { ink: "#FFFFFF", bg: "#000000" } },
    "@/src/context/session": { useSession: () => session },
    "./analytics": analytics,
    "./charts": { TrendChart: "Chart" },
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
      return exports.StatsDashboard();
    },
  };
}

test("Stats filters saved workouts, converts volume units, and opens real workout details", () => {
  const fixture = statsFixture();
  let tree = fixture.render();
  assert.equal(find(tree, "Totals")[0].props.data.current.workouts, 2);
  find(tree, "Pressable")
    .find((button) => button.props.accessibilityLabel === "Last 7 days")
    .props.onPress();
  tree = fixture.render();
  assert.equal(find(tree, "Totals")[0].props.data.current.workouts, 1);
  assert.equal(find(tree, "Chart")[0].props.points.length, 7);
  find(tree, "Pressable")
    .find((button) => button.props.accessibilityLabel === "Show volume trend")
    .props.onPress();
  fixture.session.settings.weightUnit = "lb";
  tree = fixture.render();
  const chart = find(tree, "Chart")[0].props;
  assert.equal(chart.unit, "lb");
  assert.equal(
    chart.points.reduce((sum, point) => sum + point.value, 0),
    model.weightValue(600, "lb"),
  );
  find(tree, "Pressable")
    .find((button) => button.props.accessibilityLabel?.startsWith("View Workout recent"))
    .props.onPress();
  assert.equal(fixture.calls[0].pathname, "/workout/history/[id]");
  assert.equal(fixture.calls[0].params.id, "recent");
});

test("Stats distinguishes initial loading, failed first sync, cached history, and a real empty account", () => {
  const fixture = statsFixture();
  fixture.progress.journal = { workouts: [] };
  fixture.progress.refreshing = true;
  assert.equal(find(fixture.render(), "Loading").length, 1);
  assert.equal(find(fixture.render(), "Totals").length, 0);
  fixture.progress.refreshing = false;
  fixture.progress.workoutError = "Offline";
  let tree = fixture.render();
  assert.equal(find(tree, "Totals").length, 0);
  find(tree, "Button")
    .find((button) => button.props.label === "Try again")
    .props.onPress();
  assert.deepEqual(fixture.calls, ["refresh"]);
  fixture.progress.journal = {
    workouts: [workout("cached", "2026-11-12")],
    workoutsUpdatedAt: today,
  };
  assert.equal(find(fixture.render(), "Totals")[0].props.data.current.workouts, 1);
  fixture.progress.workoutError = "";
  fixture.progress.journal = { workouts: [], workoutsUpdatedAt: today };
  tree = fixture.render();
  assert.equal(find(tree, "Totals")[0].props.data.current.workouts, 0);
  assert.equal(find(tree, "Chart").length, 0);
  assert.ok(find(tree, "Button").some((button) => button.props.label === "Go to training"));
});
