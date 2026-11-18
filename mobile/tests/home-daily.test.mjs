import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { defaultGoals } from "../src/features/progress/model.ts";

function load(file, dependencies) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require(name) {
      if (!(name in dependencies)) throw Error(`Unmocked dependency: ${name}`);
      return dependencies[name];
    },
  });
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
  if (tree == null || typeof tree === "boolean") return "";
  if (Array.isArray(tree)) return tree.map(text).join(" ");
  return typeof tree === "object" ? text(tree.props?.children) : String(tree);
}
function fixture(extra = {}) {
  const calls = [];
  const jsx = (type, props = {}) => (typeof type === "function" ? type(props) : { type, props });
  const { DailyOverview } = load("../src/features/home/daily-overview.tsx", {
    react: {},
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { View: "View", ActivityIndicator: "ActivityIndicator" },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/components/motion": { MotionPressable: "Button", ProgressFill: "ProgressFill" },
    "@/src/components/ui": { Txt: "Text" },
    "../progress/model": {
      weightValue: (value, unit) => (unit === "lb" ? value * 2.2046226218 : value),
      dateLabel: (date) => date,
    },
    "./daily-artwork": { HydrationMark: "HydrationMark", MovementMark: "MovementMark" },
  });
  const props = {
    snapshot: { daily: [], weight: null },
    today: "2026-11-18",
    goals: defaultGoals(),
    unit: "kg",
    loading: false,
    disabled: false,
    waterBusy: false,
    onLog: (metric) => calls.push(["log", metric]),
    onWater: () => calls.push(["water"]),
    onNutrition: () => calls.push(["nutrition"]),
    ...extra,
  };
  const tree = DailyOverview(props);
  return {
    tree,
    calls,
    button(label) {
      const node = nodes(tree).find(
        (node) => node.type === "Button" && node.props.accessibilityLabel === label,
      );
      assert.ok(node, `Missing button ${label}`);
      return node;
    },
  };
}
const daily = (values) => Object.entries(values).map(([metric, value]) => ({ metric, value }));

test("Home daily actions keep food diary, manual totals and water quick-add separate", () => {
  const h = fixture();
  for (const [label, metric] of [
    ["Log water", "water"],
    ["Log steps", "steps"],
    ["Log food calories", "caloriesIn"],
    ["Log protein", "protein"],
    ["Log carbs", "carbs"],
    ["Log fat", "fat"],
    ["Log sleep", "sleep"],
    ["Log body weight", "weight"],
  ]) {
    h.button(label).props.onPress();
    assert.deepEqual(h.calls.at(-1), ["log", metric]);
  }
  h.button("Open food diary").props.onPress();
  h.button("Add 250 millilitres of water to today").props.onPress();
  assert.deepEqual(h.calls.slice(-2), [["nutrition"], ["water"]]);
  for (const button of nodes(h.tree).filter((node) => node.type === "Button")) {
    assert.equal(
      nodes(button.props.children).some((node) => node.type === "Button"),
      false,
    );
  }
});

test("A daily zero stays visible while absent values remain unrecorded", () => {
  const zero = fixture({
    snapshot: {
      daily: daily({ steps: 0, water: 0, caloriesIn: 0, protein: 0, carbs: 0, fat: 0 }),
      weight: null,
    },
  });
  const absent = fixture();
  for (const label of [
    "Log steps",
    "Log water",
    "Log food calories",
    "Log protein",
    "Log carbs",
    "Log fat",
  ]) {
    assert.match(text(zero.button(label)), /\b0\b/);
    assert.doesNotMatch(text(zero.button(label)), /—/);
    assert.match(text(absent.button(label)), /—/);
  }
  assert.doesNotMatch(text(absent.tree), /10,000|2,000|2\.5 L/);
});

test("Water and steps artwork use actual logged totals against actual goals", () => {
  const h = fixture({
    snapshot: {
      daily: daily({ water: 1250, steps: 3000, caloriesIn: 900, protein: 50, carbs: 90, fat: 25 }),
      weight: null,
    },
    goals: { ...defaultGoals(), water: 2500, steps: 6000, caloriesIn: 1800, protein: 100 },
  });
  assert.match(text(h.button("Log water")), /1\.3/);
  assert.match(text(h.button("Log water")), /2\.5/);
  assert.match(text(h.button("Log steps")), /3,000/);
  for (const type of ["HydrationMark", "MovementMark"]) {
    assert.equal(nodes(h.tree).find((node) => node.type === type).props.ratio, 0.5);
  }
  const fills = nodes(h.tree).filter((node) => node.type === "ProgressFill");
  assert.deepEqual(
    fills.map((node) => node.props.ratio),
    [0.5, 0.5],
  );
  assert.equal(
    fills.every((node) => node.props.color === "#FFFFFF"),
    true,
  );
});

test("Loading and unavailable logging block writes, including programmatic presses", () => {
  for (const state of [{ loading: true }, { disabled: true }]) {
    const h = fixture(state);
    for (const node of nodes(h.tree).filter((node) => node.type === "Button")) {
      assert.equal(node.props.disabled, true, node.props.accessibilityLabel);
      node.props.onPress();
    }
    assert.deepEqual(h.calls, []);
  }
  const busy = fixture({ waterBusy: true });
  const water = busy.button("Add 250 millilitres of water to today");
  assert.equal(water.props.disabled, true);
  water.props.onPress();
  assert.deepEqual(busy.calls, []);
  assert.equal(busy.button("Log steps").props.disabled, false);
});

test("Latest body weight carries its date and converts only its display unit", () => {
  const h = fixture({
    unit: "lb",
    snapshot: { daily: [], weight: { metric: "weight", value: 75, date: "2026-11-16" } },
  });
  const body = text(h.button("Log body weight"));
  assert.match(body, /165\.3/);
  assert.match(body, /lb/);
  assert.match(body, /2026-11-16/);
});

test("Existing callers without a food diary action still log calories", () => {
  const h = fixture({ onNutrition: undefined });
  h.button("Log food calories").props.onPress();
  assert.deepEqual(h.calls, [["log", "caloriesIn"]]);
});
