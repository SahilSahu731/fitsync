export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";
export type FoodUnit = "g" | "ml" | "serving";
export type Nutrients = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
};

/** Nutrition is recorded for basisAmount, in the same unit as quantity. */
export type FoodEntry = {
  id: string;
  date: string;
  meal: MealSlot;
  name: string;
  quantity: number;
  unit: FoodUnit;
  basisAmount: number;
  nutrition: Nutrients;
  status: "planned" | "eaten";
  time: string;
  remind: boolean;
  note: string;
};

export type StoredFood = Pick<FoodEntry, "id" | "name" | "unit" | "basisAmount" | "nutrition">;
export type FoodDiary = { version: 1; entries: FoodEntry[]; library: StoredFood[] };

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export const NUTRIENT_KEYS: (keyof Nutrients)[] = [
  "calories",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "sugar",
  "sodium",
];

// These match the progress journal's daily tracking ranges. They are input
// boundaries rather than suggested dietary targets.
const LIMITS: Nutrients = {
  calories: 20_000,
  protein: 1_000,
  carbs: 2_000,
  fat: 1_000,
  fiber: 300,
  sugar: 1_000,
  sodium: 30_000,
};

export function localDate(value = new Date()): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function zeroNutrients(): Nutrients {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
}

export function emptyDiary(): FoodDiary {
  return { version: 1, entries: [], library: [] };
}

export function makeFoodId(): string {
  return `food-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function bounded(value: unknown, maximum: number, positive = false): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    (positive ? value > 0 : value >= 0) &&
    value <= maximum
  );
}

export function portionNutrition(
  entry: Pick<FoodEntry, "quantity" | "basisAmount" | "nutrition">,
): Nutrients {
  const result = zeroNutrients();
  if (!bounded(entry.quantity, 100_000, true) || !bounded(entry.basisAmount, 100_000, true))
    return result;
  const multiplier = entry.quantity / entry.basisAmount;
  for (const key of NUTRIENT_KEYS) {
    const value = entry.nutrition?.[key];
    const total = value * multiplier;
    if (Number.isFinite(value) && value >= 0 && Number.isFinite(total)) result[key] = total;
  }
  return result;
}

export function dayNutrition(
  entries: FoodEntry[],
  date: string,
  status?: FoodEntry["status"],
): Nutrients {
  const result = zeroNutrients();
  for (const entry of entries) {
    if (entry.date !== date || (status && entry.status !== status)) continue;
    const portion = portionNutrition(entry);
    for (const key of NUTRIENT_KEYS) result[key] += portion[key];
  }
  for (const key of NUTRIENT_KEYS) result[key] = Math.round(result[key] * 100) / 100;
  return result;
}

export function validateEntry(entry: FoodEntry, today = localDate()): void {
  if (!entry || typeof entry !== "object") throw new Error("Enter a food to continue.");
  if (typeof entry.id !== "string" || !entry.id.trim() || entry.id.length > 128)
    throw new Error("This food entry needs a valid ID.");
  if (typeof entry.name !== "string" || !entry.name.trim() || entry.name.length > 120)
    throw new Error("Enter a food name of up to 120 characters.");
  if (!validDate(entry.date) || !validDate(today)) throw new Error("Choose a valid calendar date.");
  if (!Object.prototype.hasOwnProperty.call(SLOT_LABELS, entry.meal))
    throw new Error("Choose a meal for this food.");
  if (!["g", "ml", "serving"].includes(entry.unit))
    throw new Error("Choose grams, millilitres or servings.");
  if (entry.status !== "planned" && entry.status !== "eaten")
    throw new Error("Choose planned or eaten.");
  if (entry.status === "eaten" && entry.date > today)
    throw new Error("Future meals can be planned. Mark them eaten on the day.");
  if (!bounded(entry.quantity, 100_000, true))
    throw new Error("Enter an amount greater than zero and no more than 100,000.");
  if (!bounded(entry.basisAmount, 100_000, true))
    throw new Error("Enter a nutrition label amount greater than zero and no more than 100,000.");
  if (!entry.nutrition || typeof entry.nutrition !== "object")
    throw new Error("Add the nutrition from your food label or recipe.");
  const portion = portionNutrition(entry);
  for (const key of NUTRIENT_KEYS) {
    if (!bounded(entry.nutrition[key], LIMITS[key]) || !bounded(portion[key], LIMITS[key])) {
      throw new Error(
        `Enter a valid ${key} amount. Check the portion and nutrition label amounts.`,
      );
    }
  }
  if (typeof entry.time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.time))
    throw new Error("Choose a meal time in HH:MM format.");
  if (typeof entry.remind !== "boolean")
    throw new Error("Choose whether to remind you about this food.");
  if (typeof entry.note !== "string" || entry.note.length > 2_000)
    throw new Error("Keep food notes within 2,000 characters.");
}

function foodIdentity(food: StoredFood): string {
  return JSON.stringify([
    food.name.trim().toLocaleLowerCase().replace(/\s+/g, " "),
    food.unit,
    food.basisAmount,
    ...NUTRIENT_KEYS.map((key) => food.nutrition[key]),
  ]);
}

/** Save label details once so a later meal can reuse them with any portion. */
export function addFoodToLibrary(diary: FoodDiary, entry: FoodEntry): FoodDiary {
  const food: StoredFood = {
    id: makeFoodId(),
    name: entry.name.trim(),
    unit: entry.unit,
    basisAmount: entry.basisAmount,
    nutrition: { ...entry.nutrition },
  };
  if (diary.library.some((existing) => foodIdentity(existing) === foodIdentity(food))) return diary;
  return { ...diary, library: [...diary.library, food] };
}

export function storeFoodEntry(diary: FoodDiary, entry: FoodEntry): FoodDiary {
  validateEntry(entry);
  const clean = {
    ...entry,
    name: entry.name.trim(),
    note: entry.note.trim(),
    nutrition: { ...entry.nutrition },
  };
  const index = diary.entries.findIndex((existing) => existing.id === entry.id);
  const entries = [...diary.entries];
  if (index < 0) entries.push(clean);
  else entries[index] = clean;
  return addFoodToLibrary({ ...diary, entries }, clean);
}
