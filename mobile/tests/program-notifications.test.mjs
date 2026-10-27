import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function setup({ granted = true, afterPrompt = granted, previous = null, token = "ExpoPushToken[new]" } = {}) {
  const calls = []; const storage = new Map();
  if (previous) storage.set("fitsync.program-push-token.v1", previous);
  const modules = {
    "@react-native-async-storage/async-storage": { getItem: async key => storage.get(key) ?? null, setItem: async (key, value) => storage.set(key, value), removeItem: async key => storage.delete(key) },
    "react-native": { Platform: { OS: "android" } },
    "expo-constants": { expoConfig: { extra: { eas: { projectId: "project" } } } },
    "expo-notifications": {
      AndroidImportance: { DEFAULT: 3 },
      setNotificationChannelAsync: async (...args) => calls.push(["channel", ...args]),
      getPermissionsAsync: async () => ({ granted }),
      requestPermissionsAsync: async () => { calls.push(["permission"]); return { granted: afterPrompt }; },
      getExpoPushTokenAsync: async options => { calls.push(["token", options]); return { data: token }; }
    },
    "@/src/features/workouts/notifications": { configureWorkoutNotifications: async () => {} },
    "./api": { programFollowApi: { registerDevice: async token => calls.push(["register", token]), unregisterDevice: async token => calls.push(["unregister", token]) } }
  };
  const source = fs.readFileSync(new URL("../src/features/program-follow/notifications.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, require: name => { if (!(name in modules)) throw Error(name); return modules[name]; } });
  return { api: exports, calls, storage };
}
test("background refresh never prompts; an explicit opt-in requests permission before registering", async () => {
  const passive = setup({ granted: false }); await passive.api.registerProgramNotifications();
  assert.equal(passive.calls.some(call => call[0] === "permission" || call[0] === "register"), false);
  const optedIn = setup({ granted: false, afterPrompt: true }); await optedIn.api.registerProgramNotifications(true);
  assert.ok(optedIn.calls.findIndex(call => call[0] === "permission") < optedIn.calls.findIndex(call => call[0] === "register"));
  const channel = optedIn.calls.find(call => call[0] === "channel");
  assert.equal(channel[1], "program-reminders-v1");
  const config = JSON.parse(fs.readFileSync(new URL("../app.json", import.meta.url), "utf8")).expo;
  const sounds = config.plugins.find(p => Array.isArray(p) && p[0] === "expo-notifications")[1].sounds;
  assert.ok(sounds.some(sound => sound.endsWith(channel[2].sound)));
});
test("denied permission unregisters a previously stored device and provides a useful error", async () => {
  const state = setup({ granted: false, previous: "ExpoPushToken[old]" });
  await assert.rejects(state.api.registerProgramNotifications(true), /phone settings/);
  assert.ok(state.calls.some(call => call[0] === "unregister" && call[1] === "ExpoPushToken[old]"));
  assert.equal(state.storage.size, 0);
});
test("token rotation removes the old token and sign-out waits for in-flight registration", async () => {
  const state = setup({ previous: "ExpoPushToken[old]" });
  await Promise.all([state.api.registerProgramNotifications(), state.api.unregisterProgramNotifications()]);
  const writes = state.calls.filter(call => call[0] === "register" || call[0] === "unregister");
  assert.deepEqual(writes, [["unregister", "ExpoPushToken[old]"], ["register", "ExpoPushToken[new]"], ["unregister", "ExpoPushToken[new]"]]);
  assert.equal(state.storage.size, 0);
});
test("notification links accept only program UUID payloads", () => {
  const { api } = setup(); const id = "f85adcf5-63d7-4fb4-8df4-deb56d53e9d4";
  assert.equal(api.notificationProgramId({ type: "program-reminder", enrollmentId: id }), id);
  for (const data of [{}, { type: "workout-rest-complete", enrollmentId: id }, { type: "program-reminder", enrollmentId: "https://evil.test" }, { type: "program-reminder", enrollmentId: "../settings" }]) assert.equal(api.notificationProgramId(data), null);
});
