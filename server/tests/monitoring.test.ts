import test from "node:test";
import assert from "node:assert/strict";
import { reportError, flushMonitoring } from "../src/common/monitoring.js";

test("monitoring sends only bounded, non-personal error metadata and survives delivery failures", async (t) => {
  const original = process.env.SENTRY_DSN;
  process.env.SENTRY_DSN = "https://publickey@sentry.example.test/42";
  const logs: string[] = [];
  t.mock.method(console, "error", (entry: string) => {
    logs.push(entry);
  });
  const envelopes: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: any, init: any) => {
    assert.equal(url, "https://sentry.example.test/api/42/envelope/");
    assert.ok(init.signal instanceof AbortSignal);
    envelopes.push(init.body);
    if (envelopes.length === 2) throw new Error("private network response");
    return new Response("", { status: 200 });
  });
  try {
    const error = new Error("health=81kg token=secret user@example.test");
    error.stack = `${error.message}\n    at fake (file:///private/health81kg.ts:80:1)\n    at save (file:///private/home/api/src/app.ts:22:5)`;
    reportError(error, "http");
    await flushMonitoring();
    const [header, item, event] = envelopes[0]
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.match(header.event_id, /^[a-f0-9]{32}$/);
    assert.equal(item.type, "event");
    assert.deepEqual(event.exception.values[0].stacktrace.frames, [
      { filename: "app.ts", lineno: 22, colno: 5 },
    ]);
    assert.equal(event.tags.category, "http");
    for (const field of ["request", "user", "breadcrumbs", "extra"])
      assert.equal(event[field], undefined);
    assert.doesNotMatch(
      envelopes[0] + logs.join(""),
      /81kg|token=|secret|user@example|private\/home/,
    );
    for (let i = 0; i < 20; i++) reportError(error, "reminders");
    await flushMonitoring();
    assert.equal(envelopes.length, 10); // Global cap prevents reporting storms.
    assert.ok(logs.some((line) => line.includes("monitoring_delivery")));
  } finally {
    if (original === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = original;
  }
});
