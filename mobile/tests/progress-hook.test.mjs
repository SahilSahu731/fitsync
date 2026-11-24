import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as model from "../src/features/progress/model.ts";

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function fixture() {
  const slots = [];
  const effects = [];
  const calls = [];
  let cursor = 0;
  let ownerId = "alice";
  let cloud;
  const reads = new Map();
  const journals = new Map();
  const journal = (id) => {
    if (!journals.has(id)) journals.set(id, model.emptyJournal());
    return journals.get(id);
  };
  const save = async (id) => {
    calls.push(["save", id]);
    const value = { ...journal(id), pending: ["saved"] };
    journals.set(id, value);
    return value;
  };
  const deps = {
    react: {
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
      useCallback: (callback) => callback,
      useMemo: (callback) => callback(),
      useEffect(callback, dependencies) {
        const i = cursor++;
        const previous = slots[i];
        if (
          !previous ||
          dependencies.some((value, index) => value !== previous.dependencies[index])
        ) {
          effects.push(() => {
            previous?.cleanup?.();
            slots[i] = { dependencies, cleanup: callback() };
          });
        }
      },
    },
    "expo-router": { useFocusEffect() {} },
    "@/src/context/session": { useSession: () => ({ user: { id: ownerId }, profile: null }) },
    "./model": model,
    "./journal": {
      readJournal: async (id) => {
        calls.push(["read", id]);
        await reads.get(id);
        return journal(id);
      },
      subscribeJournal: () => () => {},
      saveMetric: save,
      saveGoalsEvent: save,
      syncJournal: async (id) => {
        calls.push(["events", id]);
        await cloud;
        return journal(id);
      },
      syncWorkouts: async (id) => {
        calls.push(["workouts", id]);
        return journal(id);
      },
    },
  };
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL("../src/features/progress/use-progress.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    require(name) {
      assert.ok(name in deps, name);
      return deps[name];
    },
  });
  return {
    calls,
    reads,
    set owner(value) {
      ownerId = value;
    },
    set cloud(value) {
      cloud = value;
    },
    render() {
      cursor = 0;
      const hook = exports.useProgress();
      effects.splice(0).forEach((run) => run());
      return hook;
    },
  };
}

test("a local metric save returns while cloud sync is pending and leaves workout history alone", async () => {
  const ui = fixture();
  await ui.render().refresh();
  const hook = ui.render();
  assert.equal(hook.loading, false);
  const cloud = deferred();
  ui.cloud = cloud.promise;
  ui.calls.length = 0;
  await hook.increment("water", "2026-11-24", 250, "");
  assert.deepEqual(ui.calls, [
    ["save", "alice"],
    ["events", "alice"],
  ]);
  assert.deepEqual(ui.render().journal.pending, ["saved"]);
  cloud.resolve();
});

test("switching accounts starts the new journal without waiting for the previous account", async () => {
  const ui = fixture();
  const oldRead = deferred();
  ui.reads.set("alice", oldRead.promise);
  const oldRefresh = ui.render().refresh();
  ui.owner = "bob";
  const newRefresh = ui.render().refresh();
  assert.deepEqual(ui.calls, [
    ["read", "alice"],
    ["read", "bob"],
  ]);
  await newRefresh;
  assert.equal(ui.render().loading, false);
  oldRead.resolve();
  await oldRefresh;
  assert.equal(
    ui.calls.some(([kind, id]) => kind === "events" && id === "alice"),
    false,
  );
});
