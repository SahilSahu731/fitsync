import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { checkRelease } from "../scripts/check-release.mjs";
const require = createRequire(import.meta.url);
const { releaseIssues } = require("../scripts/release-config.cjs");
const valid = {
  EXPO_PUBLIC_API_URL: "https://api.fitsync.test",
  EXPO_PUBLIC_WEB_URL: "https://fitsync.test",
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "123456-test.apps.googleusercontent.com",
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: "goog_public",
  EXPO_PUBLIC_POSTHOG_KEY: "phc_public",
  EXPO_PUBLIC_POSTHOG_HOST: "https://ingestion.fitsync.test",
  EXPO_PUBLIC_SENTRY_DSN: "https://public@sentry.fitsync.test/42",
  SENTRY_ORG: "test",
  SENTRY_PROJECT: "test",
  SENTRY_AUTH_TOKEN: "build-secret",
};

test("release validation rejects credentials that would silently disable sign-in or Google Play purchases", () => {
  assert.deepEqual(releaseIssues(valid, { checkFiles: false }), []);
  for (const key of [undefined, "sk_secret", "test_fake", "appl_otherstore"]) {
    const issues = releaseIssues({ ...valid, EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: key });
    assert.ok(issues.some((issue) => issue.includes("EXPO_PUBLIC_REVENUECAT_ANDROID_KEY")));
  }
  assert.ok(
    releaseIssues({ ...valid, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "YOUR_CLIENT_ID" }).some((issue) =>
      issue.includes("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"),
    ),
  );
});

test("release endpoints cannot point at loopback, duplicate /api, credentials or an absent public website", () => {
  for (const api of [
    "http://api.fitsync.test",
    "https://localhost",
    "https://127.0.0.1",
    "https://user:password@api.fitsync.test",
    "https://api.fitsync.test/api",
    "https://api.fitsync.test?token=secret",
  ]) {
    assert.ok(releaseIssues({ ...valid, EXPO_PUBLIC_API_URL: api }).length, api);
  }
  assert.ok(
    releaseIssues({ ...valid, EXPO_PUBLIC_WEB_URL: undefined }).some((issue) =>
      issue.includes("EXPO_PUBLIC_WEB_URL"),
    ),
  );
  assert.ok(
    releaseIssues({ ...valid, EXPO_PUBLIC_TELEMETRY_DEBUG: "true" }).some((issue) =>
      issue.includes("TELEMETRY_DEBUG"),
    ),
  );
  assert.deepEqual(
    releaseIssues({ ...valid, EXPO_PUBLIC_TELEMETRY_DEBUG: "true" }, { profile: "store-test" }),
    [],
  );
});

test("offline preflight reports missing configuration without printing credentials", () => {
  const sensitive = "sk_NEVER_PRINT_THIS_VALUE";
  const messages = [];
  const status = checkRelease(
    { ...valid, EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: sensitive },
    { log: (message) => messages.push(message), error: (message) => messages.push(message) },
  );
  assert.equal(status, 1);
  const output = messages.join("\n");
  assert.match(output, /EXPO_PUBLIC_REVENUECAT_ANDROID_KEY/);
  assert.match(output, /contacts no services/);
  assert.ok(!output.includes(sensitive));
  assert.ok(!output.includes(valid.SENTRY_AUTH_TOKEN));
});
