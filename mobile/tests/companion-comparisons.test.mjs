import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as model from "../src/features/progress/model.ts";
import * as insights from "../src/features/pro/companion-insights.ts";

const jsx = (type, props) => ({ type, props });
const code = ts.transpileModule(
  readFileSync(
    new URL("../src/features/pro/companion-insights-panel.tsx", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const dependencies = {
  react: { useState: (initial) => [initial, () => {}], useMemo: (fn) => fn() },
  "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
  "react-native": { View: "View", ScrollView: "Scroll" },
  "expo-router": { router: {} },
  "@/src/components/ui": { Txt: "Txt" },
  "@/src/components/motion": { MotionPressable: "Pressable", ProgressFill: "Fill" },
  "../progress/model": model,
  "../exercises/api": { pretty: String },
  "./analytics": { MUSCLES: [] },
  "./companion-insights": insights,
  "./ui": {
    GlassCard: "Card",
    ProAction: "Action",
    ProPill: "Pill",
    ProSection: "Section",
    ProStat: "Stat",
    Reveal: "Reveal",
    PRO: { accent: "green", cyan: "cyan" },
  },
};
const exports = {};
vm.runInNewContext(code, {
  exports,
  require: (name) => {
    assert.ok(name in dependencies, `Unexpected dependency ${name}`);
    return dependencies[name];
  },
  Date,
  Set,
  Map,
  Object,
});
const { ComparisonCard } = exports;
const find = (node, predicate) =>
  !node || typeof node !== "object"
    ? []
    : Array.isArray(node)
      ? node.flatMap((n) => find(n, predicate))
      : [...(predicate(node) ? [node] : []), ...find(node.props?.children, predicate)];
const text = (node) =>
  node == null || typeof node === "boolean"
    ? ""
    : typeof node !== "object"
      ? String(node)
      : Array.isArray(node)
        ? node.map(text).join("")
        : text(node.props?.children);
const byLabel = (tree, label) => find(tree, (node) => node.props?.accessibilityLabel === label)[0];
const today = "2026-11-14";
const metric = (id, date, type, value, observedAt = `${date}T10:00:00Z`) => ({
  id,
  date,
  metric: type,
  value,
  observedAt,
  kind: "metric",
  source: "manual",
  notes: "",
});
const experiment = {
  id: "experiment",
  title: "My change",
  metric: "measurement",
  measurement: "weight",
  hypothesis: "A more consistent routine may coincide with a weight trend.",
  baseline: { start: "2026-11-01", end: "2026-11-07" },
  comparison: { start: "2026-11-08", end: today },
};
const events = [
  metric("old", "2026-11-01", "weight", 80),
  metric("corrected", "2026-11-01", "weight", 82, "2026-11-02T12:00:00Z"),
  metric("second", "2026-11-02", "weight", 84),
  metric("removed", "2026-11-03", "weight", 90),
  metric("clear", "2026-11-03", "weight", null, "2026-11-04T12:00:00Z"),
  metric("later", "2026-11-09", "weight", 81.5),
  metric("waist", "2026-11-02", "waist", 92),
];
const result = () =>
  insights.compareTrainingRanges([], events, experiment.baseline, experiment.comparison, today);
test("measurement experiments render corrected recorded-day means, coverage and hypothesis before training totals", () => {
  const tree = ComparisonCard({
    result: result(),
    unit: "kg",
    title: experiment.title,
    experiment,
  });
  assert.equal(text(byLabel(tree, "Body weight earlier average")), "83");
  assert.equal(text(byLabel(tree, "Body weight later average")), "81.5");
  assert.equal(text(byLabel(tree, "Body weight earlier coverage")), "2/7 days");
  assert.equal(text(byLabel(tree, "Body weight later coverage")), "1/7 days");
  assert.match(text(tree), /Body weight \(kg\) · Focus/);
  assert.match(text(tree), /Hypothesis: A more consistent routine/);
  assert.ok(text(tree).indexOf("Recorded-day averages") < text(tree).indexOf("Completed workouts"));
  const rows = find(tree, (node) =>
    node.props?.accessibilityLabel?.endsWith("recorded-day averages"),
  );
  assert.equal(rows[0].props.accessibilityLabel, "Body weight recorded-day averages");
  assert.equal(text(byLabel(tree, "Waist later average")), "—");
  assert.equal(text(byLabel(tree, "Waist later coverage")), "0/7 days");
});
test("comparison display converts body-weight averages to the chosen unit and retains other metric units", () => {
  const tree = ComparisonCard({
    result: result(),
    unit: "lb",
    title: experiment.title,
    experiment,
  });
  assert.equal(text(byLabel(tree, "Body weight earlier average")), "182.98");
  assert.equal(text(byLabel(tree, "Body weight later average")), "179.68");
  assert.match(text(tree), /Body weight \(lb\)/);
  assert.match(text(tree), /Waist \(cm\)/);
  assert.equal(text(byLabel(tree, "Waist earlier average")), "92");
});
test("a selected metric remains visible with dashes when every reading is absent or cleared", () => {
  const cleared = insights.compareTrainingRanges(
    [],
    [
      metric("reading", "2026-11-01", "weight", 80),
      metric("clear", "2026-11-01", "weight", null, "2026-11-02T12:00:00Z"),
    ],
    experiment.baseline,
    experiment.comparison,
    today,
  );
  const tree = ComparisonCard({ result: cleared, unit: "kg", title: experiment.title, experiment });
  assert.equal(text(byLabel(tree, "Body weight earlier average")), "—");
  assert.equal(text(byLabel(tree, "Body weight later average")), "—");
  assert.equal(text(byLabel(tree, "Body weight earlier coverage")), "0/7 days");
  assert.equal(text(byLabel(tree, "Body weight later coverage")), "0/7 days");
  assert.match(text(tree), /missing days stay missing/);
});
test("ordinary training-block comparisons also expose available measurement averages", () => {
  const tree = ComparisonCard({ result: result(), unit: "kg", title: "Four-week blocks" });
  assert.equal(text(byLabel(tree, "Body weight earlier average")), "83");
  assert.ok(text(tree).indexOf("Completed workouts") < text(tree).indexOf("Recorded-day averages"));
});
