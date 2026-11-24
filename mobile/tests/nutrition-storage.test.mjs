import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as model from "../src/features/nutrition/model.ts";

const entry = (id = "oats") => ({
  id,
  date: "2020-01-01",
  meal: "breakfast",
  name: "Oats",
  quantity: 50,
  unit: "g",
  basisAmount: 100,
  nutrition: { calories: 380, protein: 13, carbs: 68, fat: 7, fiber: 10, sugar: 1, sodium: 2 },
  status: "eaten",
  time: "08:30",
  remind: false,
  note: "",
});

function setup(storage = new Map(), overrides = {}) {
  const exports = {};
  const source = readFileSync(
    new URL("../src/features/nutrition/storage.ts", import.meta.url),
    "utf8",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const asyncStorage = {
    getItem: async (key) => storage.get(key) ?? null,
    setItem: async (key, value) => {
      storage.set(key, value);
    },
    removeItem: async (key) => storage.delete(key),
    ...overrides,
  };
  vm.runInNewContext(js, {
    exports,
    Date,
    Map,
    Set,
    Promise,
    require: (name) => {
      if (name === "./model") return model;
      if (name === "@react-native-async-storage/async-storage") return asyncStorage;
      throw new Error(name);
    },
  });
  return { api: exports, storage };
}

test("food diary and reusable food labels survive reload and are isolated by account", async () => {
  const { api, storage } = setup();
  await api.updateFoodDiary("alice", (diary) => model.storeFoodEntry(diary, entry()));
  const reloaded = setup(storage).api;
  const saved = await reloaded.readFoodDiary("alice");
  assert.equal(saved.entries[0].name, "Oats");
  assert.equal(saved.library.length, 1);
  assert.equal((await reloaded.readFoodDiary("bob")).entries.length, 0);
  await reloaded.updateFoodDiary("alice", (diary) =>
    model.storeFoodEntry(diary, { ...entry("lunch"), meal: "lunch", quantity: 70 }),
  );
  assert.equal((await reloaded.readFoodDiary("alice")).library.length, 1);
  await assert.rejects(api.readFoodDiary(""), /Sign in/);
});

test("concurrent saves serialize per account without blocking a different account", async () => {
  let release;
  let writing;
  const waiting = new Promise((resolve) => {
    release = resolve;
  });
  const began = new Promise((resolve) => {
    writing = resolve;
  });
  const storage = new Map();
  let paused = false;
  const { api } = setup(storage, {
    setItem: async (key, value) => {
      if (key.endsWith(".alice") && !paused) {
        paused = true;
        writing();
        await waiting;
      }
      storage.set(key, value);
    },
  });
  const first = api.updateFoodDiary("alice", (diary) =>
    model.storeFoodEntry(diary, entry("first")),
  );
  await began;
  const second = api.updateFoodDiary("alice", (diary) =>
    model.storeFoodEntry(diary, entry("second")),
  );
  await api.updateFoodDiary("bob", (diary) => model.storeFoodEntry(diary, entry("bob")));
  assert.equal((await api.readFoodDiary("bob")).entries[0].id, "bob");
  release();
  await Promise.all([first, second]);
  assert.deepEqual(
    Array.from((await api.readFoodDiary("alice")).entries, (value) => value.id),
    ["first", "second"],
  );
});

test("a failed durable write keeps the old diary, sends no change and can retry", async () => {
  const storage = new Map();
  let fail = false;
  const { api } = setup(storage, {
    setItem: async (key, value) => {
      if (fail) throw new Error("disk full");
      storage.set(key, value);
    },
  });
  const changes = [];
  const unsubscribe = api.subscribeFoodDiary((owner, diary) =>
    changes.push([owner, diary.entries.length]),
  );
  await api.updateFoodDiary("alice", (diary) => model.storeFoodEntry(diary, entry("first")));
  fail = true;
  await assert.rejects(
    api.updateFoodDiary("alice", (diary) => model.storeFoodEntry(diary, entry("second"))),
    /not saved/,
  );
  assert.equal((await api.readFoodDiary("alice")).entries.length, 1);
  assert.equal(changes.length, 1);
  fail = false;
  await api.updateFoodDiary("alice", (diary) => model.storeFoodEntry(diary, entry("second")));
  assert.equal((await api.readFoodDiary("alice")).entries.length, 2);
  assert.equal(changes.length, 2);
  unsubscribe();
});

test("malformed persisted data remains intact and cannot be overwritten by an empty diary", async () => {
  for (const raw of [
    "broken",
    "",
    '{"version":99}',
    JSON.stringify({ version: 1, entries: [{ ...entry(), quantity: -1 }], library: [] }),
  ]) {
    const { api, storage } = setup(new Map([["fitsync.nutrition.v1.alice", raw]]));
    await assert.rejects(api.readFoodDiary("alice"), /kept on this device/);
    await assert.rejects(
      api.updateFoodDiary("alice", () => model.emptyDiary()),
      /kept on this device/,
    );
    assert.equal(storage.get("fitsync.nutrition.v1.alice"), raw);
  }
});

test("read failures never fall back to a fresh diary during a save", async () => {
  let writes = 0;
  const { api } = setup(new Map(), {
    getItem: async () => {
      throw new Error("unavailable");
    },
    setItem: async () => {
      writes++;
    },
  });
  await assert.rejects(
    api.updateFoodDiary("alice", (diary) => model.storeFoodEntry(diary, entry())),
    /Could not open/,
  );
  assert.equal(writes, 0);
});

test("listener errors do not fail a durable save or hide it from other subscribers", async () => {
  const { api } = setup();
  api.subscribeFoodDiary(() => {
    throw new Error("unmounted view");
  });
  let received = "";
  api.subscribeFoodDiary((owner) => {
    received = owner;
  });
  await api.updateFoodDiary("alice", (diary) => model.storeFoodEntry(diary, entry()));
  assert.equal(received, "alice");
  assert.equal((await api.readFoodDiary("alice")).entries.length, 1);
});

test("account deletion drains in-flight food saves and prevents stale saves from recreating data", async () => {
  let release, started;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const began = new Promise((resolve) => {
    started = resolve;
  });
  const storage = new Map();
  const { api } = setup(storage, {
    setItem: async (key, value) => {
      if (key.endsWith(".alice")) {
        started();
        await gate;
      }
      storage.set(key, value);
    },
  });
  await api.updateFoodDiary("bob", (diary) => model.storeFoodEntry(diary, entry("bob")));
  const saving = api.updateFoodDiary("alice", (diary) => model.storeFoodEntry(diary, entry()));
  const saved = saving.catch((error) => error);
  await began;
  const deleting = api.deleteFoodDiary("alice");
  await assert.rejects(
    api.updateFoodDiary("alice", (diary) => model.storeFoodEntry(diary, entry("late"))),
    /deleted/,
  );
  release();
  assert.match((await saved).message, /deleted/);
  await deleting;
  assert.equal(storage.has("fitsync.nutrition.v1.alice"), false);
  assert.equal((await api.readFoodDiary("alice")).entries.length, 0);
  assert.equal((await api.readFoodDiary("bob")).entries[0].id, "bob");
});
