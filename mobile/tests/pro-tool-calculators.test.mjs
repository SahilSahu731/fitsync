import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as trainingModel from "../src/features/pro/training-model.ts";

function fixture(name = "WarmupCalculator", props = {}, weightUnit = "kg") {
  const slots = [];
  const closed = [];
  let cursor = 0;
  const jsx = (type, nodeProps = {}) =>
    typeof type === "function" ? type(nodeProps) : { type, props: nodeProps };
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
      useMemo: (calculate) => calculate(),
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { View: "View", TextInput: "TextInput" },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "react-native-svg": { __esModule: true, default: "Svg", Rect: "Rect", Line: "Line" },
    "@/src/components/motion": { MotionPressable: "Pressable" },
    "@/src/components/ui": { Txt: "Txt" },
    "@/src/context/session": { useSession: () => ({ settings: { weightUnit } }) },
    "../progress/editors": {
      Sheet: (nodeProps) => ({
        type: "Sheet",
        props: { ...nodeProps, children: [nodeProps.children, nodeProps.footer] },
      }),
    },
    "./training-model": trainingModel,
  };
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL("../src/features/pro/tool-calculators.tsx", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    require(dependency) {
      if (!(dependency in dependencies)) throw Error(`Unexpected dependency: ${dependency}`);
      return dependencies[dependency];
    },
  });
  return {
    closed,
    render() {
      cursor = 0;
      return exports[name]({ onClose: () => closed.push("close"), ...props });
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
  const found = nodes(
    tree,
    (node) => node.type === "Pressable" && node.props.accessibilityLabel === label,
  )[0];
  assert.ok(found, `Expected button: ${label}`);
  assert.equal(found.props.accessibilityRole, "button");
  return found;
}
function field(tree, label) {
  const found = nodes(
    tree,
    (node) => node.type === "TextInput" && node.props.accessibilityLabel === label,
  )[0];
  assert.ok(found, `Expected input: ${label}`);
  return found;
}
const alerts = (tree) => nodes(tree, (node) => node.props?.accessibilityRole === "alert");
const sets = (tree) =>
  nodes(tree, (node) => /^View warm-up set \d+$/.test(node.props?.accessibilityLabel ?? ""));

test("warm-up starts empty, reveals equipment and closes from its footer", () => {
  const ui = fixture();
  let tree = ui.render();
  assert.equal(field(tree, "Working load · kg").props.value, "");
  assert.match(text(tree), /Your warm-up starts here\./);
  assert.equal(sets(tree).length, 0);
  assert.equal(alerts(tree).length, 0);
  assert.equal(button(tree, "Equipment").props.accessibilityState.expanded, false);
  button(tree, "Equipment").props.onPress();
  tree = ui.render();
  assert.equal(button(tree, "Equipment").props.accessibilityState.expanded, true);
  assert.equal(field(tree, "Bar weight · kg").props.value, "20");
  assert.equal(field(tree, "Plate 1 count per side").props.value, "2");
  button(tree, "Done").props.onPress();
  assert.deepEqual(ui.closed, ["close"]);
});

test("saved kg targets use preferred units and unit changes reset standard equipment", () => {
  const preferred = fixture(
    "WarmupCalculator",
    { initialLoadKg: 100, exerciseName: "Bench press" },
    "lb",
  );
  let tree = preferred.render();
  assert.ok(Math.abs(Number(field(tree, "Working load · lb").props.value) - 220.46) < 0.01);
  assert.match(text(tree), /Bench press/);

  const ui = fixture("WarmupCalculator", { initialLoadKg: 100 });
  tree = ui.render();
  button(tree, "Equipment").props.onPress();
  tree = ui.render();
  field(tree, "Bar weight · kg").props.onChangeText("15");
  field(tree, "Plate 1 weight · kg").props.onChangeText("25");
  tree = ui.render();
  button(tree, "Use lb").props.onPress();
  tree = ui.render();
  assert.ok(Math.abs(Number(field(tree, "Working load · lb").props.value) - 220.46) < 0.01);
  assert.equal(field(tree, "Bar weight · lb").props.value, "45");
  assert.equal(field(tree, "Round down by · lb").props.value, "5");
  assert.equal(field(tree, "Plate 1 weight · lb").props.value, "45");
  button(tree, "Use kg").props.onPress();
  tree = ui.render();
  assert.ok(Math.abs(Number(field(tree, "Working load · kg").props.value) - 100) < 0.01);
});

test("warm-up recalculates for custom inventory and lets users inspect each set", () => {
  const ui = fixture("WarmupCalculator", { initialLoadKg: 200 });
  let tree = ui.render();
  assert.match(text(tree), /137\.5/);
  assert.equal(sets(tree).length, 3);
  button(tree, "View warm-up set 3").props.onPress();
  tree = ui.render();
  assert.equal(button(tree, "View warm-up set 3").props.accessibilityState.selected, true);
  assert.match(text(tree), /Load each side/i);
  button(tree, "Equipment").props.onPress();
  tree = ui.render();
  field(tree, "Plate 1 weight · kg").props.onChangeText("25");
  tree = ui.render();
  assert.equal(alerts(tree).length, 0);
  assert.equal(sets(tree).length, 4);
  assert.match(text(tree), /157\.5/);
  field(tree, "Plate 2 weight · kg").props.onChangeText("25");
  tree = ui.render();
  assert.ok(alerts(tree).length > 0);
  assert.equal(sets(tree).length, 0);
  field(tree, "Plate 2 weight · kg").props.onChangeText("10");
  tree = ui.render();
  assert.equal(alerts(tree).length, 0);
  assert.equal(sets(tree).length, 4);
});

test("loads below the bar show lighter-implement guidance without a plate preview", () => {
  const ui = fixture("WarmupCalculator", { initialLoadKg: 10 });
  const tree = ui.render();
  assert.equal(alerts(tree).length, 0);
  assert.ok(sets(tree).length > 0);
  assert.match(text(tree), /Use a lighter implement/);
  assert.doesNotMatch(text(tree), /Load each side/i);
  assert.equal(nodes(tree, (node) => node.type === "Svg").length, 0);
});

test("stage draft text stays editable and invalid inputs hide stale warm-up results", () => {
  const ui = fixture("WarmupCalculator", { initialLoadKg: 100 });
  let tree = ui.render();
  assert.ok(sets(tree).length > 0);
  button(tree, "Warm-up stages").props.onPress();
  tree = ui.render();
  field(tree, "Stage 1 percent").props.onChangeText("");
  tree = ui.render();
  assert.equal(field(tree, "Stage 1 percent").props.value, "");
  assert.ok(alerts(tree).length > 0);
  assert.equal(sets(tree).length, 0);
  field(tree, "Stage 1 percent").props.onChangeText("42.5");
  tree = ui.render();
  assert.equal(field(tree, "Stage 1 percent").props.value, "42.5");
  assert.equal(alerts(tree).length, 0);
  assert.ok(sets(tree).length > 0);
  field(tree, "Working load · kg").props.onChangeText("0");
  tree = ui.render();
  assert.ok(alerts(tree).length > 0);
  assert.equal(sets(tree).length, 0);
});

test("one-rep max waits for real input, rejects invalid reps and converts units", () => {
  const ui = fixture("OneRepMax");
  let tree = ui.render();
  assert.equal(field(tree, "Weight · kg").props.value, "");
  assert.equal(field(tree, "Completed repetitions").props.value, "8");
  assert.equal(alerts(tree).length, 0);
  field(tree, "Weight · kg").props.onChangeText("60");
  tree = ui.render();
  assert.match(text(tree), /Epley/);
  assert.match(text(tree), /Brzycki/);
  assert.match(text(tree), /76/);
  field(tree, "Completed repetitions").props.onChangeText("13");
  tree = ui.render();
  assert.ok(alerts(tree).length > 0);
  assert.doesNotMatch(text(tree), /Epley/);
  field(tree, "Completed repetitions").props.onChangeText("1");
  tree = ui.render();
  assert.equal(alerts(tree).length, 0);
  assert.ok(nodes(tree, (node) => node.type === "Txt" && text(node).trim() === "60").length >= 2);
  button(tree, "Use lb").props.onPress();
  tree = ui.render();
  assert.ok(Math.abs(Number(field(tree, "Weight · lb").props.value) - 132.28) < 0.01);
  assert.equal(alerts(tree).length, 0);
  button(tree, "Done").props.onPress();
  assert.deepEqual(ui.closed, ["close"]);
});
