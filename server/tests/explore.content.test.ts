import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resourceSchema, toolSchema, calculatorIds } from "../src/modules/explore/explore.schema.js";

const seeds = JSON.parse(readFileSync(new URL("../src/modules/explore/explore.seed-data.json", import.meta.url), "utf8").replaceAll(/asset:[a-z]+/g, "https://example.com/movement.webp"));
test("curated catalog has ten useful entries per section and implemented calculator keys", () => {
  for (const kind of ["guide", "mobility"]) assert.ok(seeds.resources.filter((r: { kind: string }) => r.kind === kind).length >= 10);
  assert.ok(seeds.tools.length >= 10);
  assert.equal(new Set([...seeds.resources, ...seeds.tools].map(r => r.slug)).size, seeds.resources.length + seeds.tools.length);
  for (const row of seeds.resources) { assert.ok(resourceSchema.safeParse(row).success, row.slug); if (row.kind === "mobility") assert.ok(row.steps.every((s: { image_url: string; modification: string }) => s.image_url && s.modification)); }
  for (const row of seeds.tools) { assert.ok(toolSchema.safeParse(row).success, row.slug); assert.ok(calculatorIds.includes(row.calculator_key)); }
});
test("drafts allow incomplete contents while publication validates media, timers and calculator keys", () => {
  const mobility = seeds.resources.find((r: { kind: string }) => r.kind === "mobility");
  assert.equal(resourceSchema.safeParse({ ...mobility, published: false, steps: [], cover_url: null }).success, true);
  assert.equal(resourceSchema.safeParse({ ...mobility, steps: [] }).success, false);
  assert.equal(resourceSchema.safeParse({ ...mobility, duration_minutes: 99 }).success, false);
  assert.equal(resourceSchema.safeParse({ ...mobility, cover_url: "javascript:alert(1)" }).success, false);
  assert.equal(toolSchema.safeParse({ ...seeds.tools[0], calculator_key: "unimplemented" }).success, false);
  assert.equal(toolSchema.safeParse({ ...seeds.tools[0], example: "" }).success, false);
});

import { storeTool, readTool, TOOL_TAG } from "../src/modules/explore/explore.tools.js";
test("calculator storage preserves editable metadata without exposing system tags in the editor", () => {
  for (const source of seeds.tools) {
    const stored = storeTool(source);
    assert.ok(stored.tags.includes(TOOL_TAG));
    const decoded = readTool(stored) as Record<string, unknown>;
    for (const key of ["slug", "title", "summary", "calculator_key", "explanation", "example", "cover_url", "published"]) assert.equal(decoded[key], source[key]);
    assert.equal("tags" in decoded, false);
  }
  const guide = seeds.resources.find((row: { kind: string }) => row.kind === "guide");
  assert.equal(resourceSchema.safeParse({ ...guide, tags: [TOOL_TAG] }).success, false);
});
