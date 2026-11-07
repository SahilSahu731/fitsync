import type { MealPlan, Preferences, Recipe } from "./api";

export function matchingMeals(recipes: Recipe[], preferences: Preferences, slot?: Recipe["meal"]) {
  return recipes.filter(recipe => (!slot || recipe.meal === slot)
    && (preferences.diet === "any" || recipe.diet === "vegan" || preferences.diet === "vegetarian" && recipe.diet === "vegetarian")
    && recipe.minutes <= preferences.maxPrepMinutes
    && !recipe.contains.some(ingredient => preferences.exclude.includes(ingredient)));
}
export function preferencesEqual(left: Preferences, right: Preferences) {
  const normalize = (value: Preferences) => JSON.stringify({
    diet: value.diet, servings: value.servings, maxPrepMinutes: value.maxPrepMinutes,
    exclude: [...new Set(value.exclude)].sort(), favoriteIds: [...new Set(value.favoriteIds)].sort(),
  });
  return normalize(left) === normalize(right);
}
export function menuPreferenceStatus(plan: MealPlan, preferences: Preferences): "current" | "changed" | "unknown" {
  return plan.preferences ? preferencesEqual(plan.preferences, preferences) ? "current" : "changed" : "unknown";
}
export function favoritePreferences(saved: Preferences, id: string): Preferences {
  return { ...saved, favoriteIds: saved.favoriteIds.includes(id) ? saved.favoriteIds.filter(value => value !== id) : [...saved.favoriteIds, id] };
}
