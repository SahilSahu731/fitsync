import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { buildProAnalytics } from "../src/features/pro/analytics.ts";
import { dateLabel } from "../src/features/progress/model.ts";

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
    "react-native": { View: "View", ScrollView: "ScrollView" },
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
    "../workouts/components/muscle-focus": { Body: "Body" },
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
  assert.match(text(tree), /2primary sets/);
  assert.match(text(tree), /0 supporting sets/);
  assert.match(text(tree), new RegExp(dateLabel(today)));
  const body = nodes(tree, (node) => node.type === "Body")[0];
  assert.equal(body.props.selected, "chest");
  assert.equal(body.props.intensity.chest, 1);
  assert.equal(body.props.intensity["upper-back"], 0.5);
  assert.equal(body.props.muscles.includes("unknown"), false);
  button(tree, "Explore advanced muscle insights").props.onPress();
  assert.deepEqual(calls, ["open"]);
});

test("muscle selection and front/back controls retain accessible names and selected state", () => {
  const ui = fixture();
  const props = { data: analytics(), error: "", loading: false, onOpen() {}, onRetry() {} };
  let tree = ui.render("MuscleBrief", props);
  assert.equal(button(tree, "Select chest muscle").props.accessibilityState.selected, true);
  button(tree, "Select upper back muscle").props.onPress();
  tree = ui.render("MuscleBrief", props);
  assert.equal(button(tree, "Select upper back muscle").props.accessibilityState.selected, true);
  assert.equal(button(tree, "Select chest muscle").props.accessibilityState.selected, false);
  assert.match(text(tree), /1primary sets/);
  button(tree, "Show back muscles").props.onPress();
  tree = ui.render("MuscleBrief", props);
  assert.equal(nodes(tree, (node) => node.type === "Body")[0].props.back, true);
  button(tree, "Show front muscles");
  nodes(tree, (node) => node.type === "Body")[0].props.onSelect("triceps");
  tree = ui.render("MuscleBrief", props);
  assert.equal(button(tree, "Select triceps muscle").props.accessibilityState.selected, true);
  assert.match(text(tree), /0primary sets2 supporting sets/);
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
  assert.match(text(tree), /—primary sets/);
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

const preferences = (extra = {}) => ({
  diet: "any",
  servings: 1,
  exclude: [],
  maxPrepMinutes: 30,
  favoriteIds: [],
  ...extra,
});
const food = () => ({
  preferences: preferences({ diet: "vegan", servings: 4 }),
  plan: {
    week: "2026-11-16",
    servings: 2,
    preferences: preferences({ diet: "vegetarian", servings: 2 }),
    days: [
      {
        date: today,
        meals: [
          { slot: "breakfast", recipeId: "oats" },
          { slot: "lunch", recipeId: "missing" },
        ],
      },
      { date: "2026-11-18", meals: [{ slot: "dinner", recipeId: "tomorrow" }] },
    ],
  },
  groceries: [],
  commitment: null,
});
const recipes = [
  { id: "oats", name: "Berry overnight oats", meal: "breakfast", minutes: 10 },
  { id: "tomorrow", name: "Tomorrow's lentil soup", meal: "dinner", minutes: 20 },
];

test("meal brief uses today's real recipes and the saved menu snapshot rather than changed preferences", () => {
  const calls = [];
  const tree = fixture().render("MealBrief", {
    food: food(),
    recipes,
    today,
    loading: false,
    error: "",
    onOpen: () => calls.push("meals"),
  });
  assert.match(text(tree), /vegetarian · 2 servings/);
  assert.doesNotMatch(text(tree), /vegan|4 servings/);
  assert.match(text(tree), /Berry overnight oats/);
  assert.match(text(tree), /10 min/);
  assert.match(text(tree), /Open saved meal/);
  assert.doesNotMatch(text(tree), /Tomorrow's lentil soup/);
  assert.equal(nodes(tree, (node) => node.type === "Txt" && text(node) === "0 min").length, 0);
  button(tree, "Meals & shopping list").props.onPress();
  const mealRows = nodes(
    tree,
    (node) => node.type === "Pressable" && text(node).includes("Berry overnight oats"),
  );
  assert.equal(mealRows.length, 1);
  mealRows[0].props.onPress();
  assert.deepEqual(calls, ["meals", "meals"]);
});

test("meal brief has actionable loading, setup and refresh-error states", () => {
  const ui = fixture();
  const props = { food: null, recipes: [], today, loading: true, error: "", onOpen() {} };
  const loading = ui.render("MealBrief", props);
  assert.match(text(loading), /Opening your meal plan…/);
  assert.doesNotMatch(text(loading), /Berry overnight oats|0 servings/);
  const setup = ui.render("MealBrief", {
    ...props,
    loading: false,
    error: "Meal plan could not refresh.",
  });
  assert.match(text(setup), /Give your week a little structure/);
  assert.match(
    text(setup),
    /Choose your diet, ingredients to avoid, portions and preparation time/,
  );
  assert.match(text(setup), /Meal plan could not refresh/);
  button(setup, "Plan my meals");
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
