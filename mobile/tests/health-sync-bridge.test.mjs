import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

function fixture({ enabled = false, state = "active" } = {}) {
  const slots = [];
  const layoutEffects = [];
  const effects = [];
  const intervals = new Map();
  const appListeners = new Set();
  const settingsListeners = new Set();
  const settings = new Map();
  const pendingReads = new Map();
  const reads = [];
  const imports = [];
  let cursor = 0;
  let owner = "alice";
  let now = Date.parse("2026-11-24T10:00:00Z");
  let nextInterval = 0;
  const preference = (id) => {
    if (!settings.has(id)) settings.set(id, { version: 1, enabled, lastImportedAt: null });
    return settings.get(id);
  };
  const registerEffect = (queue) => (callback, dependencies) => {
    const i = cursor++;
    const previous = slots[i];
    if (!previous || dependencies.some((value, index) => value !== previous.dependencies[index]))
      queue.push(() => {
        previous?.cleanup?.();
        slots[i] = { dependencies, cleanup: callback() };
      });
  };
  const appState = {
    currentState: state,
    addEventListener(type, callback) {
      assert.equal(type, "change");
      appListeners.add(callback);
      return { remove: () => appListeners.delete(callback) };
    },
  };
  const dependencies = {
    react: {
      useRef(initial) {
        return (slots[cursor++] ??= { current: initial });
      },
      useLayoutEffect: registerEffect(layoutEffects),
      useEffect: registerEffect(effects),
    },
    "react-native": { AppState: appState },
    "@/src/context/session": { useSession: () => ({ user: owner ? { id: owner } : null }) },
    "./native": {
      getHealthAdapter() {
        throw Error("The bridge must use the service without invoking native APIs");
      },
    },
    "./types": {},
    "./service": {
      async readHealthSyncSettings(id) {
        reads.push(id);
        await pendingReads.get(id);
        return { ...preference(id) };
      },
      async importHealthForUser(id, isCurrent, requestAccess, metrics) {
        assert.equal(isCurrent(), true);
        imports.push({ id, isCurrent, requestAccess, metrics });
        settings.set(id, { ...preference(id), lastImportedAt: new Date(now).toISOString() });
      },
      subscribeHealthSync(callback) {
        settingsListeners.add(callback);
        return () => settingsListeners.delete(callback);
      },
    },
  };
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(
      new URL("../src/features/health-sync/use-health-sync.tsx", import.meta.url),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    Date: class extends Date {
      constructor(...args) {
        super(...(args.length ? args : [now]));
      }
      static now() {
        return now;
      }
    },
    setInterval(callback, duration) {
      assert.equal(duration, 60_000);
      const id = ++nextInterval;
      intervals.set(id, callback);
      return id;
    },
    clearInterval: (id) => intervals.delete(id),
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return {
    reads,
    imports,
    pendingReads,
    settings,
    get intervalCount() {
      return intervals.size;
    },
    get listenerCount() {
      return appListeners.size + settingsListeners.size;
    },
    set owner(id) {
      owner = id;
    },
    render() {
      cursor = 0;
      assert.equal(exports.HealthSyncBridge(), null);
      layoutEffects.splice(0).forEach((run) => run());
      effects.splice(0).forEach((run) => run());
    },
    advance(milliseconds) {
      now += milliseconds;
    },
    tick() {
      [...intervals.values()].forEach((callback) => callback());
    },
    appState(state) {
      appState.currentState = state;
      [...appListeners].forEach((callback) => callback(state));
    },
    notify(id = owner) {
      [...settingsListeners].forEach((callback) => callback(id));
    },
    unmount() {
      slots.forEach((slot) => slot?.cleanup?.());
    },
  };
}

test("the bridge never requests access or imports data before account opt-in", async () => {
  const anonymous = fixture();
  anonymous.owner = "";
  anonymous.render();
  await flush();
  assert.equal(anonymous.reads.length, 0);
  assert.equal(anonymous.imports.length, 0);
  assert.equal(anonymous.intervalCount, 0);
  anonymous.unmount();
  const ui = fixture();
  ui.render();
  await flush();
  ui.advance(60_000);
  ui.tick();
  ui.appState("background");
  ui.appState("active");
  await flush();
  assert.equal(ui.imports.length, 0);
  ui.settings.set("alice", { version: 1, enabled: true, lastImportedAt: null, metrics: ["steps"] });
  const reads = ui.reads.length;
  ui.notify("bob");
  await flush();
  assert.equal(ui.reads.length, reads);
  ui.notify("alice");
  await flush();
  assert.equal(ui.imports.length, 1);
  assert.equal(ui.imports[0].id, "alice");
  assert.equal(ui.imports[0].requestAccess, undefined);
  assert.equal(ui.imports[0].metrics, undefined);
  ui.unmount();
});

test("launch, foreground and active minute polls respect the sixty-second import interval", async () => {
  const ui = fixture({ enabled: true });
  ui.render();
  await flush();
  assert.equal(ui.imports.length, 1);
  ui.advance(59_999);
  ui.tick();
  ui.appState("active");
  await flush();
  assert.equal(ui.imports.length, 1);
  ui.advance(1);
  ui.tick();
  await flush();
  assert.equal(ui.imports.length, 2);
  ui.appState("background");
  ui.advance(60_000);
  const reads = ui.reads.length;
  ui.tick();
  await flush();
  assert.equal(ui.reads.length, reads);
  assert.equal(ui.imports.length, 2);
  ui.appState("active");
  await flush();
  assert.equal(ui.imports.length, 3);
  assert.ok(ui.imports.every((call) => call.requestAccess === undefined));
  ui.unmount();
  assert.equal(ui.intervalCount, 0);
  assert.equal(ui.listenerCount, 0);
});

test("launch and settings changes wait until foreground before importing device data", async () => {
  const ui = fixture({ enabled: true, state: "background" });
  ui.render();
  await flush();
  assert.equal(ui.imports.length, 0);
  ui.advance(60_000);
  ui.tick();
  ui.notify();
  await flush();
  assert.equal(ui.imports.length, 0);
  ui.appState("active");
  await flush();
  assert.equal(ui.imports.length, 1);
  ui.appState("background");
  ui.advance(60_000);
  ui.notify();
  await flush();
  assert.equal(ui.imports.length, 1);
  ui.appState("active");
  await flush();
  assert.equal(ui.imports.length, 2);
  ui.unmount();

  const suspended = fixture({ enabled: true });
  const held = deferred();
  suspended.pendingReads.set("alice", held.promise);
  suspended.render();
  suspended.appState("background");
  held.resolve();
  await flush();
  assert.equal(suspended.imports.length, 0);
  suspended.appState("active");
  await flush();
  assert.equal(suspended.imports.length, 1);
  suspended.unmount();
});

test("late preference reads cannot start imports after unmount or an account switch", async () => {
  const unmounted = fixture({ enabled: true });
  const heldUnmount = deferred();
  unmounted.pendingReads.set("alice", heldUnmount.promise);
  unmounted.render();
  unmounted.unmount();
  heldUnmount.resolve();
  await flush();
  assert.equal(unmounted.imports.length, 0);
  assert.equal(unmounted.intervalCount, 0);
  assert.equal(unmounted.listenerCount, 0);

  const switched = fixture({ enabled: true });
  const heldAlice = deferred();
  switched.pendingReads.set("alice", heldAlice.promise);
  switched.render();
  switched.owner = "bob";
  switched.render();
  await flush();
  assert.deepEqual(
    switched.imports.map((call) => call.id),
    ["bob"],
  );
  heldAlice.resolve();
  await flush();
  assert.deepEqual(
    switched.imports.map((call) => call.id),
    ["bob"],
  );
  assert.equal(switched.intervalCount, 1);
  assert.equal(switched.listenerCount, 2);
  switched.unmount();
  assert.equal(switched.imports[0].isCurrent(), false);
  assert.equal(switched.intervalCount, 0);
  assert.equal(switched.listenerCount, 0);
});
