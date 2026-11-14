import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { nextWorkoutSet, restAfterWorkoutSet } from "../src/features/workouts/session-progress.ts";
import {
  newDraftExercise,
  routineInput,
  validTempo,
} from "../src/features/workouts/routine-draft.ts";
import { optimisticSet } from "../src/features/workouts/set-state.ts";

function exercise(id, position, group = "A", done = []) {
  return {
    id,
    position,
    superset_group: group,
    rest_seconds: 90,
    workout_logged_sets: Array.from({ length: 3 }, (_, i) => ({
      id: `${id}${i}`,
      position: i,
      set_type: "normal",
      completed_at: done.includes(i) ? "done" : null,
    })),
  };
}
test("supersets alternate actual set rounds and resume unfinished partners", () => {
  const a = exercise("a", 0),
    b = exercise("b", 1);
  assert.equal(nextWorkoutSet([a, b]).set.id, "a0");
  a.workout_logged_sets[0].completed_at = "done";
  assert.equal(nextWorkoutSet([a, b], "a").set.id, "b0");
  b.workout_logged_sets[0].completed_at = "done";
  assert.equal(nextWorkoutSet([a, b], "b").set.id, "a1");
  a.workout_logged_sets[1].completed_at = "done";
  assert.equal(nextWorkoutSet([a, b], "a").set.id, "b1");
  a.workout_logged_sets[0].completed_at = null;
  assert.equal(nextWorkoutSet([a, b], "b").set.id, "a0");
});
test("superset warm-ups precede working rounds and uneven groups remain usable", () => {
  const a = exercise("a", 0),
    b = exercise("b", 1);
  b.workout_logged_sets.unshift({
    id: "warm",
    position: -1,
    set_type: "warmup",
    completed_at: null,
  });
  assert.equal(nextWorkoutSet([a, b]).set.id, "warm");
  b.workout_logged_sets[0].completed_at = "done";
  assert.equal(nextWorkoutSet([a, b]).set.id, "a0");
  b.workout_logged_sets = [];
  assert.equal(nextWorkoutSet([a, b], "b").set.id, "a0");
});
test("rest starts after a full superset round and honors synced set overrides", () => {
  const a = exercise("a", 0),
    b = exercise("b", 1);
  assert.equal(restAfterWorkoutSet([a, b], "a", "a0"), 0);
  a.workout_logged_sets[0].completed_at = "done";
  b.workout_logged_sets[0].rest_seconds = 30;
  assert.equal(restAfterWorkoutSet([a, b], "b", "b0"), 30);
  b.workout_logged_sets[0].rest_seconds = 0;
  assert.equal(restAfterWorkoutSet([a, b], "b", "b0"), 0);
  assert.equal(restAfterWorkoutSet([a, b], "missing", "set"), 0);
  a.superset_group = null;
  assert.equal(restAfterWorkoutSet([a, b], "a", "a0"), 90);
});
test("routines preserve superset, tempo, rest overrides and rest-pause through API input", () => {
  const draft = newDraftExercise({ id: "press", name: "Press", trackingType: "reps_weight" });
  draft.supersetGroup = "A";
  draft.sets[0] = { ...draft.sets[0], type: "rest_pause", rest: "15", tempo: "3-1-x-0" };
  const input = routineInput("Upper", "", [draft]);
  assert.equal(input.exercises[0].supersetGroup, "A");
  assert.equal(input.exercises[0].sets[0].setType, "rest_pause");
  assert.equal(input.exercises[0].sets[0].restSeconds, 15);
  assert.equal(input.exercises[0].sets[0].tempo, "3-1-X-0");
  draft.sets[0].rest = "0";
  assert.equal(routineInput("Upper", "", [draft]).exercises[0].sets[0].restSeconds, 0);
  draft.sets[0].rest = "901";
  assert.throws(() => routineInput("Upper", "", [draft]), /900/);
  assert.throws(() => validTempo("2-2-2"), /four parts/);
  assert.throws(() => validTempo("10-0-1-0"), /four parts/);
});
test("offline optimistic set state preserves synced advanced settings and explicit clears", () => {
  const base = { id: "set", set_type: "normal", rest_seconds: 90, tempo: "3-1-X-0" };
  const patched = optimisticSet(base, { restSeconds: 15, tempo: "2-0-X-0", setType: "rest_pause" });
  assert.equal(patched.rest_seconds, 15);
  assert.equal(patched.tempo, "2-0-X-0");
  assert.equal(patched.set_type, "rest_pause");
  assert.equal(optimisticSet(patched, { restSeconds: null, tempo: null }).rest_seconds, null);
  assert.equal(optimisticSet(patched, { restSeconds: null, tempo: null }).tempo, null);
  assert.equal(base.rest_seconds, 90);
});

function setRowFixture({ weight = 20, reps = null, suppressRest = false } = {}) {
  const calls = [],
    rests = [];
  const slots = [];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    react: {
      memo: (component) => component,
      useState: (value) => {
        const index = cursor++;
        if (!(index in slots)) slots[index] = typeof value === "function" ? value() : value;
        return [
          slots[index],
          (next) => {
            slots[index] = typeof next === "function" ? next(slots[index]) : next;
          },
        ];
      },
      useRef: (value) => {
        const index = cursor++;
        return (slots[index] ??= { current: value });
      },
      useEffect() {},
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      View: "View",
      Pressable: "Pressable",
      TextInput: "Input",
      ActivityIndicator: "Loading",
    },
    "@/src/features/experience/experience-context": { useExperience: () => ({ feedback() {} }) },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/constants/theme": { C: {} },
    "@/src/components/app-dialog": { useAppAlert: () => ({}) },
    "@/src/components/ui": { Txt: "Txt" },
    "../workout-context": {
      useWorkout: () => ({
        updateSet: async (id, patch) => calls.push({ id, patch }),
        startRest: (seconds) => rests.push(seconds),
        busy: false,
      }),
    },
    "./workout-controls": { NumberEntry: "Entry", WorkoutDrawer: "Drawer" },
    "./set-type-picker": { SetTypePicker: "Picker" },
    "../set-types": { setAppearance: () => ({ color: "white" }) },
    "../routine-draft": { validTempo },
  };
  const code = ts.transpileModule(
    readFileSync(
      new URL("../src/features/workouts/components/set-row.tsx", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency ${name}`);
      return dependencies[name];
    },
    Date,
    Map,
    Set,
    Promise,
  });
  const props = {
    exerciseId: "exercise",
    number: 1,
    restSeconds: 90,
    suppressRest,
    set: { id: "set", weight_kg: weight, reps, set_type: "normal", completed_at: null },
    recommendation: {
      previous: { weightKg: 60, reps: 8 },
      suggested: { weightKg: 60, reps: 9 },
      reason: "Comparable history",
    },
  };
  let tree;
  const render = () => {
    cursor = 0;
    tree = exports.SetRow(props);
    return tree;
  };
  render();
  const find = (node, predicate) =>
    !node || typeof node !== "object"
      ? []
      : Array.isArray(node)
        ? node.flatMap((n) => find(n, predicate))
        : [...(predicate(node) ? [node] : []), ...find(node.props?.children, predicate)];
  const text = (node) =>
    typeof node === "string"
      ? node
      : !node || typeof node !== "object"
        ? ""
        : Array.isArray(node)
          ? node.map(text).join("")
          : text(node.props?.children);
  return { calls, rests, render, find: (predicate) => find(tree, predicate), text };
}
test("suggested targets require an explicit tap and fill only empty fields", async () => {
  const f = setRowFixture();
  assert.equal(f.calls.length, 0);
  const fill = f.find((n) => n.type === "Pressable" && f.text(n).includes("Fill empty fields"))[0];
  fill.props.onPress();
  await new Promise(setImmediate);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].patch.reps, 9);
  assert.equal("weightKg" in f.calls[0].patch, false);
  assert.equal("completed" in f.calls[0].patch, false);
  const filled = setRowFixture({ weight: 20, reps: 8 });
  assert.equal(
    filled.find((n) => n.type === "Pressable" && filled.text(n).includes("Fill empty fields"))
      .length,
    0,
  );
});
test("logging a paired set suppresses rest while the partner's round remains unfinished", async () => {
  const paired = setRowFixture({ weight: 20, reps: 8, suppressRest: true });
  paired
    .find((n) => n.type === "Pressable" && n.props.accessibilityRole === "checkbox")[0]
    .props.onPress();
  await new Promise(setImmediate);
  assert.equal(paired.calls[0].patch.completed, true);
  assert.equal(paired.rests.length, 0);
  const last = setRowFixture({ weight: 20, reps: 8 });
  last
    .find((n) => n.type === "Pressable" && n.props.accessibilityRole === "checkbox")[0]
    .props.onPress();
  await new Promise(setImmediate);
  assert.deepEqual(last.rests, [90]);
});
test("saving notes keeps an inherited exercise rest instead of freezing a device-only default", async () => {
  const f = setRowFixture({ reps: 8 });
  f.find(
    (n) =>
      n.type === "Pressable" &&
      n.props.accessibilityLabel === "Edit rest, notes and effort for set 1",
  )[0].props.onPress();
  f.render();
  const noteInput = f.find(
    (n) => n.type === "Input" && n.props.placeholder === "Technique, discomfort, equipment…",
  )[0];
  noteInput.props.onChangeText("Keep wrists straight");
  f.render();
  await f
    .find((n) => n.type === "Pressable" && f.text(n) === "Save set details")[0]
    .props.onPress();
  assert.equal(f.calls[0].patch.notes, "Keep wrists straight");
  assert.equal(f.calls[0].patch.restSeconds, null);
  assert.equal(f.calls[0].patch.tempo, null);
});
