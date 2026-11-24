import test from "node:test";
import assert from "node:assert/strict";
import { createShutdown } from "../src/common/shutdown.js";
import { isDraining } from "../src/common/lifecycle.js";

function fixture(flush: () => Promise<void> = async () => {}) {
  const calls: string[] = [];
  const exits: number[] = [];
  let onClosed: () => Promise<void>;
  const server = {
    close(callback: () => Promise<void>) {
      calls.push("stop-accepting");
      onClosed = callback;
    },
    closeIdleConnections() {
      calls.push("close-idle");
    },
    closeAllConnections() {
      calls.push("force-close");
    },
  };
  return {
    calls,
    exits,
    shutdown: createShutdown(server as any, flush, (code) => {
      exits.push(code);
    }),
    complete: () => onClosed(),
  };
}
test("shutdown drains requests once, then flushes monitoring before exiting", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let flushed = false;
  const f = fixture(async () => {
    flushed = true;
  });
  f.shutdown(0);
  f.shutdown(0);
  assert.equal(isDraining(), true);
  assert.deepEqual(f.calls, ["stop-accepting", "close-idle"]);
  assert.deepEqual(f.exits, []);
  assert.equal(flushed, false);
  await f.complete();
  assert.equal(flushed, true);
  assert.deepEqual(f.exits, [0]);
  t.mock.timers.tick(25_000);
  assert.deepEqual(f.exits, [0]);
});
test("a stalled request is force-closed at the shutdown deadline", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = fixture();
  f.shutdown(0);
  t.mock.timers.tick(24_999);
  assert.deepEqual(f.exits, []);
  t.mock.timers.tick(1);
  assert.equal(f.calls.at(-1), "force-close");
  assert.deepEqual(f.exits, [1]);
});
test("the deadline also bounds monitoring flush after requests finish", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = fixture(() => new Promise(() => {}));
  f.shutdown(0);
  void f.complete();
  t.mock.timers.tick(25_000);
  assert.deepEqual(f.exits, [1]);
});
test("fatal failures during draining retain a nonzero exit status", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = fixture();
  f.shutdown(0);
  f.shutdown(1);
  await f.complete();
  assert.deepEqual(f.exits, [1]);
});
