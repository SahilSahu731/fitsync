import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { homeSnapshot } from "../src/features/home/model.ts";
import { weekInsight } from "../src/features/home/week-insight.ts";
import { dateLabel } from "../src/features/progress/model.ts";

const workout = (id, date, extra = {}) => ({
  id,
  name: "Training",
  status: "completed",
  started_at: `${date}T09:00:00`,
  finished_at: `${date}T10:00:00`,
  elapsed_seconds: 1200,
  workout_session_exercises: [],
  ...extra,
});
const insight = (workouts, today = "2026-11-24", target = 3) =>
  weekInsight(homeSnapshot(workouts, [], today), today, target);

test("compares only the same weekdays, excluding later days last week", () => {
  const result = insight([
    workout("last-mon", "2026-11-16"),
    workout("last-wed", "2026-11-18"),
    workout("last-sat", "2026-11-21"),
    workout("this-mon", "2026-11-23"),
    workout("this-tue", "2026-11-24"),
  ]);
  assert.equal(result.text, "1 more session than Mon–Tue last week.");
  assert.equal(result.icon, "trending-up");
});

test("Monday compares with the previous Monday only across month boundaries", () => {
  const result = insight(
    [
      workout("last-mon-1", "2026-10-26"),
      workout("last-mon-2", "2026-10-26"),
      workout("last-tue", "2026-10-27"),
      workout("this-mon", "2026-11-02"),
    ],
    "2026-11-02",
  );
  assert.equal(result.text, "1 fewer session than Monday last week.");
  assert.equal(result.icon, "trending-down");
});

test("Sunday includes seven days and preserves equal-count wording", () => {
  const result = insight(
    [workout("last-sun", "2026-11-15"), workout("this-sun", "2026-11-22")],
    "2026-11-22",
  );
  assert.equal(result.text, "Same as Mon–Sun last week: 1 session.");
  assert.equal(result.icon, "minus");
});

test("future, active, unfinished, and invalid sessions cannot change the comparison", () => {
  const result = insight([
    workout("last-mon", "2026-11-16"),
    workout("future", "2026-11-25"),
    workout("active", "2026-11-24", { status: "active" }),
    workout("unfinished", "2026-11-24", { finished_at: null }),
    workout("invalid", "2026-11-24", { finished_at: "invalid" }),
  ]);
  assert.equal(result.text, "1 fewer session than Mon–Tue last week.");
});

test("empty history uses the weekly goal and makes no comparison or percentage claim", () => {
  const result = insight([]);
  assert.equal(result.text, "3 sessions to your weekly goal.");
  assert.equal(result.icon, "bullseye-arrow");
  assert.doesNotMatch(result.text, /%|more|fewer|last week/i);
});

test("a zero prior window uses goal remaining even when older history exists", () => {
  const result = insight(
    [
      workout("older", "2026-11-01"),
      workout("last-wed", "2026-11-18"),
      workout("today", "2026-11-24"),
    ],
    "2026-11-24",
    2,
  );
  assert.equal(result.text, "1 session to your weekly goal.");
  assert.doesNotMatch(result.text, /%|more|last week/i);
});

test("goal completion and missing goals have factual fallbacks", () => {
  const sessions = [workout("today", "2026-11-24")];
  assert.equal(insight(sessions, "2026-11-24", 1).text, "Weekly goal met with 1 recorded session.");
  assert.equal(insight(sessions, "2026-11-24", null).text, "1 session recorded so far this week.");
  for (const target of [null, 0, -1, NaN, Infinity]) {
    assert.equal(
      insight([], "2026-11-24", target).text,
      "Log a session to build this week's rhythm.",
    );
  }
});

const jsx = (type, props = {}) => (typeof type === "function" ? type(props) : { type, props });
const text = (node) => {
  if (node == null || typeof node === "boolean") return "";
  if (Array.isArray(node)) return node.map(text).join(" ");
  return typeof node === "object" ? text(node.props?.children) : String(node);
};
const nodes = (node) => {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== "object") return [];
  return [node, ...nodes(node.props?.children)];
};

function renderWeekOverview(extra = {}) {
  const code = ts.transpileModule(
    readFileSync(new URL("../src/features/home/week-overview.tsx", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
  ).outputText;
  const dependencies = {
    react: {},
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { View: "View" },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/components/motion": { MotionPressable: "Pressable" },
    "@/src/components/ui": { Txt: "Txt" },
    "../progress/model": { dateLabel },
    "./week-insight": { weekInsight },
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency ${name}`);
      return dependencies[name];
    },
  });
  return exports.WeekOverview({
    snapshot: homeSnapshot([], [], "2026-11-24"),
    today: "2026-11-24",
    target: 3,
    loading: false,
    onCalendar() {},
    ...extra,
  });
}

test("weekly insight retains reachable goal and calendar actions and all seven days", () => {
  let goals = 0;
  let calendar = 0;
  const tree = renderWeekOverview({
    onGoals: () => {
      goals += 1;
    },
    onCalendar: () => {
      calendar += 1;
    },
  });
  const all = nodes(tree);
  all.find((node) => node.props.accessibilityLabel === "Manage your goals").props.onPress();
  all.find((node) => node.props.accessibilityLabel === "Open training calendar").props.onPress();
  assert.equal(goals, 1);
  assert.equal(calendar, 1);
  assert.equal(
    all.filter((node) => node.props.accessibilityLabel?.includes("completed sessions")).length,
    7,
  );
  assert.match(text(tree), /3 sessions to your weekly goal/);
});

test("loading hides the insight rather than presenting a zero-history claim", () => {
  const content = text(renderWeekOverview({ loading: true }));
  assert.match(content, /Loading your weekly rhythm/);
  assert.doesNotMatch(content, /3 sessions to your weekly goal/);
});
