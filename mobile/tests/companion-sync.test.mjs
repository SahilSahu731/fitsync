import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {
  reminderDate,
  validReminderPreferences,
} from "../src/features/companion/reminder-model.ts";
import { workoutControlsSnapshot } from "../src/features/companion/native-model.ts";
import { restAfterWorkoutSet } from "../src/features/workouts/session-progress.ts";
import { currentGoals } from "../src/features/progress/model.ts";

const jsx = (type, props, key) => ({ type, props, key });
const tick = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function load(file, dependencies, globals = {}) {
  const exports = {};
  const js = ts.transpileModule(
    readFileSync(new URL(`../src/features/companion/${file}`, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  vm.runInNewContext(js, {
    exports,
    Date,
    Promise,
    Error,
    setInterval: () => 1,
    clearInterval() {},
    ...globals,
    require: (name) => {
      if (!(name in dependencies)) throw Error(`Unexpected dependency ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}
function hooks() {
  let active;
  const same = (a, b) =>
    a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  function effect(callback, deps) {
    const instance = active,
      index = instance.cursor++,
      previous = instance.slots[index];
    if (!previous || !same(previous.deps, deps)) {
      const slot = { deps, cleanup: previous?.cleanup };
      instance.slots[index] = slot;
      instance.effects.push(() => {
        slot.cleanup?.();
        slot.cleanup = callback();
      });
    }
  }
  const react = {
    createContext: () => ({ Provider: "Provider" }),
    useState(initial) {
      const instance = active,
        index = instance.cursor++;
      if (!(index in instance.slots))
        instance.slots[index] = typeof initial === "function" ? initial() : initial;
      return [
        instance.slots[index],
        (value) => {
          instance.slots[index] =
            typeof value === "function" ? value(instance.slots[index]) : value;
          instance.changed = true;
        },
      ];
    },
    useRef(initial) {
      const instance = active,
        index = instance.cursor++;
      return (instance.slots[index] ??= { current: initial });
    },
    useMemo(callback, deps) {
      const instance = active,
        index = instance.cursor++,
        previous = instance.slots[index];
      if (!previous || !same(previous.deps, deps))
        instance.slots[index] = { deps, value: callback() };
      return instance.slots[index].value;
    },
    useCallback(callback, deps) {
      return react.useMemo(() => callback, deps);
    },
    useEffect: effect,
    useLayoutEffect: effect,
  };
  function mount(render) {
    const instance = { slots: [], cursor: 0, effects: [], changed: false, tree: null, alive: true };
    instance.render = () => {
      active = instance;
      instance.cursor = 0;
      instance.changed = false;
      instance.tree = render();
      instance.effects.splice(0).forEach((run) => run());
      return instance.tree;
    };
    instance.settle = async () => {
      for (let index = 0; index < 10; index++) {
        await tick();
        if (instance.alive && instance.changed) instance.render();
      }
    };
    instance.unmount = () => {
      instance.alive = false;
      instance.slots.forEach((slot) => slot?.cleanup?.());
    };
    instance.render();
    return instance;
  }
  return { react, mount };
}
class HttpError extends Error {
  constructor(status, message = "This record changed on another device. Refresh and retry.") {
    super(message);
    this.status = status;
  }
}
const prefs = {
  enabled: true,
  time: "18:00",
  days: [1, 3, 5],
  quietStart: "22:00",
  quietEnd: "08:00",
  snoozeMinutes: 30,
  timezone: "UTC",
};
const state = (owner, revision = 1) => ({
  records: [
    {
      id: "reminders",
      kind: "reminders",
      data: prefs,
      revision,
      updatedAt: "2026-11-16T08:00:00Z",
    },
  ],
  photos: [{ id: `${owner}-photo`, url: `https://private.invalid/${owner}`, caption: owner }],
  shares: [],
});
function contextFixture(options = {}) {
  const runtime = hooks(),
    remote = { alice: state("alice"), bob: state("bob") },
    calls = [];
  let owner = "alice";
  const stateGates = options.stateGates ?? {};
  const module = load("companion-context.tsx", {
    react: runtime.react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      AppState: { currentState: "active", addEventListener: () => ({ remove() {} }) },
    },
    "@/src/context/session": { useSession: () => ({ user: { id: owner } }) },
    "@/src/services/api": { HttpError },
    "./api": {
      companionForOwner: (id) => ({
        exerciseUsage: async () => ({
          replacements: [
            {
              originalExerciseId: `${id}-original`,
              replacementExerciseId: `${id}-replacement`,
              date: "2026-11-16",
            },
          ],
        }),
        state: async () => {
          calls.push(["state", id]);
          const next = stateGates[id]?.shift();
          return next ? await next.promise : remote[id];
        },
        save: async (...args) => {
          calls.push(["save", id, ...args]);
          if (options.saveGate) await options.saveGate.promise;
          if (options.conflict) throw new HttpError(409);
          return { id: args[0], kind: args[1], data: args[2], revision: args[3] + 1 };
        },
      }),
    },
  });
  function mount(id) {
    owner = id;
    const element = module.CompanionProvider({ children: null });
    return runtime.mount(() => element.type(element.props));
  }
  return { mount, remote, calls };
}
function context(instance) {
  return instance.tree.props.value;
}
function find(node, type) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((item) => find(item, type));
  return [...(node.type === type ? [node] : []), ...find(node.props?.children, type)];
}

test("switching accounts prevents an older in-flight state response exposing private photos or records", async () => {
  const gate = deferred(),
    fixture = contextFixture({ stateGates: { alice: [gate] } });
  const alice = fixture.mount("alice");
  alice.unmount();
  const bob = fixture.mount("bob");
  await bob.settle();
  assert.equal(context(bob).state.photos[0].id, "bob-photo");
  gate.resolve(state("alice", 99));
  await bob.settle();
  assert.equal(context(bob).state.photos[0].id, "bob-photo");
  assert.equal(context(bob).state.records[0].revision, 1);
  assert.equal(context(bob).replacements[0].originalExerciseId, "bob-original");
  assert.equal(context(alice).state.photos.length, 0);
  await assert.rejects(context(alice).save("reminders", "reminders", prefs), /Sign in/);
  bob.unmount();
});
test("an in-flight mutation cannot refresh or publish data into a new account", async () => {
  const gate = deferred(),
    fixture = contextFixture({ saveGate: gate });
  const alice = fixture.mount("alice");
  await alice.settle();
  const pending = context(alice).save("reminders", "reminders", prefs, undefined, 1);
  const rejected = assert.rejects(pending, /account changed/);
  alice.unmount();
  const bob = fixture.mount("bob");
  await bob.settle();
  gate.resolve();
  await rejected;
  await bob.settle();
  assert.equal(context(bob).state.photos[0].id, "bob-photo");
  assert.equal(fixture.calls.filter((call) => call[0] === "save" && call[1] === "bob").length, 0);
  assert.equal(
    fixture.calls.filter((call) => call[0] === "state" && call[1] === "alice").length,
    1,
  );
  bob.unmount();
});
test("saving a draft sends its captured revision and a 409 refreshes server state without retrying an overwrite", async () => {
  const fixture = contextFixture({ conflict: true });
  fixture.remote.alice = state("alice", 4);
  const instance = fixture.mount("alice");
  await instance.settle();
  fixture.remote.alice = state("alice", 5);
  await assert.rejects(
    context(instance).save("reminders", "reminders", { ...prefs, time: "19:15" }, undefined, 2),
    /another device/,
  );
  await instance.settle();
  const save = fixture.calls.find((call) => call[0] === "save");
  assert.equal(save[5], 2);
  assert.equal(fixture.calls.filter((call) => call[0] === "save").length, 1);
  assert.equal(context(instance).state.records[0].revision, 5);
  assert.match(context(instance).error, /another device/);
  assert.equal(context(instance).busy, false);
  instance.unmount();
});
test("an older same-account refresh cannot replace the latest version", async () => {
  const older = deferred(),
    newer = deferred();
  // Set up two requests after the initial successful load.
  const gates = { alice: [] };
  const secondFixture = contextFixture({ stateGates: gates });
  const second = secondFixture.mount("alice");
  await second.settle();
  gates.alice.push(older, newer);
  const first = context(second).refresh(),
    last = context(second).refresh();
  newer.resolve(state("alice", 8));
  await last;
  await second.settle();
  older.resolve(state("alice", 7));
  await first;
  await second.settle();
  assert.equal(context(second).state.records[0].revision, 8);
  second.unmount();
});
test("reminder form preserves an edited draft and its old revision when a remote refresh conflicts", async () => {
  const runtime = hooks(),
    calls = [];
  let companion = {
    state: state("alice", 3),
    busy: false,
    loading: false,
    refresh: async () => {},
    save: async (...args) => {
      calls.push(args);
      throw new HttpError(409);
    },
  };
  const module = load("reminders-panel.tsx", {
    react: runtime.react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      View: "View",
      TextInput: "Input",
      Switch: "Switch",
      Linking: { openSettings: async () => {} },
    },
    "expo-router": { router: { push() {} } },
    "@/src/components/ui": { Txt: "Txt" },
    "@/src/components/motion": { MotionPressable: "Pressable" },
    "@/src/context/session": { useSession: () => ({ user: { id: "alice" } }) },
    "../billing/billing-context": { useBilling: () => ({ isPro: true }) },
    "../program-follow/program-context": { useProgram: () => ({ active: null }) },
    "../pro/ui": { GlassCard: "Card", ProButton: "Button", PRO: {} },
    "./api": { defaultReminders: () => ({ ...prefs }) },
    "./companion-context": { useCompanion: () => companion },
    "./reminder-model": { validReminderPreferences },
    "./reminders": { requestCompanionReminderPermission: async () => true },
    "./widget": {
      getCompanionNativeAvailability: () => ({
        widgets: "available",
        wearableControls: "notification-mirroring",
      }),
      requestCompanionWidgetPin: async () => true,
    },
    "./native-status": {
      useCompanionNativeStatus: () => ({ scheduled: 0, permission: "granted" }),
    },
  });
  const instance = runtime.mount(() => module.ReminderSettingsPanel());
  const input = () =>
    find(instance.tree, "Input").find(
      (node) => node.props.accessibilityLabel === "Reminder time · HH:mm",
    );
  input().props.onChangeText("19:15");
  instance.render();
  companion = {
    ...companion,
    state: {
      ...state("alice", 4),
      records: [{ ...state("alice", 4).records[0], data: { ...prefs, time: "20:00" } }],
    },
  };
  instance.render();
  assert.equal(input().props.value, "19:15");
  const button = find(instance.tree, "Button").find(
    (node) => node.props.title === "Save reminder preferences",
  );
  button.props.onPress();
  await instance.settle();
  assert.equal(calls[0][4], 3);
  assert.equal(calls.length, 1);
  assert.equal(input().props.value, "19:15");
  assert.ok(
    find(instance.tree, "Txt").some(
      (node) =>
        typeof node.props.children === "string" && node.props.children.includes("another device"),
    ),
  );
  find(instance.tree, "Button")
    .find((node) => node.props.title === "Reload saved preferences (replace draft)")
    .props.onPress();
  await instance.settle();
  assert.equal(input().props.value, "20:00");
  input().props.onChangeText("19:30");
  instance.render();
  find(instance.tree, "Button")
    .find((node) => node.props.title === "Save reminder preferences")
    .props.onPress();
  await instance.settle();
  assert.equal(calls[1][4], 4);
  instance.unmount();
});

function nativeBridgeFixture(gates = {}, options = {}) {
  const runtime = hooks(),
    calls = [],
    journalListeners = new Set();
  let owner = "alice";
  let responseListener;
  const empty = () => ({ events: [], workouts: [], workoutsUpdatedAt: new Date().toISOString() });
  const journals = { alice: empty(), bob: empty() };
  journals.alice.events = options.events ?? [];
  const companions = {
    alice: { state: state("alice"), loading: false },
    bob: { state: state("bob"), loading: false },
  };
  const workout = {
    dataRevision: 0,
    completedWorkout: null,
    session: null,
    loading: false,
    busy: false,
    restTimer: null,
    pendingSetIds: [],
    ...options.workout,
  };
  const module = load("native-bridge.tsx", {
    react: runtime.react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      Platform: { OS: "android" },
      AppState: { currentState: "active", addEventListener: () => ({ remove() {} }) },
    },
    "@react-native-async-storage/async-storage": {
      getItem: async () => null,
      removeItem: async (key) => calls.push(["remove-storage", key]),
    },
    "expo-notifications": {
      getLastNotificationResponseAsync: async () => null,
      addNotificationResponseReceivedListener: (callback) => {
        responseListener = callback;
        return {
          remove() {
            responseListener = null;
          },
        };
      },
      clearLastNotificationResponseAsync: async () => {},
    },
    "expo-router": { router: { push() {} } },
    "@/src/context/session": {
      useSession: () => ({ user: { id: owner }, profile: { trainingDays: 3 } }),
    },
    "../billing/billing-context": { useBilling: () => ({ isPro: true }) },
    "../workouts/workout-context": { useWorkout: () => workout },
    "../workouts/session-progress": { restAfterWorkoutSet },
    "../program-follow/program-context": { useProgram: () => ({ active: null, loading: false }) },
    "../coaching/api": {
      coachingForOwner: (id) => ({
        get: async () => {
          calls.push(["coaching", id]);
          if (gates[id]) return await gates[id].promise;
          return { plan: options.plan ?? null };
        },
      }),
    },
    "../coaching/updates": { subscribeCoachingChange: () => () => {} },
    "../progress/journal": {
      readJournal: async (id) => journals[id],
      subscribeJournal: (callback) => {
        journalListeners.add(callback);
        return () => journalListeners.delete(callback);
      },
      syncWorkouts: async (id, valid) => {
        calls.push(["history", id]);
        if (valid()) journalListeners.forEach((callback) => callback(id, journals[id]));
        return journals[id];
      },
    },
    "../progress/model": {
      emptyJournal: empty,
      currentGoals,
      addDays: (date, count) =>
        new Date(Date.parse(`${date}T12:00:00Z`) + count * 86400000).toISOString().slice(0, 10),
    },
    "./companion-context": { useCompanion: () => companions[owner] },
    "./api": { defaultReminders: () => ({ ...prefs }) },
    "./reminders": {
      clearCompanionReminders: async () => calls.push(["clear-reminders"]),
      reconcileCompanionReminders: async (input) => {
        calls.push(["reminders", input.ownerId]);
        return { permission: "granted", scheduled: 1, suppressedByQuietHours: 0 };
      },
      handleCompanionReminderResponse: async () => null,
    },
    "./reminder-model": { reminderDate },
    "./widget": {
      clearCompanionWidget: async () => calls.push(["clear-widget"]),
      publishCompanionWidget: async (snapshot) =>
        calls.push(["widget", snapshot.ownerId, snapshot]),
    },
    "./native-controls": {
      clearCompanionWorkoutControls: async () => {},
      publishCompanionWorkoutControls: async (snapshot) =>
        calls.push(["controls", snapshot?.nextSetId]),
      parseCompanionWorkoutControl: (_response, current) =>
        options.controlAction && current
          ? {
              action: options.controlAction,
              sessionId: current.sessionId,
              setId: current.nextSetId,
            }
          : null,
    },
    "./native-model": { workoutControlsSnapshot },
    "./native-status": {
      setCompanionNativeStatus: (value) => calls.push(["status", value.ownerId]),
    },
  });
  return {
    calls,
    workout,
    respond: (response) => responseListener?.(response),
    mount: (id) => {
      owner = id;
      const element = module.CompanionNativeBridge();
      return runtime.mount(() => element.type(element.props));
    },
  };
}
test("native bridge journal updates do not recursively refetch its own history or plan", async () => {
  const fixture = nativeBridgeFixture();
  const instance = fixture.mount("alice");
  await instance.settle();
  await instance.settle();
  assert.equal(fixture.calls.filter((call) => call[0] === "history").length, 1);
  assert.equal(fixture.calls.filter((call) => call[0] === "coaching").length, 1);
  assert.equal(
    fixture.calls.filter((call) => call[0] === "widget" && call[1] === "alice").length,
    1,
  );
  instance.unmount();
});

test("widget weekly target uses the shared journal goal even when the training plan has fewer days", async () => {
  const fixture = nativeBridgeFixture(
    {},
    {
      plan: { trainingDays: 3, sessions: [] },
      events: [
        {
          id: "weekly-goal",
          kind: "goals",
          observedAt: "2026-11-16T08:00:00Z",
          goals: { weeklyWorkouts: 5 },
        },
      ],
    },
  );
  const instance = fixture.mount("alice");
  await instance.settle();
  assert.equal(fixture.calls.find((call) => call[0] === "widget")[2].weeklyTarget, 5);
  instance.unmount();
});
test("native bridge drops an old account plan response before publishing any widget or reminder", async () => {
  const gate = deferred(),
    fixture = nativeBridgeFixture({ alice: gate });
  const alice = fixture.mount("alice");
  alice.unmount();
  const bob = fixture.mount("bob");
  await bob.settle();
  gate.resolve({ plan: null });
  await bob.settle();
  assert.equal(
    fixture.calls.filter((call) => ["widget", "reminders"].includes(call[0]) && call[1] === "alice")
      .length,
    0,
  );
  assert.equal(fixture.calls.filter((call) => call[0] === "widget" && call[1] === "bob").length, 1);
  bob.unmount();
});

test("native notification publisher follows focus changes from the shared workout context", async () => {
  const session = {
    id: "session",
    name: "Training",
    status: "active",
    workout_session_exercises: ["a", "b"].map((id, position) => ({
      id,
      position,
      exercise_name: id,
      tracking_type: "reps_weight",
      workout_logged_sets: [
        {
          id: `${id}-set`,
          position: 0,
          set_type: "normal",
          weight_kg: 20,
          reps: 8,
          completed_at: null,
        },
      ],
    })),
  };
  const fixture = nativeBridgeFixture({}, { workout: { session, focusedExerciseId: "b" } });
  const instance = fixture.mount("alice");
  await instance.settle();
  assert.equal(fixture.calls.filter((call) => call[0] === "controls").at(-1)[1], "b-set");
  fixture.workout.focusedExerciseId = "a";
  instance.render();
  await instance.settle();
  assert.equal(fixture.calls.filter((call) => call[0] === "controls").at(-1)[1], "a-set");
  instance.unmount();
});
test("watch set logging follows the phone superset order and starts rest only after the complete round", async () => {
  const actionCalls = [];
  const session = {
    id: "workout",
    status: "active",
    name: "Upper",
    workout_session_exercises: ["a", "b"].map((id, position) => ({
      id,
      position,
      superset_group: "A",
      rest_seconds: 90,
      exercise_name: id,
      tracking_type: "reps_weight",
      workout_logged_sets: [0, 1].map((round) => ({
        id: `${id}${round}`,
        position: round,
        set_type: "normal",
        weight_kg: 20,
        reps: 8,
        completed_at: null,
        rest_seconds: id === "b" && round === 0 ? 20 : null,
      })),
    })),
  };
  const fixture = nativeBridgeFixture(
    {},
    {
      controlAction: "complete-set",
      workout: {
        session,
        updateSet: async (id, patch) => {
          actionCalls.push(["set", id, patch.completed]);
          session.workout_session_exercises
            .flatMap((exercise) => exercise.workout_logged_sets)
            .find((set) => set.id === id).completed_at = "completed";
        },
        startRest: (seconds) => actionCalls.push(["rest", seconds]),
      },
    },
  );
  const instance = fixture.mount("alice");
  await instance.settle();
  const response = (date) => ({
    actionIdentifier: "complete",
    notification: {
      date,
      request: {
        identifier: "fitsync-companion-workout-controls",
        content: { data: { type: "companion-workout-controls" } },
      },
    },
  });
  fixture.respond(response(1));
  await instance.settle();
  assert.deepEqual(actionCalls, [["set", "a0", true]]);
  // The next set must be the paired exercise, not the next set of exercise A.
  instance.render();
  fixture.respond(response(2));
  await instance.settle();
  assert.deepEqual(actionCalls, [
    ["set", "a0", true],
    ["set", "b0", true],
    ["rest", 20],
  ]);
  instance.unmount();
});
