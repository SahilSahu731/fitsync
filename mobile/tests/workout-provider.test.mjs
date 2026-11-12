import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(path, dependencies, globals = {}) {
  const exports = {};
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(js, {
    exports,
    Date,
    Map,
    Set,
    Promise,
    console,
    ...globals,
    require: (name) => {
      if (!(name in dependencies)) throw Error(`Unexpected dependency ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const session = () => ({
  id: "session",
  status: "active",
  name: "Training",
  notes: "",
  started_at: new Date().toISOString(),
  workout_session_exercises: [
    {
      id: "exercise",
      workout_logged_sets: [{ id: "set", reps: 8, weight_kg: 20, completed_at: null }],
    },
  ],
});

async function fixture(options = {}) {
  const storage = new Map();
  const store = {
    getItem: async (key) => storage.get(key) ?? null,
    setItem: async (key, value) => {
      await options.beforeWrite?.(key, value);
      storage.set(key, value);
    },
    removeItem: async (key) => {
      storage.delete(key);
    },
  };
  const state = load("../src/features/workouts/set-state.ts", {});
  const offline = load("../src/features/workouts/offline.ts", {
    "./set-state": state,
    "@react-native-async-storage/async-storage": store,
  });
  const summary = load("../src/features/workouts/summary.ts", {});
  const slots = [];
  let cursor = 0;
  let changed = false;
  const effects = [];
  const same = (left, right) =>
    !!left &&
    left.length === right.length &&
    left.every((item, index) => Object.is(item, right[index]));
  const effect = (callback, dependencies) => {
    const index = cursor++;
    const previous = slots[index];
    if (!previous || !same(previous.dependencies, dependencies)) {
      slots[index] = { dependencies, cleanup: previous?.cleanup };
      effects.push(() => {
        slots[index].cleanup?.();
        slots[index].cleanup = callback();
      });
    }
  };
  const React = {
    createContext: () => ({ Provider: "provider" }),
    useEffect: effect,
    useLayoutEffect: effect,
    useRef(value) {
      const index = cursor++;
      return (slots[index] ??= { current: value });
    },
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [
        slots[index],
        (value) => {
          const next = typeof value === "function" ? value(slots[index]) : value;
          if (!Object.is(next, slots[index])) {
            slots[index] = next;
            changed = true;
          }
        },
      ];
    },
    useCallback(callback, dependencies) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || !same(previous.dependencies, dependencies))
        slots[index] = { callback, dependencies };
      return slots[index].callback;
    },
  };
  const jsx = (type, props) => ({ type, props });
  const calls = [];
  let remote = session();
  const api = {
    active: async () => {
      calls.push("active");
      return remote;
    },
    updateSet: async (_session, _set, patch) => {
      calls.push(["set", patch]);
      await options.setGate?.promise;
    },
    updateNotes: async () => {},
    finish: async (_id, seconds, notes) => {
      calls.push("finish");
      await options.finishGate?.promise;
      const draft = await offline.readWorkoutDraft("owner");
      const completed = summary.completedWorkout({ ...draft.session, notes }, seconds);
      remote = null;
      return completed;
    },
    addSet: async () => {
      await options.structureGate?.promise;
      remote = { ...remote, name: "Updated structure" };
      return remote;
    },
  };
  const provider = load(
    "../src/features/workouts/workout-context.tsx",
    {
      react: React,
      "react/jsx-runtime": { jsx, jsxs: jsx },
      "react-native": {
        AppState: { currentState: "active", addEventListener: () => ({ remove() {} }) },
      },
      "@react-native-async-storage/async-storage": store,
      "@/src/context/session": { useSession: () => ({ user: { id: "owner" } }) },
      "./notifications": {
        configureWorkoutNotifications: async () => {},
        cancelRestNotification: async () => {},
        requestWorkoutNotificationPermission: async () => {
          await options.permissionGate?.promise;
        },
        scheduleRestNotification: async (seconds) => {
          calls.push(["notification", seconds]);
        },
      },
      "../exercises/picker-cache": { loadExercisePicker: async () => [] },
      "./api": { workoutApi: api },
      "./offline": offline,
      "./summary": summary,
    },
    { setInterval: () => 1, clearInterval: () => {} },
  );
  const element = provider.WorkoutProvider({ children: null });
  let context;
  function render() {
    cursor = 0;
    changed = false;
    context = element.type(element.props).props.value;
    effects.splice(0).forEach((run) => run());
  }
  async function settle() {
    for (let i = 0; i < 8; i++) {
      await tick();
      if (changed) render();
    }
  }
  render();
  await settle();
  return {
    get context() {
      return context;
    },
    settle,
    render,
    calls,
    offline,
    storage,
  };
}

test("offline finish returns immediately, exposes the local summary, and invalidates subscribers after upload", async () => {
  const finishGate = deferred();
  const harness = await fixture({ finishGate });
  await harness.context.updateSet("set", { reps: 12, completed: true });
  await harness.settle();
  await harness.context.finish();
  await harness.settle();
  assert.equal(harness.context.session, null);
  assert.equal(harness.context.pendingCompletion, true);
  assert.equal(
    harness.context.completedWorkout.workout_session_exercises[0].workout_logged_sets[0].reps,
    12,
  );
  assert.equal(harness.context.dataRevision, 0);
  finishGate.resolve();
  await harness.settle();
  assert.equal(harness.context.pendingCompletion, false);
  assert.equal(harness.context.dataRevision, 1);
  assert.equal(harness.context.completedWorkout.status, "completed");
  assert.equal(harness.calls.filter((call) => call === "finish").length, 1);
});

test("finishing waits for a metric write already being saved to device storage", async () => {
  const storageGate = deferred();
  const finishGate = deferred();
  let delay = false;
  const harness = await fixture({
    finishGate,
    beforeWrite: async () => {
      if (delay) await storageGate.promise;
    },
  });
  await harness.context.updateSet("set", { completed: true });
  await harness.settle();
  delay = true;
  const edit = harness.context.updateSet("set", { reps: 15 });
  const finish = harness.context.finish();
  await tick();
  assert.equal(harness.calls.includes("finish"), false);
  storageGate.resolve();
  await Promise.all([edit, finish]);
  await harness.settle();
  assert.equal(
    harness.context.completedWorkout.workout_session_exercises[0].workout_logged_sets[0].reps,
    15,
  );
  finishGate.resolve();
  await harness.settle();
});

test("rest starts before notification permission resolves and skipping prevents a delayed notification", async () => {
  const permissionGate = deferred();
  const harness = await fixture({ permissionGate });
  harness.context.startRest(90);
  harness.render();
  assert.ok(harness.context.restTimer.endsAt > Date.now());
  harness.context.stopRest();
  harness.render();
  permissionGate.resolve();
  await harness.settle();
  assert.equal(harness.context.restTimer, null);
  assert.equal(
    harness.calls.some((call) => Array.isArray(call) && call[0] === "notification"),
    false,
  );
  assert.equal(harness.storage.has("fitsync.workout.rest.v2.owner"), false);
});

test("refresh cannot replace a structural workout change while it is in flight", async () => {
  const structureGate = deferred();
  const harness = await fixture({ structureGate });
  const change = harness.context.addSet("exercise");
  await tick();
  const activeReads = harness.calls.filter((call) => call === "active").length;
  await harness.context.refresh();
  assert.equal(harness.calls.filter((call) => call === "active").length, activeReads);
  structureGate.resolve();
  await change;
  await harness.settle();
  assert.equal(harness.context.session.name, "Updated structure");
});
