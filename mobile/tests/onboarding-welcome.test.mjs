import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(name, deps) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync(new URL(`../src/components/onboarding/${name}`, import.meta.url), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          esModuleInterop: true,
          jsx: ts.JsxEmit.React,
        },
      },
    ).outputText,
    {
      exports,
      require: (key) => {
        assert.ok(key in deps, key);
        return deps[key];
      },
    },
  );
  return exports;
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("welcome is claimed once per account and remains dismissed across app restarts", async () => {
  const storage = new Map();
  const deps = {
    "@react-native-async-storage/async-storage": {
      getItem: async (key) => storage.get(key),
      setItem: async (key, value) => storage.set(key, value),
      removeItem: async (key) => storage.delete(key),
    },
  };
  const first = load("welcome-state.ts", deps);
  assert.equal(await first.claimOnboardingWelcome("alice"), false);
  await first.armOnboardingWelcome("alice");
  const claims = await Promise.all([
    first.claimOnboardingWelcome("alice"),
    first.claimOnboardingWelcome("alice"),
  ]);
  assert.deepEqual(claims, [true, true], "Strict Mode consumers share the same pending claim");
  assert.equal(storage.get(first.onboardingWelcomeKey("alice")), "seen");
  assert.equal(storage.get("fitsync.goals-welcome.v1.alice"), "seen");
  assert.equal(await first.claimOnboardingWelcome("alice"), false);
  assert.equal(await load("welcome-state.ts", deps).claimOnboardingWelcome("alice"), false);
  await first.armOnboardingWelcome("bob");
  assert.equal(await first.claimOnboardingWelcome("bob"), true);
  await first.armOnboardingWelcome("alice");
  assert.equal(await first.claimOnboardingWelcome("alice"), false);
  assert.equal(await first.claimOnboardingWelcome(""), false);
});

test("a storage failure keeps the introduction closed instead of repeatedly prompting", async () => {
  let reads = 0;
  const api = load("welcome-state.ts", {
    "@react-native-async-storage/async-storage": {
      getItem: async () => {
        reads++;
        throw Error("Storage unavailable");
      },
      setItem: async () => {},
    },
  });
  assert.equal(await api.claimOnboardingWelcome("alice"), false);
  assert.equal(await api.claimOnboardingWelcome("alice"), false);
  assert.equal(reads, 1);
});

function fixture() {
  const slots = [];
  const routes = [];
  let cursor = 0,
    closes = 0,
    starts = 0;
  const react = {
    createElement(type, props, ...children) {
      return typeof type === "function"
        ? type({ ...props, children })
        : { type, props: props ?? {}, children };
    },
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [
        slots[index],
        (value) => {
          slots[index] = value;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      slots[index] ??= { current: initial };
      return slots[index];
    },
  };
  const workout = {
    loading: false,
    busy: false,
    pendingCompletion: null,
    session: null,
    start: async () => {
      starts++;
    },
  };
  const module = load("welcome-popup.tsx", {
    react,
    "react-native": { ActivityIndicator: "Loading", View: "View" },
    "expo-router": { useRouter: () => ({ push: (route) => routes.push(route) }) },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/components/motion": { MotionPressable: "Button" },
    "@/src/components/ui": { Txt: "Text" },
    "@/src/features/workouts/workout-context": { useWorkout: () => workout },
    "./popup": {
      OnboardingPopup: (props) => ({
        type: "Popup",
        props,
        children: [props.children, props.footer],
      }),
    },
    "./daily-goals-popup": { DailyGoalsPopup: (props) => ({ type: "GoalsPopup", props }) },
  });
  function nodes(node) {
    return Array.isArray(node)
      ? node.flatMap(nodes)
      : node && typeof node === "object"
        ? [node, ...nodes(node.children)]
        : [];
  }
  function render() {
    cursor = 0;
    return nodes(
      module.WelcomePopup({
        onClose: () => {
          closes++;
        },
      }),
    );
  }
  return {
    render,
    control: (label) => render().find((n) => n.props.accessibilityLabel === label),
    routes,
    workout,
    get starts() {
      return starts;
    },
    get closes() {
      return closes;
    },
  };
}

test("welcome actions put goals first, Pro second and workout third", () => {
  const goals = fixture();
  goals.control("Set your goals").props.onPress();
  assert.equal(goals.render()[0].type, "GoalsPopup");
  goals.render()[0].props.onClose();
  assert.equal(goals.closes, 1);
  const ui = fixture();
  const actions = ui
    .render()
    .filter((n) => n.props.accessibilityLabel)
    .map((n) => n.props.accessibilityLabel);
  assert.deepEqual(actions, ["Set your goals", "Explore Pro", "Start your first workout"]);
  ui.control("Explore Pro").props.onPress();
  assert.deepEqual(ui.routes, ["/(tabs)/pro"]);
  assert.equal(ui.closes, 1);
});

test("start workout opens a real session once, and failures keep the popup available", async () => {
  const ui = fixture();
  const start = ui.control("Start your first workout").props.onPress;
  start();
  start();
  await tick();
  assert.equal(ui.starts, 1);
  assert.deepEqual(ui.routes, ["/workout"]);
  const failed = fixture();
  failed.workout.start = async () => {
    throw Error("Please reconnect");
  };
  failed.control("Start your first workout").props.onPress();
  await tick();
  assert.equal(failed.routes.length, 0);
  assert.ok(failed.render().some((node) => node.props.accessibilityRole === "alert"));
});

function delayedHomeFixture() {
  const slots = [];
  const timers = new Map();
  const listeners = new Set();
  let cursor = 0,
    clock = 0,
    sequence = 0,
    effect,
    cleanup;
  let props = { ownerId: "alice", blocked: false };
  const claims = [];
  let valid = true;
  const appState = {
    currentState: "active",
    addEventListener: (_event, listener) => {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
  };
  const deps = {
    react: {
      createElement: (type, props) => ({ type, props }),
      useCallback: (fn) => fn,
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [
          slots[index],
          (value) => {
            slots[index] = value;
          },
        ];
      },
    },
    "react-native": { AppState: appState },
    "expo-router": {
      useFocusEffect: (callback) => {
        effect = callback;
      },
    },
    "./welcome-state": {
      claimOnboardingWelcome: async (id, current) => {
        claims.push(id);
        await tick();
        return valid && current();
      },
    },
    "./welcome-popup": { WelcomePopup: "WelcomePopup" },
  };
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync(
        new URL("../src/components/onboarding/home-welcome.tsx", import.meta.url),
        "utf8",
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          esModuleInterop: true,
          jsx: ts.JsxEmit.React,
        },
      },
    ).outputText,
    {
      exports,
      require: (name) => deps[name],
      setTimeout: (fn, delay) => {
        timers.set(++sequence, { at: clock + delay, fn });
        return sequence;
      },
      clearTimeout: (id) => timers.delete(id),
    },
  );
  function render() {
    cursor = 0;
    return exports.HomeOnboardingWelcome(props);
  }
  render();
  return {
    render,
    claims,
    focus() {
      cleanup = effect();
    },
    blur() {
      cleanup?.();
    },
    block() {
      cleanup?.();
      props = { ...props, blocked: true };
      render();
      cleanup = effect();
    },
    changeOwner(ownerId) {
      cleanup?.();
      props = { ...props, ownerId };
      render();
      cleanup = effect();
    },
    foreground(state) {
      appState.currentState = state;
      for (const listener of listeners) listener(state);
    },
    async advance(ms) {
      clock += ms;
      for (const [id, timer] of timers)
        if (timer.at <= clock) {
          timers.delete(id);
          timer.fn();
        }
      await tick();
      await tick();
    },
    invalidate() {
      valid = false;
    },
  };
}

test("Home waits seven seconds before opening the welcome", async () => {
  const ui = delayedHomeFixture();
  ui.focus();
  await ui.advance(6999);
  assert.equal(ui.render(), null);
  assert.equal(ui.claims.length, 0);
  await ui.advance(1);
  assert.equal(ui.render().type, "WelcomePopup");
  assert.deepEqual(ui.claims, ["alice"]);
});

test("leaving Home, opening another dialog and switching accounts cancel old countdowns", async () => {
  for (const cancel of ["blur", "block", "changeOwner"]) {
    const ui = delayedHomeFixture();
    ui.focus();
    await ui.advance(3000);
    ui[cancel]("bob");
    await ui.advance(4000);
    assert.equal(ui.render(), null);
    assert.equal(ui.claims.length, 0);
  }
});

test("backgrounding restarts the seven-second delay after returning", async () => {
  const ui = delayedHomeFixture();
  ui.focus();
  await ui.advance(6000);
  ui.foreground("background");
  await ui.advance(20000);
  assert.equal(ui.claims.length, 0);
  ui.foreground("active");
  await ui.advance(6999);
  assert.equal(ui.claims.length, 0);
  await ui.advance(1);
  assert.equal(ui.render().type, "WelcomePopup");
});

test("completion celebrates first and only arms the welcome after Enter FitSync now", async () => {
  const builder = new Proxy({}, { get: () => () => builder });
  const calls = [];
  const refs = [];
  let cursor = 0;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    useState: (initial) => [initial, () => {}],
    useRef(initial) {
      const index = cursor++;
      refs[index] ??= { current: initial };
      return refs[index];
    },
  };
  const module = load("completion-screen.tsx", {
    react,
    "react-native": { ScrollView: "ScrollView", View: "View" },
    "react-native-reanimated": {
      __esModule: true,
      default: { View: "AnimatedView" },
      FadeInDown: builder,
      ZoomIn: builder,
      ReduceMotion: { System: "system" },
    },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "@/src/components/ui": { PrimaryButton: "PrimaryButton", Txt: "Text" },
    "@/src/context/session": { useSession: () => ({ user: { id: "alice" } }) },
    "./completion-illustration": { CompletionIllustration: "CompletionIllustration" },
    "./welcome-state": {
      armOnboardingWelcome: async (id) => {
        calls.push(["arm", id]);
      },
    },
  });
  function nodes(node) {
    return Array.isArray(node)
      ? node.flatMap(nodes)
      : node && typeof node === "object"
        ? [node, ...nodes(node.children)]
        : [];
  }
  cursor = 0;
  const tree = nodes(
    module.CompletionScreen({
      draft: { trainingDays: 4, minutesPerWorkout: 45 },
      onContinue: () => calls.push(["home"]),
    }),
  );
  assert.equal(calls.length, 0);
  assert.ok(tree.some((node) => node.type === "CompletionIllustration"));
  assert.equal(
    tree.some((node) => node.type === "WelcomePopup"),
    false,
  );
  const button = tree.find((node) => node.props.title === "Enter FitSync now");
  assert.ok(button);
  button.props.onPress();
  button.props.onPress();
  await tick();
  assert.deepEqual(calls, [["arm", "alice"], ["home"]]);
});

test("a pending introduction survives restart, while legacy shown accounts stay dismissed", async () => {
  const storage = new Map();
  const deps = {
    "@react-native-async-storage/async-storage": {
      getItem: async (key) => storage.get(key),
      setItem: async (key, value) => storage.set(key, value),
      removeItem: async (key) => storage.delete(key),
    },
  };
  await load("welcome-state.ts", deps).armOnboardingWelcome("new-user");
  assert.equal(await load("welcome-state.ts", deps).claimOnboardingWelcome("new-user"), true);
  storage.set("fitsync.onboarding-welcome.v1.existing-user", "seen");
  const existing = load("welcome-state.ts", deps);
  await existing.armOnboardingWelcome("existing-user");
  assert.equal(await existing.claimOnboardingWelcome("existing-user"), false);
});

test("a delayed claim cannot consume the introduction after Home becomes ineligible", async () => {
  const storage = new Map();
  const api = load("welcome-state.ts", {
    "@react-native-async-storage/async-storage": {
      getItem: async (key) => storage.get(key),
      setItem: async (key, value) => storage.set(key, value),
      removeItem: async (key) => storage.delete(key),
    },
  });
  await api.armOnboardingWelcome("alice");
  let focused = true;
  const pending = api.claimOnboardingWelcome("alice", () => focused);
  focused = false;
  assert.equal(await pending, false);
  assert.equal(storage.has(api.onboardingWelcomeKey("alice")), false);
  assert.equal(await api.claimOnboardingWelcome("alice"), true);
});
