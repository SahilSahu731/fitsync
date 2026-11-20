import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
const exports = {};
const code = ts.transpileModule(
  readFileSync(new URL("../src/lib/proxy-identity.ts", import.meta.url), "utf8"),
  {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  },
).outputText;
vm.runInNewContext(code, { exports, require: createRequire(import.meta.url) });
const { proxyIdentity } = exports;

test("web proxy forwards only the ingress-selected IP under its server secret", () => {
  assert.deepEqual(
    {
      ...proxyIdentity(
        new Headers({ "x-forwarded-for": "192.0.2.1, 198.51.100.2" }),
        "server-secret",
      ),
    },
    {
      "X-FitSync-Proxy-Secret": "server-secret",
      "X-FitSync-Client-IP": "198.51.100.2",
    },
  );
  for (const value of ["unknown", "192.0.2.1:1234", "198.51.100.2, invalid"]) {
    assert.deepEqual(
      { ...proxyIdentity(new Headers({ "x-forwarded-for": value }), "server-secret") },
      {},
    );
  }
  assert.deepEqual({ ...proxyIdentity(new Headers(), "server-secret") }, {});
  assert.deepEqual(
    { ...proxyIdentity(new Headers({ "x-forwarded-for": "198.51.100.2" }), undefined) },
    {},
  );
});
