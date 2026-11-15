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
  const session = { user: { id: "owner", name: "Sam" }, settings: { weightUnit: "kg" } };
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
      useSession: () => session,
    },
    "@/src/components/motion": { MotionPressable: "Pressable", ScreenEntrance: "Entrance" },
    "@/src/components/tab-bar-motion": { TabScrollView: "TabScroll" },
    "@/src/components/ui": { Txt: "Txt", PageHeading: "PageHeading" },
    "../billing/billing-context": { useBilling: () => billing },
    "../progress/use-progress": {
      useProgress: () => {
        calls.push("progress-hook");
        return progress;
      },
    },
    "../progress/model": {
      ...model,
      localDate: (value) => (value ? model.localDate(value) : "2026-11-14"),
    },
    "../progress/tracking-cards": { compact: String },
    "../progress/analytics": { workoutDate },
    "../workouts/api": { workoutApi: { templates: async () => [] } },
    "../companion/today-card": { TodayForYouCard: "TodayForYou" },
    "./analytics": { buildProAnalytics },
    "./analytics-panels": { AnalyticsPanels: "Analytics" },
    "./training-tools": { TrainerPanel: "Trainer", TrainingTools: "Tools" },
    "./use-pro-catalog": {
      useProCatalog: () => {
        calls.push("catalog-hook");
        return {
          items: [],
          loading: false,
          error: "",
          refresh: async () => calls.push("catalog-refresh"),
        };
      },
    },
    "./hub-ui": Object.fromEntries(
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
    session,
    render() {
      cursor = 0;
      const expand = (node) => {
        if (!node || typeof node !== "object") return node;
        if (Array.isArray(node)) return node.map(expand);
        if (typeof node.type === "function") return expand(node.type(node.props));
        return { ...node, props: { ...node.props, children: expand(node.props?.children) } };
      };
      return expand(exports.ProHubScreen());
    },
  };
}
const tab = (tree, label) =>
  find(tree, "Pressable").find(
    (node) => node.props.accessibilityRole === "tab" && node.props.accessibilityLabel === label,
  );
const textOf = (node) =>
  !node
    ? ""
    : Array.isArray(node)
      ? node.map(textOf).join(" ")
      : typeof node === "object"
        ? textOf(node.props?.children)
        : String(node);
const assertBenefitsOnly = (tree) => {
  for (const component of ["Analytics", "Trainer", "Tools", "TodayForYou", "ProStat"])
    assert.equal(find(tree, component).length, 0, component);
  assert.equal(
    find(tree, "Pressable").some((node) => node.props.accessibilityRole === "tab"),
    false,
  );
  assert.ok(find(tree, "ProButton").some((node) => node.props.title === "Become a Pro"));
};

test("non-members see only benefits and membership actions without loading private training data", () => {
  const f = fixture();
  f.billing.isPro = false;
  const tree = f.render();
  assertBenefitsOnly(tree);
  assert.equal(f.calls.includes("progress-hook"), false);
  assert.equal(f.calls.includes("catalog-hook"), false);
  assert.match(textOf(tree), /Unlimited graph history/);
  find(tree, "ProButton")
    .find((node) => node.props.title === "Become a Pro")
    .props.onPress();
  assert.equal(f.calls.at(-1), "/membership");
});

test("checking and failed entitlement verification never mount the paid workspace", async () => {
  const f = fixture();
  f.billing.isPro = false;
  f.billing.loading = true;
  let tree = f.render();
  assertBenefitsOnly(tree);
  assert.match(textOf(tree), /Checking your membership/);
  f.billing.loading = false;
  f.billing.error = "Offline";
  tree = f.render();
  assertBenefitsOnly(tree);
  assert.equal(f.calls.includes("progress-hook"), false);
  await find(tree, "ProAction")
    .find((node) => node.props.title === "Check membership again")
    .props.onPress();
  assert.equal(f.calls.at(-1), "billing-refresh");
});

test("signed-out sessions never mount a workspace even if a stale billing value says Pro", () => {
  const f = fixture();
  f.session.user = null;
  assertBenefitsOnly(f.render());
  assert.equal(f.calls.includes("progress-hook"), false);
});

test("Pro members can reach analytics, trainer, tools and billing", () => {
  const f = fixture();
  let tree = f.render();
  find(tree, "Pressable")
    .find((node) => node.props.accessibilityLabel === "Muscle insights")
    .props.onPress();
  tree = f.render();
  assert.equal(find(tree, "Analytics")[0].props.view, "muscles");
  find(tree, "ProPill")
    .find((node) => node.props.label === "All time")
    .props.onPress();
  assert.equal(find(f.render(), "Analytics")[0].props.data.previous, null);
  tab(tree, "Trainer").props.onPress();
  assert.equal(find(f.render(), "Trainer").length, 1);
  tab(tree, "Tools").props.onPress();
  assert.equal(find(f.render(), "Tools").length, 1);
  find(tree, "Pressable")
    .find((node) => node.props.accessibilityLabel === "Manage Pro membership")
    .props.onPress();
  assert.equal(f.calls.at(-1), "/membership");
});

test("membership expiration unmounts all paid content and stops paid data hooks", () => {
  const f = fixture();
  tab(f.render(), "Analytics").props.onPress();
  assert.equal(find(f.render(), "Analytics").length, 1);
  const privateReads = f.calls.filter((call) => call.endsWith("-hook")).length;
  f.billing.isPro = false;
  assertBenefitsOnly(f.render());
  assert.equal(f.calls.filter((call) => call.endsWith("-hook")).length, privateReads);
});

test("verified members keep their workspace during a background membership refresh", () => {
  const f = fixture();
  f.billing.loading = true;
  tab(f.render(), "Analytics").props.onPress();
  assert.equal(find(f.render(), "Analytics").length, 1);
});

test("For you opens the daily briefing and routes shortcuts to the matching screen", () => {
  const f = fixture();
  let tree = f.render();
  find(tree, "ProAction")
    .find((node) => node.props.title === "Your daily Pro companion")
    .props.onPress();
  tree = f.render();
  assert.equal(tab(tree, "For you").props.accessibilityState.selected, true);
  assert.equal(find(tree, "TodayForYou").length, 1);
  const actions = find(tree, "ProAction");
  assert.equal(new Set(actions.map((node) => node.props.title)).size, actions.length);
  for (const [title, destination] of [
    ["Today’s readiness check-in", "readiness"],
    ["A muscle focus that fits your plan", "focus"],
    ["Your monthly training report", "reports"],
    ["Your desktop planning workspace", "desktop"],
  ]) {
    actions.find((node) => node.props.title === title).props.onPress();
    assert.equal(f.calls.at(-1), `/companion?tab=${destination}`);
  }
});

test("independent training tools remain reachable while history is opening", () => {
  const f = fixture();
  f.progress.loading = true;
  const tree = f.render();
  assert.equal(find(tree, "Loading").length, 1);
  tab(tree, "Tools").props.onPress();
  assert.equal(find(f.render(), "Tools").length, 1);
});

test("pull to refresh updates the same progress, muscle metadata and entitlement sources", async () => {
  const f = fixture();
  find(f.render(), "TabScroll")[0].props.refreshControl.props.onRefresh();
  await Promise.resolve();
  for (const source of ["progress-refresh", "catalog-refresh", "billing-refresh"])
    assert.ok(f.calls.includes(source));
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
