import test from "node:test";
import assert from "node:assert/strict";
import { accountPreferences } from "./helpers/account-preferences.mjs";

test("deletion waits for an active preference write and fences queued and future saves", async () => {
  const storage = new Map([
    ["fitsync.companion.paused-rest.v1.bob", "keep"],
    ["fitsync.experience.v1", "device preferences"],
  ]);
  let release, started;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const began = new Promise((resolve) => {
    started = resolve;
  });
  const api = accountPreferences({
    setItem: async (key, value) => {
      if (key.endsWith(".alice")) {
        started();
        await gate;
      }
      storage.set(key, value);
    },
    removeItem: async (key) => storage.delete(key),
    multiRemove: async (keys) => {
      for (const key of keys) storage.delete(key);
    },
  });
  const first = api.writeAccountPreference(
    "alice",
    "fitsync.companion.paused-rest.v1.alice",
    "private paused walk",
  );
  await began;
  const queued = api.writeAccountPreference(
    "alice",
    "fitsync.train-order.v1.alice",
    "private program IDs",
  );
  const deleting = api.deleteAccountPreferences("alice");
  release();
  await Promise.all([first, queued, deleting]);
  await api.writeAccountPreference("alice", "fitsync.upgrade-moments.v1.alice", "late workout ID");
  for (const key of storage.keys()) assert.equal(key.endsWith(".alice"), false);
  assert.equal(storage.get("fitsync.companion.paused-rest.v1.bob"), "keep");
  assert.equal(storage.get("fitsync.experience.v1"), "device preferences");
  await api.writeAccountPreference("bob", "fitsync.train-order.v1.bob", "new order");
  assert.equal(storage.get("fitsync.train-order.v1.bob"), "new order");
});

test("owner preferences cannot write or delete another owner's key or device preferences", async () => {
  let calls = 0;
  const api = accountPreferences({
    setItem: async () => {
      calls++;
    },
    removeItem: async () => {
      calls++;
    },
    multiRemove: async () => {
      calls++;
    },
  });
  await assert.rejects(
    api.writeAccountPreference("alice", "fitsync.train-order.v1.bob", "bad"),
    /does not belong/,
  );
  await assert.rejects(
    api.writeAccountPreference("alice", "fitsync.experience.v1", "bad"),
    /does not belong/,
  );
  await assert.rejects(api.deleteAccountPreferences(""), /No account/);
  assert.equal(calls, 0);
});
