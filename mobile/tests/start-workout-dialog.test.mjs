import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function mount(file, exportName, dependencies, props = {}) {
  const slots = [];
  const effects = [];
  let cursor = 0;
  let effectCursor = 0;
  const jsx = (type, props) => ({ type, props });
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [
        slots[index],
        (value) => {
          slots[index] = typeof value === "function" ? value(slots[index]) : value;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(run, deps) {
      const index = effectCursor++;
      const previous = effects[index];
      if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
        previous?.cleanup?.();
        effects[index] = { run, deps: [...deps], pending: true };
      }
    },
    useCallback: (fn) => fn,
  };
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  vm.runInNewContext(outputText, {
    exports,
    Date,
    Error,
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "Fragment" };
      if (name === "react") return react;
      if (!(name in dependencies)) throw Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  return {
    render() {
      cursor = 0;
      effectCursor = 0;
      const tree = exports[exportName](props);
      return exportName === "default" ? tree.type(tree.props) : tree;
    },
    async flush() {
      for (const effect of effects) {
        if (effect.pending) {
          effect.pending = false;
          effect.cleanup = effect.run();
        }
      }
      await new Promise(setImmediate);
    },
    unmount() {
      for (const effect of effects) effect.cleanup?.();
    },
  };
}

function find(node, type) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((child) => find(child, type));
  return [...(node.type === type ? [node] : []), ...find(node.props?.children, type)];
}
const button = (tree, label) =>
  find(tree, "Pressable").find((node) => node.props.accessibilityLabel === label);
const text = (tree) =>
  typeof tree === "string"
    ? tree
    : Array.isArray(tree)
      ? tree.map(text).join(" ")
      : text(tree?.props?.children ?? "");
const routines = [
  { id: "push", slug: "push-gym", estimated_minutes: 65 },
  { id: "pull", slug: "pull-gym", estimated_minutes: 60 },
  { id: "legs", slug: "legs-gym", estimated_minutes: 70 },
];
function fixture(overrides = {}) {
  const calls = { saved: [], started: [], opened: 0, closed: 0 };
  const props = {
    disabled: false,
    onStart: async (id) => {
      calls.started.push(id);
    },
    onStarted: () => {
      calls.opened++;
    },
    onClose: () => {
      calls.closed++;
    },
    ...overrides.props,
  };
  const catalogApi = {
    routines: async () => routines,
    saveRoutine: async (id) => {
      calls.saved.push(id);
      return { templateId: `template-${id}` };
    },
    ...overrides.catalog,
  };
  const screen = mount(
    "../src/features/workouts/components/start-workout-dialog.tsx",
    "StartWorkoutDialog",
    {
      "react-native": {
        View: "View",
        Modal: "Modal",
        ScrollView: "ScrollView",
        ActivityIndicator: "Loading",
      },
      "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
      "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
      "@/src/components/motion": { MotionPressable: "Pressable", useReducedAppMotion: () => true },
      "@/src/components/ui": { Txt: "Txt" },
      "@/src/constants/theme": { C: { bg: "#000000", ink: "#FFFFFF", brand: "#C5F460" } },
      "@/src/features/training-catalog/api": { catalogApi },
    },
    props,
  );
  return { ...screen, calls, props };
}

for (const [title, id] of [
  ["Push Day", "push"],
  ["Back Day", "pull"],
  ["Leg Day", "legs"],
]) {
  test(`${title} starts the real saved routine with its exercises and sets`, async () => {
    const screen = fixture();
    let tree = screen.render();
    assert.equal(screen.calls.started.length, 0, "opening the picker must not create a workout");
    assert.equal(button(tree, `Start ${title}`).props.disabled, true);
    await screen.flush();
    tree = screen.render();
    assert.equal(button(tree, `Start ${title}`).props.disabled, false);
    button(tree, `Start ${title}`).props.onPress();
    await screen.flush();
    assert.deepEqual(screen.calls.saved, [id]);
    assert.deepEqual(screen.calls.started, [`template-${id}`]);
    assert.equal(screen.calls.opened, 1);
  });
}

test("custom workouts remain available while recommendations load and after a load failure", async () => {
  const screen = fixture({
    catalog: {
      routines: async () => {
        throw Error("Offline");
      },
    },
  });
  let tree = screen.render();
  assert.equal(button(tree, "Start a custom workout").props.disabled, false);
  await screen.flush();
  tree = screen.render();
  assert.match(text(tree), /Couldn't load recommendations/);
  assert.equal(button(tree, "Start a custom workout").props.disabled, false);
  button(tree, "Start a custom workout").props.onPress();
  await screen.flush();
  assert.deepEqual(screen.calls.started, [undefined]);
  assert.deepEqual(screen.calls.saved, []);
  assert.equal(screen.calls.opened, 1);
});

test("unpublished recommendations are disabled and retry loads newly available routines", async () => {
  let requests = 0;
  const screen = fixture({ catalog: { routines: async () => (++requests === 1 ? [] : routines) } });
  screen.render();
  await screen.flush();
  let tree = screen.render();
  assert.equal(button(tree, "Start Push Day").props.disabled, true);
  find(tree, "Pressable")
    .find((node) => text(node).includes("Retry recommendations"))
    .props.onPress();
  screen.render();
  await screen.flush();
  tree = screen.render();
  assert.equal(button(tree, "Start Push Day").props.disabled, false);
});

test("a failed start stays in the dialog and retries without copying the routine again", async () => {
  let attempts = 0;
  const screen = fixture({
    props: {
      onStart: async () => {
        if (++attempts === 1) throw Error("Start failed");
      },
    },
  });
  screen.render();
  await screen.flush();
  button(screen.render(), "Start Push Day").props.onPress();
  await screen.flush();
  let tree = screen.render();
  assert.match(
    text(find(tree, "Txt").find((node) => node.props.accessibilityRole === "alert")),
    /Start failed/,
  );
  assert.equal(screen.calls.opened, 0);
  button(tree, "Start Push Day").props.onPress();
  await screen.flush();
  assert.equal(attempts, 2);
  assert.deepEqual(screen.calls.saved, ["push"]);
  assert.equal(screen.calls.opened, 1);
});

test("a recommendation that cannot be prepared never starts an empty workout", async () => {
  const screen = fixture({ catalog: { saveRoutine: async () => ({}) } });
  screen.render();
  await screen.flush();
  button(screen.render(), "Start Push Day").props.onPress();
  await screen.flush();
  assert.deepEqual(screen.calls.started, []);
  assert.equal(screen.calls.opened, 0);
  assert.match(text(screen.render()), /Could not prepare this routine/);
});

test("an existing workout operation prevents starting a new session", async () => {
  const screen = fixture({ props: { disabled: true } });
  const tree = screen.render();
  assert.equal(button(tree, "Start a custom workout").props.disabled, true);
  button(tree, "Start a custom workout").props.onPress();
  assert.deepEqual(screen.calls.started, []);
});

test("rapid taps cannot start duplicates or dismiss the dialog during preparation", async () => {
  let finish;
  const screen = fixture({
    props: {
      onStart: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    },
  });
  let tree = screen.render();
  button(tree, "Start a custom workout").props.onPress();
  const firstFinish = finish;
  button(tree, "Start a custom workout").props.onPress();
  assert.equal(finish, firstFinish, "a second tap must not call start again");
  tree = screen.render();
  assert.equal(button(tree, "Start a custom workout").props.disabled, true);
  tree.props.onRequestClose();
  assert.equal(screen.calls.closed, 0);
  finish();
  await screen.flush();
  assert.equal(screen.calls.opened, 1);
});

test("closing the picker creates nothing, and an unmounted picker cannot start a prepared routine", async () => {
  let finishSave;
  const screen = fixture({
    catalog: {
      saveRoutine: () =>
        new Promise((resolve) => {
          finishSave = resolve;
        }),
    },
  });
  let tree = screen.render();
  tree.props.onRequestClose();
  assert.equal(screen.calls.closed, 1);
  assert.deepEqual(screen.calls.started, []);
  await screen.flush();
  tree = screen.render();
  button(tree, "Start Push Day").props.onPress();
  screen.unmount();
  finishSave({ templateId: "template-push" });
  await screen.flush();
  assert.deepEqual(screen.calls.started, []);
  assert.equal(screen.calls.opened, 0);
});

test("Train opens the picker first and navigates only after a workout is started", async () => {
  const calls = [];
  const start = async (id) => {
    calls.push(["start", id]);
  };
  const screen = mount("../src/app/(tabs)/train.tsx", "default", {
    "react-native": {
      View: "View",
      ActivityIndicator: "Loading",
      useWindowDimensions: () => ({ width: 390 }),
    },
    "expo-router": {
      useRouter: () => ({ push: (route) => calls.push(["navigate", route]) }),
      useFocusEffect() {},
    },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/components/tab-bar-motion": { TabScrollView: "ScrollView" },
    "@/src/features/workouts/components/workout-sync-notice": { WorkoutSyncNotice: "SyncNotice" },
    "@/src/features/coaching/home-card": { CoachHomeCard: "CoachHomeCard" },
    "@/src/components/motion": { MotionPressable: "Pressable", ScreenEntrance: "Entrance" },
    "@/src/features/program-follow/active-program-card": { ActiveProgramCard: "ActiveProgramCard" },
    "@/src/components/app-dialog": { useAppAlert: () => ({ alert() {} }) },
    "@/src/constants/theme": { C: { bg: "#000000", ink: "#FFFFFF", brand: "#C5F460" } },
    "@/src/components/ui": { PageHeading: "Heading", SectionHeading: "SectionHeading", Txt: "Txt" },
    "@/src/features/workouts/api": { workoutApi: {} },
    "@/src/features/workouts/workout-context": {
      useWorkout: () => ({
        session: null,
        start,
        busy: false,
        loading: false,
        pendingCompletion: false,
        dataRevision: 0,
      }),
    },
    "@/src/features/training-catalog/api": { catalogApi: {} },
    "@react-native-async-storage/async-storage": {},
    "@/src/context/session": { useSession: () => ({ user: { id: "athlete" } }) },
    "@/src/features/workouts/components/train-actions": {},
    "expo-image": { Image: "Image" },
    "@/src/features/workouts/components/training-section": { TrainingSection: "TrainingSection" },
    "@/src/features/workouts/summary": {
      trainingWeek: () => ({ workouts: 0, minutes: 0, days: 0 }),
      workoutSummary: () => ({}),
    },
    "@/src/features/workouts/components/routine-card": { RoutineCard: "RoutineCard" },
    "@/src/features/workouts/components/start-workout-dialog": {
      StartWorkoutDialog: "StartWorkoutDialog",
    },
  });
  let tree = screen.render();
  assert.equal(find(tree, "StartWorkoutDialog").length, 0);
  find(tree, "Pressable")
    .find((node) => text(node).includes("Start empty workout"))
    .props.onPress();
  tree = screen.render();
  assert.deepEqual(calls, []);
  const dialog = find(tree, "StartWorkoutDialog")[0];
  await dialog.props.onStart("template-push");
  dialog.props.onStarted();
  assert.deepEqual(calls, [
    ["start", "template-push"],
    ["navigate", "/workout"],
  ]);
  assert.equal(find(screen.render(), "StartWorkoutDialog").length, 0);
});
