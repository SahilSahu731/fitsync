import test from "node:test";
import assert from "node:assert/strict";
import { parseExperience, DEFAULT_EXPERIENCE } from "../src/features/experience/model.ts";

test("corrupt or missing device preferences fall back without blocking startup", () => {
  for (const value of [null, "", "{broken", "null", "false", "[]", "42"])
    assert.deepEqual(parseExperience(value), DEFAULT_EXPERIENCE);
});
test("boolean preferences survive restart while unknown and malformed fields are ignored", () => {
  assert.deepEqual(parseExperience(JSON.stringify({ sounds: false, haptics: false, reduceMotion: true, keepAwake: false, extra: true })), { sounds: false, haptics: false, reduceMotion: true, keepAwake: false });
  assert.deepEqual(parseExperience('{"sounds":"false","haptics":0}'), DEFAULT_EXPERIENCE);
  assert.notEqual(parseExperience(null), DEFAULT_EXPERIENCE);
});
