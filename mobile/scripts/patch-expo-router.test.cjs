const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const patchExpoRouter = require("./patch-expo-router.cjs");

const file = path.join(
  path.dirname(require.resolve("expo-router/package.json")),
  "build/fork/useLinking.native.js",
);

test("router patch is idempotent and defers initial-link updates until mount", () => {
  patchExpoRouter();
  const source = fs.readFileSync(file, "utf8");
  patchExpoRouter();
  assert.equal(fs.readFileSync(file, "utf8"), source);
  const start = source.indexOf("    const initialLinkLifecycle");
  const end = source.indexOf("    const getInitialState", start);
  assert.ok(start > 0 && end > start);
  const calls = [];
  let mount;
  const context = {
    react_1: {
      useRef: (value) => ({ current: value }),
      useCallback: (fn) => fn,
      useEffect: (fn) => {
        mount = fn;
      },
    },
    onUnhandledLinking: (value) => calls.push(value),
  };
  vm.createContext(context);
  vm.runInContext(
    source.slice(start, end) + "\nglobalThis.report = reportInitialLink;",
    context,
  );
  context.report("/exercises/123");
  assert.deepEqual(calls, []);
  const unmount = mount();
  assert.deepEqual(calls, ["/exercises/123"]);
  context.report("/workout-templates");
  assert.equal(calls.length, 2);
  unmount();
  context.report("/late-link");
  assert.equal(calls.length, 2);
  mount();
  assert.deepEqual(calls, [
    "/exercises/123",
    "/workout-templates",
    "/late-link",
  ]);
  const initialHandler = source.slice(
    end,
    source.indexOf("    (0, react_1.useEffect)", end),
  );
  assert.equal(initialHandler.includes("onUnhandledLinking("), false);
});
