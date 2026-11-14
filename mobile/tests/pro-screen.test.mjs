import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { buildProAnalytics } from "../src/features/pro/analytics.ts";
import * as model from "../src/features/progress/model.ts";
import { workoutDate } from "../src/features/progress/analytics.ts";
const jsx = (type, props) => ({ type, props });
const find = (node, type) =>
  !node || typeof node !== "object"
    ? []
    : Array.isArray(node)
      ? node.flatMap((n) => find(n, type))
      : [...(node.type === type ? [node] : []), ...find(node.props?.children, type)];
function fixture() {
  const slots = [];
  let cursor = 0;
  const calls = [];
  const billing = {
    isPro: true,
    loading: false,
    error: "",
    refresh: async () => calls.push("billing-refresh"),
  };
  const progress = {
    journal: model.emptyJournal(),
    goals: { weeklyWorkouts: 3 },
    loading: false,
    refreshing: false,
    storageError: "",
    workoutError: "",
    syncError: "",
    refresh: async () => calls.push("progress-refresh"),
  };
  progress.journal.workoutsUpdatedAt = "2026-11-14T12:00:00Z";
  const dependencies = {
    react: {
      useState(initial) {
        const i = cursor++;
        if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
        return [
          slots[i],
          (value) => {
            slots[i] = typeof value === "function" ? value(slots[i]) : value;
          },
        ];
      },
      useRef(initial) {
        const i = cursor++;
        if (!(i in slots)) slots[i] = { current: initial };
        return slots[i];
      },
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
      useEffect() {},
    },
    "react-native": {
      ActivityIndicator: "Loading",
      RefreshControl: "Refresh",
      ScrollView: "ScrollView",
      View: "View",
    },
    "expo-router": { router: { push: (path) => calls.push(path) }, useFocusEffect() {} },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "react-native-svg": { __esModule: true, default: "Svg", Circle: "Circle", Path: "Path" },
    "@/src/context/session": {
      useSession: () => ({ user: { id: "owner", name: "Sam" }, settings: { weightUnit: "kg" } }),
    },
    "@/src/components/motion": { MotionPressable: "Pressable", ScreenEntrance: "Entrance" },
    "@/src/components/tab-bar-motion": { TabScrollView: "TabScroll" },
    "@/src/components/ui": { Txt: "Txt" },
    "../billing/billing-context": { useBilling: () => billing },
    "../progress/use-progress": { useProgress: () => progress },
    "../progress/model": {
      ...model,
      localDate: (value) => (value ? model.localDate(value) : "2026-11-14"),
    },
    "../progress/tracking-cards": { compact: String },
    "../progress/analytics": { workoutDate },
    "../workouts/api": { workoutApi: { templates: async () => [] } },
    "./analytics": { buildProAnalytics },
    "./analytics-panels": { AnalyticsPanels: "Analytics" },
    "./training-tools": { TrainerPanel: "Trainer", TrainingTools: "Tools" },
    "./use-pro-catalog": {
      useProCatalog: () => ({ items: [], loading: false, error: "", refresh: async () => {} }),
    },
    "./ui": Object.fromEntries(
      [
        "GlassCard",
        "ProAction",
        "ProButton",
        "ProPill",
        "ProSection",
        "ProStat",
        "ProScene",
        "Reveal",
      ]
        .map((name) => [name, name])
        .concat([["PRO", { accent: "#D4F89A", muted: "#989DA5" }]]),
    ),
  };
  const code = ts.transpileModule(
    readFileSync(new URL("../src/features/pro/screen.tsx", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    Date,
    Intl,
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "Fragment" };
      if (!(name in dependencies)) throw Error(`Unexpected dependency ${name}`);
      return dependencies[name];
    },
  });
  return {
    billing,
    progress,
    calls,
    render() {
      cursor = 0;
      const root = exports.ProHubScreen();
      return root.type(root.props);
    },
  };
}
test("Pro hub exposes real training, analytics, trainer and tool destinations", () => {
  const f = fixture();
  let tree = f.render();
  assert.ok(find(tree, "ProAction").some((n) => n.props.title === "Every muscle, understood"));
  find(tree, "ProAction")
    .find((n) => n.props.title === "Every muscle, understood")
    .props.onPress();
  tree = f.render();
  assert.equal(find(tree, "Analytics")[0].props.view, "muscles");
  find(tree, "ProPill")
    .find((n) => n.props.label === "All time")
    .props.onPress();
  tree = f.render();
  assert.equal(find(tree, "Analytics")[0].props.data.previous, null);
  find(tree, "ProPill")
    .find((n) => n.props.label === "Trainer")
    .props.onPress();
  tree = f.render();
  assert.equal(find(tree, "Trainer").length, 1);
  find(tree, "ProPill")
    .find((n) => n.props.label === "Tools")
    .props.onPress();
  tree = f.render();
  assert.equal(find(tree, "Tools").length, 1);
  find(tree, "Pressable")
    .find((n) => n.props.accessibilityLabel === "Manage Pro membership")
    .props.onPress();
  assert.equal(f.calls.at(-1), "/membership");
});
test("membership expiration replaces deep analytics with the membership explanation", () => {
  const f = fixture();
  let tree = f.render();
  find(tree, "ProPill")
    .find((n) => n.props.label === "Analytics")
    .props.onPress();
  assert.equal(find(f.render(), "Analytics").length, 1);
  f.billing.isPro = false;
  tree = f.render();
  assert.equal(find(tree, "Analytics").length, 0);
  const walk = (node) =>
    !node || typeof node !== "object"
      ? []
      : Array.isArray(node)
        ? node.flatMap(walk)
        : [...(node.type?.name === "LockedAnalytics" ? [node] : []), ...walk(node.props?.children)];
  const preview = walk(tree)[0];
  assert.ok(preview);
  assert.ok(
    find(preview.type(preview.props), "ProButton").some(
      (n) => n.props.title === "Explore membership",
    ),
  );
});
test("independent training tools remain reachable while workout history is opening", () => {
  const f = fixture();
  f.progress.loading = true;
  let tree = f.render();
  assert.equal(find(tree, "Loading").length, 1);
  find(tree, "ProPill")
    .find((n) => n.props.label === "Tools")
    .props.onPress();
  tree = f.render();
  assert.equal(find(tree, "Tools").length, 1);
});

function loadUi(file, dependencies) {
  let state = 0;
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "Fragment" };
      if (name === "react")
        return {
          useState: () => [
            state,
            (value) => {
              state = typeof value === "function" ? value(state) : value;
            },
          ],
        };
      if (!(name in dependencies)) throw Error(`Unexpected UI dependency ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}
test("long graph histories expose every saved point through bounded, reversible pages", () => {
  const { HistoryChart } = loadUi("../src/features/pro/history-chart.tsx", {
    "react-native": { View: "View" },
    "@/src/components/ui": { Txt: "Txt" },
    "../progress/charts": { TrendChart: "Chart" },
    "./ui": { ProPill: "Pill" },
  });
  const points = Array.from({ length: 125 }, (_, i) => ({
    date: model.addDays("2020-01-01", i),
    value: i,
  }));
  const render = () => HistoryChart({ points, color: "white", unit: "kg" });
  let tree = render(),
    shown = find(tree, "Chart")[0].props.points;
  assert.equal(shown.length, 60);
  assert.equal(shown.at(-1).value, 124);
  const values = [...shown.map((p) => p.value)];
  for (let i = 0; i < 2; i++) {
    find(tree, "Pill")
      .find((n) => n.props.label === "← Older")
      .props.onPress();
    tree = render();
    shown = find(tree, "Chart")[0].props.points;
    values.push(...shown.map((p) => p.value));
  }
  assert.equal(new Set(values).size, 125);
  assert.equal(find(tree, "Pill").find((n) => n.props.label === "← Older").props.disabled, true);
  find(tree, "Pill")
    .find((n) => n.props.label === "Newer →")
    .props.onPress();
  assert.equal(find(render(), "Chart")[0].props.points[0].value, 5);
});
test("muscle-map selection opens the correct group and keeps existing workout artwork unchanged", () => {
  const { Body } = loadUi("../src/features/workouts/components/muscle-focus.tsx", {
    "react-native": { Pressable: "Pressable", View: "View" },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/constants/theme": { C: {} },
    "react-native-svg": { __esModule: true, default: "Svg", Circle: "Circle", Path: "Path" },
    "@/src/components/ui": { Txt: "Txt" },
    "./workout-controls": { WorkoutDrawer: "Drawer" },
  });
  const selections = [];
  const tree = Body({
    muscles: ["chest"],
    selected: "chest",
    intensity: { chest: 0.5 },
    onSelect: (code) => selections.push(code),
    size: 130,
  });
  const selected = find(tree, "Path").find((n) => n.props.stroke === "#F0FFD9");
  assert.ok(selected);
  selected.props.onPress();
  assert.deepEqual(selections, ["chest"]);
  assert.equal(tree.props.width, 130);
  const ordinary = Body({ muscles: ["chest"] });
  assert.ok(find(ordinary, "Path").some((n) => n.props.fill === "#C5F460"));
  assert.ok(find(ordinary, "Path").every((n) => !n.props.onPress));
});
