import test from "node:test";
import assert from "node:assert/strict";
import { isPublicCatalogRead } from "../../web/src/lib/catalog-access.ts";
const id = "a9e2a4fd-3b36-4065-b4a0-a1b96a97df46";
test("published catalog browsing is available without sign-in", () => {
  for (const kind of ["programs", "routines", "categories"]) assert.equal(isPublicCatalogRead("GET", ["catalog", kind]), true);
  assert.equal(isPublicCatalogRead("GET", ["catalog", "routines", id]), true);
});
test("admin, personal records, saves, and writes remain private", () => {
  for (const path of [["catalog", "admin", "routines"], ["catalog", "my-routines"], ["catalog", "my-programs"], ["catalog", "programs", id, "save"], ["catalog", "routines", "bad-id"], ["me"]]) assert.equal(isPublicCatalogRead("GET", path), false);
  for (const method of ["POST", "PATCH", "DELETE", "PUT"]) assert.equal(isPublicCatalogRead(method, ["catalog", "routines", id]), false);
});
