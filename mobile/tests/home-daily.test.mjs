import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as progressModel from "../src/features/progress/model.ts";
import * as healthModel from "../src/features/home/health-model.ts";
import * as chartModel from "../src/features/home/chart-model.ts";
import { homeSnapshot } from "../src/features/home/model.ts";

function load(file, dependencies) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      exports,
      require: (name) => {
        assert.ok(name in dependencies, name);
        return dependencies[name];
      },
    },
  );
  return exports;
}
function nodes(tree) {
  return Array.isArray(tree)
    ? tree.flatMap(nodes)
    : tree && typeof tree === "object"
      ? [tree, ...nodes(tree.props?.children)]
      : [];
}
function text(tree) {
  return tree == null || typeof tree === "boolean"
    ? ""
    : Array.isArray(tree)
      ? tree.map(text).join(" ")
      : typeof tree === "object"
        ? text(tree.props?.children)
        : String(tree);
}
const jsx = (type, props = {}) => (typeof type === "function" ? type(props) : { type, props });
const today = "2026-11-24";
const event = (
  metric,
  value,
  date = today,
  id = `${metric}-${date}`,
  observedAt = `${date}T12:00:00Z`,
) => ({ kind: "metric", metric, value, date, id, observedAt, source: "manual", notes: "" });
const workout = (id, date, status = "completed") => ({
  id,
  name: "Strength",
  status,
  finished_at: `${date}T12:00:00Z`,
  started_at: `${date}T11:00:00Z`,
  elapsed_seconds: 3600,
  workout_session_exercises: [],
});
const snapshot = (events = [], workouts = []) => homeSnapshot(workouts, events, today);
const baseDeps = {
  react: { Fragment: "Fragment" },
  "react/jsx-runtime": { jsx, jsxs: jsx },
  "react-native": { View: "View", ActivityIndicator: "Spinner" },
  "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
  "@/src/components/motion": { MotionPressable: "Button", ProgressFill: "ProgressFill" },
  "@/src/components/ui": { Txt: "Text" },
  "../progress/model": progressModel,
  "./health-model": healthModel,
  "./chart-model": chartModel,
};
function cards(extra = {}) {
  const calls = [];
  const { DailyOverview } = load("../src/features/home/daily-overview.tsx", {
    ...baseDeps,
    "./health-artwork": {
      MiniHistory: "MiniHistory",
      StepOrbit: "StepOrbit",
      WaterGlass: "WaterGlass",
      WorkoutHeatmap: "WorkoutHeatmap",
      MacroDonut: "MacroDonut",
    },
  });
  const tree = DailyOverview({
    snapshot: snapshot(),
    today,
    goals: progressModel.defaultGoals(),
    unit: "kg",
    loading: false,
    disabled: false,
    onOpen: (kind) => calls.push(kind),
    ...extra,
  });
  return {
    tree,
    calls,
    button: (label) => nodes(tree).find((node) => node.props.accessibilityLabel === label),
  };
}

test("five health cards open details rather than logging directly, with no nested actions", () => {
  const ui = cards();
  for (const [label, kind] of [
    ["water", "water"],
    ["steps", "steps"],
    ["workouts", "workouts"],
    ["nutrition", "nutrition"],
    ["body weight", "weight"],
  ]) {
    const button = ui.button(`View ${label} details`);
    assert.ok(button);
    button.props.onPress();
    assert.equal(ui.calls.at(-1), kind);
    assert.equal(
      nodes(button.props.children).some((node) => node.type === "Button"),
      false,
    );
  }
  assert.equal(nodes(ui.tree).filter((node) => node.type === "Button").length, 5);
});

test("cards preserve missing entries, real zeroes, personal goals and weight units", () => {
  const empty = cards();
  for (const kind of ["water", "steps", "nutrition", "body weight"])
    assert.match(text(empty.button(`View ${kind} details`)), /—/);
  const ui = cards({
    snapshot: snapshot([
      event("water", 1250),
      event("steps", 3000),
      event("caloriesIn", 0),
      event("weight", 75, "2026-11-23"),
    ]),
    unit: "lb",
    goals: { ...progressModel.defaultGoals(), water: 2500, steps: 6000 },
  });
  assert.match(text(ui.button("View water details")), /1\.25/);
  assert.match(text(ui.button("View nutrition details")), /\b0\b/);
  assert.match(text(ui.button("View body weight details")), /165\.3/);
  assert.match(text(ui.button("View body weight details")), /Last/);
  assert.equal(nodes(ui.tree).find((n) => n.type === "WaterGlass").props.ratio, 0.5);
  assert.equal(nodes(ui.tree).find((n) => n.type === "StepOrbit").props.ratio, 0.5);
});

test("unavailable cards do not trigger actions even on programmatic presses", () => {
  for (const state of [{ loading: true }, { disabled: true }]) {
    const ui = cards(state);
    for (const button of nodes(ui.tree).filter((node) => node.type === "Button")) {
      assert.equal(button.props.disabled, true);
      button.props.onPress();
    }
    assert.equal(ui.calls.length, 0);
  }
});

test("health history retains gaps and corrections, ignores future data and counts actual completed workouts", () => {
  const state = snapshot(
    [
      event("water", 800, "2026-11-20"),
      event("water", 0, "2026-11-22"),
      event("water", 1000),
      event("water", 1250, today, "correction", `${today}T13:00:00Z`),
      event("steps", 999, "2026-11-25"),
      event("weight", 70, "2026-11-23"),
      event("weight", null, "2026-11-23", "cleared", "2026-11-23T13:00:00Z"),
    ],
    [workout("done", today), workout("active", today, "active"), workout("future", "2026-11-25")],
  );
  const water = healthModel.healthHistory(state, "water", today, 7, "kg");
  assert.equal(water.find((p) => p.date === "2026-11-20").value, 0.8);
  assert.equal(water.find((p) => p.date === "2026-11-21").value, null);
  assert.equal(water.find((p) => p.date === "2026-11-22").value, 0);
  assert.equal(water.at(-1).value, 1.25);
  assert.equal(
    healthModel.healthHistory(state, "weight", today, 7, "kg").every((p) => p.value === null),
    true,
  );
  const sessions = healthModel.healthHistory(state, "workouts", today, 7, "kg");
  assert.equal(sessions.at(-1).value, 1);
  assert.equal(sessions[0].value, 0);
  assert.equal(
    healthModel.healthHistory(state, "steps", today, 30, "kg").every((p) => p.value === null),
    true,
  );
  assert.equal(healthModel.healthSummary(water).recorded, 3);
});

test("chart geometry breaks missing days and safely renders empty, single and flat series", () => {
  const points = [
    { date: "1", value: 70 },
    { date: "2", value: null },
    { date: "3", value: 71 },
  ];
  const chart = healthModel.healthChartGeometry(points, "weight");
  assert.equal(chart.segments.length, 2);
  for (const values of [[], [0], [70, 70]]) {
    const data = values.map((value, index) => ({ date: String(index), value }));
    const geometry = healthModel.healthChartGeometry(data, "weight");
    assert.ok(Number.isFinite(geometry.high));
    for (const value of values) assert.ok(Number.isFinite(geometry.y(value)));
  }
  const pounds = healthModel.healthHistory(
    snapshot([event("weight", 70)]),
    "weight",
    today,
    7,
    "lb",
  );
  assert.ok(Math.abs(pounds.at(-1).value - 154.324) < 0.01);
});

function detail(extra = {}) {
  const state = [];
  let cursor = 0;
  const calls = [];
  const react = {
    Fragment: "Fragment",
    useId: () => "test-chart",
    useState: (initial) => {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [
        state[index],
        (value) => {
          state[index] = value;
        },
      ];
    },
  };
  const chartDeps = {
    ...baseDeps,
    react,
    "./health-artwork": { MacroDonut: "MacroDonut" },
    "react-native-svg": {
      __esModule: true,
      default: "Svg",
      Circle: "Circle",
      Defs: "Defs",
      Line: "Line",
      LinearGradient: "Gradient",
      Path: "Path",
      Rect: "Rect",
      Stop: "Stop",
      Text: "SvgText",
    },
  };
  const healthCharts = load("../src/features/home/health-charts.tsx", chartDeps);
  const { HealthDetailSheet } = load("../src/features/home/health-detail-sheet.tsx", {
    ...baseDeps,
    react,
    "./health-charts": healthCharts,
    "../health-sync/step-tracking-card": { StepTrackingCard: "StepTrackingCard" },
    "../progress/editors": {
      Sheet: (props) => ({
        type: "Sheet",
        props: { ...props, children: [props.children, props.footer] },
      }),
    },
  });
  const props = {
    kind: "water",
    snapshot: snapshot([event("water", 1250), event("water", 500, "2026-11-23")]),
    today,
    goals: { ...progressModel.defaultGoals(), water: 2000 },
    unit: "kg",
    isPro: false,
    waterBusy: false,
    onClose: () => calls.push(["close"]),
    onLog: (...args) => calls.push(["log", ...args]),
    onWater: () => calls.push(["water"]),
    onFood: (date) => calls.push(["food", date]),
    onWorkout: () => calls.push(["workout"]),
    onGoals: () => calls.push(["goals"]),
    ...extra,
  };
  function render() {
    cursor = 0;
    return HealthDetailSheet(props);
  }
  return {
    render,
    calls,
    props,
    control: (label) => nodes(render()).find((node) => node.props.accessibilityLabel === label),
  };
}

test("detail drawer supports 7/30 days, inspecting dates and explicit date-correct logging", () => {
  const ui = detail();
  assert.match(text(ui.render()), /1\.25/);
  ui.control("Previous day").props.onPress();
  ui.control("Log water").props.onPress();
  assert.deepEqual(ui.calls.at(-1), ["log", "water", "2026-11-23"]);
  assert.equal(ui.control("Add 250 millilitres of water to today"), undefined);
  ui.control("Show 30 days").props.onPress();
  const graph = ui.control("Water history graph");
  assert.equal(graph.props.accessibilityValue.max, 29);
  ui.control("Add 250 millilitres of water to today").props.onPress();
  assert.deepEqual(ui.calls.at(-1), ["water"]);
  graph.props.onPress({ nativeEvent: { locationX: 0 } });
  ui.control("Log water").props.onPress();
  assert.deepEqual(ui.calls.at(-1), ["log", "water", "2026-10-26"]);
});

test("drawer keeps free nutrition logging, Pro diary routing and workout actions available", () => {
  const free = detail({ kind: "nutrition" });
  free.control("Log nutrition").props.onPress();
  assert.deepEqual(free.calls.at(-1), ["log", "caloriesIn", today]);
  free.control("Log protein").props.onPress();
  assert.deepEqual(free.calls.at(-1), ["log", "protein", today]);
  const pro = detail({ kind: "nutrition", isPro: true });
  pro.control("Open food diary").props.onPress();
  assert.deepEqual(pro.calls.at(-1), ["food", today]);
  const sessions = detail({ kind: "workouts" });
  sessions.control("Open workout options").props.onPress();
  assert.deepEqual(sessions.calls.at(-1), ["workout"]);
  const busy = detail({ waterBusy: true });
  const add = busy.control("Add 250 millilitres of water to today");
  assert.equal(add.props.disabled, true);
  add.props.onPress();
  assert.equal(busy.calls.length, 0);
});

test("steps drawer keeps automatic history separate from date-correct manual additions", () => {
  const current = event("steps", 4200);
  const previous = event("steps", 3500, "2026-11-23");
  const ui = detail({ kind: "steps", snapshot: snapshot([current, previous]) });
  assert.equal(
    nodes(ui.render()).find((node) => node.type === "StepTrackingCard").props.entry.id,
    current.id,
  );
  ui.control("Previous day").props.onPress();
  assert.equal(
    nodes(ui.render()).find((node) => node.type === "StepTrackingCard").props.entry.id,
    previous.id,
  );
  ui.control("Add extra steps").props.onPress();
  assert.deepEqual(ui.calls.at(-1), ["log", "steps", "2026-11-23"]);
});

test("history selection returns after editing and blocked workout actions cannot start", () => {
  const history = detail({ initialDate: "2026-11-10" });
  assert.equal(history.control("Show 30 days").props.accessibilityState.selected, true);
  history.control("Log water").props.onPress();
  assert.deepEqual(history.calls.at(-1), ["log", "water", "2026-11-10"]);
  const blocked = detail({ kind: "workouts", workoutBlocked: true });
  const action = blocked.control("Open workout options");
  assert.equal(action.props.disabled, true);
  action.props.onPress();
  assert.equal(blocked.calls.length, 0);
});

test("nutrition charts expose recorded macro energy and switch to calorie history", () => {
  const nutrition = detail({
    kind: "nutrition",
    snapshot: snapshot([event("protein", 25), event("carbs", 50), event("fat", 10)]),
  });
  assert.match(
    nutrition.control("Nutrition stacked macro history").props.accessibilityValue.text,
    /390 macro kilocalories/,
  );
  nutrition.control("Show calorie history").props.onPress();
  assert.ok(nutrition.control("Nutrition history graph"));
});

test("calendar selection ignores padding and selects the correct dated cell", () => {
  const ui = detail({
    kind: "workouts",
    snapshot: snapshot([], [workout("today", today), workout("first", "2026-11-18")]),
  });
  let calendar = ui.control("Workouts activity calendar");
  assert.equal(calendar.props.accessibilityValue.now, 6);
  calendar.props.onPress({ nativeEvent: { locationX: 31, locationY: 46 } });
  assert.equal(ui.control("Workouts activity calendar").props.accessibilityValue.now, 6);
  calendar.props.onPress({ nativeEvent: { locationX: 115, locationY: 46 } });
  assert.equal(ui.control("Workouts activity calendar").props.accessibilityValue.now, 0);
  calendar = ui.control("Workouts activity calendar");
  calendar.props.onAccessibilityAction({ nativeEvent: { actionName: "increment" } });
  assert.equal(ui.control("Workouts activity calendar").props.accessibilityValue.now, 1);
  ui.control("Show 30 days").props.onPress();
  assert.equal(ui.control("Workouts activity calendar").props.accessibilityValue.max, 29);
});

test("macro-only, fractional, partial and zero logs stay truthful and selectable", () => {
  const ui = detail({
    kind: "nutrition",
    snapshot: snapshot([event("protein", 0.4), event("carbs", 0), event("fat", 10, "2026-11-23")]),
  });
  assert.doesNotMatch(text(ui.render()), /Your first entry will start the chart/);
  assert.match(text(ui.render()), /No food-calorie totals/);
  assert.match(text(ui.control("Log protein")), /0\.4/);
  let donut = nodes(ui.render()).find((n) => n.type === "MacroDonut");
  assert.equal(donut.props.breakdown.recorded, 2);
  assert.equal(donut.props.breakdown.complete, false);
  assert.equal(donut.props.breakdown.totalEnergy, 1.6);
  ui.control("Previous day").props.onPress();
  donut = nodes(ui.render()).find((n) => n.type === "MacroDonut");
  assert.equal(donut.props.breakdown.recorded, 1);
  assert.equal(donut.props.breakdown.totalEnergy, 90);
  ui.control("Log fat").props.onPress();
  assert.deepEqual(ui.calls.at(-1), ["log", "fat", "2026-11-23"]);
  const zero = detail({
    kind: "nutrition",
    snapshot: snapshot([event("protein", 0), event("carbs", 0), event("fat", 0)]),
  });
  const ring = nodes(zero.render()).find((n) => n.type === "MacroDonut");
  assert.equal(ring.props.breakdown.complete, true);
  assert.equal(ring.props.breakdown.totalEnergy, 0);
  assert.doesNotMatch(text(zero.render()), /NaN|Infinity/);
});
