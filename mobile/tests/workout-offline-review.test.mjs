import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(file, dependencies = {}, globals = {}) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, Date, Map, Set, Promise, console, ...globals, require: name => { if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`); return dependencies[name]; } });
  return exports;
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const A = "550e8400-e29b-41d4-a716-446655440000";
const B = "550e8400-e29b-41d4-a716-446655440001";
const session = (id = "session") => ({ id, status: "active", notes: "", started_at: "2026-11-07T10:00:00Z", workout_session_exercises: [{ id: "exercise", workout_logged_sets: [{ id: "set", reps: 8, weight_kg: 20, completed_at: null }] }] });
function offlineFixture() {
  const storage = new Map();
  const setState = load("../src/features/workouts/set-state.ts");
  const api = load("../src/features/workouts/offline.ts", { "./set-state": setState, "@react-native-async-storage/async-storage": { getItem: async key => storage.get(key) ?? null, setItem: async (key, value) => { storage.set(key, value); }, removeItem: async key => { storage.delete(key); } } });
  return { api, storage };
}
const noop = { set: async () => {}, notes: async () => {}, finish: async () => {} };

test("concurrent flushers cannot apply an older set after a newer set was acknowledged", async () => {
  const { api } = offlineFixture();
  await api.cacheWorkout(A, session()); await api.queueSet(A, "set", { reps: 9 });
  let release; let remoteReps = 8; let calls = 0;
  const transport = { ...noop, set: async (_session, _set, patch) => { if (++calls === 1) await new Promise(resolve => { release = resolve; }); remoteReps = patch.reps; } };
  const first = api.flushWorkoutDraft(A, () => true, transport); await tick();
  await api.queueSet(A, "set", { reps: 12 });
  const second = api.flushWorkoutDraft(A, () => true, transport); await tick();
  release(); await Promise.all([first, second]);
  assert.equal(remoteReps, 12, "the newest durable edit must win even across provider remounts");
  assert.equal(api.draftPending(await api.readWorkoutDraft(A)), 0);
});

test("an older active-session response cannot replace a newer acknowledged local revision", async () => {
  const { api } = offlineFixture();
  await api.cacheWorkout(A, session());
  const observed = await api.readWorkoutDraft(A);
  await api.queueSet(A, "set", { reps: 12 });
  await api.flushWorkoutDraft(A, () => true, noop);
  await api.cacheWorkout(A, session(), observed.revision);
  assert.equal((await api.readWorkoutDraft(A)).session.workout_session_exercises[0].workout_logged_sets[0].reps, 12);
});

test("delayed notes from a previous workout cannot edit a new workout belonging to the same account", async () => {
  const { api } = offlineFixture();
  await api.cacheWorkout(A, session("previous"));
  await api.cacheWorkout(A, session("current"));
  await assert.rejects(api.queueNotes(A, "Notes for previous workout", "previous"), /session|workout|changed|reopen/i);
  assert.equal((await api.readWorkoutDraft(A)).session.notes, "");
});

function authFixture(fetcher, options = {}) {
  const storage = new Map(); const requests = [];
  const api = load("../src/services/api.ts", {
    "./native-modules": { loadSecureStore: async () => ({ getItemAsync: async key => storage.get(key) ?? null, setItemAsync: async (key, value) => { await options.beforeSet?.(key, value); storage.set(key, value); }, deleteItemAsync: async key => { storage.delete(key); } }) }
  }, { process: { env: { EXPO_PUBLIC_API_URL: "https://fitsync.test" } }, AbortController, setTimeout: options.setTimeout ?? setTimeout, clearTimeout: options.clearTimeout ?? clearTimeout, fetch: async (url, init) => { requests.push({ url, init }); return fetcher(url, init); } });
  return { api, storage, requests };
}
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("an old account refresh response cannot overwrite a newer login or retry the old operation", async () => {
  let finishRefresh; let originals = 0;
  const fixture = authFixture(async url => {
    if (url.endsWith("/auth/refresh")) return new Promise(resolve => { finishRefresh = resolve; });
    return ++originals === 1 ? response({ message: "expired" }, 401) : response({ ok: true });
  });
  await fixture.api.storeSessionTokens({ accessToken: "alice-access", refreshToken: "alice-refresh" });
  const old = fixture.api.apiRequest("/workouts/active", { expectedOwnerId: A }); await tick();
  await fixture.api.storeSessionTokens({ accessToken: "bob-access", refreshToken: "bob-refresh" });
  finishRefresh(response({ accessToken: "alice-new-access", refreshToken: "alice-new-refresh" }));
  await assert.rejects(old, /account|changed|session|sign in/i);
  assert.equal(fixture.storage.get("fitsync.refresh-token.v1"), "bob-refresh");
  await fixture.api.apiRequest("/probe", { expectedOwnerId: B });
  assert.equal(fixture.requests.at(-1).init.headers.Authorization, "Bearer bob-access");
});

test("a rejected refresh for an old account cannot erase a newer account's stored login", async () => {
  let finishRefresh;
  const fixture = authFixture(async url => url.endsWith("/auth/refresh") ? new Promise(resolve => { finishRefresh = resolve; }) : response({ message: "expired" }, 401));
  await fixture.api.storeSessionTokens({ accessToken: "alice-access", refreshToken: "alice-refresh" });
  const old = fixture.api.apiRequest("/workouts/active", { expectedOwnerId: A }); await tick();
  await fixture.api.storeSessionTokens({ accessToken: "bob-access", refreshToken: "bob-refresh" });
  finishRefresh(response({ message: "revoked" }, 401));
  await assert.rejects(old);
  assert.equal(fixture.storage.get("fitsync.refresh-token.v1"), "bob-refresh");
});

test("the expected account header survives a normal token refresh on a retried workout write", async () => {
  let writes = 0;
  const fixture = authFixture(async url => url.endsWith("/auth/refresh") ? response({ accessToken: "fresh-access", refreshToken: "fresh-refresh" }) : ++writes === 1 ? response({}, 401) : response({ ok: true }));
  await fixture.api.storeSessionTokens({ accessToken: "old-access", refreshToken: "old-refresh" });
  await fixture.api.apiRequest("/workouts/sessions/session/sets/set", { method: "PATCH", expectedOwnerId: A, json: { reps: 12 } });
  const requests = fixture.requests.filter(request => !request.url.endsWith("/auth/refresh"));
  assert.equal(requests.length, 2);
  for (const request of requests) assert.equal(request.init.headers["X-FitSync-Owner"], A);
  assert.equal(requests.at(-1).init.headers.Authorization, "Bearer fresh-access");
});

test("serialized SecureStore writes leave the latest login intact when an older disk write is delayed", async () => {
  let completeWrite;
  const fixture = authFixture(async () => response({ ok: true }), { beforeSet: async (_key, value) => { if (value === "alice-refresh") await new Promise(resolve => { completeWrite = resolve; }); } });
  const first = fixture.api.storeSessionTokens({ accessToken: "alice-access", refreshToken: "alice-refresh" }).then(() => null, error => error);
  await tick();
  const second = fixture.api.storeSessionTokens({ accessToken: "bob-access", refreshToken: "bob-refresh" });
  completeWrite(); await second;
  assert.equal((await first).status, 409);
  assert.equal(fixture.storage.get("fitsync.refresh-token.v1"), "bob-refresh");
  await fixture.api.apiRequest("/probe");
  assert.equal(fixture.requests.at(-1).init.headers.Authorization, "Bearer bob-access");
});

test("an old account's response cannot be returned after the login changes while JSON is decoding", async () => {
  let completeBody;
  const fixture = authFixture(async () => ({ status: 200, ok: true, json: async () => new Promise(resolve => { completeBody = resolve; }) }));
  await fixture.api.storeSessionTokens({ accessToken: "alice-access", refreshToken: "alice-refresh" });
  const first = fixture.api.apiRequest("/private-data"); await tick();
  await fixture.api.storeSessionTokens({ accessToken: "bob-access", refreshToken: "bob-refresh" });
  completeBody({ name: "Alice" });
  await assert.rejects(first, /account changed/i);
});

test("a delayed Google login response cannot replace an account established while its body was decoding", async () => {
  let completeBody;
  const fixture = authFixture(async () => ({ status: 200, ok: true, json: async () => new Promise(resolve => { completeBody = resolve; }) }));
  const first = fixture.api.googleBackendLogin("synthetic-google-token"); await tick();
  await fixture.api.storeSessionTokens({ accessToken: "bob-access", refreshToken: "bob-refresh" });
  completeBody({ accessToken: "alice-access", refreshToken: "alice-refresh", user: { id: A } });
  await assert.rejects(first, /account changed/i);
  assert.equal(fixture.storage.get("fitsync.refresh-token.v1"), "bob-refresh");
});

test("simultaneous expired requests for the same session share one refresh", async () => {
  let refreshes = 0;
  const fixture = authFixture(async (url, init) => {
    if (url.endsWith("/auth/refresh")) { refreshes++; await tick(); return response({ accessToken: "fresh-access", refreshToken: "fresh-refresh" }); }
    return init.headers.Authorization === "Bearer fresh-access" ? response({ ok: true }) : response({}, 401);
  });
  await fixture.api.storeSessionTokens({ accessToken: "old-access", refreshToken: "old-refresh" });
  await Promise.all([fixture.api.apiRequest("/first", { expectedOwnerId: A }), fixture.api.apiRequest("/second", { expectedOwnerId: A })]);
  assert.equal(refreshes, 1);
});

function controlledDeadline() {
  const timers = new Map(); let next = 0;
  return {
    setTimeout: (callback, duration) => { assert.equal(duration, 20000); timers.set(++next, callback); return next; },
    clearTimeout: id => { timers.delete(id); },
    fire: () => { assert.equal(timers.size, 1); [...timers.values()][0](); },
    pending: () => timers.size
  };
}

test("a hanging upload aborts at its deadline, retains queued edits, and permits a later same-account retry", async () => {
  const timers = controlledDeadline(); let hang = true; let aborted = false;
  const fixture = authFixture(async (_url, init) => {
    if (!hang) return response({ ok: true });
    return new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => { aborted = true; reject(new Error("AbortError")); }, { once: true }));
  }, timers);
  await fixture.api.storeSessionTokens({ accessToken: "alice-access", refreshToken: "alice-refresh" });
  const { api } = offlineFixture(); await api.cacheWorkout(A, session()); await api.queueSet(A, "set", { reps: 12 });
  const transport = { ...noop, set: async (id, setId, patch) => fixture.api.apiRequest(`/workouts/sessions/${id}/sets/${setId}`, { method: "PATCH", expectedOwnerId: A, json: patch }) };
  const first = api.flushWorkoutDraft(A, () => true, transport); await tick(); timers.fire();
  await assert.rejects(first, error => error.status === 408 && /connection.*retry/i.test(error.message));
  assert.equal(aborted, true); assert.equal(timers.pending(), 0);
  assert.equal(api.draftPending(await api.readWorkoutDraft(A)), 1);
  assert.equal(fixture.storage.get("fitsync.refresh-token.v1"), "alice-refresh");
  hang = false; await api.flushWorkoutDraft(A, () => true, transport);
  assert.equal(api.draftPending(await api.readWorkoutDraft(A)), 0); assert.equal(timers.pending(), 0);
});

test("the request deadline also bounds a stalled JSON body that ignores transport abort", async () => {
  const timers = controlledDeadline(); let signal;
  const fixture = authFixture(async (_url, init) => { signal = init.signal; return { status: 200, ok: true, json: async () => new Promise(() => {}) }; }, timers);
  const first = fixture.api.apiRequest("/private-data"); await tick(); timers.fire();
  await assert.rejects(first, error => error.status === 408);
  assert.equal(signal.aborted, true); assert.equal(timers.pending(), 0);
});

test("Google login and token refresh each have a deadline without clearing saved login on timeout", async () => {
  for (const kind of ["login", "refresh"]) {
    const timers = controlledDeadline(); let signal;
    const fixture = authFixture(async (_url, init) => { signal = init.signal; return new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("AbortError")), { once: true })); }, timers);
    await fixture.api.storeSessionTokens({ accessToken: "alice-access", refreshToken: "alice-refresh" });
    const first = kind === "login" ? fixture.api.googleBackendLogin("synthetic-google-token") : fixture.api.refreshAccessToken();
    await tick(); timers.fire();
    await assert.rejects(first, error => error.status === 408);
    assert.equal(signal.aborted, true); assert.equal(timers.pending(), 0);
    assert.equal(fixture.storage.get("fitsync.refresh-token.v1"), "alice-refresh");
  }
});

class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
function finishFixture(concurrentStatus, initialStatus = "active") {
  let currentStatus = initialStatus; let updates = 0;
  const stored = { ...session(), user_id: A, finished_at: initialStatus === "active" ? null : "2026-11-07T10:30:00Z", elapsed_seconds: 1800 };
  const db = { from: () => {
    const builder = {
      select() { return builder; }, eq() { return builder; },
      update() { updates++; currentStatus = concurrentStatus; return builder; },
      maybeSingle: async () => ({ data: { ...stored, status: currentStatus }, error: null }),
      single: async () => ({ data: { ...stored, status: currentStatus }, error: null }),
      then(resolve) { resolve({ data: [], error: null }); }
    }; return builder;
  } };
  const service = load("../../server/src/modules/workouts/workout.service.ts", {
    "../../config/supabase.js": { db },
    "../../common/errors.js": { ApiError, checkDbError: error => { if (error) throw error; } },
    "../program-follow/program.service.js": { resolveProgramSlot: async () => null, programError: error => { if (error) throw error; } },
    "./workout.order.js": { planPositionChanges: () => [] }
  });
  return { service, updates: () => updates };
}

test("completion losing a race to discard returns conflict, so offline intent is not silently cleared", async () => {
  const fixture = finishFixture("discarded");
  await assert.rejects(fixture.service.finishWorkout(A, "session", "completed", "Saved notes", 1800), error => error instanceof ApiError && error.status === 409);
});

test("a repeated successful completion preserves its original completion time without another update", async () => {
  const fixture = finishFixture("completed", "completed");
  const result = await fixture.service.finishWorkout(A, "session", "completed", "Retry notes", 9999);
  assert.equal(result.finished_at, "2026-11-07T10:30:00Z"); assert.equal(result.elapsed_seconds, 1800); assert.equal(fixture.updates(), 0);
});
