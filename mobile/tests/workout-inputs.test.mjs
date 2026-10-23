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
    useLayoutEffect(callback) { callback(); }
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

test("picker prefetch and opening share one request; repeated searches need no requests", async () => {
  let calls = 0; let fail = false;
  const rows = [{ id: "one", name: "Incline Bench Press (Dumbbell)", equipment: ["dumbbell"], primaryMuscles: ["chest"], secondaryMuscles: ["triceps"] }];
  const picker = load("../src/features/exercises/picker-cache.ts", { "@/src/services/api": { apiRequest: async () => {
    calls++; if (fail) throw Error("offline"); return { items: rows, hasMore: false };
  } } });
  await Promise.all([picker.loadExercisePicker(), picker.loadExercisePicker()]);
  assert.equal(calls, 1);
  await picker.loadExercisePicker(); assert.equal(calls, 1);
  const { matchesExercise } = load("../src/features/exercises/picker-search.ts");
  for (const query of ["dumbbell incline", "chest", "bench press", "triceps"]) assert.equal(matchesExercise(rows[0], query), true);
  assert.equal(matchesExercise(rows[0], "squat"), false);
  assert.equal(calls, 1);
  fail = true; await assert.rejects(picker.loadExercisePicker(true), /offline/);
  assert.equal(picker.cachedExercisePicker()[0].id, "one");
});

test("picker retrieves every page so local search never silently excludes later exercises", async () => {
  const paths = [];
  const picker = load("../src/features/exercises/picker-cache.ts", { "@/src/services/api": { apiRequest: async path => {
    paths.push(path);
    return path.endsWith("=1") ? { items: [{ id: "first" }], hasMore: true } : { items: [{ id: "last" }], hasMore: false };
  } } });
  const rows = await picker.loadExercisePicker();
  assert.equal(rows.length, 2);
  assert.equal(rows[1].id, "last");
  assert.deepEqual(paths, ["/exercises/picker?page=1", "/exercises/picker?page=2"]);
});
