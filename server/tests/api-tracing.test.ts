import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createApiTracing } from "../src/common/api-tracing.js";

const options = {
  projectToken: "phc_test",
  host: "https://eu.i.posthog.com",
  sampleRate: 1,
  environment: "staging",
};
const timing = {
  method: "GET",
  route: "/api/workouts/sessions/:id",
  status: 200,
  durationMs: 4.25,
};

test("sends sampled server spans as a single authenticated OTLP batch, without request data", async (t) => {
  const calls: RequestInit[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, "https://eu.i.posthog.com/i/v1/traces");
    calls.push(init);
    return new Response();
  });
  const tracing = createApiTracing(options);
  tracing.record(timing);
  tracing.record({ ...timing, route: "/api/share?token=private", method: "private", status: 503 });
  assert.equal(calls.length, 0);
  await tracing.flush();
  assert.equal(calls.length, 1);
  const call = calls[0];
  assert.deepEqual(call.headers, {
    Authorization: "Bearer phc_test",
    "Content-Type": "application/json",
  });
  assert.equal(call.redirect, "error");
  assert.ok(call.signal instanceof AbortSignal);
  assert.doesNotMatch(String(call.body), /private|phc_test/);
  const [resource] = JSON.parse(String(call.body)).resourceSpans;
  assert.deepEqual(
    resource.resource.attributes.map((attr: any) => attr.value.stringValue),
    ["fitsync-api", "staging"],
  );
  const [first, failed] = resource.scopeSpans[0].spans;
  assert.equal(first.name, "GET /api/workouts/sessions/:id");
  assert.match(first.traceId, /^[0-9a-f]{32}$/);
  assert.match(first.spanId, /^[0-9a-f]{16}$/);
  assert.notEqual(first.traceId, failed.traceId);
  assert.equal(BigInt(first.endTimeUnixNano) - BigInt(first.startTimeUnixNano), 4_250_000n);
  assert.deepEqual(first.attributes.at(-1), {
    key: "http.response.status_code",
    value: { intValue: "200" },
  });
  assert.equal(failed.name, "_OTHER /api/unmatched");
  assert.equal(failed.status.code, 2);
});

test("disabled tracing and untrusted ingestion hosts send nothing", async (t) => {
  const send = t.mock.method(globalThis, "fetch", async () => new Response());
  for (const override of [
    { sampleRate: 0 },
    { projectToken: undefined },
    { host: "https://example.org" },
  ]) {
    const tracing = createApiTracing({ ...options, ...override });
    tracing.record(timing);
    await tracing.flush();
  }
  assert.equal(send.mock.callCount(), 0);
});

test("a full queue is bounded and shutdown waits for a batch recorded during an export", async (t) => {
  let finishFirst!: (response: Response) => void;
  const first = new Promise<Response>((resolve) => {
    finishFirst = resolve;
  });
  const batchSizes: number[] = [];
  t.mock.method(globalThis, "fetch", (_url: string, init: RequestInit) => {
    const spans = JSON.parse(String(init.body)).resourceSpans[0].scopeSpans[0].spans;
    batchSizes.push(spans.length);
    return batchSizes.length === 1 ? first : Promise.resolve(new Response());
  });
  const tracing = createApiTracing(options);
  for (let i = 0; i < 100; i++) tracing.record(timing);
  const pending = tracing.flush();
  tracing.record(timing);
  const shutdown = tracing.flush();
  assert.deepEqual(batchSizes, [32]);
  finishFirst(new Response());
  await Promise.all([pending, shutdown]);
  assert.deepEqual(batchSizes, [32, 1]);
});

test("delivery outages drop batches and warn once without failing API shutdown", async (t) => {
  const warnings = t.mock.method(console, "warn", () => {});
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("private URL");
  });
  const tracing = createApiTracing(options);
  for (let i = 0; i < 2; i++) {
    tracing.record(timing);
    await tracing.flush();
  }
  assert.equal(warnings.mock.callCount(), 1);
  assert.deepEqual(warnings.mock.calls[0].arguments, ["PostHog API trace export failed."]);
});

test("Express exports one timing for a matched API route and excludes health probes and URL values", async (t) => {
  Object.assign(process.env, {
    NODE_ENV: "test",
    POSTHOG_PROJECT_TOKEN: options.projectToken,
    POSTHOG_HOST: options.host,
    POSTHOG_TRACE_SAMPLE_RATE: "1",
    SUPABASE_URL: "https://example.test",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real",
    GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com",
    JWT_SECRET: "test-secret-".repeat(6),
    CLOUDINARY_CLOUD_NAME: "test",
    CLOUDINARY_API_KEY: "test",
    CLOUDINARY_API_SECRET: "test",
  });
  const { default: express } = await import("express");
  const { requestLog, flushApiTracing } = await import("../src/middleware/request-log.js");
  const app = express();
  app.use(requestLog);
  const router = express.Router();
  router.get("/sessions/:id", (_req, res) => res.sendStatus(200));
  app.use("/api/workouts", router);
  app.get("/health", (_req, res) => res.sendStatus(200));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const callLocal = globalThis.fetch.bind(globalThis);
  let batch = "";
  t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    batch = String(init.body);
    return new Response();
  });
  const logger = t.mock.method(console, "log", () => {});
  assert.equal((await callLocal(base + "/health")).status, 200);
  const response = await callLocal(base + "/api/workouts/sessions/private-id?sensitive=123");
  const requestId = response.headers.get("X-Request-ID");
  assert.ok(requestId);
  await flushApiTracing();
  assert.equal(logger.mock.callCount(), 0);
  assert.ok(!batch.includes(requestId));
  assert.doesNotMatch(batch, /private-id|sensitive|health/);
  const spans = JSON.parse(batch).resourceSpans[0].scopeSpans[0].spans;
  assert.deepEqual(
    spans.map((span: { name: string }) => span.name),
    ["GET /api/workouts/sessions/:id"],
  );
});
