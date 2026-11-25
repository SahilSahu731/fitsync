import * as permissionPrompts from "./helpers/permission-prompts.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function setup({
  granted = true,
  afterPrompt = granted,
  previous = null,
  token = "ExpoPushToken[new]",
  development = true,
  onToken,
  onRegister,
} = {}) {
  const calls = [];
  const storage = new Map();
  let session = 0;
  if (previous) storage.set("fitsync.program-push-token.v1", previous);
  const modules = {
    "@/src/services/permission-prompts": permissionPrompts,
    "@/src/services/api": { apiSessionKey: () => session },
    "@react-native-async-storage/async-storage": {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, value) => storage.set(key, value),
      removeItem: async (key) => storage.delete(key),
    },
    "react-native": { Platform: { OS: "android" } },
    "expo-constants": { expoConfig: { extra: { eas: { projectId: "project" } } } },
    "expo-notifications": {
      AndroidImportance: { DEFAULT: 3 },
      setNotificationChannelAsync: async (...args) => calls.push(["channel", ...args]),
      getPermissionsAsync: async () => ({ granted }),
      requestPermissionsAsync: async () => {
        calls.push(["permission"]);
        return { granted: afterPrompt };
      },
      getExpoPushTokenAsync: async (options) => {
        calls.push(["token", options]);
        onToken?.();
        return { data: token };
      },
    },
    "@/src/features/workouts/notifications": { configureWorkoutNotifications: async () => {} },
    "./api": {
      programFollowApi: {
        registerDevice: async (token) => {
          calls.push(["register", token]);
          await onRegister?.();
        },
        unregisterDevice: async (token) => calls.push(["unregister", token]),
      },
    },
  };
  const source = fs.readFileSync(
    new URL("../src/features/program-follow/notifications.ts", import.meta.url),
    "utf8",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(js, {
    exports,
    __DEV__: development,
    require: (name) => {
      if (!(name in modules)) throw Error(name);
      return modules[name];
    },
  });
  return {
    api: exports,
    calls,
    storage,
    nextSession() {
      session++;
    },
    setGranted(value) {
      granted = value;
    },
  };
}
test("background refresh never prompts; an explicit opt-in requests permission before registering", async () => {
  const passive = setup({ granted: false });
  await passive.api.registerProgramNotifications();
  assert.equal(
    passive.calls.some((call) => call[0] === "permission" || call[0] === "register"),
    false,
  );
  const optedIn = setup({ granted: false, afterPrompt: true });
  await optedIn.api.registerProgramNotifications(true);
  assert.ok(
    optedIn.calls.findIndex((call) => call[0] === "permission") <
      optedIn.calls.findIndex((call) => call[0] === "register"),
  );
  const channels = optedIn.calls.filter((call) => call[0] === "channel");

  const general = channels.find((call) => call[1] === "general-v1");
  const program = channels.find((call) => call[1] === "program-reminders-v2");

  assert.ok(general, "General notification channel must exist");
  assert.ok(program, "Program reminder channel must exist");

  assert.equal(Object.hasOwn(general[2], "sound"), false);
  assert.equal(Object.hasOwn(program[2], "sound"), false);
});
test("a developer can get only this installation’s test token with permission, without relying on the backend", async () => {
  const device = setup({
    granted: false,
    afterPrompt: true,
    onRegister: () =>
      assert.fail("The test token should be available even when the API is offline"),
  });
  assert.equal(await device.api.getDevelopmentPushToken(), "ExpoPushToken[new]");
  assert.deepEqual(
    device.calls
      .filter(([kind]) => kind === "token" || kind === "permission")
      .map(([kind]) => kind),
    ["permission", "token"],
  );
  const denied = setup({ granted: false, afterPrompt: false });
  await assert.rejects(denied.api.getDevelopmentPushToken(), /Allow FitSync notifications/);
  assert.ok(!denied.calls.some(([kind]) => kind === "token"));
  const release = setup({ development: false });
  await assert.rejects(release.api.getDevelopmentPushToken(), /development build/);
  assert.equal(release.calls.length, 0);
});
test("denied permission unregisters a previously stored device and provides a useful error", async () => {
  const state = setup({ granted: false, previous: "ExpoPushToken[old]" });
  await assert.rejects(state.api.registerProgramNotifications(true), /phone settings/);
  assert.ok(
    state.calls.some((call) => call[0] === "unregister" && call[1] === "ExpoPushToken[old]"),
  );
  assert.equal(state.storage.size, 0);
});
test("token rotation removes the old token and sign-out waits for in-flight registration", async () => {
  let release, started;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const registering = new Promise((resolve) => {
    started = resolve;
  });
  const state = setup({
    previous: "ExpoPushToken[old]",
    onRegister: async () => {
      started();
      await gate;
    },
  });
  const pending = state.api.registerProgramNotifications();
  const cancelled = assert.rejects(pending, /account changed/);
  await registering;
  let cleaned = false;
  const unregistering = state.api.unregisterProgramNotifications().then(() => {
    cleaned = true;
  });
  await new Promise(setImmediate);
  assert.equal(cleaned, false, "cleanup waits for the in-flight token registration");
  release();
  await Promise.all([cancelled, unregistering]);
  const writes = state.calls.filter((call) => call[0] === "register" || call[0] === "unregister");
  assert.deepEqual(writes, [
    ["unregister", "ExpoPushToken[old]"],
    ["register", "ExpoPushToken[new]"],
    ["unregister", "ExpoPushToken[new]"],
  ]);
  assert.equal(state.storage.size, 0);
});
test("sign-out does not wait for consent and late acceptance cannot register the old session", async () => {
  let explain, opened;
  const shown = new Promise((resolve) => {
    opened = resolve;
  });
  const unmount = permissionPrompts.registerPermissionPresenter((_prompt, complete) => {
    explain = complete;
    opened();
  });
  try {
    const state = setup({ granted: false, afterPrompt: true, previous: "ExpoPushToken[old]" });
    const pending = state.api.registerProgramNotifications(true);
    const cancelled = assert.rejects(pending, /account changed/);
    await shown;
    await state.api.unregisterProgramNotifications();
    assert.equal(state.storage.size, 0, "unregister must complete while the explanation is open");
    await assert.rejects(state.api.registerProgramNotifications(), /account changed/);
    state.nextSession();
    state.setGranted(true);
    await state.api.registerProgramNotifications();
    explain(true);
    await cancelled;
    assert.equal(state.calls.filter((call) => call[0] === "permission").length, 0);
    assert.equal(state.calls.filter((call) => call[0] === "register").length, 1);
    assert.equal(state.storage.get("fitsync.program-push-token.v1"), "ExpoPushToken[new]");
  } finally {
    unmount();
    permissionPrompts.registerPermissionPresenter((_prompt, complete) => complete(true));
  }
});
test("notification links accept only program UUID payloads", () => {
  const { api } = setup();
  const id = "f85adcf5-63d7-4fb4-8df4-deb56d53e9d4";
  assert.equal(api.notificationProgramId({ type: "program-reminder", enrollmentId: id }), id);
  for (const data of [
    {},
    { type: "workout-rest-complete", enrollmentId: id },
    { type: "program-reminder", enrollmentId: "https://evil.test" },
    { type: "program-reminder", enrollmentId: "../settings" },
  ])
    assert.equal(api.notificationProgramId(data), null);
});

test("native token events raised while registering reuse the current registration", async () => {
  let state;
  state = setup({
    onToken: () => {
      void state.api.registerProgramNotifications();
    },
  });
  await state.api.registerProgramNotifications();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.calls.filter((call) => call[0] === "token").length, 1);
  assert.equal(state.calls.filter((call) => call[0] === "register").length, 1);
});
