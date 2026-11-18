import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as model from "../src/features/nutrition/model.ts";

const tick = () => new Promise((resolve) => setImmediate(resolve));
const diary = (name) => ({ version: 1, entries: [{ id: name, name }], library: [] });

function fixture() {
  let ownerId = "alice";
  let cursor = 0;
  let mounted = true;
  const slots = [];
  const queue = [];
  const reads = [];
  const subscribers = new Set();
  let writes = 0;
  const depsEqual = (left, right) =>
    !!left && left.length === right.length && left.every((value, index) => value === right[index]);
  const useEffect = (callback, deps, layout = false) => {
    const index = cursor++;
    const previous = slots[index];
    if (depsEqual(previous?.deps, deps)) return;
    queue.push({ index, callback, deps, layout });
  };
  const react = {
    useRef(value) {
      const index = cursor++;
      return (slots[index] ??= { current: value });
    },
    useState(value) {
      const index = cursor++;
      slots[index] ??= { value: typeof value === "function" ? value() : value };
      return [
        slots[index].value,
        (next) => {
          assert.ok(mounted, "a late result must not update an unmounted hook");
          slots[index].value = typeof next === "function" ? next(slots[index].value) : next;
        },
      ];
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!depsEqual(slots[index]?.deps, deps)) slots[index] = { callback, deps };
      return slots[index].callback;
    },
    useEffect,
    useLayoutEffect: (callback, deps) => useEffect(callback, deps, true),
  };
  const storage = {
    readFoodDiary: (owner) =>
      new Promise((resolve, reject) => {
        reads.push({ owner, resolve, reject });
      }),
    subscribeFoodDiary: (listener) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    updateFoodDiary: async (_owner, update) => {
      writes++;
      return update(model.emptyDiary());
    },
  };
  const source = readFileSync(
    new URL("../src/features/nutrition/use-food-diary.ts", import.meta.url),
    "utf8",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const exports = {};
  const modules = {
    react,
    "expo-router": { useFocusEffect: (callback) => useEffect(callback, [callback]) },
    "@/src/context/session": { useSession: () => ({ user: ownerId ? { id: ownerId } : null }) },
    "./model": model,
    "./storage": storage,
  };
  vm.runInNewContext(js, { exports, Map, Set, Promise, Error, require: (name) => modules[name] });
  return {
    reads,
    writes: () => writes,
    account: (owner) => {
      ownerId = owner;
    },
    publish: (owner, value) => {
      for (const callback of subscribers) callback(owner, value);
    },
    render: () => {
      cursor = 0;
      const value = exports.useFoodDiary();
      queue.sort((a, b) => Number(b.layout) - Number(a.layout));
      for (const effect of queue.splice(0)) {
        slots[effect.index]?.cleanup?.();
        slots[effect.index] = { deps: effect.deps, cleanup: effect.callback() };
      }
      return value;
    },
    unmount: () => {
      for (const slot of slots) slot?.cleanup?.();
      mounted = false;
    },
  };
}

test("a new account sees an empty masked diary immediately and stale reads cannot replace its data", async () => {
  const f = fixture();
  const first = f.render();
  assert.equal(first.loading, true);
  f.reads.shift().resolve(diary("Alice food"));
  await tick();
  const alice = f.render();
  assert.equal(alice.diary.entries[0].name, "Alice food");
  const late = alice.refresh();
  const stale = f.reads.shift();
  f.account("bob");
  const bob = f.render();
  assert.equal(bob.diary.entries.length, 0);
  assert.equal(bob.error, "");
  assert.equal(bob.loading, true);
  stale.resolve(diary("Old Alice refresh"));
  f.reads.shift().resolve(diary("Bob food"));
  await late;
  await tick();
  assert.equal(f.render().diary.entries[0].name, "Bob food");
  await assert.rejects(alice.removeEntry("old"), /account changed/);
  assert.equal(f.writes(), 0);
});

test("committed subscriptions invalidate an earlier read and other accounts are ignored", async () => {
  const f = fixture();
  f.render();
  const stale = f.reads.shift();
  f.publish("bob", diary("Bob food"));
  assert.equal(f.render().diary.entries.length, 0);
  f.publish("alice", diary("Committed food"));
  stale.resolve(diary("Older food"));
  await tick();
  const value = f.render();
  assert.equal(value.diary.entries[0].name, "Committed food");
  assert.equal(value.loading, false);
});

test("a late read does not update an unmounted diary", async () => {
  const f = fixture();
  f.render();
  f.unmount();
  f.reads.shift().resolve(diary("Late food"));
  await tick();
});
