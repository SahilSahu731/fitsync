import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(file, dependencies = {}) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, Date, Intl, require: name => { if (!(name in dependencies)) throw Error(name); return dependencies[name]; } });
  return exports;
}
const view = load("../src/features/program-follow/program-view.ts");
const insights = load("../src/features/program-follow/insights.ts", { "./program-view": view });
const slot = (id, week, date, extra = {}) => ({ id, week, day: 1, date, status: "completed", sessionId: id, routineName: "Full body", templateId: "routine", completedAt: `${date}T10:00:00Z`, completedSets: 3, volumeKg: 100, durationSeconds: 600, ...extra });
function detail(slots = []) {
  return { today: "2026-11-09", week: 3, enrollment: { id: "program", start_date: "2026-10-26", timezone: "Asia/Kolkata", duration_weeks: 3, status: "active", ended_at: null }, slots,
    analytics: { completed: slots.filter(s => s.status === "completed").length, planned: 3, progressPercent: 0, completedSets: 0, minutes: 0, volumeKg: 0, adherencePercent: null, weeks: [] }, events: [] };
}
test("Pro uses completed sets and compares only fully elapsed program weeks", () => {
  const data = detail([slot("a", 1, "2026-10-26"), slot("b", 2, "2026-11-02", { volumeKg: 150, durationSeconds: 900, completedSets: 6 }), slot("c", 3, "2026-11-09", { status: "active", volumeKg: 999, durationSeconds: 999 })]);
  const result = insights.buildProgramInsights(data);
  assert.equal(result.weeks[2].volumeKg, 0); assert.equal(result.weeks[2].minutes, 0);
  assert.equal(result.comparison.previous.week, 1); assert.equal(result.comparison.latest.week, 2);
  assert.equal(result.comparison.volumeChange, 50); assert.equal(result.comparison.setsChange, 100);
  assert.equal(result.comparison.minutesChange, 50);
});
test("zero baseline and insufficient history never manufacture a percentage", () => {
  assert.equal(insights.percentChange(0, 100), null);
  assert.equal(insights.percentChange(100, 0), -100);
  const data = detail(); data.today = "2026-10-27";
  const result = insights.buildProgramInsights(data);
  assert.equal(result.comparison, null); assert.equal(result.adherence, null);
  assert.equal(result.onTimePercent, null); assert.equal(result.routineTrends.length, 0);
  assert.equal(result.activity.length, 28);
});
test("activity and on-time comparisons use the program timezone and actual finish date", () => {
  const data = detail([slot("late", 1, "2026-10-26", { completedAt: "2026-10-26T20:00:00Z" }), slot("early", 2, "2026-11-02", { completedAt: "2026-11-01T10:00:00Z" })]);
  const result = insights.buildProgramInsights(data);
  assert.equal(result.activity.find(day => day.date === "2026-10-27").workouts, 1);
  assert.equal(result.activity.find(day => day.date === "2026-10-26").workouts, 0);
  assert.equal(result.onTime, 1); assert.equal(result.onTimePercent, 50);
});
test("future sessions are excluded from adherence and rest days do not break completed runs", () => {
  const data = detail([slot("a", 1, "2026-10-26"), slot("b", 1, "2026-10-30"), slot("c", 2, "2026-11-03", { status: "planned", completedAt: null }), slot("d", 3, "2026-11-10")]);
  const result = insights.buildProgramInsights(data);
  assert.equal(result.due, 3); assert.equal(result.loggedDue, 2); assert.equal(result.adherence, 67);
  assert.equal(result.bestRun, 2);
});
test("routine comparisons use template identity and actual completion order", () => {
  const data = detail([slot("later", 1, "2026-10-26", { completedAt: "2026-11-04T10:00:00Z", volumeKg: 150 }), slot("first", 2, "2026-11-02"), slot("different", 2, "2026-11-03", { templateId: "other" })]);
  const result = insights.buildProgramInsights(data);
  assert.equal(result.routineTrends.length, 2);
  assert.equal(result.routineTrends[0].first.id, "first"); assert.equal(result.routineTrends[0].last.id, "later");
  assert.equal(result.routineTrends[0].volumeChange, 50); assert.equal(result.routineTrends[1].volumeChange, null);
});
test("historical insights freeze on the date the enrollment ended", () => {
  const data = detail([slot("a", 1, "2026-10-26"), slot("b", 2, "2026-11-02", { status: "planned", completedAt: null })]);
  data.enrollment.status = "switched"; data.enrollment.ended_at = "2026-10-27T10:00:00Z";
  const result = insights.buildProgramInsights(data);
  assert.equal(result.asOf, "2026-10-27"); assert.equal(result.due, 1); assert.equal(result.adherence, 100);
  assert.equal(result.activity.at(-1).date, "2026-10-27");
});
test("Basic includes milestones and recent real logs without Pro calculations", () => {
  const data = detail([slot("a", 1, "2026-10-26"), slot("b", 2, "2026-11-02", { status: "active" })]);
  const result = insights.basicProgress(data);
  assert.equal(result.done.length, 1); assert.equal(result.milestone, 3); assert.equal(result.toMilestone, 2);
  assert.equal(result.recent.length, 1); assert.equal(result.averageMinutes, 10);
});
test("Pro true/false renders the correct dashboard without changing basic log access", () => {
  const Pro = Symbol("ProInsights");
  const jsx = (type, props) => ({ type, props });
  const { ProgramProgress } = load("../src/features/program-follow/program-progress.tsx", {
    react: { useMemo: callback => callback(), useState: initial => [initial, () => {}] },
    "react/jsx-runtime": { jsx, jsxs: jsx }, "react-native": { View: "View", Pressable: "Pressable", ScrollView: "ScrollView" },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" }, "expo-router": { router: {} },
    "@/src/components/ui": { Txt: "Txt" }, "@/src/constants/theme": { C: {} },
    "./insights": insights, "./program-view": view,
    "./program-visuals": { ProgressRing: "Ring", ProBadge: "Badge", PRO_COLOR: "purple" }, "./pro-insights": { ProInsights: Pro }
  });
  const nodes = tree => !tree || typeof tree !== "object" ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
  for (const pro of [false, true]) {
    const tree = ProgramProgress({ detail: detail([slot("a", 1, "2026-10-26")]), pro, unit: "kg", onWeek() {} });
    const all = nodes(tree);
    assert.equal(all.some(node => node.type === Pro), pro);
    assert.ok(all.some(node => node.type === "Ring"));
    assert.ok(all.some(node => node.type === "Txt" && node.props.children === "Recent workouts"));
  }
  const { features } = load("../src/config/features.ts"); assert.equal(typeof features.pro, "boolean");
});
