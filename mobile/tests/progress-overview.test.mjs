import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(file, deps = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        jsx: ts.JsxEmit.React,
      },
    }).outputText,
    {
      exports,
      Date,
      Intl,
      require: (name) => {
        if (!(name in deps)) throw Error(name);
        return deps[name];
      },
    },
  );
  return exports;
}
const model = load("../src/features/progress/model.ts");
const analytics = load("../src/features/progress/analytics.ts", { "./model": model });
const { buildProgress } = analytics;
const report = load("../src/features/progress/report.ts", {
  "./analytics": analytics,
  "./model": model,
});
let hookState = [];
let hookIndex = 0;
const react = {
  createElement: (type, props, ...children) =>
    typeof type === "function"
      ? type({ ...props, children })
      : { type, props: props ?? {}, children },
  Fragment: "fragment",
  useState: (initial) => {
    const index = hookIndex++;
    if (!(index in hookState)) hookState[index] = initial;
    return [
      hookState[index],
      (value) => {
        hookState[index] = value;
      },
    ];
  },
};
const component = (name) => (props) => ({ type: name, props, children: props.children ?? [] });
const insights = load("../src/features/progress/insights.ts", {
  "./model": model,
  "./analytics": analytics,
  "./report": report,
});
const dashboardUi = load("../src/features/progress/dashboard-ui.tsx", {
  react,
  "react-native": { View: "View" },
  "@/src/components/motion": { MotionPressable: "Pressable", ProgressFill: "Fill" },
  "@/src/components/ui": { Txt: "Text" },
  "@/src/constants/theme": { C: { brand: "#C5F460" } },
  "./visuals": { Icon: component("Icon") },
});
const { ProgressOverview } = load("../src/features/progress/overview.tsx", {
  react,
  "react-native": { View: "View", ScrollView: "Scroll" },
  "react-native-svg": { __esModule: true, default: "Svg", Path: "Path", Circle: "Circle" },
  "@/src/components/motion": { MotionPressable: "Pressable" },
  "@/src/components/ui": { Txt: "Text" },
  "@/src/constants/theme": { C: {} },
  "./model": model,
  "./visuals": {
    Icon: component("Icon"),
    SectionTitle: component("SectionTitle"),
    SmallButton: component("SmallButton"),
  },
  "./analytics": analytics,
  "./report": report,
  "./insights": insights,
  "./dashboard-ui": dashboardUi,
  "./deep-analytics": { DeepAnalytics: component("DeepAnalytics") },
  "./health-panels": {
    BodyAnalytics: component("BodyAnalytics"),
    RecoveryAnalytics: component("RecoveryAnalytics"),
  },
  "./charts": { TrendChart: component("TrendChart"), Ring: component("Ring") },
  "./insight-charts": {
    HabitWeek: component("HabitWeek"),
    ActivityHeatmap: component("Heatmap"),
    MacroRing: component("MacroRing"),
  },
  "./analytical-charts": {
    CumulativeChart: component("CumulativeChart"),
    SessionScatter: component("SessionScatter"),
    DurationBoxPlot: component("DurationBoxPlot"),
  },
  "./progress-range": { ProgressRange: component("Range") },
  "./advanced-insights": { AdvancedInsights: component("Advanced") },
  "./tracking-cards": {
    compact: String,
    displayMetric: (_, value) => (value === null ? "—" : String(value)),
  },
});
function nodes(n) {
  return Array.isArray(n)
    ? n.flatMap(nodes)
    : n && typeof n === "object"
      ? [n, ...nodes(n.children)]
      : [];
}
function text(n) {
  return Array.isArray(n)
    ? n.map(text).join(" ")
    : n && typeof n === "object"
      ? text(n.children)
      : String(n ?? "");
}
function render(extra = {}) {
  const calls = [];
  const props = {
    data: buildProgress([], [], 30, "2026-11-15", 3),
    goals: { weeklyWorkouts: 3, water: 2000 },
    unit: "kg",
    today: "2026-11-15",
    dateTitle: "Today",
    daily: () => null,
    weights: [],
    canLog: true,
    trainingAvailable: true,
    waterBusy: false,
    ...Object.fromEntries(
      [
        "onLog",
        "onMetric",
        "onNutrition",
        "onHealth",
        "onTraining",
        "onExercise",
        "onTrain",
        "onHistory",
        "onWater",
      ].map((key) => [key, (value) => calls.push([key, value])]),
    ),
    ...extra,
  };
  hookState = [];
  function rerender() {
    hookIndex = 0;
    const tree = ProgressOverview(props);
    return { tree, nodes: nodes(tree), calls, rerender };
  }
  return rerender();
}
test("new user sees starting actions and missing values without invented progress", () => {
  const v = render();
  assert.match(text(v.tree), /Your first log sets your baseline/);
  assert.match(text(v.tree), /Finish a workout/);
  assert.match(text(v.tree), /—/);
  v.nodes.find((n) => n.props.label === "Start your first workout").props.onPress();
  assert.deepEqual(v.calls, [["onTrain", undefined]]);
});
test("tracking actions open the intended detail or editor", () => {
  const v = render();
  v.nodes.find((n) => n.props.accessibilityLabel === "Log weight").props.onPress();
  v.nodes.find((n) => n.props.accessibilityLabel?.startsWith("Water,")).props.onPress();
  v.nodes.find((n) => n.props.accessibilityLabel === "Log protein").props.onPress();
  v.nodes
    .find((n) => n.props.accessibilityLabel === "Nutrition totals and nutrient tracking")
    .props.onPress();
  v.nodes
    .find((n) => n.props.accessibilityLabel?.startsWith("Add 250 milliliters"))
    .props.onPress();
  assert.deepEqual(v.calls, [
    ["onLog", "weight"],
    ["onMetric", "water"],
    ["onLog", "protein"],
    ["onNutrition", undefined],
    ["onWater", undefined],
  ]);
});
test("storage loading disables logging and failed training does not look like a new user", () => {
  const v = render({ canLog: false, trainingAvailable: false });
  for (const label of ["Log weight", "Log water", "Log protein"])
    assert.equal(v.nodes.find((n) => n.props.accessibilityLabel === label).props.disabled, true);
  assert.doesNotMatch(text(v.tree), /Start with one workout|See what’s getting stronger/);
});
test("topic navigation displays the requested analytics and preserves metric actions", () => {
  let v = render({ isPro: true, billingChecking: true });
  assert.equal(
    v.nodes.some((n) => n.type === "BodyAnalytics" || n.type === "RecoveryAnalytics"),
    false,
  );
  v.nodes
    .find((n) => n.props.accessibilityRole === "tab" && text(n) === "Body & food")
    .props.onPress();
  v = v.rerender();
  const body = v.nodes.find((n) => n.type === "BodyAnalytics");
  assert.equal(body.props.isPro, false);
  assert.equal(
    v.nodes.some((n) => n.type === "CumulativeChart"),
    false,
  );
  body.props.onMetric("protein");
  v.nodes
    .find((n) => n.props.accessibilityRole === "tab" && text(n) === "Recovery")
    .props.onPress();
  v = v.rerender();
  v.nodes.find((n) => n.type === "RecoveryAnalytics").props.onMetric("sleep");
  assert.equal(
    v.nodes.some((n) => n.type === "BodyAnalytics"),
    false,
  );
  assert.deepEqual(v.calls, [
    ["onMetric", "protein"],
    ["onMetric", "sleep"],
  ]);
});
test("exercise preview compares real sessions in the selected weight unit and opens that exercise", () => {
  const data = buildProgress(
    [workout("a", "2026-11-10", 20, 50), workout("b", "2026-11-14", 30, 55)],
    [],
    30,
    "2026-11-15",
    3,
  );
  const v = render({ data, unit: "lb" });
  const chart = v.nodes.find(
    (n) => n.type === "TrendChart" && n.props.unit === "lb" && n.props.points.length > 0,
  );
  assert.equal(chart.props.points.length, 2);
  assert.equal(chart.props.points[1].value, model.weightValue(55, "lb"));
  v.nodes
    .find((n) => n.props.accessibilityLabel === "View Bench press performance details")
    .props.onPress();
  assert.deepEqual(v.calls, [["onExercise", "bench:reps_weight"]]);
});
function workout(id, date, minutes, load = 20) {
  return {
    id,
    name: `Workout ${id}`,
    status: "completed",
    started_at: `${date}T09:00:00Z`,
    finished_at: `${date}T10:00:00Z`,
    elapsed_seconds: minutes === null ? null : minutes * 60,
    workout_session_exercises: [
      {
        id: `exercise-${id}`,
        exercise_id: "bench",
        exercise_name: "Bench press",
        tracking_type: "reps_weight",
        workout_logged_sets: [
          { completed_at: `${date}T10:00:00Z`, set_type: "normal", weight_kg: load, reps: 10 },
          { completed_at: `${date}T10:00:00Z`, set_type: "warmup", weight_kg: 1000, reps: 10 },
        ],
      },
    ],
  };
}
test("overview uses cumulative totals and switches to a real session-length distribution", () => {
  const data = buildProgress(
    [
      workout("a", "2026-11-10", 20),
      workout("b", "2026-11-14", 40),
      workout("missing", "2026-11-15", null),
    ],
    [],
    30,
    "2026-11-15",
    3,
  );
  let v = render({ data, unit: "lb" });
  const cumulative = v.nodes.find((n) => n.type === "CumulativeChart");
  assert.equal(cumulative.props.points.length, 30);
  assert.equal(cumulative.props.points.at(-1).value, 3);
  const scatter = v.nodes.find((n) => n.type === "SessionScatter");
  assert.equal(scatter.props.points.length, 2);
  assert.equal(scatter.props.points[1].sets, 1);
  assert.match(text(v.tree), /2.*\/.*3.*sessions with recorded duration/);
  const durationButton = v.nodes.find(
    (n) => n.type === "Pressable" && text(n) === "Session length",
  );
  durationButton.props.onPress();
  v = v.rerender();
  assert.equal(
    v.nodes.some((n) => n.type === "SessionScatter"),
    false,
  );
  assert.equal(v.nodes.find((n) => n.type === "DurationBoxPlot").props.distribution.median, 30);
  const volumeButton = v.nodes.find((n) => n.type === "Pressable" && text(n) === "Volume");
  volumeButton.props.onPress();
  v = v.rerender();
  assert.equal(
    v.nodes.find((n) => n.type === "CumulativeChart").props.points.at(-1).value,
    model.weightValue(600, "lb"),
  );
});
test("hydration timeline receives missing logs distinctly from logged zero and uses the selected check-in date", () => {
  const events = [
    {
      id: "water-zero",
      kind: "metric",
      metric: "water",
      date: "2026-11-10",
      value: 0,
      observedAt: "2026-11-10T10:00:00Z",
    },
    {
      id: "water-goal",
      kind: "metric",
      metric: "water",
      date: "2026-11-11",
      value: 2000,
      observedAt: "2026-11-11T10:00:00Z",
    },
  ];
  const data = buildProgress([], events, 30, "2026-11-15", 3);
  const v = render({ data, selectedDate: "2026-11-11" });
  const timeline = v.nodes.find((n) => n.type === "HabitWeek");
  assert.equal(timeline.props.days.at(-1).date, "2026-11-11");
  assert.equal(timeline.props.days.at(-1).value, 2000);
  assert.equal(timeline.props.days.at(-2).value, 0);
  assert.equal(timeline.props.days.at(-3).value, null);
});
