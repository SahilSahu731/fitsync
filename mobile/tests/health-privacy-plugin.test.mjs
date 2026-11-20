import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

test("Health Connect privacy intents reach an unauthenticated native policy activity on both Android paths", async () => {
  let manifestMod, sourceMod;
  const module = { exports: {} };
  vm.runInNewContext(
    await readFile(new URL("../plugins/with-health-privacy.js", import.meta.url), "utf8"),
    {
      module,
      require: (name) =>
        name === "expo/config-plugins"
          ? {
              withAndroidManifest(config, fn) {
                manifestMod = fn;
                return config;
              },
              withDangerousMod(config, [platform, fn]) {
                assert.equal(platform, "android");
                sourceMod = fn;
                return config;
              },
              AndroidConfig: {
                Manifest: {
                  getMainApplicationOrThrow: (results) => results.manifest.application[0],
                  getMainActivityOrThrow: (results) => results.manifest.application[0].activity[0],
                },
              },
            }
          : require(name),
    },
  );
  module.exports({}, { privacyUrl: "https://fitsync.example.test/privacy" });
  const activity = {
    $: { "android:name": ".MainActivity" },
    "intent-filter": [
      { action: [{ $: { "android:name": "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" } }] },
    ],
  };
  const app = { activity: [activity], "activity-alias": [] };
  const config = { modResults: { manifest: { application: [app] } } };
  manifestMod(config);
  manifestMod(config);
  assert.equal(activity["intent-filter"].length, 0);
  const policy = app.activity.filter((a) => a.$["android:name"] === ".HealthPrivacyActivity");
  assert.equal(policy.length, 1);
  assert.equal(
    policy[0]["intent-filter"][0].action[0].$["android:name"],
    "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE",
  );
  assert.equal(app["activity-alias"].length, 1);
  assert.equal(app["activity-alias"][0].$["android:targetActivity"], ".HealthPrivacyActivity");
  assert.equal(
    app["activity-alias"][0].$["android:permission"],
    "android.permission.START_VIEW_PERMISSION_USAGE",
  );
  const root = await mkdtemp(path.join(tmpdir(), "fitsync-health-privacy-"));
  try {
    await sourceMod({
      android: { package: "com.example.fitsync" },
      modRequest: { platformProjectRoot: root },
    });
    const source = await readFile(
      path.join(root, "app/src/main/java/com/example/fitsync/HealthPrivacyActivity.java"),
      "utf8",
    );
    assert.match(source, /https:\/\/fitsync.example.test\/privacy/);
    assert.match(source, /setJavaScriptEnabled\(false\)/);
    assert.match(source, /MIXED_CONTENT_NEVER_ALLOW/);
    assert.doesNotMatch(
      source,
      /getIntent\(\)|ReactActivity|Authorization|setAllowFileAccess\(true\)/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
