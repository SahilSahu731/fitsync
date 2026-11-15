import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as drafts from "../src/features/workouts/routine-draft.ts";

const jsx = (type, props, key) => ({ type, props, key });
const nodes = (node, predicate) =>
  !node || typeof node !== "object"
    ? []
    : Array.isArray(node)
      ? node.flatMap((child) => nodes(child, predicate))
      : [...(predicate(node) ? [node] : []), ...nodes(node.props?.children, predicate)];
const ofType = (tree, type) => nodes(tree, (node) => node.type === type);
const text = (node) =>
  node == null || typeof node === "boolean"
    ? ""
    : typeof node !== "object"
      ? String(node)
      : Array.isArray(node)
        ? node.map(text).join("")
        : text(node.props?.children);
const button = (tree, label) => {
  const found = nodes(
    tree,
    (node) =>
      node.type === "Pressable" &&
      (node.props.accessibilityLabel === label || text(node) === label),
  )[0];
  assert.ok(found, `Missing button: ${label}`);
  return found;
};
const entry = (tree, label) => {
  const found = nodes(tree, (node) => node.type === "Entry" && node.props.label === label)[0];
  assert.ok(found, `Missing target: ${label}`);
  return found;
};
const input = (tree, label) => {
  const found = nodes(
    tree,
    (node) => node.type === "TextInput" && node.props.accessibilityLabel === label,
  )[0];
  assert.ok(found, `Missing input: ${label}`);
  return found;
};
const settle = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
const bench = { id: "bench", name: "Bench press", trackingType: "reps_weight", imageUrl: null };
const plank = { id: "plank", name: "Plank", trackingType: "duration", imageUrl: null };

function load(relative, dependencies) {
  const code = ts.transpileModule(readFileSync(new URL(relative, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    Error,
    Date,
    console,
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

function fixture({ create = async () => ({ id: "saved" }), signedIn = true } = {}) {
  const instances = new Map();
  const effects = [];
  const requests = [],
    routes = [],
    alerts = [];
  const session = { user: signedIn ? { id: "owner" } : null };
  let current,
    cursor,
    seen,
    mounted = true,
    lateUpdates = 0;
  const React = {
    useState(initial) {
      const instance = current,
        i = cursor++;
      if (!(i in instance.slots))
        instance.slots[i] = typeof initial === "function" ? initial() : initial;
      return [
        instance.slots[i],
        (value) => {
          if (!mounted) {
            lateUpdates++;
            return;
          }
          instance.slots[i] = typeof value === "function" ? value(instance.slots[i]) : value;
        },
      ];
    },
    useRef(initial) {
      const i = cursor++;
      return (current.slots[i] ??= { current: initial });
    },
    useEffect(callback, deps) {
      const instance = current,
        i = cursor++;
      const previous = instance.slots[i];
      if (!previous || !deps || deps.some((value, index) => value !== previous.deps?.[index])) {
        const effect = { deps, cleanup: undefined };
        instance.slots[i] = effect;
        effects.push(() => {
          previous?.cleanup?.();
          effect.cleanup = callback();
        });
      }
    },
  };
  const dependencies = {
    react: React,
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "react-native": {
      ...Object.fromEntries(
        [
          "ActivityIndicator",
          "KeyboardAvoidingView",
          "Modal",
          "Pressable",
          "ScrollView",
          "TextInput",
          "View",
        ].map((type) => [type, type]),
      ),
      Platform: { OS: "ios" },
      Keyboard: { dismiss() {} },
    },
    "react-native-safe-area-context": {
      SafeAreaView: "SafeAreaView",
      useSafeAreaInsets: () => ({ top: 24, bottom: 20 }),
    },
    "expo-router": {
      useRouter: () => ({
        canGoBack: () => true,
        back: () => routes.push("back"),
        replace: (route) => routes.push(route),
      }),
    },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/components/ui": { Txt: "Txt" },
    "@/src/constants/theme": { C: { bg: "#000", ink: "#fff", muted: "#aaa", brand: "#C5F460" } },
    "@/src/components/app-dialog": {
      useAppAlert: () => ({ alert: (...args) => alerts.push(args) }),
    },
    "@/src/context/session": { useSession: () => session },
    "@/src/components/motion": { ScreenEntrance: "Entrance" },
    "@/src/features/workouts/api": {
      workoutApi: {
        createTemplate: async (...args) => {
          requests.push(args);
          return create(...args);
        },
      },
    },
    "@/src/features/workouts/routine-draft": drafts,
    "@/src/features/workouts/components/workout-glass": {
      WorkoutGlassScene: "GlassScene",
      WorkoutGlassSurface: "GlassSurface",
    },
    "@/src/features/workouts/components/exercise-picker": { ExercisePicker: "ExercisePicker" },
    "@/src/features/workouts/components/workout-controls": {
      NumberEntry: "Entry",
      WorkoutDrawer: "Drawer",
    },
    "@/src/features/workouts/components/train-actions": {
      ReorderTraining: "ReorderTraining",
      TrainActions: "TrainActions",
    },
  };
  const card = load("../src/features/workouts/components/routine-exercise-card.tsx", {
    ...dependencies,
    "./exercise-image": { ExerciseImage: "ExerciseImage" },
    "./workout-glass": dependencies["@/src/features/workouts/components/workout-glass"],
    "./workout-controls": dependencies["@/src/features/workouts/components/workout-controls"],
    "./set-type-picker": { SetTypePicker: "SetTypePicker" },
  });
  dependencies["@/src/features/workouts/components/routine-exercise-card"] = card;
  const screen = load("../src/app/workout/create.tsx", dependencies).default;
  function expand(node, path) {
    if (!node || typeof node !== "object") return node;
    if (Array.isArray(node))
      return node.map((child, index) => expand(child, `${path}/${child?.key ?? index}`));
    if (typeof node.type === "function") {
      const key = `${path}/${node.type.name}:${node.key ?? ""}`;
      seen.add(key);
      current = instances.get(key) ?? { slots: [] };
      instances.set(key, current);
      cursor = 0;
      return expand(node.type(node.props), key);
    }
    return {
      ...node,
      props: {
        ...node.props,
        children: expand(node.props?.children, `${path}/${String(node.type)}`),
      },
    };
  }
  return {
    requests,
    routes,
    alerts,
    session,
    get lateUpdates() {
      return lateUpdates;
    },
    render() {
      seen = new Set();
      const tree = expand(jsx(screen, {}), "root");
      for (const [key, instance] of instances) {
        if (seen.has(key)) continue;
        for (const slot of instance.slots) slot?.cleanup?.();
        instances.delete(key);
      }
      effects.splice(0).forEach((run) => run());
      return tree;
    },
    unmount() {
      for (const instance of instances.values())
        for (const slot of instance.slots) slot?.cleanup?.();
      mounted = false;
    },
  };
}

async function add(app, exercises = [bench]) {
  button(app.render(), "Add exercises").props.onPress();
  const picker = ofType(app.render(), "ExercisePicker")[0];
  await picker.props.onConfirm(exercises);
  assert.equal(ofType(app.render(), "ExercisePicker").length, 0);
}
function name(app, value = "Upper A") {
  input(app.render(), "Routine name").props.onChangeText(value);
}
function save(app) {
  button(app.render(), "Save routine").props.onPress();
  return settle();
}

test("picker selections and edited strength/time targets save the exact routine for its owner and return to Train", async () => {
  const app = fixture();
  name(app, " Upper A ");
  input(app.render(), "Routine notes").props.onChangeText("Strength and stability");
  await add(app, [bench, plank]);
  let tree = app.render();
  entry(tree, "Bench press, set 1 weight in kg").props.onChange("22,5");
  entry(tree, "Bench press, set 1 reps").props.onChange("8");
  entry(tree, "Plank, set 1 seconds").props.onChange("45");
  await save(app);
  assert.equal(app.requests.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(app.requests[0])), [
    {
      name: "Upper A",
      description: "Strength and stability",
      exercises: [
        {
          exerciseId: "bench",
          notes: "",
          restSeconds: 90,
          sets: [
            { setType: "normal", targetReps: 8, targetWeight: 22.5, targetDurationSeconds: null },
            { setType: "normal", targetReps: 10, targetWeight: 0, targetDurationSeconds: null },
            { setType: "normal", targetReps: 10, targetWeight: 0, targetDurationSeconds: null },
          ],
        },
        {
          exerciseId: "plank",
          notes: "",
          restSeconds: 90,
          sets: [45, 30, 30].map((seconds) => ({
            setType: "normal",
            targetReps: null,
            targetWeight: null,
            targetDurationSeconds: seconds,
          })),
        },
      ],
    },
    "owner",
  ]);
  assert.deepEqual(app.routes, ["/(tabs)/train"]);
});

test("invalid and signed-out drafts show a useful error before creating any routine", async () => {
  const app = fixture();
  await save(app);
  assert.match(text(app.render()), /routine a name/);
  name(app);
  await save(app);
  assert.match(text(app.render()), /Choose between 1 and 50 exercises/);
  await add(app);
  entry(app.render(), "Bench press, set 1 reps").props.onChange("");
  await save(app);
  assert.match(text(app.render()), /Bench press, set 1 reps/);
  assert.equal(app.requests.length, 0);
  const signedOut = fixture({ signedIn: false });
  name(signedOut);
  await add(signedOut);
  await save(signedOut);
  assert.match(text(signedOut.render()), /Sign in again/);
  assert.equal(signedOut.requests.length, 0);
});

test("a rejected save preserves every target and permits retry without rebuilding the draft", async () => {
  let attempts = 0;
  const app = fixture({
    create: async () => {
      if (++attempts === 1) throw Error("Connection lost");
      return { id: "saved" };
    },
  });
  name(app);
  await add(app);
  entry(app.render(), "Bench press, set 2 weight in kg").props.onChange("17.5");
  await save(app);
  assert.match(text(app.render()), /Connection lost/);
  assert.equal(input(app.render(), "Routine name").props.value, "Upper A");
  assert.equal(entry(app.render(), "Bench press, set 2 weight in kg").props.value, "17.5");
  assert.equal(button(app.render(), "Save routine").props.disabled, false);
  assert.deepEqual(app.routes, []);
  await save(app);
  assert.deepEqual(app.requests[1], app.requests[0]);
  assert.deepEqual(app.routes, ["/(tabs)/train"]);
});

test("duplicate taps share a single pending save and lock editing until it resolves", async () => {
  const pending = deferred();
  const app = fixture({ create: () => pending.promise });
  name(app);
  await add(app);
  const submit = button(app.render(), "Save routine");
  submit.props.onPress();
  submit.props.onPress();
  assert.equal(app.requests.length, 1);
  const tree = app.render();
  assert.equal(button(tree, "Save routine").props.disabled, true);
  assert.equal(input(tree, "Routine name").props.editable, false);
  assert.equal(button(tree, "Add exercises").props.disabled, true);
  assert.equal(
    ofType(tree, "Entry").every((node) => node.props.disabled),
    true,
  );
  pending.resolve({ id: "saved" });
  await settle();
  assert.deepEqual(app.routes, ["/(tabs)/train"]);
});

test("leaving the builder while save is pending cannot navigate or update an unmounted screen", async () => {
  const pending = deferred();
  const app = fixture({ create: () => pending.promise });
  name(app);
  await add(app);
  button(app.render(), "Save routine").props.onPress();
  app.unmount();
  pending.resolve({ id: "saved" });
  await settle();
  assert.deepEqual(app.routes, []);
  assert.equal(app.lateUpdates, 0);
});

test("switching accounts clears the visible draft and cancels the old owner's late navigation", async () => {
  const pending = deferred();
  const app = fixture({ create: () => pending.promise });
  name(app);
  await add(app);
  button(app.render(), "Save routine").props.onPress();
  app.session.user = { id: "different-owner" };
  const nextAccount = app.render();
  assert.equal(input(nextAccount, "Routine name").props.value, "");
  assert.equal(ofType(nextAccount, "Entry").length, 0);
  pending.resolve({ id: "old-owner-routine" });
  await settle();
  assert.deepEqual(app.routes, []);
  assert.equal(app.requests[0][1], "owner");
});

test("training method drawers, set additions/removals and exercise reordering reach the saved prescription", async () => {
  const app = fixture();
  name(app);
  await add(app, [bench, plank]);
  button(app.render(), "Rest and notes for Bench press").props.onPress();
  entry(app.render(), "Rest between sets · seconds").props.onChange("120");
  input(app.render(), "Exercise notes").props.onChangeText("Pause on the chest");
  input(app.render(), "Routine superset group").props.onChangeText("A");
  button(app.render(), "Save details").props.onPress();
  button(app.render(), "Options for set 1 of Bench press").props.onPress();
  input(app.render(), "Routine set rest override").props.onChangeText("0");
  input(app.render(), "Routine set tempo").props.onChangeText("3-1-x-0");
  button(app.render(), "Save set options").props.onPress();
  ofType(app.render(), "SetTypePicker")[0].props.onChange("rest_pause");
  entry(app.render(), "Bench press, set 3 weight in kg").props.onChange("12.5");
  button(app.render(), "Add set to Bench press").props.onPress();
  assert.equal(entry(app.render(), "Bench press, set 4 weight in kg").props.value, "12.5");
  button(app.render(), "Options for set 4 of Bench press").props.onPress();
  button(app.render(), "Remove planned set").props.onPress();
  assert.equal(ofType(app.render(), "SetTypePicker").length, 6);
  button(app.render(), "Reorder exercises").props.onPress();
  const reorder = ofType(app.render(), "ReorderTraining")[0];
  await reorder.props.onSave(["plank", "bench"]);
  reorder.props.onClose();
  await save(app);
  const exercises = app.requests[0][0].exercises;
  assert.deepEqual(
    Array.from(exercises, (item) => item.exerciseId),
    ["plank", "bench"],
  );
  assert.equal(exercises[1].notes, "Pause on the chest");
  assert.equal(exercises[1].restSeconds, 120);
  assert.equal(exercises[1].supersetGroup, "A");
  assert.equal(exercises[1].sets.length, 3);
  assert.equal(exercises[1].sets[0].setType, "rest_pause");
  assert.equal(exercises[1].sets[0].restSeconds, 0);
  assert.equal(exercises[1].sets[0].tempo, "3-1-X-0");
});

test("routine cards expose compact decimal targets without gesture controls and use duration targets for cardio", async () => {
  const app = fixture();
  await add(app, [
    bench,
    { id: "run", name: "Treadmill", trackingType: "distance_duration", imageUrl: null },
  ]);
  const tree = app.render();
  assert.equal(ofType(tree, "Entry").length, 9);
  for (const target of ofType(tree, "Entry")) {
    assert.equal(target.props.compact, true);
    assert.equal(target.props.showLabel, false);
    assert.equal(target.props.showStepper, false);
    assert.equal(target.props.allowDrag, false);
  }
  assert.equal(entry(tree, "Bench press, set 1 weight in kg").props.step, 0.5);
  assert.equal(entry(tree, "Treadmill, set 1 seconds").props.max, 86400);
  assert.equal(
    ofType(tree, "Entry").some((node) => /Treadmill.*(reps|weight)/.test(node.props.label)),
    false,
  );
  assert.match(text(tree), /Record actual distance during your workout/);
  button(tree, "Bench press, 3 planned sets").props.onPress();
  assert.equal(ofType(app.render(), "Entry").length, 3);
});

test("picker duplicates and repeated selections never create duplicate draft exercises", async () => {
  const app = fixture();
  await add(app, [bench, bench]);
  assert.equal(ofType(app.render(), "SetTypePicker").length, 3);
  button(app.render(), "Add exercises").props.onPress();
  const picker = ofType(app.render(), "ExercisePicker")[0];
  assert.deepEqual(Array.from(picker.props.existingIds), ["bench"]);
  await picker.props.onConfirm([bench, plank]);
  assert.equal(ofType(app.render(), "SetTypePicker").length, 6);
});
