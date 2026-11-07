import { Router } from "express";
import { createHash, randomBytes } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { db } from "../../config/supabase.js";
import { ApiError, checkDbError } from "../../common/errors.js";
import { asyncHandler } from "../../common/async-handler.js";
import { getAuth, requireAuth } from "../../middleware/auth.js";
import { requirePro } from "../billing/billing.middleware.js";
import { commitmentSchema, dateSchema, preferencesSchema, recipes, makeMealPlan, groceries, weekOf, addDate, type MealPlan } from "./wellness.model.js";

const router = Router();
router.use(requireAuth);
function checked(error: { message: string; code?: string } | null) {
  if (error && ["42P01", "PGRST205", "42883", "PGRST202"].includes(error.code ?? "")) throw new ApiError(503, "Meal planning and accountability are not available yet. Try again later.");
  checkDbError(error, "wellness");
}
function monday(value: unknown) { const date = dateSchema.parse(value); if (weekOf(date) !== date) throw new ApiError(400, "Choose a week starting on Monday."); return date; }
router.get("/recipes", (_req, res) => { res.json({ recipes, note: "Meal ideas with flexible portions. Check ingredient labels for your dietary needs; these are not individualized nutrition prescriptions." }); });
router.get("/state", asyncHandler(async (req, res) => {
  const userId = getAuth(req).userId; const week = monday(req.query.week);
  const [prefs, menu, commitment] = await Promise.all([
    db.from("wellness_preferences").select("preferences").eq("user_id", userId).maybeSingle(),
    db.from("wellness_meal_plans").select("plan").eq("user_id", userId).eq("week", week).maybeSingle(),
    db.from("wellness_commitments").select("week,target,habit,reflection,completed_dates").eq("user_id", userId).eq("week", week).maybeSingle(),
  ]);
  [prefs.error, menu.error, commitment.error].forEach(checked);
  const plan = menu.data?.plan as MealPlan | undefined;
  res.json({ preferences: preferencesSchema.parse(prefs.data?.preferences ?? {}), plan: plan ?? null, groceries: plan ? groceries(plan) : [], commitment: commitment.data ?? null });
}));
router.put("/preferences", asyncHandler(async (req, res) => {
  const preferences = preferencesSchema.parse(req.body);
  if (preferences.favoriteIds.some(id => !recipes.some(r => r.id === id))) throw new ApiError(400, "Choose a recipe from the library.");
  const { error } = await db.from("wellness_preferences").upsert({ user_id: getAuth(req).userId, preferences, updated_at: new Date().toISOString() }); checked(error); res.json(preferences);
}));
router.post("/meal-plan", requirePro, asyncHandler(async (req, res) => {
  const { week } = z.object({ week: dateSchema }).strict().parse(req.body); monday(week);
  const userId = getAuth(req).userId;
  const { data, error } = await db.from("wellness_preferences").select("preferences").eq("user_id", userId).maybeSingle(); checked(error);
  let plan: MealPlan;
  try { plan = makeMealPlan(week, preferencesSchema.parse(data?.preferences ?? {})); } catch (e) { throw new ApiError(400, e instanceof Error ? e.message : "No matching meals."); }
  const saved = await db.from("wellness_meal_plans").upsert({ user_id: userId, week, plan, updated_at: new Date().toISOString() }); checked(saved.error);
  res.json({ plan, groceries: groceries(plan) });
}));
router.patch("/meal-plan/swap", requirePro, asyncHandler(async (req, res) => {
  const input = z.object({ week: dateSchema, date: dateSchema, slot: z.enum(["breakfast", "lunch", "dinner"]), recipeId: z.string().max(60) }).strict().parse(req.body);
  const userId = getAuth(req).userId; monday(input.week);
  const [saved, prefs] = await Promise.all([db.from("wellness_meal_plans").select("plan,updated_at").eq("user_id", userId).eq("week", input.week).maybeSingle(), db.from("wellness_preferences").select("preferences").eq("user_id", userId).maybeSingle()]); checked(saved.error); checked(prefs.error);
  if (!saved.data) throw new ApiError(404, "Create a meal plan first.");
  const preferences = preferencesSchema.parse(prefs.data?.preferences ?? {});
  const recipe = recipes.find(r => r.id === input.recipeId && r.meal === input.slot);
  if (!recipe || recipe.minutes > preferences.maxPrepMinutes || recipe.contains.some(t => preferences.exclude.includes(t)) || preferences.diet === "vegan" && recipe.diet !== "vegan" || preferences.diet === "vegetarian" && recipe.diet === "any") throw new ApiError(400, "This meal does not match your preferences.");
  const plan = saved.data.plan as MealPlan; const day = plan.days.find(d => d.date === input.date);
  if (!day) throw new ApiError(400, "Choose a day in this meal plan.");
  day.meals = day.meals.map(m => m.slot === input.slot ? { ...m, recipeId: recipe.id } : m);
  const updated = await db.from("wellness_meal_plans").update({ plan, updated_at: new Date(Math.max(Date.now(), Date.parse(saved.data.updated_at) + 1)).toISOString() }).eq("user_id", userId).eq("week", input.week).eq("updated_at", saved.data.updated_at).select("week").maybeSingle(); checked(updated.error);
  if (!updated.data) throw new ApiError(409, "Your meal plan changed on another device. Refresh and try the swap again.");
  res.json({ plan, groceries: groceries(plan) });
}));
router.put("/commitment", asyncHandler(async (req, res) => {
  const input = commitmentSchema.parse(req.body); monday(input.week);
  const { error } = await db.from("wellness_commitments").upsert({ user_id: getAuth(req).userId, ...input }); checked(error); res.json({ saved: true });
}));
router.patch("/commitment/check-in", asyncHandler(async (req, res) => {
  const input = z.object({ week: dateSchema, date: dateSchema, completed: z.boolean() }).strict().parse(req.body); monday(input.week);
  const localToday = dateSchema.parse(req.query.today); // Device-local day; never used for access control.
  if (input.date < input.week || input.date > addDate(input.week, 6) || input.date > localToday) throw new ApiError(400, "Choose a completed day in this week.");
  const userId = getAuth(req).userId;
  const { error } = await db.rpc("fitsync_commitment_checkin", { p_user: userId, p_week: input.week, p_date: input.date, p_completed: input.completed });
  if (error?.code === "P0002") throw new ApiError(404, "Set your commitment first.");
  checked(error); res.json({ saved: true });
}));
router.post("/partner/invite", asyncHandler(async (req, res) => {
  const token = randomBytes(18).toString("base64url"); const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
  const { error } = await db.rpc("fitsync_create_invite", { p_user: getAuth(req).userId, p_hash: createHash("sha256").update(token).digest("hex"), p_expires: expiresAt });
  if (error?.code === "40001") throw new ApiError(409, "Disconnect your current outgoing partner before creating another invitation."); checked(error);
  res.status(201).json({ code: token, expiresAt });
}));
router.post("/partner/join", rateLimit({ windowMs: 60000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false }), asyncHandler(async (req, res) => {
  const { code } = z.object({ code: z.string().regex(/^[A-Za-z0-9_-]{24}$/) }).strict().parse(req.body);
  const { data, error } = await db.rpc("fitsync_join_partner", { p_user: getAuth(req).userId, p_hash: createHash("sha256").update(code).digest("hex") });
  if (error?.code === "P0001") throw new ApiError(400, "This invitation is unavailable or expired."); checked(error); res.json({ id: data });
}));
router.get("/partners", asyncHandler(async (req, res) => {
  const userId = getAuth(req).userId; const week = monday(req.query.week);
  const { data, error } = await db.from("accountability_partners").select("id,owner_id,partner_id").or(`owner_id.eq.${userId},partner_id.eq.${userId}`).not("partner_id", "is", null); checked(error);
  const peers = (data ?? []).map(row => ({ id: row.id as string, userId: (row.owner_id === userId ? row.partner_id : row.owner_id) as string }));
  const partners = await Promise.all(peers.map(async peer => {
    const [person, commitment] = await Promise.all([db.from("app_users").select("display_name").eq("id", peer.userId).maybeSingle(), db.from("wellness_commitments").select("target,habit,completed_dates").eq("user_id", peer.userId).eq("week", week).maybeSingle()]); checked(person.error); checked(commitment.error);
    return { id: peer.id, name: person.data?.display_name ?? "Your partner", commitment: commitment.data ? { target: commitment.data.target, habit: commitment.data.habit, completed: commitment.data.completed_dates.length } : null };
  }));
  res.json({ partners });
}));
router.delete("/partner/:id", asyncHandler(async (req, res) => {
  const id = z.uuid().parse(req.params.id); const userId = getAuth(req).userId;
  const { error } = await db.from("accountability_partners").delete().eq("id", id).or(`owner_id.eq.${userId},partner_id.eq.${userId}`); checked(error); res.json({ removed: true });
}));
export default router;
