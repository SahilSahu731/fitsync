import { z } from "zod";

export const dateSchema = z.iso.date();
export const preferencesSchema = z.object({
  diet: z.enum(["any", "vegetarian", "vegan"]).default("any"),
  exclude: z.array(z.enum(["dairy", "eggs", "soy", "gluten", "nuts"])).max(5).default([]),
  servings: z.number().int().min(1).max(6).default(1),
  maxPrepMinutes: z.number().int().min(10).max(90).default(30),
  favoriteIds: z.array(z.string().max(60)).max(40).default([]),
}).strict();
export type Preferences = z.infer<typeof preferencesSchema>;
export type Ingredient = { name: string; amount: number; unit: "g" | "ml" | "each" };
export type Recipe = {
  id: string; name: string; meal: "breakfast" | "lunch" | "dinner";
  diet: "vegan" | "vegetarian" | "any"; contains: Preferences["exclude"];
  minutes: number; ingredients: Ingredient[]; steps: string[];
};
// Recipe ideas and quantities are practical starting points, not prescribed nutrition targets.
export const recipes: Recipe[] = [
  { id: "banana-oats", name: "Banana cinnamon oats", meal: "breakfast", diet: "vegan", contains: ["gluten"], minutes: 10, ingredients: [{ name: "Rolled oats", amount: 50, unit: "g" }, { name: "Banana", amount: 1, unit: "each" }, { name: "Cinnamon", amount: 1, unit: "g" }], steps: ["Simmer oats with water until soft.", "Slice the banana and add it with the cinnamon."] },
  { id: "chickpea-toast", name: "Chickpea tomato toast", meal: "breakfast", diet: "vegan", contains: ["gluten"], minutes: 10, ingredients: [{ name: "Wholegrain bread", amount: 2, unit: "each" }, { name: "Cooked chickpeas", amount: 100, unit: "g" }, { name: "Tomato", amount: 1, unit: "each" }], steps: ["Mash the chickpeas with a little water and your preferred seasoning.", "Toast the bread and top with chickpeas and sliced tomato."] },
  { id: "fruit-chickpea-bowl", name: "Fruit and chickpea breakfast bowl", meal: "breakfast", diet: "vegan", contains: [], minutes: 10, ingredients: [{ name: "Cooked chickpeas", amount: 100, unit: "g" }, { name: "Apple", amount: 1, unit: "each" }, { name: "Banana", amount: 1, unit: "each" }], steps: ["Rinse and drain the chickpeas.", "Chop the fruit and serve alongside the chickpeas; season to taste."] },
  { id: "yogurt-oats", name: "Yogurt, oats and fruit", meal: "breakfast", diet: "vegetarian", contains: ["dairy", "gluten"], minutes: 10, ingredients: [{ name: "Plain yogurt", amount: 200, unit: "g" }, { name: "Rolled oats", amount: 40, unit: "g" }, { name: "Apple", amount: 1, unit: "each" }], steps: ["Stir the oats into the yogurt.", "Top with chopped apple; refrigerate to soften if preferred."] },
  { id: "eggs-spinach", name: "Eggs with spinach and potatoes", meal: "breakfast", diet: "vegetarian", contains: ["eggs"], minutes: 25, ingredients: [{ name: "Eggs", amount: 2, unit: "each" }, { name: "Spinach", amount: 80, unit: "g" }, { name: "Potato", amount: 150, unit: "g" }, { name: "Olive oil", amount: 5, unit: "ml" }], steps: ["Dice and cook the potato until tender.", "Soften the spinach in oil, add the eggs and cook until set. Serve with the potato."] },
  { id: "lentil-rice", name: "Lentils, rice and vegetables", meal: "lunch", diet: "vegan", contains: [], minutes: 25, ingredients: [{ name: "Cooked lentils", amount: 180, unit: "g" }, { name: "Cooked rice", amount: 150, unit: "g" }, { name: "Mixed vegetables", amount: 150, unit: "g" }, { name: "Olive oil", amount: 5, unit: "ml" }], steps: ["Cook the vegetables in the oil until tender.", "Warm the lentils and rice, combine and season to taste."] },
  { id: "chickpea-rice", name: "Chickpea cucumber rice bowl", meal: "lunch", diet: "vegan", contains: [], minutes: 10, ingredients: [{ name: "Cooked chickpeas", amount: 150, unit: "g" }, { name: "Cooked rice", amount: 150, unit: "g" }, { name: "Cucumber", amount: 100, unit: "g" }, { name: "Tomato", amount: 1, unit: "each" }], steps: ["Rinse the chickpeas and chop the vegetables.", "Serve over freshly cooked or safely stored rice with your preferred seasoning."] },
  { id: "tofu-rice", name: "Tofu and vegetable rice", meal: "lunch", diet: "vegan", contains: ["soy"], minutes: 20, ingredients: [{ name: "Firm tofu", amount: 180, unit: "g" }, { name: "Cooked rice", amount: 150, unit: "g" }, { name: "Mixed vegetables", amount: 150, unit: "g" }, { name: "Olive oil", amount: 5, unit: "ml" }], steps: ["Drain and cube the tofu.", "Cook tofu and vegetables in oil until heated through and serve with rice."] },
  { id: "chicken-potato", name: "Chicken, potatoes and vegetables", meal: "lunch", diet: "any", contains: [], minutes: 30, ingredients: [{ name: "Chicken breast", amount: 150, unit: "g" }, { name: "Potato", amount: 200, unit: "g" }, { name: "Mixed vegetables", amount: 150, unit: "g" }, { name: "Olive oil", amount: 5, unit: "ml" }], steps: ["Dice the potato and chicken and season to taste.", "Cook chicken thoroughly in a pan; cook the potato until tender and serve with cooked vegetables."] },
  { id: "bean-potato", name: "Bean and sweet potato bowl", meal: "dinner", diet: "vegan", contains: [], minutes: 30, ingredients: [{ name: "Cooked kidney beans", amount: 180, unit: "g" }, { name: "Sweet potato", amount: 200, unit: "g" }, { name: "Spinach", amount: 80, unit: "g" }, { name: "Olive oil", amount: 5, unit: "ml" }], steps: ["Dice and cook the sweet potato until tender.", "Warm the cooked beans and spinach with the oil and combine."] },
  { id: "lentil-tomato", name: "Tomato lentils with rice", meal: "dinner", diet: "vegan", contains: [], minutes: 20, ingredients: [{ name: "Cooked lentils", amount: 180, unit: "g" }, { name: "Cooked rice", amount: 150, unit: "g" }, { name: "Tomato", amount: 2, unit: "each" }, { name: "Spinach", amount: 80, unit: "g" }], steps: ["Chop and simmer the tomatoes with your preferred spices.", "Add the lentils and spinach, heat thoroughly and serve with rice."] },
  { id: "bean-salad", name: "Bean, tomato and cucumber salad", meal: "dinner", diet: "vegan", contains: [], minutes: 10, ingredients: [{ name: "Cooked kidney beans", amount: 180, unit: "g" }, { name: "Cucumber", amount: 150, unit: "g" }, { name: "Tomato", amount: 2, unit: "each" }, { name: "Olive oil", amount: 5, unit: "ml" }], steps: ["Rinse and drain the cooked beans, and chop the vegetables.", "Combine with oil and your preferred seasoning. Add bread or rice to suit your appetite."] },
  { id: "paneer-rice", name: "Paneer and vegetable rice", meal: "dinner", diet: "vegetarian", contains: ["dairy"], minutes: 20, ingredients: [{ name: "Paneer", amount: 120, unit: "g" }, { name: "Cooked rice", amount: 150, unit: "g" }, { name: "Mixed vegetables", amount: 180, unit: "g" }], steps: ["Cut the paneer into cubes and cook in a nonstick pan.", "Add and cook the vegetables, then serve with rice."] },
  { id: "fish-rice", name: "Fish, rice and greens", meal: "dinner", diet: "any", contains: [], minutes: 25, ingredients: [{ name: "Fish fillet", amount: 150, unit: "g" }, { name: "Cooked rice", amount: 150, unit: "g" }, { name: "Spinach", amount: 100, unit: "g" }, { name: "Olive oil", amount: 5, unit: "ml" }], steps: ["Season and cook the fish thoroughly.", "Soften the spinach in oil and serve with the fish and rice."] },
];
export type MealPlan = { week: string; servings: number; preferences: Preferences; days: { date: string; meals: { slot: Recipe["meal"]; recipeId: string }[] }[] };
export function addDate(date: string, count: number) { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + count); return d.toISOString().slice(0, 10); }
export function weekOf(date: string) { const day = new Date(`${date}T12:00:00Z`).getUTCDay(); return addDate(date, -((day + 6) % 7)); }
export function eligibleRecipes(prefs: Preferences) {
  return recipes.filter(r => (prefs.diet === "any" || r.diet === "vegan" || prefs.diet === "vegetarian" && r.diet === "vegetarian") && r.minutes <= prefs.maxPrepMinutes && !r.contains.some(tag => prefs.exclude.includes(tag)));
}
export function makeMealPlan(week: string, prefs: Preferences): MealPlan {
  const allowed = eligibleRecipes(prefs);
  const slots = ["breakfast", "lunch", "dinner"] as const;
  const choices = slots.map(slot => allowed.filter(r => r.meal === slot).sort((a, b) => Number(prefs.favoriteIds.includes(b.id)) - Number(prefs.favoriteIds.includes(a.id)) || a.id.localeCompare(b.id)));
  if (choices.some(c => c.length === 0)) throw new Error("No complete menu matches these preferences. Increase preparation time or choose different exclusions.");
  return { week, servings: prefs.servings, preferences: prefs, days: Array.from({ length: 7 }, (_, i) => ({ date: addDate(week, i), meals: slots.map((slot, s) => ({ slot, recipeId: choices[s]![i % choices[s]!.length]!.id })) })) };
}
export function groceries(plan: MealPlan): Ingredient[] {
  const list = new Map<string, Ingredient>();
  for (const day of plan.days) for (const meal of day.meals) for (const ingredient of recipes.find(r => r.id === meal.recipeId)?.ingredients ?? []) {
    const key = `${ingredient.name}:${ingredient.unit}`;
    const existing = list.get(key);
    list.set(key, { ...ingredient, amount: (existing?.amount ?? 0) + ingredient.amount * plan.servings });
  }
  return [...list.values()].map(i => ({ ...i, amount: Math.round(i.amount * 100) / 100 })).sort((a, b) => a.name.localeCompare(b.name));
}
export const commitmentSchema = z.object({ week: dateSchema, target: z.number().int().min(1).max(7), habit: z.enum(["train", "walk", "mobility"]), reflection: z.string().trim().max(500).default("") }).strict();
