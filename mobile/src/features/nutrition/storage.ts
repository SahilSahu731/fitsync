import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  emptyDiary,
  validateEntry,
  type FoodDiary,
  type FoodEntry,
  type StoredFood,
} from "./model";

const locks = new Map<string, Promise<FoodDiary>>();
const listeners = new Set<(ownerId: string, diary: FoodDiary) => void>();
const PRESERVED =
  "Could not read your food diary. Your saved data has been kept on this device. Retry before adding food.";

function storageKey(ownerId: string): string {
  if (!ownerId || !ownerId.trim()) throw new Error("Sign in to open your food diary.");
  return `fitsync.nutrition.v1.${encodeURIComponent(ownerId)}`;
}

function assertFood(food: StoredFood): void {
  if (!food || typeof food !== "object") throw new Error(PRESERVED);
  validateEntry({
    ...food,
    date: "2000-01-01",
    meal: "snack",
    quantity: food.basisAmount,
    status: "planned",
    time: "12:00",
    remind: false,
    note: "",
  });
}

function assertDiary(value: unknown): asserts value is FoodDiary {
  if (!value || typeof value !== "object") throw new Error(PRESERVED);
  const diary = value as FoodDiary;
  if (diary.version !== 1 || !Array.isArray(diary.entries) || !Array.isArray(diary.library))
    throw new Error(PRESERVED);
  const entries = new Set<string>();
  for (const entry of diary.entries) {
    // Loading should survive a device clock adjustment. New edits enforce the
    // real current date, while stored eaten entries remain readable.
    validateEntry(entry as FoodEntry, "9999-12-31");
    if (entries.has(entry.id)) throw new Error(PRESERVED);
    entries.add(entry.id);
  }
  const foods = new Set<string>();
  for (const food of diary.library) {
    assertFood(food);
    if (foods.has(food.id)) throw new Error(PRESERVED);
    foods.add(food.id);
  }
}

export function subscribeFoodDiary(
  listener: (ownerId: string, diary: FoodDiary) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function readFoodDiary(ownerId: string): Promise<FoodDiary> {
  const key = storageKey(ownerId);
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    throw new Error("Could not open your food diary on this device. Please retry.");
  }
  if (raw === null) return emptyDiary();
  try {
    const value: unknown = JSON.parse(raw);
    assertDiary(value);
    return value;
  } catch {
    throw new Error(PRESERVED);
  }
}

/** Each owner has a separate write queue; readers never receive an uncommitted update. */
export function updateFoodDiary(
  ownerId: string,
  update: (diary: FoodDiary) => FoodDiary,
): Promise<FoodDiary> {
  // Validate synchronously through a resolved Promise so every failure follows
  // the same async contract as a storage error.
  const next = (locks.get(ownerId) ?? Promise.resolve(emptyDiary()))
    .catch(() => emptyDiary())
    .then(async () => {
      const key = storageKey(ownerId);
      const value = update(await readFoodDiary(ownerId));
      assertDiary(value);
      try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
      } catch {
        throw new Error("Your food was not saved. Device storage is unavailable; please retry.");
      }
      for (const listener of listeners) {
        try {
          listener(ownerId, value);
        } catch {
          /* A view cannot invalidate a successfully committed save. */
        }
      }
      return value;
    });
  locks.set(ownerId, next);
  const clean = () => {
    if (locks.get(ownerId) === next) locks.delete(ownerId);
  };
  void next.then(clean, clean);
  return next;
}
