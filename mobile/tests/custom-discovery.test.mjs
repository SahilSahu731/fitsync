import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(file, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    Date,
    Map,
    Set,
    Promise,
    require(name) {
      if (name === "./custom-discovery") return discovery;
      if (!(name in dependencies)) throw Error(`Unexpected dependency ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}
const discovery = load("../src/features/exercises/custom-discovery.ts");
const exercise = (id, changes = {}) => ({
  id,
  name: `My lift ${id}`,
  status: "published",
  isCustom: true,
  category: "strength",
  trackingType: "reps_weight",
  regionLabel: "Upper body",
  primaryMuscles: ["chest"],
  secondaryMuscles: ["triceps"],
  equipment: ["dumbbell"],
  media: [],
  ...changes,
});

test("My exercises searches the full owned collection, removes archived rows and duplicate IDs", () => {
  const exercises = [
    exercise("b"),
    exercise("b"),
    exercise("a", { name: "Cable press" }),
    exercise("old", { status: "archived" }),
    exercise("draft", { status: "draft" }),
  ];
  assert.equal(
    discovery
      .filterCustomExercises(exercises)
      .map((row) => row.id)
      .join(","),
    "a,b",
  );
  assert.equal(
    discovery
      .filterCustomExercises(exercises, "press chest dumbbell")
      .map((row) => row.id)
      .join(","),
    "a",
  );
  assert.equal(
    discovery.filterCustomExercises(exercises, "triceps", {
      equipment: "dumbbell",
      category: "strength",
    }).length,
    2,
  );
  assert.equal(discovery.filterCustomExercises(exercises, "", { muscle: "hamstrings" }).length, 0);
  assert.equal(discovery.filterCustomExercises(exercises, "", { category: "cardio" }).length, 0);
});

test("custom selection keeps the catalog ID and tracking type used by workouts and routines", () => {
  const row = discovery.customPickerExercise(
    exercise("custom-uuid", {
      trackingType: "duration",
      media: [
        { kind: "video", url: "video" },
        { kind: "image", url: "image" },
      ],
    }),
  );
  assert.equal(row.id, "custom-uuid");
  assert.equal(row.trackingType, "duration");
  assert.equal(row.isCustom, true);
  assert.equal(row.imageUrl, "image");
});

test("natural muscle and equipment labels match hyphenated taxonomy codes", () => {
  const rows = [
    exercise("row", {
      name: "My row",
      primaryMuscles: ["upper-back"],
      secondaryMuscles: ["front-delts"],
      equipment: ["pull-up-bar"],
    }),
  ];
  assert.equal(discovery.filterCustomExercises(rows, "upper back").length, 1);
  assert.equal(discovery.filterCustomExercises(rows, "front delts").length, 1);
  assert.equal(discovery.filterCustomExercises(rows, "pull up bar upper-back").length, 1);
  assert.equal(
    discovery.filterCustomExercises(rows, "upper back", { muscle: "upper-back" }).length,
    1,
  );
});

test("My picker paginates after filtering and never needs Pro or the public catalog", async () => {
  const calls = [];
  const rows = Array.from({ length: 37 }, (_, index) => exercise(String(index).padStart(2, "0")));
  rows.push(exercise("archived", { status: "archived" }));
  const picker = load("../src/features/exercises/picker-cache.ts", {
    "@/src/services/api": {
      apiSessionKey: () => 1,
      apiRequest: async (path, options) => {
        calls.push([path, options]);
        return rows;
      },
    },
  });
  const options = { scope: "custom", ownerId: "alice" };
  const first = await picker.loadPickerPage("", 1, options);
  const last = await picker.loadPickerPage("", 3, options);
  assert.equal(first.items.length, 15);
  assert.equal(first.hasMore, true);
  assert.equal(last.items.length, 7);
  assert.equal(last.hasMore, false);
  assert.equal((await picker.loadPickerPage("36", 1, options)).items[0].id, "36");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/exercises/custom");
  assert.equal(calls[0][1].expectedOwnerId, "alice");
  assert.equal((await picker.loadPickerPage("", 1, { scope: "custom" })).items.length, 0);
  assert.equal(calls.length, 1);
});

test("custom and public caches stay separate, account-safe and refresh subscribed lists after edits", async () => {
  let generation = 1,
    version = 1,
    notices = 0;
  const calls = [];
  const picker = load("../src/features/exercises/picker-cache.ts", {
    "@/src/services/api": {
      apiSessionKey: () => generation,
      apiRequest: async (path, options) => {
        calls.push(path);
        return path === "/exercises/custom"
          ? [exercise(`${options.expectedOwnerId}-${version}`)]
          : { items: [{ id: "public" }], hasMore: false };
      },
    },
  });
  const stop = picker.subscribePickerCache(() => notices++);
  const alice = { scope: "custom", ownerId: "alice" };
  assert.equal((await picker.loadPickerPage("", 1, alice)).items[0].id, "alice-1");
  assert.equal((await picker.loadPickerPage("", 1)).items[0].id, "public");
  generation++;
  assert.equal(picker.cachedPickerPage("", 1, alice), undefined);
  assert.equal(
    (await picker.loadPickerPage("", 1, { scope: "custom", ownerId: "bob" })).items[0].id,
    "bob-1",
  );
  version++;
  picker.clearPickerCache();
  assert.equal(notices, 1);
  assert.equal(
    (await picker.loadPickerPage("", 1, { scope: "custom", ownerId: "bob" })).items[0].id,
    "bob-2",
  );
  stop();
  picker.clearPickerCache();
  assert.equal(notices, 1);
  assert.equal(calls.length, 4);
});

test("an invalidated in-flight result cannot repopulate the new picker cache", async () => {
  let resolve;
  const picker = load("../src/features/exercises/picker-cache.ts", {
    "@/src/services/api": {
      apiSessionKey: () => 1,
      apiRequest: () =>
        new Promise((done) => {
          resolve = done;
        }),
    },
  });
  const pending = picker.loadPickerPage("", 1);
  picker.clearPickerCache();
  resolve({ items: [{ id: "outdated" }], hasMore: false });
  await pending;
  assert.equal(picker.cachedPickerPage("", 1), undefined);
});
