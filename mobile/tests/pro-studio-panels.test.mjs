import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { buildProAnalytics } from "../src/features/pro/analytics.ts";
import { dateLabel } from "../src/features/progress/model.ts";
import * as foodModel from "../src/features/nutrition/model.ts";

function fixture() {
  const slots = [];
  let cursor = 0;
  const jsx = (type, props = {}) => (typeof type === "function" ? type(props) : { type, props });
  const dependencies = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
        return [
          slots[index],
          (next) => {
            slots[index] = typeof next === "function" ? next(slots[index]) : next;
          },
        ];
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      View: "View",
      ScrollView: "ScrollView",
      useWindowDimensions: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
    },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "react-native-svg": {
      __esModule: true,
      default: "Svg",
      Circle: "Circle",
      Line: "Line",
      Path: "Path",
      Rect: "Rect",
    },
    "@/src/components/motion": { MotionPressable: "Pressable", ProgressFill: "ProgressFill" },
    "@/src/components/ui": { Txt: "Txt" },
    "./anatomical-body": { AnatomicalBody: "AnatomicalBody" },
    "../nutrition/model": foodModel,
    "../nutrition/components": { PlateArt: "PlateArt" },
    "../progress/model": { dateLabel },
    "./hub-ui": { PRO: { accent: "#C5F460", gold: "#ECD7A8", muted: "#A3A3A3" } },
  };
  const exports = {};
  const source = ts.transpileModule(
    readFileSync(new URL("../src/features/pro/studio-panels.tsx", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  vm.runInNewContext(source, {
    exports,
    Date,
    require(name) {
      if (!(name in dependencies)) throw Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return {
    render(name, props) {
      cursor = 0;
      return exports[name](props);
    },
  };
}

function nodes(node, predicate = () => true) {
  if (node == null || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((child) => nodes(child, predicate));
  return [...(predicate(node) ? [node] : []), ...nodes(node.props?.children, predicate)];
}
function text(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node !== "object") return String(node);
  if (Array.isArray(node)) return node.map(text).join("");
  return text(node.props?.children);
}
function button(tree, label) {
  const found = nodes(
    tree,
    (node) => node.type === "Pressable" && node.props.accessibilityLabel === label,
  )[0];
  assert.ok(found, `Expected accessible button: ${label}`);
  assert.equal(found.props.accessibilityRole, "button");
  return found;
}
const today = "2026-11-17";
const set = (id, extra = {}) => ({
  id,
  set_type: "normal",
  completed_at: `${today}T10:00:00Z`,
  weight_kg: 40,
  reps: 8,
  duration_seconds: null,
  distance_meters: null,
  rpe: null,
  rir: null,
  ...extra,
});
const analytics = () =>
  buildProAnalytics(
    [
      {
        id: "completed",
        name: "Upper",
        status: "completed",
        started_at: `${today}T10:00:00Z`,
        finished_at: `${today}T11:00:00Z`,
        elapsed_seconds: 1800,
        workout_session_exercises: [
          {
            id: "press",
            exercise_id: "press",
            exercise_name: "Press",
            position: 0,
            tracking_type: "reps_weight",
            workout_logged_sets: [
              set("p1"),
              set("p2"),
              set("warmup", { set_type: "warmup" }),
              set("unfinished", { completed_at: null }),
            ],
          },
          {
            id: "row",
            exercise_id: "row",
            exercise_name: "Row",
            position: 1,
            tracking_type: "reps_weight",
            workout_logged_sets: [set("r1")],
          },
          {
            id: "unknown",
            exercise_id: "unknown",
            exercise_name: "Unclassified movement",
            position: 2,
            tracking_type: "reps",
            workout_logged_sets: [set("u1", { weight_kg: null })],
          },
        ],
      },
    ],
    [
      { id: "press", primaryMuscles: ["chest", "chest"], secondaryMuscles: ["triceps"] },
      { id: "row", primaryMuscles: ["upper-back"], secondaryMuscles: ["biceps"] },
    ],
    [],
    30,
    today,
  );

test("muscle brief shows real mapped coverage and separate primary/supporting involvement without a growth score", () => {
  const ui = fixture();
  const calls = [];
  const tree = ui.render("MuscleBrief", {
    data: analytics(),
    error: "",
    loading: false,
    onOpen: () => calls.push("open"),
    onRetry: () => calls.push("retry"),
  });
  assert.match(text(tree), /3 of 4 working sets have muscle labels/);
  assert.match(text(tree), /Counts show involvement, not a recovery or growth score/);
  assert.match(text(tree), /2\s*primary sets/);
  assert.match(text(tree), /0\s*supporting sets/);
  assert.match(text(tree), new RegExp(dateLabel(today)));
  const bodies = nodes(tree, (node) => node.type === "AnatomicalBody");
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].props.back, false);
  assert.equal(bodies[1].props.back, true);
  for (const body of bodies) {
    assert.equal(body.props.selected, "chest");
    assert.equal(body.props.intensity.chest, 1);
    assert.equal(body.props.intensity["upper-back"], 0.5);
    assert.equal(body.props.intensity.triceps, 1);
    assert.equal(body.props.intensity.biceps, 0.5);
    assert.equal(body.props.muscles.includes("unknown"), false);
  }
  assert.equal(
    button(tree, "Select chest muscle").props.accessibilityHint,
    "2 primary sets and 0 supporting sets.",
  );
  assert.equal(
    button(tree, "Select triceps muscle").props.accessibilityHint,
    "0 primary sets and 2 supporting sets.",
  );
  button(tree, "Explore advanced muscle insights").props.onPress();
  assert.deepEqual(calls, ["open"]);
});

test("front and back anatomy and muscle rows share selection without hiding either view", () => {
  const ui = fixture();
  const props = { data: analytics(), error: "", loading: false, onOpen() {}, onRetry() {} };
  let tree = ui.render("MuscleBrief", props);
  assert.equal(button(tree, "Select chest muscle").props.accessibilityState.selected, true);
  nodes(tree, (node) => node.type === "AnatomicalBody")[1].props.onSelect("upper-back");
  tree = ui.render("MuscleBrief", props);
  assert.equal(button(tree, "Select upper back muscle").props.accessibilityState.selected, true);
  assert.equal(button(tree, "Select chest muscle").props.accessibilityState.selected, false);
  assert.match(text(tree), /1\s*primary sets/);
  let bodies = nodes(tree, (node) => node.type === "AnatomicalBody");
  assert.equal(bodies[0].props.selected, "upper-back");
  assert.equal(bodies[1].props.selected, "upper-back");
  assert.equal(bodies[0].props.back, false);
  assert.equal(bodies[1].props.back, true);
  bodies[0].props.onSelect("triceps");
  tree = ui.render("MuscleBrief", props);
  assert.equal(button(tree, "Select triceps muscle").props.accessibilityState.selected, true);
  assert.match(text(tree), /0\s*primary sets\s*2\s*supporting sets/);
  button(tree, "Select chest muscle").props.onPress();
  tree = ui.render("MuscleBrief", props);
  bodies = nodes(tree, (node) => node.type === "AnatomicalBody");
  assert.equal(bodies[0].props.selected, "chest");
  assert.equal(bodies[1].props.selected, "chest");
  assert.equal(button(tree, "Select chest muscle").props.accessibilityState.selected, true);
});

test("supporting-only muscles remain selectable without being counted as primary sets", () => {
  const ui = fixture();
  const props = { data: analytics(), error: "", loading: false, onOpen() {}, onRetry() {} };
  let tree = ui.render("MuscleBrief", props);
  button(tree, "Select biceps muscle").props.onPress();
  tree = ui.render("MuscleBrief", props);
  assert.equal(button(tree, "Select biceps muscle").props.accessibilityState.selected, true);
  assert.match(text(tree), /0\s*primary sets\s*1\s*supporting sets/);
  assert.match(text(tree), new RegExp(dateLabel(today)));
  for (const body of nodes(tree, (node) => node.type === "AnatomicalBody")) {
    assert.equal(body.props.selected, "biceps");
  }
});

test("selecting an untrained muscle on the anatomy exposes its zero-count details and row", () => {
  const ui = fixture();
  const props = { data: analytics(), error: "", loading: false, onOpen() {}, onRetry() {} };
  let tree = ui.render("MuscleBrief", props);
  assert.equal(
    nodes(tree, (node) => node.props.accessibilityLabel === "Select calves muscle").length,
    0,
  );
  nodes(tree, (node) => node.type === "AnatomicalBody")[1].props.onSelect("calves");
  tree = ui.render("MuscleBrief", props);
  const selected = button(tree, "Select calves muscle");
  assert.equal(selected.props.accessibilityState.selected, true);
  assert.equal(selected.props.accessibilityHint, "0 primary sets and 0 supporting sets.");
  assert.match(text(tree), /0\s*primary sets\s*0\s*supporting sets/);
  assert.match(text(tree), /No mapped sets yet/);
  for (const body of nodes(tree, (node) => node.type === "AnatomicalBody")) {
    assert.equal(body.props.selected, "calves");
    assert.equal(body.props.muscles.includes("calves"), false);
  }
});

test("empty or failed muscle refresh exposes missing data and a working retry without invented counts", () => {
  const calls = [];
  const data = buildProAnalytics([], [], [], 30, today);
  const tree = fixture().render("MuscleBrief", {
    data,
    loading: true,
    error: "offline",
    onOpen() {},
    onRetry: () => calls.push("retry"),
  });
  assert.match(text(tree), /—\s*primary sets/);
  assert.match(text(tree), /No mapped sets yet/);
  assert.match(text(tree), /0 of 0 working sets have muscle labels/);
  const retry = nodes(
    tree,
    (node) => node.type === "Pressable" && text(node).includes("Tap to retry"),
  )[0];
  assert.equal(retry.props.accessibilityRole, "button");
  retry.props.onPress();
  assert.deepEqual(calls, ["retry"]);
});

const diaryFood = (id, extra = {}) => ({
  id,
  date: today,
  meal: "breakfast",
  name: "My oats",
  quantity: 150,
  unit: "g",
  basisAmount: 100,
  nutrition: { calories: 100, protein: 10, carbs: 20, fat: 3, fiber: 2, sugar: 1, sodium: 5 },
  status: "eaten",
  time: "08:00",
  remind: false,
  note: "",
  ...extra,
});
test("meal brief shows user's eaten totals and planned portions without recipe suggestions", () => {
  const calls = [];
  const tree = fixture().render("MealBrief", {
    entries: [
      diaryFood("eaten"),
      diaryFood("planned", { name: "My lunch", status: "planned", quantity: 200, time: "13:00" }),
      diaryFood("future", { name: "Tomorrow food", date: "2026-11-18" }),
    ],
    today,
    loading: false,
    error: "",
    onOpen: () => calls.push("food"),
  });
  assert.match(text(tree), /150/);
  assert.match(text(tree), /200 planned/);
  assert.match(text(tree), /My lunch/);
  assert.doesNotMatch(text(tree), /Tomorrow food/);
  button(tree, "Open my food diary").props.onPress();
  button(tree, "Open planned food: My lunch").props.onPress();
  assert.deepEqual(calls, ["food", "food"]);
});
test("meal brief has loading, empty diary and read-error states", () => {
  const ui = fixture();
  const props = { entries: [], today, loading: true, error: "", onOpen() {} };
  assert.match(text(ui.render("MealBrief", props)), /Opening your food diary/);
  const empty = ui.render("MealBrief", {
    ...props,
    loading: false,
    error: "Food diary could not open.",
  });
  assert.match(text(empty), /Build a menu that feels like you/);
  assert.match(text(empty), /how much, and its nutrition/);
  assert.match(text(empty), /Food diary could not open/);
  button(empty, "Add my first food");
});

test("weekly rhythm distinguishes completed, planned and rest days and announces today", () => {
  const days = [
    { date: "2026-11-16", done: true, planned: true, today: false },
    { date: today, done: false, planned: true, today: true },
    { date: "2026-11-18", done: false, planned: false, today: false },
    { date: "2026-11-19", done: true, planned: false, today: false },
  ];
  const tree = fixture().render("WeekRhythm", { title: "Your training week", days });
  const announced = nodes(tree, (node) => node.props.accessible === true);
  assert.equal(announced.length, days.length);
  assert.equal(announced[0].props.accessibilityLabel, `${dateLabel(days[0].date)}, completed`);
  assert.equal(
    announced[1].props.accessibilityLabel,
    `${dateLabel(today)}, today, planned workout`,
  );
  assert.equal(
    announced[2].props.accessibilityLabel,
    `${dateLabel(days[2].date)}, no session planned`,
  );
  assert.equal(announced[3].props.accessibilityLabel, `${dateLabel(days[3].date)}, completed`);
  assert.equal(nodes(announced[0], (node) => node.type === "Icon")[0].props.name, "check");
  assert.equal(nodes(announced[1], (node) => node.type === "Icon")[0].props.name, "dumbbell");
  assert.equal(nodes(announced[2], (node) => node.type === "Icon")[0].props.name, "minus");
  assert.match(text(tree), /Your training week/);
});
