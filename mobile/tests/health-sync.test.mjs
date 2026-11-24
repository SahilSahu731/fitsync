import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(file, dependencies = {}) {
  const js = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(js, {
    exports,
    Date,
    Intl,
    Map,
    Set,
    Promise,
    require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}
const progress = load("../src/features/progress/model.ts");
const model = load("../src/features/health-sync/model.ts", { "../progress/model": progress });
const types = load("../src/features/health-sync/types.ts");
const NOW = new Date("2026-11-07T12:00:00Z");
const today = progress.localDate(NOW);
const value = (metric, amount, date = today) => ({ metric, value: amount, date });
const metricEvent = (source, amount, extra = {}) => ({
  id: "event-00000000000000001",
  observedAt: "2026-11-07T10:00:00Z",
  kind: "metric",
  metric: "steps",
  date: today,
  value: amount,
  notes: "",
  source,
  ...extra,
});

test("health imports select seven local calendar days, including today, without fixed 24-hour boundaries", () => {
  const old = process.env.TZ;
  process.env.TZ = "Asia/Kolkata";
  try {
    const days = model.healthDays(new Date("2026-11-07T20:00:00Z"));
    assert.equal(days.length, 7);
    assert.equal(days.at(-1).date, "2026-11-08");
    assert.equal(days[0].date, "2026-11-02");
    assert.equal(days.at(-1).start.toISOString(), "2026-11-07T18:30:00.000Z");
    assert.equal(days.at(-1).end.toISOString(), "2026-11-07T20:00:00.000Z");
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});

test("repeated imports do not add entries or double totals; changed provider values replace imported snapshots", () => {
  const first = model.planHealthImport(
    progress.emptyJournal(),
    "healthconnect",
    [value("steps", 6000)],
    NOW,
  );
  assert.equal(first.imported, 1);
  assert.equal(first.journal.pending.length, 1);
  const repeated = model.planHealthImport(
    first.journal,
    "healthconnect",
    [value("steps", 6000)],
    NOW,
  );
  assert.equal(repeated.imported, 0);
  assert.equal(repeated.unchanged, 1);
  assert.equal(repeated.journal, first.journal);
  const changed = model.planHealthImport(
    repeated.journal,
    "healthconnect",
    [value("steps", 6500)],
    NOW,
  );
  assert.equal(changed.imported, 1);
  assert.equal(progress.latestMetrics(changed.journal.events)[0].value, 6500);
  assert.equal(changed.journal.events.length, 2);
});

test("automatic snapshots keep manual extra steps exactly once and unchanged imports preserve the journal", () => {
  const journal = {
    ...progress.emptyJournal(),
    events: [
      metricEvent("manual", 300, {
        notes: "Walking without my phone",
        stepBreakdown: { automatic: null, manual: 300, source: null },
      }),
    ],
  };
  const first = model.planHealthImport(journal, "healthconnect", [value("steps", 6000)], NOW);
  const firstEntry = progress.latestMetrics(first.journal.events)[0];
  assert.equal(firstEntry.value, 6300);
  assert.equal(firstEntry.stepBreakdown.automatic, 6000);
  assert.equal(firstEntry.stepBreakdown.manual, 300);
  assert.equal(firstEntry.notes, "Walking without my phone");
  const repeated = model.planHealthImport(
    first.journal,
    "healthconnect",
    [value("steps", 6000)],
    NOW,
  );
  assert.equal(repeated.imported, 0);
  assert.equal(repeated.unchanged, 1);
  assert.equal(repeated.journal, first.journal);
  const changed = model.planHealthImport(
    repeated.journal,
    "healthconnect",
    [value("steps", 6500)],
    NOW,
  );
  const changedEntry = progress.latestMetrics(changed.journal.events)[0];
  assert.equal(changedEntry.value, 6800);
  assert.equal(changedEntry.stepBreakdown.automatic, 6500);
  assert.equal(changedEntry.stepBreakdown.manual, 300);
});

test("manual corrections, manual deletions and pedometer totals are preserved", () => {
  for (const source of ["manual", "pedometer"])
    for (const amount of [null, 500]) {
      const journal = { ...progress.emptyJournal(), events: [metricEvent(source, amount)] };
      const result = model.planHealthImport(journal, "healthkit", [value("steps", 6000)], NOW);
      assert.equal(result.imported, 0);
      assert.equal(result.protectedEntries, 1);
      assert.equal(result.journal.events[0].value, amount);
      assert.equal(result.journal, journal);
    }
});

test("invalid/out-of-window native values are rejected and absent values never create zero measurements", () => {
  const result = model.planHealthImport(
    progress.emptyJournal(),
    "healthkit",
    [
      value("steps", -5),
      value("steps", 0, "2020-01-01"),
      value("weight", 0),
      value("sleep", 25),
      value("steps", 25, "2099-01-01"),
    ],
    NOW,
  );
  assert.equal(result.imported, 0);
  const old = { ...progress.emptyJournal(), events: [metricEvent("healthkit", 6000)] };
  assert.equal(model.planHealthImport(old, "healthkit", [], NOW).journal.events[0].value, 6000);
});

test("overlapping sleep samples are unioned; overnight stages belong to the episode wake date", () => {
  const before = new Date(NOW);
  before.setHours(22, 0, 0, 0);
  before.setDate(before.getDate() - 1);
  const after = new Date(NOW);
  after.setHours(6, 0, 0, 0);
  const middle = new Date(before);
  middle.setHours(23, 30, 0, 0);
  const samples = [
    { start: before.getTime(), end: middle.getTime() },
    { start: middle.getTime(), end: after.getTime() },
    { start: middle.getTime(), end: after.getTime() },
  ];
  const result = model.sleepValues(samples, [today]);
  assert.equal(result.length, 1);
  assert.equal(result[0].date, today);
  assert.equal(result[0].value, 8);
  assert.equal(
    model.sleepValues(
      [
        { start: NaN, end: 1 },
        { start: 2, end: 1 },
      ],
      [today],
    ).length,
    0,
  );
});

test("daily body weight uses the latest real sample and kilograms", () => {
  const result = model.latestWeightValues(
    [
      { at: NOW.getTime() - 1000, kg: 80 },
      { at: NOW.getTime(), kg: 79.125 },
      { at: NOW.getTime(), kg: NaN },
    ],
    [today],
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].value, 79.13);
});

function serviceFixture({
  enabled = false,
  metrics,
  onRead,
  onPermission,
  current = () => true,
  cloudFail = false,
} = {}) {
  const data = new Map();
  const calls = { permission: 0, reads: 0, cloud: 0, permissionMetrics: [], readMetrics: [] };
  let session = 0;
  let journal = progress.emptyJournal();
  const storage = {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
  };
  data.set(
    "fitsync.health-sync.v1.alice",
    JSON.stringify({ version: 1, enabled, lastImportedAt: null, metrics }),
  );
  const adapter = {
    source: "healthconnect",
    available: async () => ({ available: true }),
    requestReadAccess: async (selected) => {
      calls.permission++;
      calls.permissionMetrics.push(selected);
      await onPermission?.(selected);
    },
    readLastWeek: async (now, selected) => {
      calls.reads++;
      calls.readMetrics.push(selected);
      return onRead
        ? await onRead(now, selected, calls.reads)
        : {
            source: "healthconnect",
            values: [value("steps", 6000, progress.localDate())],
            warnings: [],
          };
    },
  };
  const service = load("../src/features/health-sync/service.ts", {
    "@/src/services/api": { apiSessionKey: () => session },
    "@react-native-async-storage/async-storage": storage,
    "../progress/journal": {
      updateJournal: async (_owner, update) => {
        journal = update(journal);
        return journal;
      },
      syncJournal: async () => {
        calls.cloud++;
        if (cloudFail) throw Error("offline");
        journal = { ...journal, pending: [] };
      },
    },
    "./model": model,
    "./types": types,
    "./native": { getHealthAdapter: () => adapter },
  });
  return { service, data, calls, current, journal: () => journal, changeSession: () => session++ };
}

test("device data is never read without account opt-in; explicit connect requests read permission first", async () => {
  const f = serviceFixture();
  await assert.rejects(
    f.service.importHealthForUser("alice", () => true),
    /Enable health import/,
  );
  assert.equal(f.calls.reads, 0);
  assert.equal(f.calls.permission, 0);
  const result = await f.service.importHealthForUser("alice", () => true, true);
  assert.equal(result.imported, 1);
  assert.equal(f.calls.permission, 1);
  assert.equal(f.calls.reads, 1);
  assert.equal((await f.service.readHealthSyncSettings("alice")).enabled, true);
  assert.equal((await f.service.readHealthSyncSettings("bob")).enabled, false);
});
test("deletion removes only that account's health preferences and cancels a pending native read", async () => {
  let finish;
  let started;
  const reading = new Promise((resolve) => {
    started = resolve;
  });
  const f = serviceFixture({
    enabled: true,
    onRead: () => {
      started();
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  });
  f.data.set(
    "fitsync.health-sync.v1.bob",
    JSON.stringify({ version: 1, enabled: true, lastImportedAt: null }),
  );
  const pending = f.service.importHealthForUser("alice", () => true);
  const rejected = assert.rejects(pending, /account or import setting changed/);
  await reading;
  await f.service.deleteHealthSyncSettings("alice");
  finish({ source: "healthconnect", values: [value("steps", 800)], warnings: [] });
  await rejected;
  assert.equal(f.data.has("fitsync.health-sync.v1.alice"), false);
  assert.equal(f.journal().events.length, 0);
  assert.equal((await f.service.readHealthSyncSettings("bob")).enabled, true);
  await assert.rejects(
    f.service.importHealthForUser("alice", () => true, true),
    /account or import setting changed/,
  );
  assert.equal(f.data.has("fitsync.health-sync.v1.alice"), false);
});

test("connecting steps selects only steps and unchanged automatic refreshes avoid cloud work", async () => {
  const f = serviceFixture();
  await f.service.importHealthForUser("alice", () => true, true, ["steps"]);
  assert.deepEqual(f.calls.permissionMetrics, [["steps"]]);
  assert.deepEqual(f.calls.readMetrics, [["steps"]]);
  assert.equal(
    JSON.stringify((await f.service.readHealthSyncSettings("alice")).metrics),
    '["steps"]',
  );
  const saved = f.journal();
  const repeated = await f.service.importHealthForUser("alice", () => true);
  assert.equal(repeated.imported, 0);
  assert.equal(repeated.unchanged, 1);
  assert.equal(f.journal(), saved);
  assert.equal(f.calls.cloud, 1);
});
test("automatic import warnings reach other screens and remain scoped to the current session", async () => {
  const f = serviceFixture({
    enabled: true,
    onRead: () => ({
      source: "healthconnect",
      values: [],
      warnings: ["Steps access is off. Review permissions to resume automatic steps."],
    }),
  });
  const notices = [];
  const unsubscribe = f.service.subscribeHealthSync((owner) => {
    notices.push([owner, f.service.latestHealthImportResult(owner)?.warnings[0]]);
  });
  const result = await f.service.importHealthForUser("alice", () => true);
  assert.equal(notices.at(-1)[1], result.warnings[0]);
  assert.equal(f.service.latestHealthImportResult("alice"), result);
  assert.equal(f.service.latestHealthImportResult("bob"), null);
  f.changeSession();
  assert.equal(f.service.latestHealthImportResult("alice"), null);
  unsubscribe();
});

test("an older overlapping read cannot roll back newer steps or remove newly enabled metrics", async () => {
  let finishOlder;
  const f = serviceFixture({
    enabled: true,
    metrics: ["steps"],
    onRead: async (_now, _metrics, index) =>
      index === 1
        ? new Promise((resolve) => {
            finishOlder = resolve;
          })
        : {
            source: "healthconnect",
            values: [
              value("steps", 6500, progress.localDate()),
              value("sleep", 7, progress.localDate()),
            ],
            warnings: ["Latest permission status"],
          },
  });
  const older = f.service.importHealthForUser("alice", () => true);
  await new Promise((resolve) => setImmediate(resolve));
  const newer = await f.service.importHealthForUser("alice", () => true, true, ["sleep"]);
  assert.equal(newer.imported, 2);
  finishOlder({
    source: "healthconnect",
    values: [value("steps", 6000, progress.localDate())],
    warnings: ["Stale permission status"],
  });
  const oldResult = await older;
  assert.equal(oldResult.imported, 0);
  assert.equal(f.service.latestHealthImportResult("alice"), newer);
  const entries = progress.latestMetrics(f.journal().events);
  assert.equal(entries.find((entry) => entry.metric === "steps").value, 6500);
  assert.equal(entries.find((entry) => entry.metric === "sleep").value, 7);
  assert.equal(
    JSON.stringify((await f.service.readHealthSyncSettings("alice")).metrics),
    '["steps","sleep"]',
  );
  assert.deepEqual(f.calls.permissionMetrics, [["sleep"]]);
  assert.equal(JSON.stringify(f.calls.readMetrics), '[["steps"],["steps","sleep"]]');
});

test("a shared import keeps running for a current caller after its first caller leaves", async () => {
  let firstCurrent = true;
  let finish;
  const f = serviceFixture({
    enabled: true,
    onRead: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  const first = f.service.importHealthForUser("alice", () => firstCurrent);
  const firstRejected = assert.rejects(first, /account changed/);
  await new Promise((resolve) => setImmediate(resolve));
  const second = f.service.importHealthForUser("alice", () => true);
  firstCurrent = false;
  finish({
    source: "healthconnect",
    values: [value("steps", 6000, progress.localDate())],
    warnings: [],
  });
  const result = await second;
  await firstRejected;
  assert.equal(result.imported, 1);
  assert.equal(f.calls.reads, 1);
  assert.equal(progress.latestMetrics(f.journal().events)[0].value, 6000);
});

test("a session replacement stops pending imports even if the owner callback remains current", async () => {
  let finish;
  const f = serviceFixture({
    enabled: true,
    onRead: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  const pending = f.service.importHealthForUser("alice", () => true);
  const rejected = assert.rejects(pending, /account or import setting changed/);
  await new Promise((resolve) => setImmediate(resolve));
  f.changeSession();
  finish({
    source: "healthconnect",
    values: [value("steps", 6000, progress.localDate())],
    warnings: [],
  });
  await rejected;
  assert.equal(f.journal().events.length, 0);
  assert.equal((await f.service.readHealthSyncSettings("alice")).lastImportedAt, null);
});

test("account change during system permission dialog stops the import and preference write", async () => {
  let current = true;
  const f = serviceFixture({
    onPermission: async () => {
      current = false;
    },
  });
  await assert.rejects(
    f.service.importHealthForUser("alice", () => current, true),
    /account or import setting changed/,
  );
  assert.equal(f.calls.reads, 0);
  assert.equal(f.journal().events.length, 0);
  assert.equal((await f.service.readHealthSyncSettings("alice")).enabled, false);
});

test("disconnect cancels an in-flight read before it can append health records", async () => {
  let finish;
  const f = serviceFixture({
    enabled: true,
    onRead: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  const pending = f.service.importHealthForUser("alice", () => true);
  await new Promise((resolve) => setImmediate(resolve));
  await f.service.disconnectHealthSync("alice");
  finish({
    source: "healthconnect",
    values: [value("steps", 6000, progress.localDate())],
    warnings: [],
  });
  await assert.rejects(pending, /account or import setting changed/);
  assert.equal(f.journal().events.length, 0);
});

test("offline cloud sync preserves locally imported events and reports the retry state", async () => {
  const f = serviceFixture({ enabled: true, cloudFail: true });
  const result = await f.service.importHealthForUser("alice", () => true);
  assert.equal(result.imported, 1);
  assert.equal(f.journal().pending.length, 1);
  assert.ok(result.warnings.some((warning) => warning.includes("Saved on this device")));
});

function nativeFixture(platform, module, extraConstants = {}) {
  return load("../src/features/health-sync/native.ts", {
    "react-native": { Platform: { OS: platform }, Linking: { openURL: async () => {} } },
    "expo-constants": {
      __esModule: true,
      default: { executionEnvironment: "bare", ...extraConstants },
      ExecutionEnvironment: { StoreClient: "storeClient" },
    },
    "./model": model,
    "react-native-health-connect": module,
    "@kingstinct/react-native-healthkit": module,
  }).getHealthAdapter();
}

test("unsupported and missing native builds fail gracefully without health reads", async () => {
  assert.equal((await nativeFixture("web", {}).available()).available, false);
  assert.equal((await nativeFixture("android", {}).available()).available, false);
  assert.equal(
    (await nativeFixture("ios", {}, { executionEnvironment: "storeClient" }).available()).available,
    false,
  );
});

test("Android requests read permissions only and does not query denied record types", async () => {
  let permissionRequest;
  let queries = 0;
  const adapter = nativeFixture("android", {
    SdkAvailabilityStatus: { SDK_AVAILABLE: 3 },
    getSdkStatus: async () => 3,
    initialize: async () => true,
    requestPermission: async (requested) => {
      permissionRequest = requested;
      return requested;
    },
    getGrantedPermissions: async () => [],
    readRecords: async () => {
      queries++;
      throw Error("must not read denied records");
    },
    aggregateRecord: async () => {
      queries++;
      throw Error("must not read denied records");
    },
  });
  await adapter.requestReadAccess();
  assert.equal(permissionRequest.length, 3);
  assert.ok(permissionRequest.every((permission) => permission.accessType === "read"));
  const result = await adapter.readLastWeek(NOW);
  assert.equal(queries, 0);
  assert.equal(result.values.length, 0);
  assert.equal(result.warnings.length, 3);
});

test("steps-only access does not import other granted metrics and distinguishes missing data from measured zero", async () => {
  let permissionRequest;
  let index = 0;
  const adapter = nativeFixture("android", {
    requestPermission: async (requested) => {
      permissionRequest = requested;
      return requested;
    },
    getGrantedPermissions: async () =>
      ["Steps", "SleepSession", "Weight"].map((recordType) => ({ accessType: "read", recordType })),
    aggregateRecord: async ({ recordType }) => {
      assert.equal(recordType, "Steps");
      index++;
      return index === 2
        ? { COUNT_TOTAL: 0, dataOrigins: ["phone"] }
        : index === 3
          ? { COUNT_TOTAL: 6000, dataOrigins: ["phone"] }
          : { COUNT_TOTAL: 0, dataOrigins: [] };
    },
    readRecords: async () => {
      throw Error("Unselected sleep and weight records must not be queried");
    },
  });
  await adapter.requestReadAccess(["steps"]);
  assert.equal(JSON.stringify(permissionRequest), '[{"accessType":"read","recordType":"Steps"}]');
  const result = await adapter.readLastWeek(NOW, ["steps"]);
  const days = model.healthDays(NOW);
  assert.equal(result.values.length, 2);
  assert.equal(result.values[0].date, days[1].date);
  assert.equal(result.values[0].metric, "steps");
  assert.equal(result.values[0].value, 0);
  assert.equal(result.values[1].date, days[2].date);
  assert.equal(result.values[1].value, 6000);
  assert.equal(result.warnings.length, 0);
});

test("a denied steps permission cannot be satisfied by an unrelated health permission", async () => {
  const adapter = nativeFixture("android", {
    requestPermission: async () => [{ accessType: "read", recordType: "Weight" }],
  });
  await assert.rejects(adapter.requestReadAccess(["steps"]), /No health access was granted/);
});

test("Android-only build never loads HealthKit or reads health data on iOS", async () => {
  const adapter = nativeFixture("ios", {
    isHealthDataAvailable() {
      throw Error("must not call HealthKit");
    },
  });
  assert.equal((await adapter.available()).available, false);
  await assert.rejects(adapter.requestReadAccess(), /not available/);
});
