import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");

test("vendored source matches recorded provenance with only the documented decoder export change", () => {
  for (const name of ["query-string", "decode-uri-component"]) {
    const pkg = require(path.join(root, "vendor", name, "package.json"));
    let source = readFileSync(
      path.join(root, "vendor", name, name === "query-string" ? "index.js" : "index.cjs"),
      "utf8",
    );
    if (name === "decode-uri-component")
      source = source.replace(
        "module.exports = function decodeUriComponent",
        "export default function decodeUriComponent",
      );
    assert.equal(
      createHash("sha256").update(source).digest("hex"),
      pkg.fitsyncVendor.upstreamSourceSha256,
    );
    assert.match(
      readFileSync(path.join(root, "vendor", name, "license"), "utf8"),
      /Permission is hereby granted/,
    );
  }
});

test("actual Router consumers decode malformed inputs in a bounded child process", () => {
  const script = `
    const assert = require('node:assert/strict');
    const {getStateFromPath} = require('expo-router/build/react-navigation/core/getStateFromPath.js');
    const {getPathFromState} = require('expo-router/build/react-navigation/core/getPathFromState.js');
    const state = getStateFromPath('workout?note=caf%C3%A9&tag=one&tag=two');
    assert.equal(state.routes[0].params.note, 'café');
    assert.deepEqual(state.routes[0].params.tag, ['one', 'two']);
    assert.equal(getStateFromPath(getPathFromState(state)).routes[0].params.note, 'café');
    let malformed = '';
    for (let i = 0; i < 32000; i++) malformed += '%' + Math.floor(i / 256).toString(16).padStart(2, '0') + '%' + (i % 256).toString(16).padStart(2, '0') + 'x';
    malformed += '%zz';
    for (const input of [malformed, '%C2'.repeat(20000), '%FE%FF'.repeat(10000)]) {
      const route = getStateFromPath('workout?note=' + input).routes[0];
      assert.equal(typeof route.params.note, 'string');
      assert.ok(route.params.note.length > 0);
    }
  `;
  const child = spawnSync(process.execPath, ["-e", script], {
    cwd: root,
    timeout: 10000,
    encoding: "utf8",
  });
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr);
});
