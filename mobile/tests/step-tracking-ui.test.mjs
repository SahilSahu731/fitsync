import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as progressModel from "../src/features/progress/model.ts";

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
const jsx = (type, props = {}) => (typeof type === "function" ? type(props) : { type, props });
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
const baseDeps = {
  react: {
    Fragment: "Fragment",
    useState: (initial) => [typeof initial === "function" ? initial() : initial, () => {}],
  },
  "react/jsx-runtime": { jsx, jsxs: jsx },
  "react-native": { View: "View", ActivityIndicator: "Spinner", ScrollView: "ScrollView" },
  "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
  "@/src/components/motion": { MotionPressable: "Button" },
  "@/src/components/ui": { Txt: "Text" },
};
function card(extra = {}) {
  const calls = [];
  const state = {
    settings: { enabled: false, lastImportedAt: null },
    availability: { available: true },
    busy: false,
    error: "",
    importNow: (...args) => calls.push(args),
    ...extra,
  };
  const component = load("../src/features/health-sync/step-tracking-card.tsx", {
    ...baseDeps,
    "./use-health-sync": { useHealthSync: () => state },
  });
  return { ...component, calls, state, render: (props = {}) => component.StepTrackingCard(props) };
}
const button = (tree) => nodes(tree).find((node) => node.type === "Button");
const entry = (extra = {}) => ({
  kind: "metric",
  id: "steps",
  metric: "steps",
  date: "2026-11-24",
  observedAt: "2026-11-24T12:00:00Z",
  value: 4200,
  source: "healthconnect",
  notes: "",
  ...extra,
});

test("automatic steps requires an explicit steps-only connection, then syncs without requesting access", () => {
  const ui = card();
  const off = ui.render({ children: "Phone walk counter" });
  assert.match(text(off), /Automatic tracking is off/);
  assert.match(text(off), /Phone walk counter/);
  assert.match(text(off), /No automatic data for this day/);
  assert.doesNotMatch(text(off), /\b0\b/);
  button(off).props.onPress();
  assert.equal(ui.calls[0][0], true);
  assert.deepEqual(Array.from(ui.calls[0][1]), ["steps"]);
  ui.state.settings = { enabled: true, metrics: ["steps"], lastImportedAt: "2026-11-24T12:00:00Z" };
  const connected = ui.render({ children: "Phone walk counter" });
  assert.match(text(connected), /Connected to Health Connect/);
  assert.match(text(connected), /Last synced/);
  assert.doesNotMatch(text(connected), /Phone walk counter/);
  button(connected).props.onPress();
  assert.equal(ui.calls[1].length, 0);
});

test("step import enablement respects metric selection and legacy all-metric settings", () => {
  const ui = card({ settings: { enabled: true, metrics: ["weight"], lastImportedAt: null } });
  assert.match(
    text(ui.render({ children: "Phone walk counter" })),
    /Automatic tracking is off.*Phone walk counter/,
  );
  ui.state.settings = { enabled: true, lastImportedAt: null };
  assert.doesNotMatch(text(ui.render({ children: "Phone walk counter" })), /Phone walk counter/);
});

test("automatic and extra steps remain visibly separate, including imported legacy entries", () => {
  const ui = card();
  const combined = entry({
    value: 4700,
    source: "manual",
    stepBreakdown: { automatic: 4200, manual: 500, source: "healthconnect" },
  });
  const tree = ui.render({ entry: combined });
  assert.match(text(tree), /Automatic 4,200 Health Connect Added manually 500/);
  assert.equal(ui.stepEntryLabel(combined), "Health Connect · 4,200 automatic + 500 extra");
  assert.equal(ui.stepEntryLabel(entry()), "Health Connect · 4,200 automatic");
  assert.equal(ui.stepEntryLabel(entry({ source: "healthkit" })), "Apple Health · 4,200 automatic");
  assert.equal(ui.stepEntryLabel(entry({ source: "pedometer" })), "Includes saved phone steps");
  assert.match(
    text(ui.render({ entry: entry({ source: "manual" }) })),
    /No automatic data for this day/,
  );
});

test("busy and unavailable step import show errors and prevent repeated imports", () => {
  for (const extra of [
    { busy: true },
    { availability: { available: false, reason: "Install Health Connect to import steps." } },
  ]) {
    const ui = card({ ...extra, error: "Permission was denied." });
    const tree = ui.render();
    assert.equal(button(tree).props.disabled, true);
    button(tree).props.onPress();
    assert.equal(ui.calls.length, 0);
    assert.match(text(tree), /Permission was denied/);
  }
});

test("revoked or unreadable step access offers an explicit permission review", () => {
  for (const warning of [
    "Steps access is off. Enable it in Health Connect to track walking automatically.",
    "Steps could not be read. Check access in Health Connect and retry.",
  ]) {
    const ui = card({
      settings: { enabled: true, metrics: ["steps"], lastImportedAt: null },
      result: { warnings: [warning] },
    });
    const tree = ui.render({ entry: entry() });
    assert.match(text(tree), /Step access needs attention/);
    assert.ok(text(tree).includes(warning));
    assert.match(text(tree), /Previously synced steps are shown/);
    assert.match(text(tree), /still add missed steps manually/);
    assert.equal(button(tree).props.accessibilityLabel, "Review step permissions");
    button(tree).props.onPress();
    assert.equal(ui.calls[0][0], true);
    assert.deepEqual(Array.from(ui.calls[0][1]), ["steps"]);
  }
});

test("older manual and phone totals are identified as protected daily totals", () => {
  const ui = card();
  for (const source of ["manual", "pedometer"]) {
    const tree = ui.render({ entry: entry({ source }) });
    assert.match(text(tree), /Saved manually/);
    assert.match(text(tree), /Previously saved daily total/);
    assert.match(text(tree), /will not replace this older daily total/);
    assert.doesNotMatch(text(tree), /Extra steps added to your total/);
  }
  assert.equal(ui.stepEntryLabel(entry({ source: "manual" })), "Saved manually");
});

test("recorded steps identify Health Connect and manual additions accurately", () => {
  const ui = card();
  const { MetricDetail } = load("../src/features/progress/metric-detail.tsx", {
    ...baseDeps,
    "@/src/constants/theme": { C: {} },
    "./editors": { Sheet: "Sheet" },
    "../pro/history-chart": { HistoryChart: "Chart" },
    "./charts": { TrendChart: "Chart" },
    "./analytics": { average: () => 0 },
    "../health-sync/step-tracking-card": {
      StepTrackingCard: "StepTrackingCard",
      stepEntryLabel: ui.stepEntryLabel,
    },
    "./model": progressModel,
  });
  const recorded = entry({
    value: 4700,
    source: "manual",
    stepBreakdown: { automatic: 4200, manual: 500, source: "healthconnect" },
  });
  const tree = MetricDetail({
    initialMetric: "steps",
    metrics: [recorded],
    start: "2026-11-24",
    end: "2026-11-24",
    days: 1,
    unit: "kg",
    onClose() {},
    onEdit() {},
  });
  assert.match(text(tree), /Health Connect · 4,200 automatic \+ 500 extra/);
  assert.match(text(tree), /Add extra steps/);
  assert.equal(
    nodes(tree).find((node) => node.type === "StepTrackingCard").props.entry.id,
    recorded.id,
  );
});
