import test from "node:test";
import assert from "node:assert/strict";
import {
  addFoodToLibrary,
  dayNutrition,
  emptyDiary,
  portionNutrition,
  storeFoodEntry,
  validateEntry,
  zeroNutrients,
} from "../src/features/nutrition/model.ts";

const food = (change = {}) => ({
  id: "oats",
  date: "2020-01-01",
  meal: "breakfast",
  name: "Rolled oats",
  quantity: 60,
  unit: "g",
  basisAmount: 100,
  nutrition: { calories: 380, protein: 13, carbs: 68, fat: 7, fiber: 10, sugar: 1, sodium: 2 },
  status: "eaten",
  time: "08:30",
  remind: false,
  note: "",
  ...change,
});

test("label nutrition scales with the actual portion, including fractional servings", () => {
  assert.deepEqual(portionNutrition(food()), {
    calories: 228,
    protein: 7.8,
    carbs: 40.8,
    fat: 4.2,
    fiber: 6,
    sugar: 0.6,
    sodium: 1.2,
  });
  assert.equal(
    portionNutrition(food({ quantity: 1.5, unit: "serving", basisAmount: 1 })).calories,
    570,
  );
  assert.equal(
    portionNutrition(food({ quantity: 250, unit: "ml", basisAmount: 100 })).calories,
    950,
  );
});

test("day totals distinguish planned and eaten food without mixing calendar dates", () => {
  const entries = [
    food(),
    food({ id: "plan", quantity: 100, status: "planned" }),
    food({ id: "other", date: "2020-01-02" }),
  ];
  assert.equal(dayNutrition(entries, "2020-01-01").calories, 608);
  assert.equal(dayNutrition(entries, "2020-01-01", "eaten").calories, 228);
  assert.equal(dayNutrition(entries, "2020-01-01", "planned").calories, 380);
  assert.deepEqual(dayNutrition(entries, "2020-01-03"), zeroNutrients());
});

test("invalid numeric fields cannot create NaN or infinity in visible totals", () => {
  for (const amount of [NaN, Infinity, -1, 0]) {
    assert.deepEqual(portionNutrition(food({ quantity: amount })), zeroNutrients());
    assert.deepEqual(portionNutrition(food({ basisAmount: amount })), zeroNutrients());
  }
  const broken = food({
    nutrition: { ...zeroNutrients(), calories: NaN, protein: Infinity, carbs: -1 },
  });
  assert.deepEqual(portionNutrition(broken), zeroNutrients());
  assert.throws(() => validateEntry(broken, "2020-01-01"), /calories/);
});

test("validation rejects impossible dates, invalid metadata and portions outside journal ranges", () => {
  for (const date of ["2020-02-30", "2020-13-01", "20-01-01", "2020-1-1"]) {
    assert.throws(() => validateEntry(food({ date }), "2020-01-01"), /calendar date/);
  }
  assert.doesNotThrow(() => validateEntry(food({ date: "2020-02-29" }), "2020-02-29"));
  assert.throws(() => validateEntry(food({ name: " " }), "2020-01-01"), /food name/);
  assert.throws(() => validateEntry(food({ meal: "toString" }), "2020-01-01"), /meal/);
  assert.throws(() => validateEntry(food({ quantity: 0 }), "2020-01-01"), /greater than zero/);
  assert.throws(() => validateEntry(food({ basisAmount: 0 }), "2020-01-01"), /label amount/);
  assert.throws(() => validateEntry(food({ quantity: 100_000 }), "2020-01-01"), /calories/);
  assert.throws(() => validateEntry(food({ time: "24:00" }), "2020-01-01"), /meal time/);
  assert.throws(
    () => validateEntry(food({ nutrition: { ...zeroNutrients(), sodium: 30_001 } }), "2020-01-01"),
    /sodium/,
  );
});

test("future meals are plans until the selected calendar day arrives", () => {
  const tomorrow = food({ date: "2020-01-02", remind: true });
  assert.throws(() => validateEntry(tomorrow, "2020-01-01"), /Future meals/);
  assert.doesNotThrow(() => validateEntry({ ...tomorrow, status: "planned" }, "2020-01-01"));
  assert.doesNotThrow(() => validateEntry(tomorrow, "2020-01-02"));
});

test("saving edits replaces a meal and automatically reuses equivalent food labels", () => {
  let diary = storeFoodEntry(emptyDiary(), food());
  diary = storeFoodEntry(diary, food({ quantity: 80 }));
  diary = storeFoodEntry(
    diary,
    food({ id: "again", name: "  ROLLED   OATS  ", quantity: 100, meal: "snack" }),
  );
  assert.equal(diary.entries.length, 2);
  assert.equal(diary.entries[0].quantity, 80);
  assert.equal(diary.library.length, 1);
  assert.equal(diary.library[0].basisAmount, 100);
  assert.equal(diary.library[0].nutrition.calories, 380);
  diary = addFoodToLibrary(diary, food({ nutrition: { ...food().nutrition, calories: 400 } }));
  assert.equal(diary.library.length, 2, "a different recipe keeps its own label values");
  assert.equal(diary.library[0].nutrition.calories, 380);
});
