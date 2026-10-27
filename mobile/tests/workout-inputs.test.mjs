import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(file, dependencies = {}) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, require: name => {
    if (!(name in dependencies)) throw Error(`Unexpected dependency ${name}`);
    return dependencies[name];
  }, Date, Map, Set, Promise });
  return exports;
}
const { dragNumber } = load("../src/features/workouts/number-input.ts");

test("weight and reps drag in both directions with fractional steps and limits", () => {
  assert.equal(dragNumber(20, -40, 0.5, 100000), "22");
  assert.equal(dragNumber(8, -30, 1, 1000), "11");
  assert.equal(dragNumber(8, 30, 1, 1000), "5");
  assert.equal(dragNumber(0, 100, 0.5, 100000), "0");
  assert.equal(dragNumber(999, -100, 1, 1000), "1000");
});

test("number responder survives rerenders and preserves its drag origin", () => {
  const slots = []; let cursor = 0; const responders = [];
  const React = {
    useRef(value) { const index = cursor++; return slots[index] ??= { current: value }; },
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial; return [slots[index], () => {}]; },
    useLayoutEffect(callback) { callback(); },
    useEffect(callback) { callback(); }
  };
  const { NumberEntry } = load("../src/features/workouts/components/workout-controls.tsx", {
    react: React, "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "react-native": { PanResponder: { create(config) { responders.push(config); return { panHandlers: {} }; } } },
    "react-native-safe-area-context": {}, "@expo/vector-icons": {}, "@/src/constants/theme": { C: {} },
    "@/src/components/ui": {}, "../number-input": { dragNumber }
  });
  let value = "10"; let committed = "";
  const render = (disabled = false) => { cursor = 0; NumberEntry({ label: "Reps", value, disabled, onChange: next => { value = next; }, onCommit: next => { committed = next; } }); };
  render(); const pan = responders[0];
  assert.equal(pan.onMoveShouldSetPanResponderCapture(null, { dy: -20, dx: 1 }), true);
  pan.onPanResponderGrant(); pan.onPanResponderMove(null, { dy: -20 });
  assert.equal(value, "12");
  render(); assert.equal(responders.length, 1);
  pan.onPanResponderMove(null, { dy: -40 }); assert.equal(value, "14");
  pan.onPanResponderRelease(); assert.equal(committed, "14");
  assert.equal(pan.onPanResponderTerminationRequest(), false);
  render(true); assert.equal(pan.onMoveShouldSetPanResponderCapture(null, { dy: -20, dx: 1 }), false);
});

test("picker shares cached requests and loads later pages only on demand", async () => {
  const paths = [];
  const picker = load("../src/features/exercises/picker-cache.ts", { "@/src/services/api": { apiRequest: async path => {
    paths.push(path);
    const page = Number(new URL(`http://test${path}`).searchParams.get("page"));
    return { items: Array.from({ length: 15 }, (_, index) => ({ id: String((page - 1) * 15 + index) })), hasMore: true };
  } } });
  await Promise.all([picker.loadExercisePicker(), picker.loadExercisePicker()]);
  assert.equal(paths.length, 1);
  const first = await picker.loadPickerPage("", 1);
  assert.equal(first.items.length, 15);
  assert.equal(paths.length, 1);
  const second = await picker.loadPickerPage("", 2);
  assert.equal(second.items[0].id, "15");
  assert.equal(paths.length, 2);
  await picker.loadPickerPage("squat", 1);
  assert.equal(paths.length, 3);
});

test("failed picker pages can be retried without discarding cached pages", async () => {
  let fail = false;
  const picker = load("../src/features/exercises/picker-cache.ts", { "@/src/services/api": { apiRequest: async () => {
    if (fail) throw Error("offline");
    return { items: [{ id: "one" }], hasMore: true };
  } } });
  await picker.loadPickerPage("", 1);
  fail = true; await assert.rejects(picker.loadPickerPage("", 2), /offline/);
  assert.equal(picker.cachedPickerPage("", 1).items[0].id, "one");
  fail = false; assert.equal((await picker.loadPickerPage("", 2)).items.length, 1);
});

test("reordering preserves all rows and accounts for scroll offset in both directions", () => {
  const { moveItem, dragPosition, edgeScroll } = load("../src/features/workouts/reorder.ts");
  const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.equal(moveItem(rows, "a", 0), rows);
  assert.equal(moveItem(rows, "missing", 1), rows);
  assert.equal(moveItem(rows, "a", 2).map(row => row.id).join(","), "b,c,a");
  assert.equal(moveItem(rows, "c", -5).map(row => row.id).join(","), "c,a,b");
  assert.equal(rows.map(row => row.id).join(","), "a,b,c");
  assert.equal(dragPosition(1, 40, 40, 3, 80), 160);
  assert.equal(dragPosition(1, -40, -40, 3, 80), 0);
  assert.equal(dragPosition(0, 5000, 0, 3, 80), 160);
  assert.ok(edgeScroll(10, 0, 400) < 0);
  assert.ok(edgeScroll(390, 0, 400) > 0);
  assert.equal(edgeScroll(200, 0, 400), 0);
});

test("routine targets preserve types and time targets and reject invalid input", () => {
  const { newDraftExercise, routineInput } = load("../src/features/workouts/routine-draft.ts");
  const strength = newDraftExercise({ id: "a", name: "Squat", trackingType: "reps_weight" });
  const timed = newDraftExercise({ id: "b", name: "Plank", trackingType: "duration" });
  strength.sets[0].type = "warmup";
  const input = routineInput(" Leg day ", "Goals", [strength, timed]);
  assert.equal(input.name, "Leg day");
  assert.equal(input.exercises[0].sets[0].setType, "warmup");
  assert.equal(input.exercises[1].sets[0].targetDurationSeconds, 30);
  assert.equal(input.exercises[1].sets[0].targetReps, null);
  assert.equal(new Set(strength.sets.map(set => set.id)).size, 3);
  strength.sets[0].reps = "2.5";
  assert.throws(() => routineInput("Leg day", "", [strength]), /whole number/);
  strength.sets[0].reps = "";
  assert.throws(() => routineInput("Leg day", "", [strength]), /whole number/);
  assert.throws(() => routineInput("", "", [timed]), /name/);
  assert.throws(() => routineInput("A", "", []), /Choose/);
});

test("set badges have unique letters and colors for every supported type", () => {
  const { SET_TYPES } = load("../src/features/workouts/set-types.ts");
  assert.equal(new Set(SET_TYPES.map(item => item.letter)).size, 5);
  assert.equal(new Set(SET_TYPES.map(item => item.color)).size, 5);
});

test("reorder handle keeps its responder when its index changes mid-drag", () => {
  const slots = []; let cursor = 0; const responders = [];
  const React = {
    useRef(value) { const index = cursor++; return slots[index] ??= { current: value }; },
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial; return [slots[index], () => {}]; },
    useLayoutEffect(callback) { callback(); }
  };
  const { ReorderRow } = load("../src/features/workouts/components/reorder-training.tsx", {
    react: React, "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "react-native": { PanResponder: { create(config) { responders.push(config); return { panHandlers: {} }; } } },
    "react-native-reanimated": { useAnimatedStyle: () => ({}), withTiming: value => value },
    "react-native-safe-area-context": {}, "@expo/vector-icons": {}, "@/src/constants/theme": { C: {} },
    "@/src/components/ui": {}, "../reorder": {}, "./exercise-image": {}
  });
  const moves = []; let ended = 0;
  const render = index => {
    cursor = 0;
    ReorderRow({ item: { id: "a", name: "Bench press" }, index, count: 3, disabled: false,
      active: { get: () => "a" }, dragY: { get: () => 80 }, onStart: () => {},
      onMove: (dy, y) => moves.push([index, dy, y]), onEnd: () => { ended = index + 1; }, onAdjust: () => {} });
  };
  render(0);
  responders[0].onPanResponderMove(null, { dy: 30, moveY: 200 });
  render(2);
  responders[0].onPanResponderMove(null, { dy: 170, moveY: 340 });
  responders[0].onPanResponderRelease();
  assert.equal(responders.length, 1);
  assert.deepEqual(moves, [[0, 30, 200], [2, 170, 340]]);
  assert.equal(ended, 3);
});
