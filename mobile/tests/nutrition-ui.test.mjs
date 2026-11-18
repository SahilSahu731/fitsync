import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as nutrition from "../src/features/nutrition/model.ts";
import * as progressModel from "../src/features/progress/model.ts";

const TODAY = "2026-11-18";
const NOW = new Date(`${TODAY}T12:00:00Z`).getTime();
class Clock extends Date {
  constructor(...args) {
    super(...(args.length ? args : [NOW]));
  }
  static now() {
    return NOW;
  }
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
const food = (change = {}) => ({
  id: "oats",
  date: TODAY,
  meal: "breakfast",
  name: "Oats",
  quantity: 60,
  unit: "g",
  basisAmount: 100,
  nutrition: { calories: 380, protein: 13, carbs: 68, fat: 7, fiber: 10, sugar: 1, sodium: 2 },
  status: "planned",
  time: "18:00",
  remind: false,
  note: "",
  ...change,
});

function fixture(component = "FoodEditor", props = {}, options = {}) {
  const states = [];
  let cursor = 0;
  const saves = [],
    closes = [],
    logs = [],
    marks = [],
    routes = [];
  let permissionCalls = 0;
  const jsx = (type, nodeProps = {}) =>
    typeof type === "function" ? type(nodeProps) : { type, props: nodeProps };
  const button = (p) =>
    jsx("Pressable", {
      ...p,
      accessibilityRole: "button",
      accessibilityLabel: p.title,
      children: p.title,
    });
  const dependencies = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
        return [
          states[index],
          (next) => {
            states[index] = typeof next === "function" ? next(states[index]) : next;
          },
        ];
      },
      useRef(initial) {
        const index = cursor++;
        return (states[index] ??= { current: initial });
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      Switch: "Switch",
      View: "View",
      ActivityIndicator: "ActivityIndicator",
      ScrollView: "ScrollView",
    },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "expo-router": {
      router: { push: (route) => routes.push(route) },
      useLocalSearchParams: () => ({}),
    },
    "@/src/components/motion": { MotionPressable: "Pressable" },
    "@/src/components/ui": { Txt: "Txt" },
    "@/src/context/session": {
      useSession: () => ({ user: options.signedOut ? null : { id: "alice" } }),
    },
    "../billing/billing-context": { useBilling: () => ({ isPro: options.isPro ?? true }) },
    "../progress/use-progress": {
      useProgress: () => ({
        goals: { caloriesIn: 2000, protein: 100 },
        loading: false,
        log: async (...args) => {
          logs.push(args);
        },
        saveGoals: async () => {},
      }),
    },
    "../progress/model": { ...progressModel, localDate: () => TODAY },
    "../progress/editors": {
      Sheet: (p) => ({ type: "Sheet", props: { ...p, children: [p.children, p.footer] } }),
    },
    "./components": {
      amountLabel: (value) =>
        Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100),
      FoodButton: button,
      FoodPill: button,
      FoodField: (p) =>
        jsx("TextInput", { ...p, accessibilityLabel: p.label, onChangeText: p.onChange }),
      MealTimePicker: "MealTimePicker",
      FoodDatePicker: "FoodDatePicker",
      PlateArt: "PlateArt",
    },
    "./model": nutrition,
    "./reminders": {
      foodReminderAt: (date, time) => Date.parse(`${date}T${time}:00Z`),
      requestFoodReminderPermission: async () => {
        permissionCalls++;
        return typeof options.permission === "function"
          ? options.permission()
          : (options.permission ?? true);
      },
      useFoodReminderStatus: () => ({ permission: "unknown", scheduled: 0, error: "" }),
    },
    "./use-food-diary": {
      useFoodDiary: () => ({
        diary: { version: 1, entries: options.entries ?? [], library: [] },
        loading: false,
        busy: false,
        error: "",
        refresh: async () => {},
        saveEntry: async (entry) => {
          marks.push(entry);
        },
        removeEntry: async () => {},
      }),
    },
    "./food-editor": { FoodEditor: "FoodEditor" },
  };
  const source = readFileSync(
    new URL(
      `../src/features/nutrition/${component === "FoodEditor" ? "food-editor" : "food-diary"}.tsx`,
      import.meta.url,
    ),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    Date: Clock,
    Error,
    Set,
    Map,
    Promise,
    require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return {
    saves,
    closes,
    logs,
    marks,
    routes,
    permissionCalls: () => permissionCalls,
    render() {
      cursor = 0;
      return exports[component](
        component === "FoodEditor"
          ? {
              date: TODAY,
              meal: "breakfast",
              library: [],
              onSave: async (entry) => {
                saves.push(entry);
              },
              onClose: () => closes.push(true),
              ...props,
            }
          : props,
      );
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
  if (Array.isArray(node)) return node.map(text).join(" ");
  return text(node.props?.children);
}
function button(tree, label) {
  const result = nodes(
    tree,
    (node) => node.type === "Pressable" && node.props.accessibilityLabel === label,
  )[0];
  assert.ok(result, `Expected button: ${label}`);
  return result;
}
function field(tree, label) {
  const result = nodes(
    tree,
    (node) => node.type === "TextInput" && node.props.accessibilityLabel === label,
  )[0];
  assert.ok(result, `Expected field: ${label}`);
  return result;
}
const alerts = (tree) =>
  nodes(tree, (node) => node.props?.accessibilityRole === "alert")
    .map(text)
    .join(" ");
const preview = (tree) =>
  nodes(tree, (node) => node.type === "Txt" && /YOUR .* PORTION/.test(text(node))).length;
function fill(ui, values = {}) {
  for (const [label, value] of Object.entries({
    "Food name": "Oats",
    "Amount you’ll eat": "60",
    "Nutrition reference amount": "100",
    Calories: "380",
    Protein: "13",
    Carbs: "68",
    Fat: "7",
    ...values,
  })) {
    field(ui.render(), label).props.onChangeText(value);
  }
}

test("manual food entry scales a per-100 g label and saves the portion with its original label", async () => {
  const ui = fixture();
  fill(ui);
  let tree = ui.render();
  assert.equal(preview(tree), 1);
  assert.match(text(tree), /228\s+kcal/);
  assert.match(text(tree), /7\.8\s+g protein/);
  button(tree, "Add food").props.onPress();
  await tick();
  assert.equal(ui.saves.length, 1);
  assert.equal(ui.saves[0].quantity, 60);
  assert.equal(ui.saves[0].basisAmount, 100);
  assert.equal(ui.saves[0].nutrition.calories, 380);
  assert.equal(nutrition.portionNutrition(ui.saves[0]).calories, 228);
  assert.equal(ui.saves[0].nutrition.fiber, 0, "blank optional nutrients use zero");
  assert.equal(ui.closes.length, 1);
});

test("mandatory nutrition stays editable, hides stale portions and cannot save NaN", async () => {
  const ui = fixture();
  fill(ui);
  assert.equal(preview(ui.render()), 1);
  field(ui.render(), "Protein").props.onChangeText("");
  let tree = ui.render();
  assert.equal(preview(tree), 0);
  assert.doesNotMatch(text(tree), /NaN|Infinity/);
  button(tree, "Add food").props.onPress();
  await tick();
  assert.equal(ui.saves.length, 0);
  assert.match(alerts(ui.render()), /protein/);
  field(ui.render(), "Protein").props.onChangeText("0");
  assert.equal(preview(ui.render()), 1, "an explicit zero is valid");
  field(ui.render(), "Amount you’ll eat").props.onChangeText("invalid");
  assert.equal(preview(ui.render()), 0);
  assert.equal(field(ui.render(), "Amount you’ll eat").props.value, "invalid");
});

test("saved food reuse restores label values and accepts a different portion", async () => {
  const saved = {
    id: "saved-oats",
    name: "Rolled oats",
    unit: "g",
    basisAmount: 100,
    nutrition: food().nutrition,
  };
  const ui = fixture("FoodEditor", { library: [saved] });
  button(ui.render(), "Use a saved food").props.onPress();
  let tree = ui.render();
  assert.equal(tree.props.title, "Your saved foods");
  button(tree, "Use Rolled oats").props.onPress();
  tree = ui.render();
  assert.equal(field(tree, "Food name").props.value, "Rolled oats");
  assert.equal(field(tree, "Protein").props.value, "13");
  field(tree, "Amount you’ll eat").props.onChangeText("40");
  assert.match(text(ui.render()), /152\s+kcal/);
  button(ui.render(), "Add food").props.onPress();
  await tick();
  assert.equal(ui.saves[0].nutrition.calories, 380);
  assert.equal(ui.saves[0].quantity, 40);
});

test("extra nutrients reveal on demand and remain in the saved food", async () => {
  const ui = fixture();
  fill(ui);
  assert.equal(
    nodes(ui.render(), (node) => node.type === "TextInput" && node.props.label === "Fiber").length,
    0,
  );
  button(ui.render(), "Show more nutrients").props.onPress();
  field(ui.render(), "Fiber").props.onChangeText("10");
  field(ui.render(), "Sugar").props.onChangeText("1");
  field(ui.render(), "Sodium").props.onChangeText("2");
  button(ui.render(), "Show fewer nutrients").props.onPress();
  button(ui.render(), "Add food").props.onPress();
  await tick();
  assert.equal(ui.saves[0].nutrition.fiber, 10);
  assert.equal(ui.saves[0].nutrition.sodium, 2);
});

test("future food stays planned and validation rejects an eaten future draft", async () => {
  const ui = fixture("FoodEditor", { date: "2026-11-19" });
  fill(ui);
  assert.equal(button(ui.render(), "Already eaten").props.disabled, true);
  button(ui.render(), "Add food").props.onPress();
  await tick();
  assert.equal(ui.saves[0].status, "planned");
  const invalid = fixture("FoodEditor", {
    date: "2026-11-19",
    entry: food({ date: "2026-11-19", status: "eaten" }),
  });
  button(invalid.render(), "Save changes").props.onPress();
  await tick();
  assert.equal(invalid.saves.length, 0);
  assert.match(alerts(invalid.render()), /Future meals/);
});

test("denied reminder permission leaves the reminder off and explains how to enable it", async () => {
  const ui = fixture("FoodEditor", {}, { permission: false });
  fill(ui);
  await nodes(ui.render(), (node) => node.type === "Switch")[0].props.onValueChange(true);
  const tree = ui.render();
  assert.equal(ui.permissionCalls(), 1);
  assert.equal(nodes(tree, (node) => node.type === "Switch")[0].props.value, false);
  assert.match(alerts(tree), /Allow notifications/);
});

test("a reminder needs a future time; marking food eaten removes its reminder", async () => {
  const ui = fixture("FoodEditor", { entry: food({ time: "08:00", remind: true }) });
  assert.equal(
    preview(ui.render()),
    1,
    "valid nutrition remains visible while a reminder time needs fixing",
  );
  button(ui.render(), "Save changes").props.onPress();
  await tick();
  assert.equal(ui.saves.length, 0);
  assert.match(alerts(ui.render()), /future meal time/);
  button(ui.render(), "Already eaten").props.onPress();
  assert.equal(nodes(ui.render(), (node) => node.type === "Switch").length, 0);
  button(ui.render(), "Save changes").props.onPress();
  await tick();
  assert.equal(ui.saves[0].status, "eaten");
  assert.equal(ui.saves[0].remind, false);
});

test("diary totals switch planned/eaten and Progress exports only eaten values as replacements", async () => {
  const entries = [
    food({ status: "eaten" }),
    food({ id: "planned", name: "More oats", quantity: 100 }),
    food({ id: "other-day", date: "2026-11-17", status: "eaten" }),
  ];
  const ui = fixture("FoodDiaryPanel", { initialDate: TODAY }, { entries });
  assert.match(text(ui.render()), /228\s+kcal\s+eaten/);
  button(ui.render(), "Planned").props.onPress();
  assert.match(text(ui.render()), /380\s+kcal\s+planned/);
  button(ui.render(), "Show additional nutrients").props.onPress();
  assert.match(text(ui.render()), /Fiber/);
  button(ui.render(), "Save eaten totals to Progress").props.onPress();
  await tick();
  assert.equal(ui.logs.length, 7);
  assert.deepEqual(ui.logs[0], ["caloriesIn", TODAY, 228, "Eaten food diary total"]);
  assert.deepEqual(ui.logs[1], ["protein", TODAY, 7.8, "Eaten food diary total"]);
  assert.ok(
    ui.logs.every((args) => args.length === 4),
    "no increment option is passed to Progress",
  );
  assert.match(alerts(ui.render()), /Eaten totals saved/);
});

test("marking planned food eaten clears its reminder and free members open the Pro paywall", async () => {
  const ui = fixture("FoodDiaryPanel", {}, { entries: [food({ remind: true })] });
  button(ui.render(), "Mark Oats as eaten").props.onPress();
  await tick();
  assert.equal(ui.marks[0].status, "eaten");
  assert.equal(ui.marks[0].remind, false);
  const free = fixture("FoodDiaryPanel", {}, { isPro: false });
  button(free.render(), "Add food to Breakfast").props.onPress();
  assert.deepEqual(free.routes, ["/membership"]);
});

test("a day with only planned food cannot replace Progress nutrition with zeros", async () => {
  const ui = fixture("FoodDiaryPanel", {}, { entries: [food()] });
  const save = button(ui.render(), "Save eaten totals to Progress");
  assert.equal(save.props.disabled, true);
  save.props.onPress();
  await tick();
  assert.equal(ui.logs.length, 0, "the handler also guards a stale or accidental press");
});

test("an unresolved reminder permission blocks save, delete and close including stale callbacks", async () => {
  let grant;
  const permission = new Promise((resolve) => {
    grant = resolve;
  });
  const deleted = [];
  const ui = fixture(
    "FoodEditor",
    {
      entry: food(),
      onDelete: async (id) => {
        deleted.push(id);
      },
    },
    { permission: () => permission },
  );
  const original = ui.render();
  const request = nodes(original, (node) => node.type === "Switch")[0].props.onValueChange(true);
  button(original, "Save changes").props.onPress();
  button(original, "Delete food").props.onPress();
  original.props.onClose();
  await tick();
  let tree = ui.render();
  assert.equal(tree.props.busy, true);
  assert.equal(button(tree, "Enabling reminder…").props.disabled, true);
  assert.equal(button(tree, "Delete food").props.disabled, true);
  assert.equal(nodes(tree, (node) => node.type === "Switch")[0].props.disabled, true);
  assert.equal(ui.saves.length, 0);
  assert.equal(ui.closes.length, 0);
  assert.equal(deleted.length, 0);
  grant(true);
  await request;
  tree = ui.render();
  assert.equal(tree.props.busy, false);
  assert.equal(button(tree, "Save changes").props.disabled, false);
  assert.equal(nodes(tree, (node) => node.type === "Switch")[0].props.value, true);
  button(tree, "Save changes").props.onPress();
  await tick();
  assert.equal(ui.saves.length, 1);
  assert.equal(ui.saves[0].remind, true);
  assert.equal(ui.closes.length, 1);
});

test("a late permission grant cannot undo an off intent or an eaten choice", async () => {
  for (const intent of ["off", "eaten"]) {
    let grant;
    const permission = new Promise((resolve) => {
      grant = resolve;
    });
    const ui = fixture("FoodEditor", { entry: food() }, { permission: () => permission });
    const originalSwitch = nodes(ui.render(), (node) => node.type === "Switch")[0];
    const request = originalSwitch.props.onValueChange(true);
    if (intent === "off") await originalSwitch.props.onValueChange(false);
    else button(ui.render(), "Already eaten").props.onPress();
    grant(true);
    await request;
    if (intent === "eaten") {
      assert.equal(nodes(ui.render(), (node) => node.type === "Switch").length, 0);
      button(ui.render(), "Plan to eat").props.onPress();
    }
    const tree = ui.render();
    assert.equal(nodes(tree, (node) => node.type === "Switch")[0].props.value, false, intent);
    button(tree, "Save changes").props.onPress();
    await tick();
    assert.equal(ui.saves[0].remind, false, intent);
    assert.equal(ui.permissionCalls(), 1);
  }
});
