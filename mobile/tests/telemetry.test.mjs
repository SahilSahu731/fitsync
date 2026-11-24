import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as model from "../src/services/telemetry-model.ts";

const code = ts.transpileModule(
  readFileSync(new URL("../src/services/telemetry.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  },
).outputText;
function fixture({ saved = null, dev = false, storageFails = false } = {}) {
  const events = [],
    errors = [],
    clients = [];
  let crashOptions;
  const exports = {};
  const storage = {
    getItem: async () => {
      if (storageFails) throw Error("disk unavailable");
      return saved;
    },
    setItem: async (_key, value) => {
      saved = value;
    },
  };
  class PostHog {
    constructor(_key, options) {
      this.options = options;
      clients.push(this);
    }
    capture(name, properties) {
      events.push({ name, properties });
    }
    async optOut() {
      this.out = true;
    }
    async optIn() {
      this.out = false;
    }
    async flush() {}
  }
  const sentry = {
    init: (options) => {
      crashOptions = options;
    },
    captureException: (error, context) =>
      errors.push(
        crashOptions.beforeSend({
          message: error.message,
          tags: context.tags,
          exception: { values: [{ type: "Error", value: error.message }] },
        }),
      ),
    wrap: (component) => component,
  };
  vm.runInNewContext(code, {
    exports,
    __DEV__: dev,
    process: {
      env: {
        EXPO_PUBLIC_POSTHOG_KEY: "phc_test",
        EXPO_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
        EXPO_PUBLIC_SENTRY_DSN: "https://public@sentry.example.test/42",
      },
    },
    require(name) {
      if (name === "expo") return { requireOptionalNativeModule: () => null };
      if (name === "@react-native-async-storage/async-storage") return storage;
      if (name === "@sentry/react-native") return sentry;
      if (name === "posthog-react-native") return PostHog;
      if (name === "./telemetry-model") return model;
      throw Error(name);
    },
  });
  return {
    api: exports,
    events,
    errors,
    clients,
    get crashOptions() {
      return crashOptions;
    },
  };
}
test("persisted opt-outs prevent SDK initialization and survive later event calls", async () => {
  const f = fixture({ saved: JSON.stringify({ analytics: false, diagnostics: false }) });
  await f.api.initializeTelemetry();
  f.api.trackEvent("screen_viewed", { screen: "home" });
  f.api.recordError(Error("private health value"));
  assert.equal(f.clients.length, 0);
  assert.equal(f.crashOptions, undefined);
  assert.equal(f.events.length + f.errors.length, 0);
});
test("approved capture uses explicit events, sanitizes errors, and honors independent device switches", async () => {
  const f = fixture();
  await f.api.initializeTelemetry();
  f.api.trackEvent("paywall_viewed", { source: "home", weight: 81, email: "private@example.test" });
  assert.deepEqual(f.events[0], { name: "paywall_viewed", properties: { source: "home" } });
  assert.equal(f.clients[0].options.personProfiles, "never");
  assert.equal(f.clients[0].options.enableSessionReplay, false);
  assert.equal(f.clients[0].options.captureAppLifecycleEvents, false);
  f.api.recordError(Error("private health=81kg"), "workout_finish");
  assert.doesNotMatch(JSON.stringify(f.errors), /81kg|private/);
  await f.api.updateTelemetry({ analytics: false });
  f.api.trackEvent("paywall_viewed");
  assert.equal(f.events.length, 1);
  assert.equal(f.clients[0].out, true);
  await f.api.updateTelemetry({ diagnostics: false });
  f.api.recordError(Error("private"));
  assert.equal(f.errors.length, 1);
  assert.equal(f.crashOptions.beforeSend({ message: "private" }), null);
  await f.api.updateTelemetry({ analytics: true });
  f.api.trackEvent("screen_viewed", { screen: "settings" });
  assert.equal(f.events.length, 2);
});
test("normal development and unreadable privacy preferences send no data", async () => {
  for (const options of [{ dev: true }, { storageFails: true }]) {
    const f = fixture(options);
    await f.api.initializeTelemetry();
    f.api.trackEvent("screen_viewed");
    f.api.recordError(Error("private"));
    assert.equal(f.clients.length, 0);
    assert.equal(f.errors.length, 0);
  }
});
