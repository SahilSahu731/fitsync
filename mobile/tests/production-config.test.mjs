import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const resolveConfig = require("../app.config.js");
const { expo: config } = require("../app.json");

test("cleartext networking is restricted to the explicit development build", () => {
  const original = process.env.EAS_BUILD_PROFILE;
  try {
    for (const profile of [undefined, "preview", "store-test", "production", "development"]) {
      if (profile === undefined) delete process.env.EAS_BUILD_PROFILE;
      else process.env.EAS_BUILD_PROFILE = profile;
      const resolved = resolveConfig({ config });
      const properties = resolved.plugins.find(
        (p) => Array.isArray(p) && p[0] === "expo-build-properties",
      )[1];
      assert.equal(properties.android.usesCleartextTraffic, profile === "development", profile);
      assert.equal(properties.android.minSdkVersion, 26);
      assert.deepEqual(resolved.android.permissions, config.android.permissions);
    }
  } finally {
    if (original === undefined) delete process.env.EAS_BUILD_PROFILE;
    else process.env.EAS_BUILD_PROFILE = original;
  }
});

test("EAS release builds require HTTPS API and legal destinations", () => {
  const keys = [
    "EAS_BUILD",
    "EAS_BUILD_PROFILE",
    "EXPO_PUBLIC_API_URL",
    "EXPO_PUBLIC_WEB_URL",
    "EXPO_PUBLIC_PRIVACY_URL",
    "EXPO_PUBLIC_TERMS_URL",
    "EXPO_PUBLIC_POSTHOG_KEY",
    "EXPO_PUBLIC_POSTHOG_HOST",
    "EXPO_PUBLIC_SENTRY_DSN",
    "SENTRY_ORG",
    "SENTRY_PROJECT",
    "SENTRY_AUTH_TOKEN",
    "EXPO_PUBLIC_TELEMETRY_DEBUG",
  ];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    for (const key of keys) delete process.env[key];
    process.env.EAS_BUILD = "true";
    process.env.EAS_BUILD_PROFILE = "production";
    assert.throws(() => resolveConfig({ config }), /require HTTPS/);
    process.env.EXPO_PUBLIC_API_URL = "http://api.example.test";
    process.env.EXPO_PUBLIC_WEB_URL = "https://www.example.test";
    assert.throws(() => resolveConfig({ config }), /require HTTPS/);
    process.env.EXPO_PUBLIC_API_URL = "https://api.example.test";
    assert.throws(() => resolveConfig({ config }), /require PostHog/);
    Object.assign(process.env, {
      EXPO_PUBLIC_POSTHOG_KEY: "phc_test",
      EXPO_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
      EXPO_PUBLIC_SENTRY_DSN: "https://publickey@sentry.example.test/42",
      SENTRY_ORG: "test",
      SENTRY_PROJECT: "fitsync",
      SENTRY_AUTH_TOKEN: "test-token-not-real",
    });
    const resolved = resolveConfig({ config });
    const privacy = resolved.plugins.find(
      (p) => Array.isArray(p) && p[0] === "./plugins/with-health-privacy",
    );
    assert.equal(privacy[1].privacyUrl, "https://www.example.test/privacy");
    process.env.EXPO_PUBLIC_PRIVACY_URL = "https://legal.example.test/policy";
    assert.equal(
      resolveConfig({ config }).plugins.find(
        (p) => Array.isArray(p) && p[0] === "./plugins/with-health-privacy",
      )[1].privacyUrl,
      "https://legal.example.test/policy",
    );
  } finally {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});
