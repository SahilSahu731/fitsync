import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const require = createRequire(import.meta.url);
const resolveConfig = require("../app.config.js");
const { expo: config } = require("../app.json");

test("native changes receive their own update runtime even when the marketing version stays unchanged", () => {
  const resolved = resolveConfig({ config });
  assert.equal(resolved.runtimeVersion.policy, "fingerprint");
  assert.deepEqual(resolved.platforms, ["android"]);
});

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
      assert.equal(
        resolved.android.blockedPermissions.includes("android.permission.SYSTEM_ALERT_WINDOW"),
        profile !== "development",
      );
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
    "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
    "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
    "GOOGLE_SERVICES_JSON",
  ];
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fitsync-release-config-"));
  const firebase = path.join(directory, "google-services.json");
  fs.writeFileSync(
    firebase,
    JSON.stringify({
      client: [{ client_info: { android_client_info: { package_name: config.android.package } } }],
    }),
  );
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
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "123456-test.apps.googleusercontent.com",
      EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: "goog_test",
      GOOGLE_SERVICES_JSON: firebase,
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
    fs.rmSync(directory, { recursive: true, force: true });
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

test("Android store builds use API36 without downgrading the installed SDK and exclude unused sensitive permissions", () => {
  const properties = config.plugins.find(
    (p) => Array.isArray(p) && p[0] === "expo-build-properties",
  )[1].android;
  const catalog = fs.readFileSync(
    new URL("../node_modules/react-native/gradle/libs.versions.toml", import.meta.url),
    "utf8",
  );
  assert.equal(properties.targetSdkVersion, Number(/targetSdk = "(\d+)"/.exec(catalog)[1]));
  assert.equal(properties.compileSdkVersion, Number(/compileSdk = "(\d+)"/.exec(catalog)[1]));
  assert.ok(properties.targetSdkVersion >= 36);
  for (const permission of [
    "CAMERA",
    "RECORD_AUDIO",
    "READ_CALENDAR",
    "WRITE_CALENDAR",
    "READ_EXTERNAL_STORAGE",
    "WRITE_EXTERNAL_STORAGE",
    "READ_MEDIA_IMAGES",
    "READ_MEDIA_VIDEO",
  ]) {
    assert.ok(
      config.android.blockedPermissions.includes(`android.permission.${permission}`),
      permission,
    );
    assert.ok(!config.android.permissions.includes(`android.permission.${permission}`), permission);
  }
  assert.ok(config.android.blockedPermissions.includes("com.google.android.gms.permission.AD_ID"));
  for (const permission of ["READ_STEPS", "READ_SLEEP", "READ_WEIGHT"])
    assert.ok(config.android.permissions.includes(`android.permission.health.${permission}`));
});

test("store profiles create incrementing AABs and submit only to an internal draft", () => {
  const eas = require("../eas.json");
  assert.equal(eas.cli.appVersionSource, "remote");
  assert.equal(eas.build.production.android.buildType, "app-bundle");
  assert.equal(eas.build.production.distribution, "store");
  assert.equal(eas.build.production.autoIncrement, true);
  assert.equal(eas.build["store-test"].extends, "production");
  assert.equal(eas.submit.production.android.track, "internal");
  assert.equal(eas.submit.production.android.releaseStatus, "draft");
  assert.equal(eas.submit["store-test"].extends, "production");
});
