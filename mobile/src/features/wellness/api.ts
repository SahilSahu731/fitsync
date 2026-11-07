import { apiRequest } from "@/src/services/api";
export type Preferences = { diet: "any" | "vegetarian" | "vegan"; exclude: string[]; servings: number; maxPrepMinutes: number; favoriteIds: string[] };
export type Ingredient = { name: string; amount: number; unit: "g" | "ml" | "each" };
export type Recipe = { id: string; name: string; meal: "breakfast" | "lunch" | "dinner"; diet: string; contains: string[]; minutes: number; ingredients: Ingredient[]; steps: string[] };
export type MealPlan = { week: string; servings: number; preferences?: Preferences; days: { date: string; meals: { slot: Recipe["meal"]; recipeId: string }[] }[] };
export type Commitment = { week: string; target: number; habit: "train" | "walk" | "mobility"; reflection: string; completed_dates: string[] };
export type WellnessState = { preferences: Preferences; plan: MealPlan | null; groceries: Ingredient[]; commitment: Commitment | null };
export type Partner = { id: string; name: string; commitment: { target: number; habit: string; completed: number } | null };
export function wellnessForOwner(expectedOwnerId?: string) {
  const request = <T,>(path: string, options: Parameters<typeof apiRequest>[1] = {}) => apiRequest<T>(path, { ...options, expectedOwnerId });
  return {
  recipes: () => request<{ recipes: Recipe[]; note: string }>("/wellness/recipes"),
  state: (week: string) => request<WellnessState>(`/wellness/state?week=${week}`),
  preferences: (preferences: Preferences) => request<Preferences>("/wellness/preferences", { method: "PUT", json: preferences }),
  plan: (week: string) => request<{ plan: MealPlan; groceries: Ingredient[] }>("/wellness/meal-plan", { method: "POST", json: { week } }),
  swap: (week: string, date: string, slot: string, recipeId: string) => request("/wellness/meal-plan/swap", { method: "PATCH", json: { week, date, slot, recipeId } }),
  commitment: (value: Omit<Commitment, "completed_dates">) => request("/wellness/commitment", { method: "PUT", json: value }),
  checkIn: (week: string, date: string, completed: boolean, today: string) => request(`/wellness/commitment/check-in?today=${today}`, { method: "PATCH", json: { week, date, completed } }),
  invite: () => request<{ code: string; expiresAt: string }>("/wellness/partner/invite", { method: "POST", json: {} }),
  join: (code: string) => request("/wellness/partner/join", { method: "POST", json: { code } }),
  partners: (week: string) => request<{ partners: Partner[] }>(`/wellness/partners?week=${week}`),
  removePartner: (id: string) => request(`/wellness/partner/${id}`, { method: "DELETE" }),
  };
}
export const wellnessApi = wellnessForOwner();
