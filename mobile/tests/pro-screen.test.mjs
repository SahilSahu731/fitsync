import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { buildProAnalytics } from "../src/features/pro/analytics.ts";
import * as model from "../src/features/progress/model.ts";
import { workoutDate } from "../src/features/progress/analytics.ts";
import { nextSession } from "../src/features/coaching/model.ts";
const jsx = (type, props) => ({ type, props });
const find = (node, type) =>
  !node || typeof node !== "object"
    ? []
    : Array.isArray(node)
      ? node.flatMap((n) => find(n, type))
      : [...(node.type === type ? [node] : []), ...find(node.props?.children, type)];
const textOf = (node) =>
  !node
    ? ""
    : Array.isArray(node)
      ? node.map(textOf).join(" ")
      : typeof node === "object"
        ? textOf(node.props?.children)
        : String(node);
function fixture() {
  const slots = [],
    calls = [];
  let cursor = 0;
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
  const program = {
    active: null,
    loading: false,
    error: "",
    refresh: async () => calls.push("program-refresh"),
  };
  const coaching = {
    data: { plan: null },
    loading: false,
    error: null,
    refresh: async () => calls.push("coaching-refresh"),
  };
  const companion = {
    state: { records: [] },
    loading: false,
    error: null,
    refresh: async () => calls.push("companion-refresh"),
  };
  const resources = {
    food: null,
    recipes: [],
    library: [],
    loading: false,
    mealError: "",
    libraryError: "",
    refresh: async () => calls.push("resources-refresh"),
  };
  const nativeStatus = {
    permission: "granted",
    error: null,
    scheduled: 0,
    suppressedByQuietHours: 0,
  };
  const hook = (name, value) => () => {
    calls.push(name + "-hook");
    return value;
  };
  const react = {
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
  };
  const dependencies = {
    react,
    "react-native": {
      ActivityIndicator: "Loading",
      RefreshControl: "Refresh",
      ScrollView: "ScrollView",
      View: "View",
    },
    "expo-linear-gradient": { LinearGradient: "Gradient" },
    "expo-router": { router: { push: (path) => calls.push(path) }, useFocusEffect() {} },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/context/session": { useSession: () => session },
    "@/src/components/motion": { MotionPressable: "Pressable", ScreenEntrance: "Entrance" },
    "@/src/components/tab-bar-motion": { TabScrollView: "TabScroll" },
    "@/src/components/ui": { Txt: "Txt" },
    "../billing/billing-context": { useBilling: () => billing },
    "../billing/paywall": { ProScreen: "ProMarketing" },
    "../progress/use-progress": { useProgress: hook("progress", progress) },
    "../nutrition/use-food-diary": {
      useFoodDiary: () => ({
        diary: { version: 1, entries: [], library: [] },
        loading: false,
        error: "",
        refresh: async () => calls.push("food-refresh"),
      }),
    },
    "../progress/model": {
      ...model,
      localDate: (value) => (value ? model.localDate(value) : "2026-11-14"),
    },
    "../progress/analytics": { workoutDate },
    "../progress/editors": { Sheet: "Sheet" },
    "../program-follow/program-context": { useProgram: hook("program", program) },
    "../program-follow/active-program-card": { ActiveProgramCard: "ActiveProgram" },
    "../coaching/use-coaching": { useCoaching: hook("coaching", coaching) },
    "../coaching/model": { nextSession },
    "../companion/companion-context": { useCompanion: hook("companion", companion) },
    "../companion/reminders-panel": { ReminderSettingsPanel: "ReminderSettings" },
    "../companion/native-status": { useCompanionNativeStatus: () => nativeStatus },
    "./analytics": { buildProAnalytics },
    "./analytics-panels": { AnalyticsPanels: "Analytics" },
    "./training-tools": { WarmupCalculator: "Warmup", OneRepMax: "OneRepMax" },
    "./use-studio-resources": { useStudioResources: hook("resources", resources) },
    "./use-pro-catalog": {
      useProCatalog: hook("catalog", {
        items: [],
        loading: false,
        error: "",
        refresh: async () => calls.push("catalog-refresh"),
      }),
    },
    "./studio-panels": Object.fromEntries(
      [
        "MealBrief",
        "MuscleBrief",
        "StudioArt",
        "StudioButton",
        "StudioProgress",
        "StudioSection",
        "ToolTile",
        "WeekRhythm",
      ].map((n) => [n, n]),
    ),
    "./hub-ui": {
      ProScene: "ProScene",
      ProPill: "ProPill",
      PRO: {
        accent: "#C5F460",
        muted: "#A3A3A3",
        gold: "#ECD7A8",
        cyan: "#A9DDE3",
        violet: "#C6BAF2",
      },
    },
  };
  function load(name) {
    const exports = {};
    const code = ts.transpileModule(
      readFileSync(new URL(`../src/features/pro/${name}.tsx`, import.meta.url), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      },
    ).outputText;
    vm.runInNewContext(code, {
      exports,
      Date,
      Intl,
      require(name) {
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "Fragment" };
        if (name === "./member-workspace") return load("member-workspace");
        if (!(name in dependencies)) throw Error(`Unexpected dependency ${name}`);
        return dependencies[name];
      },
    });
    return exports;
  }
  const { ProHubScreen } = load("screen");
  return {
    billing,
    progress,
    calls,
    session,
    program,
    coaching,
    companion,
    resources,
    nativeStatus,
    render() {
      cursor = 0;
      const expand = (node) => {
        if (!node || typeof node !== "object") return node;
        if (Array.isArray(node)) return node.map(expand);
        if (typeof node.type === "function") return expand(node.type(node.props));
        return { ...node, props: { ...node.props, children: expand(node.props?.children) } };
      };
      return expand(ProHubScreen());
    },
  };
}
const action = (tree, title) =>
  [...find(tree, "StudioButton"), ...find(tree, "ToolTile"), ...find(tree, "Pressable")].find(
    (node) => node.props.title === title || node.props.accessibilityLabel === title,
  );
const assertBenefitsOnly = (tree) => {
  assert.equal(find(tree, "ProMarketing")[0]?.props.embedded, true);
  for (const name of ["Analytics", "MuscleBrief", "MealBrief", "Warmup", "ReminderSettings"])
    assert.equal(find(tree, name).length, 0);
};

test("Free, signed-out and unverified accounts never mount private trainer data hooks", () => {
  for (const kind of ["free", "checking", "failed", "signed-out"]) {
    const f = fixture();
    if (kind === "signed-out") f.session.user = null;
    else f.billing.isPro = false;
    if (kind === "checking") f.billing.loading = true;
    if (kind === "failed") f.billing.error = "Offline";
    assertBenefitsOnly(f.render());
    assert.equal(
      f.calls.some((call) => typeof call === "string" && call.endsWith("-hook")),
      false,
    );
  }
});
test("Pro is one connected daily workspace with programs, muscle insights, meals and tools", () => {
  const f = fixture(),
    tree = f.render();
  assert.ok(action(tree, "Choose my program"));
  assert.equal(find(tree, "MuscleBrief").length, 1);
  assert.equal(find(tree, "MealBrief").length, 1);
  assert.ok(action(tree, "Warm-up & plates"));
  assert.ok(action(tree, "Working weight guide"));
  assert.equal(
    find(tree, "Pressable").some((node) => node.props.accessibilityRole === "tab"),
    false,
  );
  action(tree, "Choose my program").props.onPress();
  assert.equal(f.calls.at(-1), "/explore/programs");
  action(tree, "Build a personal plan").props.onPress();
  assert.equal(f.calls.at(-1), "/coach/setup");
  action(tree, "Open my exercise library").props.onPress();
  assert.equal(f.calls.at(-1), "/exercises/custom");
  find(tree, "MealBrief")[0].props.onOpen();
  assert.equal(f.calls.at(-1), "/nutrition");
});
test("muscle insights open real paid analytics and all-time range selection", () => {
  const f = fixture();
  find(f.render(), "MuscleBrief")[0].props.onOpen();
  let tree = f.render();
  assert.equal(find(tree, "Analytics")[0].props.view, "muscles");
  find(tree, "ProPill")
    .find((node) => node.props.label === "All time")
    .props.onPress();
  assert.equal(find(f.render(), "Analytics")[0].props.data.previous, null);
});
test("warmup, strength tools and reminder settings are immediately reachable", () => {
  const f = fixture();
  let tree = f.render();
  action(tree, "Warm-up & plates").props.onPress();
  tree = f.render();
  assert.equal(find(tree, "Warmup").length, 1);
  find(tree, "Warmup")[0].props.onClose();
  action(tree, "Open estimated one-rep max calculator").props.onPress();
  assert.equal(find(f.render(), "OneRepMax").length, 1);
  action(tree, "Customize my reminders").props.onPress();
  assert.equal(find(f.render(), "ReminderSettings").length, 1);
});
test("membership expiration unmounts paid resources while verified background refresh preserves the workspace", () => {
  const f = fixture();
  f.billing.loading = true;
  assert.equal(find(f.render(), "MuscleBrief").length, 1);
  const count = f.calls.filter((call) => typeof call === "string" && call.endsWith("-hook")).length;
  f.billing.isPro = false;
  assertBenefitsOnly(f.render());
  assert.equal(
    f.calls.filter((call) => typeof call === "string" && call.endsWith("-hook")).length,
    count,
  );
});
test("analytics never show an empty history while the journal is loading or unavailable", () => {
  for (const unavailable of [false, true]) {
    const f = fixture();
    f.progress.loading = !unavailable;
    f.progress.journal.workoutsUpdatedAt = null;
    if (unavailable) f.progress.workoutError = "Offline";
    let tree = f.render();
    action(tree, "Your strength story").props.onPress();
    tree = f.render();
    assert.equal(find(tree, "Analytics").length, 0);
    assert.equal(find(tree, "MuscleBrief").length, 0);
    if (!unavailable) assert.ok(find(tree, "Loading").length);
    action(tree, "Warm-up & plates").props.onPress();
    assert.equal(find(f.render(), "Warmup").length, 1);
  }
});
test("reminder preferences do not claim delivery when phone permission is denied", () => {
  const f = fixture();
  f.companion.state.records = [
    {
      id: "reminders",
      kind: "reminders",
      data: {
        enabled: true,
        time: "18:00",
        days: [1, 3, 5],
        habits: { meals: { enabled: true, time: "12:00" } },
      },
    },
  ];
  f.nativeStatus.permission = "denied";
  assert.match(textOf(f.render()), /2 reminder preferences enabled/);
  assert.match(textOf(f.render()), /Notifications are off on this phone/);
});
test("completed program sessions are not left planned on their original date", () => {
  const f = fixture();
  f.program.active = {
    enrollment: { id: "enrollment", reminder_enabled: false },
    slots: [{ date: "2026-11-14", status: "completed" }],
  };
  const tree = f.render();
  assert.equal(find(tree, "ActiveProgram").length, 1);
  assert.equal(
    find(tree, "WeekRhythm")[0].props.days.find((day) => day.date === "2026-11-14").planned,
    false,
  );
  assert.equal(action(tree, "Choose my program"), undefined);
});
test("pull to refresh updates all connected account resources", async () => {
  const f = fixture();
  find(f.render(), "TabScroll")[0].props.refreshControl.props.onRefresh();
  await Promise.resolve();
  for (const source of [
    "progress",
    "program",
    "coaching",
    "catalog",
    "resources",
    "companion",
    "billing",
  ])
    assert.ok(f.calls.includes(source + "-refresh"));
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
