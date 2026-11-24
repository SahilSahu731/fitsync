import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as config from "../src/components/onboarding/config.ts";

const tick = () => new Promise((resolve) => setImmediate(resolve));
test("account deletion drains onboarding autosaves and prevents a stale draft from returning", async () => {
  const slots = [],
    effects = [];
  const storage = new Map([["@fitsync/onboarding/v3/bob", "keep"]]);
  let cursor = 0,
    release,
    started;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const began = new Promise((resolve) => {
    started = resolve;
  });
  const same = (a, b) => a && a.length === b.length && a.every((value, i) => value === b[i]);
  const react = {
    useRef(value) {
      const index = cursor++;
      return (slots[index] ??= { current: value });
    },
    useState(initial) {
      const index = cursor++;
      slots[index] ??= { value: typeof initial === "function" ? initial() : initial };
      return [
        slots[index].value,
        (value) => {
          slots[index].value = typeof value === "function" ? value(slots[index].value) : value;
        },
      ];
    },
    useEffect(fn, deps) {
      const index = cursor++;
      if (!same(slots[index]?.deps, deps)) effects.push({ index, fn, deps });
    },
  };
  const modules = {
    react,
    "./config": config,
    "@react-native-async-storage/async-storage": {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, value) => {
        started();
        await gate;
        storage.set(key, value);
      },
      removeItem: async (key) => storage.delete(key),
    },
  };
  const exports = {};
  const source = readFileSync(
    new URL("../src/components/onboarding/use-onboarding-draft.ts", import.meta.url),
    "utf8",
  );
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    {
      exports,
      require(name) {
        assert.ok(name in modules, name);
        return modules[name];
      },
    },
  );
  function render() {
    cursor = 0;
    const value = exports.useOnboardingDraft("alice");
    for (const effect of effects.splice(0)) {
      slots[effect.index]?.cleanup?.();
      slots[effect.index] = { deps: effect.deps, cleanup: effect.fn() };
    }
    return value;
  }
  render();
  await tick();
  render();
  await began;
  const deleting = exports.deleteOnboardingDraft("alice");
  release();
  await deleting;
  const form = render();
  form.setDraft({ ...form.draft, weightKg: 80 });
  render();
  await tick();
  assert.equal(storage.has("@fitsync/onboarding/v3/alice"), false);
  assert.equal(storage.get("@fitsync/onboarding/v3/bob"), "keep");
});
