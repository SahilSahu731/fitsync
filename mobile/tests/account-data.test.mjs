import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { accountPreferences } from "./helpers/account-preferences.mjs";

function fixture(fail = "") {
  const calls = [];
  const storage = new Map([
    ["fitsync.workout.rest.v2.alice", "private"],
    ["fitsync.companion.paused-rest.v1.alice", "private"],
    ["fitsync.upgrade-moments.v1.alice", "private"],
    ["fitsync.train-order.v1.alice", "private"],
    ["fitsync.workout.rest.v2.bob", "keep"],
    ["fitsync.experience.v1", "device preferences"],
  ]);
  const feature = (name) => async (owner) => {
    calls.push([name, owner]);
    if (name === fail) throw new Error("storage unavailable");
  };
  const modules = {
    "@react-native-async-storage/async-storage": {
      multiRemove: async (keys) => {
        calls.push(["remaining", ...keys]);
        for (const key of keys) storage.delete(key);
      },
    },
    "@/src/components/onboarding/use-onboarding-draft": {
      deleteOnboardingDraft: feature("onboarding"),
    },
    "@/src/features/health-sync/service": { deleteHealthSyncSettings: feature("health") },
    "@/src/features/nutrition/storage": { deleteFoodDiary: feature("food") },
    "@/src/features/progress/journal": { deleteProgressJournal: feature("progress") },
    "@/src/features/workouts/offline": { deleteWorkoutDraft: feature("workout") },
  };
  const exports = {};
  modules["./account-preferences"] = accountPreferences(
    modules["@react-native-async-storage/async-storage"],
  );
  const source = readFileSync(new URL("../src/services/account-data.ts", import.meta.url), "utf8");
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    {
      exports,
      require(name) {
        assert.ok(name in modules, name);
        return modules[name];
      },
    },
  );
  return { ...exports, calls, storage };
}

test("local account deletion clears only the selected owner and preserves device preferences", async () => {
  const f = fixture();
  await f.deleteAccountData("alice");
  assert.equal(f.calls.filter(([name]) => name !== "remaining").length, 5);
  for (const [name, owner] of f.calls) if (name !== "remaining") assert.equal(owner, "alice");
  assert.equal(f.storage.has("fitsync.workout.rest.v2.alice"), false);
  assert.equal(f.storage.has("fitsync.companion.paused-rest.v1.alice"), false);
  assert.equal(f.storage.has("fitsync.train-order.v1.alice"), false);
  assert.equal(f.storage.get("fitsync.workout.rest.v2.bob"), "keep");
  assert.equal(f.storage.get("fitsync.experience.v1"), "device preferences");
});

test("one failed feature cleanup cannot prevent deletion of the other feature data", async () => {
  const f = fixture("food");
  await assert.rejects(f.deleteAccountData("alice"), /account was deleted, but/);
  assert.equal(f.calls.length, 6);
  assert.equal(f.storage.has("fitsync.upgrade-moments.v1.alice"), false);
  assert.equal(f.storage.has("fitsync.workout.rest.v2.bob"), true);
});

test("an empty deletion owner cannot target another account or shared device data", async () => {
  const f = fixture();
  await assert.rejects(f.deleteAccountData(""), /No account/);
  assert.equal(f.calls.length, 0);
});
