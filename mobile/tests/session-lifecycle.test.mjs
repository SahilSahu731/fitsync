import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const tick = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function account(id = "alice") {
  return {
    user: {
      id,
      name: id,
      email: `${id}@example.com`,
      bio: "",
      avatarUrl: null,
      hasCustomAvatar: false,
      createdAt: "2026-11-01T12:00:00Z",
    },
    profile: {
      goal: "strength",
      experience: "beginner",
      gender: "prefer_not_to_say",
      heightCm: 175,
      weightKg: 70,
      bodyType: null,
      trainingDays: 3,
      minutesPerWorkout: 45,
      equipment: "gym",
      completedAt: "2026-11-01T12:00:00Z",
    },
    settings: { weightUnit: "kg", restSeconds: 90, workoutReminders: false },
  };
}
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function fixture(options = {}) {
  const slots = [],
    effects = [],
    errors = [],
    persisted = [],
    requests = [];
  const deletedData = [];
  let cursor = 0;
  let stored = true;
  let googleSignOuts = 0;
  const restoring = deferred();
  const same = (left, right) =>
    left && left.length === right.length && left.every((value, index) => value === right[index]);
  const react = {
    createContext: () => ({ Provider: "SessionProvider" }),
    useRef(value) {
      const index = cursor++;
      return (slots[index] ??= { current: value });
    },
    useState(initial) {
      const index = cursor++;
      slots[index] ??= { value: typeof initial === "function" ? initial() : initial };
      return [
        slots[index].value,
        (value) => {
          slots[index].value = typeof value === "function" ? value(slots[index].value) : value;
        },
      ];
    },
    useCallback(fn, deps) {
      const index = cursor++;
      if (!same(slots[index]?.deps, deps)) slots[index] = { value: fn, deps };
      return slots[index].value;
    },
    useMemo(fn, deps) {
      const index = cursor++;
      if (!same(slots[index]?.deps, deps)) slots[index] = { value: fn(), deps };
      return slots[index].value;
    },
    useEffect(fn, deps) {
      const index = cursor++;
      if (!same(slots[index]?.deps, deps)) effects.push({ fn, deps, index });
    },
  };
  const api = {
    HttpError,
    readSessionSnapshot: async () =>
      options.snapshot === undefined ? account() : options.snapshot,
    cacheSessionSnapshot: async (data) => {
      if (options.cacheError) throw options.cacheError;
      persisted.push(data);
    },
    hasStoredSession: async () => stored,
    restoreBackendSession: () => restoring.promise,
    clearSessionTokens: async () => {
      stored = false;
      if (options.clearError) throw options.clearError;
    },
    storeSessionTokens: async () => {
      stored = true;
    },
    googleBackendLogin: async () => ({
      ...account("bob"),
      accessToken: "access",
      refreshToken: "refresh",
    }),
    apiRequest: async (path, request = {}) => {
      requests.push({ path, ...request });
      return options.request ? options.request(path, request) : account();
    },
  };
  const source = readFileSync(new URL("../src/context/session.tsx", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const exports = {};
  const modules = {
    react,
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }) },
    "@/src/services/telemetry": {
      trackEvent() {},
      recordError: (error, context) => errors.push({ error, context }),
    },
    "@/src/features/program-follow/notifications": {
      unregisterProgramNotifications: async () => {},
    },
    "@react-native-google-signin/google-signin": {
      GoogleSignin: {
        configure() {},
        hasPlayServices: async () => {},
        signIn: async () => ({ data: { idToken: "id-token" } }),
        signOut: async () => {
          googleSignOuts++;
        },
      },
      isSuccessResponse: () => true,
    },
    "@/src/services/avatar-upload": { createAvatarForm: async () => ({}) },
    "@/src/services/account-data": {
      deleteAccountData: async (ownerId) => {
        deletedData.push(ownerId);
        if (options.dataError) throw options.dataError;
      },
    },
    "@/src/services/api": api,
  };
  vm.runInNewContext(outputText, {
    exports,
    console: { warn() {} },
    process: { env: {} },
    require(name) {
      assert.ok(name in modules, name);
      return modules[name];
    },
  });
  return {
    restoring,
    persisted,
    requests,
    errors,
    deletedData,
    stored: () => stored,
    googleSignOuts: () => googleSignOuts,
    render() {
      cursor = 0;
      const tree = exports.SessionProvider({ children: null });
      for (const effect of effects.splice(0)) {
        slots[effect.index]?.cleanup?.();
        slots[effect.index] = { deps: effect.deps, cleanup: effect.fn() };
      }
      return tree.props.value;
    },
    unmount() {
      for (const slot of slots) slot?.cleanup?.();
    },
  };
}

test("encrypted account snapshot opens local workouts before server restoration finishes", async () => {
  const f = fixture();
  assert.equal(f.render().ready, false);
  await tick();
  const local = f.render();
  assert.equal(local.ready, true);
  assert.equal(local.user.id, "alice");
  assert.equal(local.profile.trainingDays, 3);
  assert.equal(f.requests.length, 0);
  assert.equal(f.persisted.length, 0, "reading a snapshot does not rewrite it");
  f.restoring.resolve(true);
  await tick();
  assert.equal(f.persisted[0].user.id, "alice");
});

test("offline restoration retains the saved identity and its workout access", async () => {
  const f = fixture();
  f.render();
  await tick();
  f.restoring.reject(new Error("Network is offline"));
  await tick();
  assert.equal(f.render().user.id, "alice");
  assert.equal(f.render().ready, true);
  assert.equal(f.stored(), true);
});

test("expired or revoked credentials remove the saved identity", async () => {
  const expired = fixture();
  expired.render();
  await tick();
  expired.restoring.resolve(false);
  await tick();
  assert.equal(expired.render().user, null);
  const revoked = fixture({
    request: async () => {
      throw new HttpError(403, "Account disabled");
    },
  });
  revoked.render();
  await tick();
  revoked.restoring.resolve(true);
  await tick();
  assert.equal(revoked.render().user, null);
  assert.equal(revoked.stored(), false);
});

test("a newer sign-in cannot be replaced or cleared by a late restore", async () => {
  for (const exists of [true, false]) {
    const remote = deferred();
    const f = fixture({ request: () => remote.promise });
    f.render();
    await tick();
    if (exists) {
      f.restoring.resolve(true);
      await tick();
    }
    await f.render().signInGoogle();
    if (exists) remote.resolve(account("alice"));
    else f.restoring.resolve(false);
    await tick();
    assert.equal(f.render().user.id, "bob");
    assert.equal(f.persisted.at(-1).user.id, "bob");
  }
});

test("malformed cached account data is ignored rather than opening broken profile screens", async () => {
  const f = fixture({
    snapshot: { user: { id: "alice" }, settings: { weightUnit: "kg" }, profile: {} },
  });
  f.render();
  await tick();
  assert.equal(f.render().ready, true);
  assert.equal(f.render().user, null);
  f.restoring.reject(new Error("offline"));
  await tick();
  assert.equal(f.render().user, null);
});

test("snapshot storage failures do not turn a completed sign-in into a failed sign-in", async () => {
  const f = fixture({ snapshot: null, cacheError: new Error("Storage full") });
  f.render();
  await tick();
  assert.equal(await f.render().signInGoogle(), true);
  await tick();
  assert.equal(f.render().user.id, "bob");
  assert.ok(f.errors.some((item) => item.context === "session_cache"));
});

test("sign-out clears rendered identity even if credential storage cleanup fails", async () => {
  const f = fixture({ clearError: new Error("Secure storage unavailable") });
  f.render();
  await tick();
  await assert.rejects(f.render().signOut(), /Secure storage unavailable/);
  assert.equal(f.render().user, null);
  assert.equal(f.googleSignOuts(), 1);
});

test("successful server deletion clears local identity even if local credential cleanup fails", async () => {
  const f = fixture({ clearError: new Error("Secure storage unavailable") });
  f.render();
  await tick();
  await f.render().deleteAccount();
  assert.equal(f.render().user, null);
  assert.equal(f.requests.at(-1).method, "DELETE");
  assert.ok(f.errors.some((item) => item.context === "deleted_session_clear"));
  assert.deepEqual(f.deletedData, ["alice"]);
});

test("server deletion failures preserve local data, while device cleanup failures report server success accurately", async () => {
  const denied = fixture({
    request: async () => {
      throw new HttpError(500, "Server unavailable");
    },
  });
  denied.render();
  await tick();
  await assert.rejects(denied.render().deleteAccount(), /Server unavailable/);
  assert.equal(denied.render().user.id, "alice");
  assert.equal(denied.deletedData.length, 0);
  const local = fixture({ dataError: new Error("Disk unavailable") });
  local.render();
  await tick();
  await assert.rejects(local.render().deleteAccount(), /Your account was deleted, but/);
  assert.equal(local.render().user, null);
  assert.deepEqual(local.deletedData, ["alice"]);
});

test("an unmounted provider does not apply a late restore", async () => {
  const f = fixture();
  f.render();
  await tick();
  f.unmount();
  f.restoring.resolve(true);
  await tick();
  assert.equal(f.requests.length, 0);
});
