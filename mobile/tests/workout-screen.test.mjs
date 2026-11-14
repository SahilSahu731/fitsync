import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { nextWorkoutSet, workoutTime } from "../src/features/workouts/session-progress.ts";
import { workoutSummary } from "../src/features/workouts/summary.ts";
import { workoutControlsSnapshot } from "../src/features/companion/native-model.ts";

function screen({ completed = false, busy = false, isPro = true } = {}) {
  const slots = [];
  let cursor = 0;
  const frames = [];
  const scrolls = [];
  const alerts = [];
  const routes = [];
  const listeners = {};
  let finishes = 0;
  let focusedExerciseId;
  const session = {
    id: "session",
    name: "Upper body",
    started_at: new Date().toISOString(),
    notes: "",
    workout_session_exercises: [
      {
        id: "bench",
        exercise_id: "movement",
        exercise_name: "Bench press",
        position: 0,
        tracking_type: "reps_weight",
        rest_seconds: 90,
        workout_logged_sets: [true, completed].map((done, position) => ({
          id: `set-${position}`,
          position,
          completed_at: done ? "done" : null,
          set_type: "normal",
          weight_kg: 40,
          reps: 8,
        })),
      },
    ],
  };
  const React = {
    useRef(initial) {
      const i = cursor++;
      return (slots[i] ??= { current: initial });
    },
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [
        slots[i],
        (value) => {
          slots[i] = typeof value === "function" ? value(slots[i]) : value;
        },
      ];
    },
    useEffect(callback) {
      callback();
    },
    useMemo(callback) {
      return callback();
    },
    useCallback(callback) {
      return callback;
    },
  };
  const billing = { isPro };
  const progress = {
    journal: {
      workouts: [
        { ...session, id: "previous", status: "completed", finished_at: "2026-11-13T11:00:00Z" },
      ],
    },
  };
  const C = { bg: "#000", ink: "#fff", muted: "#aaa", brand: "#C5F460" };
  const deps = {
    react: React,
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
      Fragment: "Fragment",
    },
    "react-native": Object.fromEntries(
      [
        "ActivityIndicator",
        "KeyboardAvoidingView",
        "Pressable",
        "ScrollView",
        "View",
        "TextInput",
      ].map((name) => [name, name]),
    ),
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 24, bottom: 20 }) },
    "expo-router": { useRouter: () => ({ replace: (...args) => routes.push(args) }) },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/components/ui": { Txt: "Txt" },
    "@/src/constants/theme": { C },
    "@/src/components/motion": { useReducedAppMotion: () => true },
    "@/src/components/app-dialog": {
      useAppAlert: () => ({ alert: (...args) => alerts.push(args) }),
    },
    "@/src/features/experience/experience-context": { useExperience: () => ({ feedback() {} }) },
    "@/src/features/experience/keep-workout-awake": { useWorkoutAwake() {} },
    "@/src/features/progress/use-progress": { useProgress: () => progress },
    "@/src/features/progress/model": { localDate: () => "2026-11-14" },
    "@/src/features/billing/billing-context": { useBilling: () => billing },
    "@/src/features/workouts/workout-context": {
      useWorkout: () => ({
        session,
        busy,
        focusedExerciseId,
        setFocusedExerciseId: (id) => {
          focusedExerciseId = id;
        },
        finish: async () => {
          finishes++;
        },
      }),
    },
    "@/src/features/workouts/components/workout-glass": {
      WorkoutGlassScene: "GlassScene",
      WorkoutGlassSurface: "GlassSurface",
    },
    "@/src/features/workouts/components/workout-controls": { WorkoutDrawer: "WorkoutDrawer" },
    "@/src/features/workouts/components/train-actions": {
      TrainActions: "TrainActions",
      ReorderTraining: "ReorderTraining",
    },
    "@/src/features/workouts/summary": { workoutSummary },
    "@/src/features/workouts/session-progress": { nextWorkoutSet, workoutTime },
    "@/src/features/workouts/components/session-exercise-card": {
      SessionExerciseCard: "ExerciseCard",
    },
    "@/src/features/workouts/components/session-overview": { SessionOverview: "Overview" },
    "@/src/features/workouts/components/rest-timer": { RestTimer: "RestTimer" },
  };
  deps["react-native"].Platform = { OS: "ios" };
  deps["react-native"].Keyboard = {
    addListener(name, listener) {
      listeners[name] = listener;
      return { remove() {} };
    },
  };
  const source = readFileSync(new URL("../src/app/workout/index.tsx", import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(js, {
    exports,
    Date,
    console,
    setInterval: () => 1,
    clearInterval() {},
    requestAnimationFrame: (callback) => frames.push(callback),
    require(name) {
      assert.ok(name in deps, `Unexpected dependency ${name}`);
      return deps[name];
    },
  });
  return {
    session,
    billing,
    progress,
    get focusedExerciseId() {
      return focusedExerciseId;
    },
    setFocusedExerciseId(id) {
      focusedExerciseId = id;
    },
    alerts,
    routes,
    scrolls,
    listeners,
    get finishes() {
      return finishes;
    },
    render() {
      cursor = 0;
      const tree = exports.default();
      find(tree, (node) => node.type === "View" && node.props.ref).props.ref.current = {
        measureInWindow: (callback) => callback(0, 120, 390, 600),
      };
      find(tree, (node) => node.type === "ScrollView").props.ref.current = {
        scrollTo: (options) => scrolls.push(options),
        measureInWindow: (callback) => callback(0, 120, 390, 600),
      };
      return tree;
    },
    flushFrames() {
      frames.splice(0).forEach((callback) => callback());
    },
  };
}
function find(node, predicate) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = find(child, predicate);
      if (found) return found;
    }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function text(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node !== "object") return String(node);
  return Array.isArray(node) ? node.map(text).join("") : text(node.props?.children);
}
const button = (tree, label) =>
  find(
    tree,
    (node) =>
      node.type === "Pressable" &&
      (node.props.accessibilityLabel === label || text(node) === label),
  );

test("the live screen passes its exercise list to the overview", () => {
  const app = screen();
  const overview = find(app.render(), (node) => node.type === "Overview");
  assert.equal(overview.props.exercises.length, 1);
  assert.equal(overview.props.exercises[0].exercise_name, "Bench press");
});

test("phone and watch next-set guidance follows the shared focused exercise", () => {
  const app = screen();
  app.session.status = "active";
  app.session.workout_session_exercises.push({
    ...app.session.workout_session_exercises[0],
    id: "row",
    exercise_name: "Row",
    position: 1,
    workout_logged_sets: [
      {
        ...app.session.workout_session_exercises[0].workout_logged_sets[1],
        id: "row-set",
        position: 0,
        completed_at: null,
      },
    ],
  });
  let tree = app.render();
  const row = find(
    tree,
    (node) => node.type === "ExerciseCard" && node.props.exercise.id === "row",
  );
  row.props.onFocus("row");
  tree = app.render();
  assert.equal(app.focusedExerciseId, "row");
  assert.equal(find(tree, (node) => node.type === "Overview").props.currentId, "row");
  const watch = workoutControlsSnapshot("owner", app.session, null, app.focusedExerciseId);
  assert.equal(watch.nextSetId, "row-set");
  assert.ok(button(tree, "Go to Row, set 1"));
  // A focus change from another consumer updates the phone on the next render.
  app.setFocusedExerciseId("bench");
  tree = app.render();
  assert.ok(button(tree, "Go to Bench press, set 2"));
  assert.equal(
    workoutControlsSnapshot("owner", app.session, null, app.focusedExerciseId).nextSetId,
    "set-1",
  );
});

test("Pro working-set guidance receives canonical history and superset session state, and expires immediately", () => {
  const app = screen();
  let card = find(app.render(), (node) => node.type === "ExerciseCard");
  assert.equal(card.props.history, app.progress.journal.workouts);
  assert.equal(card.props.sessionExercises[0], app.session.workout_session_exercises[0]);
  assert.equal(card.props.sessionExercises.length, app.session.workout_session_exercises.length);
  assert.equal(card.props.today, "2026-11-14");
  app.billing.isPro = false;
  card = find(app.render(), (node) => node.type === "ExerciseCard");
  assert.equal(card.props.history, undefined);
  assert.equal(card.props.sessionExercises[0], app.session.workout_session_exercises[0]);
  const free = screen({ isPro: false });
  assert.equal(
    find(free.render(), (node) => node.type === "ExerciseCard").props.history,
    undefined,
  );
});

test("exercises start collapsed and next set measures the row against the scrolled viewport", () => {
  const app = screen();
  let tree = app.render();
  assert.equal(find(tree, (node) => node.type === "ExerciseCard").props.collapsed, true);
  assert.ok(button(tree, "Expand all exercises"));
  button(tree, "Go to Bench press, set 2").props.onPress();
  tree = app.render();
  const card = find(tree, (node) => node.type === "ExerciseCard");
  assert.equal(card.props.collapsed, false);
  find(tree, (node) => node.type === "ScrollView").props.onScroll({
    nativeEvent: { contentOffset: { y: 300 } },
  });
  card.props.onSetMount("set-1", { measureInWindow: (callback) => callback(0, 280, 358, 100) });
  card.props.onSetLayout("set-1");
  app.flushFrames();
  assert.equal(app.scrolls.length, 1);
  assert.equal(app.scrolls[0].y, 444);
  assert.equal(app.scrolls[0].animated, false);
});

test("expand all opens exercises and collapse all restores the initial state", () => {
  const app = screen();
  button(app.render(), "Expand all exercises").props.onPress();
  let tree = app.render();
  assert.equal(find(tree, (node) => node.type === "ExerciseCard").props.collapsed, false);
  button(tree, "Collapse all exercises").props.onPress();
  tree = app.render();
  assert.equal(find(tree, (node) => node.type === "ExerciseCard").props.collapsed, true);
});

test("finishing reviews unlogged sets before saving, then opens history", async () => {
  const app = screen();
  let tree = app.render();
  button(tree, "Finish").props.onPress();
  assert.equal(app.finishes, 0);
  tree = app.render();
  assert.match(text(tree), /1 unlogged set will be left out/);
  await button(tree, "Save & finish workout").props.onPress();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(app.finishes, 1);
  assert.equal(app.routes[0][0].pathname, "/workout/history/[id]");
  assert.equal(app.routes[0][0].params.id, "session");
});

test("completed sessions show a finish shortcut and typing hides the footer", () => {
  const app = screen({ completed: true });
  let tree = app.render();
  assert.ok(button(tree, "Review and finish workout"));
  app.listeners.keyboardWillShow();
  tree = app.render();
  assert.equal(button(tree, "Review and finish workout"), null);
  app.listeners.keyboardWillHide();
  tree = app.render();
  assert.ok(button(tree, "Review and finish workout"));
});
