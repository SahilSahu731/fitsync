import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
test("meal and accountability requests include their account and selected week", async () => {
  const source = readFileSync(new URL("../src/features/wellness/api.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {}; const calls = [];
  vm.runInNewContext(js, { exports, require: () => ({ apiRequest: async (path, options) => { calls.push({ path, ...options }); return {}; } }) });
  const api = exports.wellnessForOwner("alice");
  await api.state("2026-11-02"); await api.recipes(); await api.partners("2026-11-02");
  await api.plan("2026-11-02"); await api.preferences({ favoriteIds: ["meal"] });
  await api.checkIn("2026-11-02", "2026-11-07", true, "2026-11-07");
  await api.invite(); await api.join("invitation"); await api.removePartner("peer");
  for (const request of calls) assert.equal(request.expectedOwnerId, "alice");
  assert.equal(calls[0].path, "/wellness/state?week=2026-11-02");
  assert.equal(calls[3].json.week, "2026-11-02");
  assert.equal(calls[5].json.date, "2026-11-07");
});

function model() {
  const source = readFileSync(new URL("../src/features/wellness/model.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {}; vm.runInNewContext(js, { exports }); return exports;
}
const logic = model();
const preferences = { diet: "any", exclude: [], servings: 1, maxPrepMinutes: 30, favoriteIds: [] };
test("meal filters respect diet, preparation time, excluded ingredients and meal slot together", () => {
  const recipes = [
    { id: "vegan-fast", diet: "vegan", minutes: 10, contains: [], meal: "dinner" },
    { id: "vegan-soy", diet: "vegan", minutes: 10, contains: ["soy"], meal: "dinner" },
    { id: "vegetarian", diet: "vegetarian", minutes: 10, contains: ["dairy"], meal: "dinner" },
    { id: "meat", diet: "any", minutes: 10, contains: [], meal: "dinner" },
    { id: "slow", diet: "vegan", minutes: 45, contains: [], meal: "dinner" },
    { id: "lunch", diet: "vegan", minutes: 10, contains: [], meal: "lunch" },
  ];
  assert.equal(logic.matchingMeals(recipes, { ...preferences, diet: "vegan", exclude: ["soy"], maxPrepMinutes: 10 }, "dinner").map(value => value.id).join(","), "vegan-fast");
  assert.equal(logic.matchingMeals(recipes, { ...preferences, diet: "vegetarian", exclude: ["dairy", "soy"] }, "dinner").map(value => value.id).join(","), "vegan-fast");
  assert.equal(recipes.length, 6);
});
test("saved menu snapshots detect changed preferences while older menus remain explicitly unknown", () => {
  assert.equal(logic.menuPreferenceStatus({ preferences }, preferences), "current");
  assert.equal(logic.menuPreferenceStatus({}, preferences), "unknown");
  for (const change of [{ diet: "vegan" }, { exclude: ["nuts"] }, { servings: 2 }, { maxPrepMinutes: 10 }, { favoriteIds: ["meal"] }]) {
    assert.equal(logic.menuPreferenceStatus({ preferences }, { ...preferences, ...change }), "changed");
  }
  assert.equal(logic.preferencesEqual({ ...preferences, exclude: ["soy", "dairy"], favoriteIds: ["a", "b"] }, { ...preferences, exclude: ["dairy", "soy"], favoriteIds: ["b", "a"] }), true);
});
test("favorite saves preserve persisted preferences and leave unsaved draft edits independent", () => {
  const draft = { ...preferences, diet: "vegan", maxPrepMinutes: 10 };
  const saved = logic.favoritePreferences(preferences, "lentil");
  assert.equal(saved.diet, "any"); assert.equal(saved.maxPrepMinutes, 30);
  assert.equal(saved.favoriteIds.join(","), "lentil");
  const updatedDraft = { ...draft, favoriteIds: saved.favoriteIds };
  assert.equal(updatedDraft.diet, "vegan"); assert.equal(updatedDraft.maxPrepMinutes, 10);
  assert.equal(preferences.favoriteIds.length, 0);
  assert.equal(logic.favoritePreferences(saved, "lentil").favoriteIds.length, 0);
});
