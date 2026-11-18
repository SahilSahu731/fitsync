import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as pickerSearch from "../src/features/exercises/picker-search.ts";

function load(relative, dependencies) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(relative, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    Error,
    Promise,
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

test("every custom-library request is tied to its owner, including edit and restore", async () => {
  const calls = [];
  const { customExerciseApi } = load("../src/features/exercises/custom-api.ts", {
    "@/src/services/api": {
      apiRequest: async (path, options) => {
        calls.push({ path, ...options });
        return path === "/exercises/custom" && !options.method ? [] : { id: "custom-id" };
      },
    },
  });
  const api = customExerciseApi("alice");
  const input = { name: "My cable press", primaryMuscles: ["chest"] };
  await api.list();
  await api.save(input);
  await api.save(input, "custom-id");
  await api.archive("custom-id");
  await api.restore("custom-id");
  assert.ok(calls.every((call) => call.expectedOwnerId === "alice"));
  assert.deepEqual(
    calls.map((call) => [call.path, call.method ?? "GET"]),
    [
      ["/exercises/custom", "GET"],
      ["/exercises/custom", "POST"],
      ["/exercises/custom/custom-id", "PATCH"],
      ["/exercises/custom/custom-id", "DELETE"],
      ["/exercises/custom/custom-id/restore", "POST"],
    ],
  );
  assert.equal(calls[1].json, input);
  assert.equal(calls[2].json, input);
});

const tax = {
  categories: [
    { code: "strength", label: "Strength" },
    { code: "cardio", label: "Cardio" },
  ],
  activityTypes: [
    { code: "weight-training", label: "Weight training", category: "strength" },
    { code: "running", label: "Running", category: "cardio" },
  ],
  bodyRegions: [{ code: "upper-body", label: "Upper body" }],
  muscleGroups: [
    { code: "chest", label: "Chest" },
    { code: "triceps", label: "Triceps" },
    { code: "abs", label: "Abs" },
  ],
  equipmentTypes: [
    { code: "cable", label: "Cable" },
    { code: "dumbbell", label: "Dumbbell" },
  ],
};
const exercise = {
  id: "my-press",
  name: "My cable press",
  description: "Use the low handle",
  category: "strength",
  activityType: "weight-training",
  bodyRegion: "upper-body",
  difficulty: "intermediate",
  trackingType: "reps_weight",
  movementPattern: "push",
  primaryMuscles: ["chest"],
  secondaryMuscles: ["triceps"],
  equipment: ["cable"],
  instructions: ["Set up the cable", "Press with control"],
  tips: ["Keep wrists neutral"],
  mistakes: ["Rushing the return"],
  safetyNotes: ["Use a comfortable range"],
  breathingTip: "Exhale as you press",
  status: "published",
};
const settle = () => new Promise((resolve) => setImmediate(resolve));
function editorFixture({ initial, onSave = async () => {} } = {}) {
  const slots = [];
  let cursor = 0;
  const saves = [],
    closes = [];
  const jsx = (type, props = {}) => (typeof type === "function" ? type(props) : { type, props });
  const { CustomExerciseEditor } = load("../src/features/exercises/custom-editor.tsx", {
    react: {
      useState(initialValue) {
        const index = cursor++;
        if (!(index in slots))
          slots[index] = typeof initialValue === "function" ? initialValue() : initialValue;
        return [
          slots[index],
          (next) => {
            slots[index] = typeof next === "function" ? next(slots[index]) : next;
          },
        ];
      },
      useRef(initialValue) {
        const index = cursor++;
        return (slots[index] ??= { current: initialValue });
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { View: "View", TextInput: "TextInput" },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/components/motion": { MotionPressable: "Pressable" },
    "@/src/components/ui": { Txt: "Txt" },
    "../progress/editors": {
      Sheet: (props) => ({
        type: "Sheet",
        props: { ...props, children: [props.children, props.footer] },
      }),
    },
    "../pro/anatomical-body": { AnatomicalBody: "AnatomicalBody" },
    "../pro/hub-ui": {
      ProButton: (props) =>
        jsx("Pressable", {
          ...props,
          accessibilityRole: "button",
          accessibilityLabel: props.title,
          disabled: props.disabled || props.loading,
          children: props.title,
        }),
      ProPill: "ProPill",
    },
    "./api": { pretty: (value) => value.replace(/-/g, " ") },
  });
  return {
    saves,
    closes,
    render() {
      cursor = 0;
      return CustomExerciseEditor({
        exercise: initial,
        tax,
        onSave: async (input) => {
          saves.push(input);
          await onSave(input);
        },
        onClose: () => closes.push(true),
      });
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
function control(tree, label, role = "button") {
  const node = nodes(
    tree,
    (node) => node.props?.accessibilityRole === role && node.props.accessibilityLabel === label,
  )[0];
  assert.ok(node, `Expected ${role}: ${label}`);
  return node;
}
function field(tree, label) {
  const node = nodes(
    tree,
    (node) => node.type === "TextInput" && node.props.accessibilityLabel === label,
  )[0];
  assert.ok(node, `Expected input: ${label}`);
  return node;
}
const errors = (tree) =>
  nodes(tree, (node) => node.props?.accessibilityRole === "alert")
    .map(text)
    .join(" ");
function choose(ui, label, value) {
  control(ui.render(), `Choose ${label}`).props.onPress();
  control(ui.render(), value, "checkbox").props.onPress();
  control(ui.render(), "Done").props.onPress();
}
function fillBasics(ui) {
  field(ui.render(), "Custom exercise name").props.onChangeText("  My cable press  ");
  choose(ui, "primary muscles", "Chest");
  choose(ui, "equipment", "Cable");
  control(ui.render(), "Next · technique").props.onPress();
}
function fillTechnique(ui, instructions = "  Set up the cable  \n\n Press with control ") {
  field(ui.render(), "Custom exercise instructions").props.onChangeText(instructions);
  field(ui.render(), "Custom exercise notes").props.onChangeText("  Use the low handle  ");
  control(ui.render(), "Review exercise").props.onPress();
}

test("custom exercise creation guides required details, reviews and saves trimmed instructions", async () => {
  const ui = editorFixture();
  control(ui.render(), "Next · technique").props.onPress();
  assert.match(errors(ui.render()), /name.*primary muscles/);
  assert.equal(ui.saves.length, 0);
  fillBasics(ui);
  fillTechnique(ui);
  let tree = ui.render();
  assert.match(text(tree), /Your technique/);
  assert.match(text(tree), /Set up the cable/);
  control(tree, "Save exercise").props.onPress();
  await settle();
  assert.equal(ui.saves.length, 1);
  const saved = ui.saves[0];
  assert.equal(saved.name, "My cable press");
  assert.equal(saved.description, "Use the low handle");
  assert.deepEqual(Array.from(saved.instructions), ["Set up the cable", "Press with control"]);
  assert.deepEqual(Array.from(saved.primaryMuscles), ["chest"]);
  assert.deepEqual(Array.from(saved.equipment), ["cable"]);
  assert.equal(saved.activityType, "weight-training");
  assert.equal(ui.closes.length, 1);
});

test("primary muscles remove matching support labels and support chooser excludes primary muscles", () => {
  const ui = editorFixture();
  choose(ui, "supporting muscles", "Triceps");
  choose(ui, "primary muscles", "Triceps");
  control(ui.render(), "Choose supporting muscles").props.onPress();
  let tree = ui.render();
  assert.equal(
    nodes(
      tree,
      (node) =>
        node.props?.accessibilityRole === "checkbox" && node.props.accessibilityLabel === "Triceps",
    ).length,
    0,
  );
  const anatomy = nodes(tree, (node) => node.type === "AnatomicalBody");
  assert.ok(
    anatomy.every((node) => node.props.muscles.length === 0),
    "the support selection is cleared",
  );
  field(tree, "Search supporting muscles").props.onChangeText("abs");
  tree = ui.render();
  assert.equal(nodes(tree, (node) => node.props?.accessibilityRole === "checkbox").length, 1);
  control(tree, "Abs", "checkbox").props.onPress();
  control(ui.render(), "Done").props.onPress();
  assert.match(text(ui.render()), /Abs/);
});

test("instruction validation stops empty, one-character, excessive and overly long steps", () => {
  const ui = editorFixture();
  fillBasics(ui);
  for (const invalid of [
    "",
    "x",
    Array.from({ length: 31 }, () => "Press up").join("\n"),
    "x".repeat(501),
  ]) {
    field(ui.render(), "Custom exercise instructions").props.onChangeText(invalid);
    control(ui.render(), "Review exercise").props.onPress();
    assert.match(errors(ui.render()), /1–30 instruction steps/);
    assert.equal(field(ui.render(), "Custom exercise instructions").props.value, invalid);
    assert.equal(ui.saves.length, 0);
  }
  fillTechnique(ui, "Press with control");
  assert.equal(errors(ui.render()), "");
  assert.ok(control(ui.render(), "Save exercise"));
});

test("save failures keep editable drafts and existing optional guidance survives editing", async () => {
  let rejectSave = true;
  const ui = editorFixture({
    initial: exercise,
    onSave: async () => {
      if (rejectSave) throw new Error("Connection interrupted. Try again.");
    },
  });
  control(ui.render(), "Next · technique").props.onPress();
  control(ui.render(), "Review exercise").props.onPress();
  control(ui.render(), "Save exercise").props.onPress();
  await settle();
  assert.equal(ui.closes.length, 0);
  assert.match(errors(ui.render()), /Connection interrupted/);
  control(ui.render(), "Back").props.onPress();
  assert.equal(
    field(ui.render(), "Custom exercise instructions").props.value,
    exercise.instructions.join("\n"),
  );
  assert.equal(field(ui.render(), "Breathing cue · optional").props.value, exercise.breathingTip);
  field(ui.render(), "Custom exercise notes").props.onChangeText("Updated setup");
  control(ui.render(), "Review exercise").props.onPress();
  rejectSave = false;
  control(ui.render(), "Save exercise").props.onPress();
  await settle();
  const saved = ui.saves[1];
  assert.equal(saved.description, "Updated setup");
  assert.deepEqual(Array.from(saved.tips), exercise.tips);
  assert.deepEqual(Array.from(saved.mistakes), exercise.mistakes);
  assert.deepEqual(Array.from(saved.safetyNotes), exercise.safetyNotes);
  assert.equal(saved.breathingTip, exercise.breathingTip);
  assert.equal(ui.closes.length, 1);
});

test("category changes select a matching activity before saving", async () => {
  const ui = editorFixture({ initial: exercise });
  control(ui.render(), "Next · technique").props.onPress();
  control(ui.render(), "Review exercise").props.onPress();
  control(ui.render(), "More exercise details").props.onPress();
  control(ui.render(), "Choose category").props.onPress();
  control(ui.render(), "Cardio", "radio").props.onPress();
  control(ui.render(), "Save exercise").props.onPress();
  await settle();
  assert.equal(ui.saves[0].category, "cardio");
  assert.equal(ui.saves[0].activityType, "running");
});

test("pending save locks duplicate submissions and dismissal until the result arrives", async () => {
  let finish;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  const ui = editorFixture({ initial: exercise, onSave: () => pending });
  control(ui.render(), "Next · technique").props.onPress();
  control(ui.render(), "Review exercise").props.onPress();
  const before = ui.render();
  const save = control(before, "Save exercise");
  save.props.onPress();
  save.props.onPress();
  before.props.onClose();
  const tree = ui.render();
  assert.equal(tree.props.busy, true);
  assert.equal(control(tree, "Save exercise").props.disabled, true);
  assert.equal(control(tree, "Back").props.disabled, true);
  assert.equal(ui.saves.length, 1);
  assert.equal(ui.closes.length, 0);
  finish();
  await settle();
  assert.equal(ui.closes.length, 1);
});

function libraryFixture({ isPro = true, session = null, rows = [{ ...exercise }] } = {}) {
  const slots = [],
    effects = [],
    routes = [],
    adds = [],
    archives = [],
    alerts = [];
  let cursor = 0,
    cleared = 0;
  const dependenciesChanged = (before, after) =>
    !before || !after || after.some((value, index) => value !== before[index]);
  const React = {
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
    useRef(initial) {
      const index = cursor++;
      return (slots[index] ??= { current: initial });
    },
    useMemo(calculate, dependencies) {
      const index = cursor++;
      if (dependenciesChanged(slots[index]?.dependencies, dependencies)) {
        slots[index] = { dependencies, value: calculate() };
      }
      return slots[index].value;
    },
    useCallback(callback, dependencies) {
      return React.useMemo(() => callback, dependencies);
    },
    useEffect(callback, dependencies) {
      const index = cursor++;
      if (dependenciesChanged(slots[index]?.dependencies, dependencies)) {
        const previous = slots[index];
        slots[index] = { dependencies };
        effects.push(() => {
          previous?.cleanup?.();
          slots[index].cleanup = callback();
        });
      }
    },
  };
  const jsx = (type, props = {}) => (typeof type === "function" ? type(props) : { type, props });
  const button = (props) =>
    jsx("Pressable", {
      ...props,
      accessibilityRole: "button",
      accessibilityLabel: props.title ?? props.label,
      disabled: props.disabled || props.loading,
      children: props.title ?? props.label,
    });
  const { CustomExercisesScreen } = load("../src/features/exercises/custom-screen.tsx", {
    react: React,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      View: "View",
      TextInput: "TextInput",
      ActivityIndicator: "ActivityIndicator",
      ScrollView: "ScrollView",
      RefreshControl: "RefreshControl",
    },
    "expo-router": {
      router: {
        push: (route) => routes.push(route),
        back: () => {},
        replace: (route) => routes.push(route),
        canGoBack: () => true,
      },
      useFocusEffect: (callback) => React.useEffect(callback, [callback]),
    },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "react-native-svg": { __esModule: true, default: "Svg", Line: "Line", Rect: "Rect" },
    "@/src/context/session": { useSession: () => ({ user: { id: "alice" } }) },
    "@/src/components/motion": { MotionPressable: "Pressable", ScreenEntrance: "ScreenEntrance" },
    "@/src/components/ui": { Txt: "Txt" },
    "@/src/components/app-dialog": {
      useAppAlert: () => ({ alert: (...args) => alerts.push(args) }),
    },
    "../billing/billing-context": { useBilling: () => ({ isPro, loading: false }) },
    "../workouts/workout-context": {
      useWorkout: () => ({
        session,
        busy: false,
        loading: false,
        addExercises: async (ids) => adds.push(Array.from(ids)),
      }),
    },
    "../pro/hub-ui": {
      ProAction: button,
      ProButton: button,
      ProPill: button,
      ProScene: "ProScene",
    },
    "../pro/anatomical-body": { AnatomicalBody: "AnatomicalBody" },
    "../progress/editors": {
      Sheet: (props) => ({
        type: "Sheet",
        props: { ...props, children: [props.children, props.footer] },
      }),
    },
    "./api": { pretty: (value) => value.replace(/-/g, " "), getTaxonomies: async () => tax },
    "./custom-api": {
      customExerciseApi: (ownerId) => {
        assert.equal(ownerId, "alice");
        return {
          list: async () => rows,
          archive: async (id) => {
            archives.push(id);
            rows = rows.map((row) => (row.id === id ? { ...row, status: "archived" } : row));
          },
          restore: async (id) => {
            rows = rows.map((row) => (row.id === id ? { ...row, status: "published" } : row));
          },
          save: async () => exercise,
        };
      },
    },
    "./picker-cache": {
      clearPickerCache: () => {
        cleared++;
      },
    },
    "./picker-search": pickerSearch,
    "./custom-editor": {
      CustomExerciseEditor: "CustomExerciseEditor",
      TRACKING: {
        reps_weight: { label: "Weight & reps", icon: "weight-kilogram" },
        reps: { label: "Reps only", icon: "repeat" },
        duration: { label: "Time", icon: "timer-outline" },
        distance_duration: { label: "Distance & time", icon: "map-marker-distance" },
      },
    },
  });
  return {
    routes,
    adds,
    archives,
    alerts,
    cleared: () => cleared,
    render() {
      cursor = 0;
      const tree = CustomExercisesScreen();
      effects.splice(0).forEach((effect) => effect());
      return tree;
    },
    async mount() {
      this.render();
      await settle();
      return this.render();
    },
  };
}

test("free members can view and archive saved custom exercises while create and edit open Pro", async () => {
  const ui = libraryFixture({ isPro: false });
  let tree = await ui.mount();
  assert.equal(control(tree, "Create custom exercise").props.disabled, false);
  control(tree, "Create custom exercise").props.onPress();
  control(tree, `Edit ${exercise.name}`).props.onPress();
  assert.deepEqual(ui.routes, ["/membership", "/membership"]);
  assert.equal(nodes(ui.render(), (node) => node.type === "CustomExerciseEditor").length, 0);
  control(ui.render(), `View ${exercise.name}`).props.onPress();
  tree = ui.render();
  const preview = nodes(tree, (node) => node.type === "Sheet")[0];
  assert.equal(preview.props.title, exercise.name);
  assert.match(text(preview), /Set up the cable/);
  assert.ok(control(preview, "Use in a new routine"));
  preview.props.onClose();
  control(ui.render(), `Archive ${exercise.name}`).props.onPress();
  assert.equal(ui.alerts.length, 1);
  const archive = ui.alerts[0][2].find((action) => action.text === "Archive");
  await archive.onPress();
  tree = ui.render();
  assert.deepEqual(ui.archives, [exercise.id]);
  assert.equal(ui.cleared(), 1);
  assert.match(text(tree), /Exercise archived/);
  control(tree, "Archived · 1").props.onPress();
  assert.ok(control(ui.render(), `View ${exercise.name}`));
  assert.ok(control(ui.render(), `Restore ${exercise.name}`));
});

test("custom exercise preview adds its identifier to the active workout and opens that workout", async () => {
  const ui = libraryFixture({ session: { id: "active-session", workout_session_exercises: [] } });
  await ui.mount();
  control(ui.render(), `View ${exercise.name}`).props.onPress();
  const action = control(ui.render(), "Add to active workout");
  assert.equal(action.props.disabled, false);
  action.props.onPress();
  await settle();
  assert.deepEqual(ui.adds, [[exercise.id]]);
  assert.deepEqual(ui.routes, ["/workout"]);
  assert.equal(nodes(ui.render(), (node) => node.type === "Sheet").length, 0);
});

test("custom exercise preview without an active workout seeds a new routine with that exercise", async () => {
  const ui = libraryFixture();
  await ui.mount();
  control(ui.render(), `View ${exercise.name}`).props.onPress();
  control(ui.render(), "Use in a new routine").props.onPress();
  assert.equal(ui.routes.length, 1);
  assert.equal(ui.routes[0].pathname, "/workout/create");
  assert.equal(ui.routes[0].params.exerciseId, exercise.id);
  assert.equal(ui.adds.length, 0);
  assert.equal(nodes(ui.render(), (node) => node.type === "Sheet").length, 0);
});
