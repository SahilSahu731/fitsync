import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Share, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { MotionPressable } from "@/src/components/motion";
import { Card, PrimaryButton, Txt } from "@/src/components/ui";
import { useAppAlert } from "@/src/components/app-dialog";
import { Sheet } from "@/src/features/progress/editors";
import { C } from "@/src/constants/theme";
import { useSession } from "@/src/context/session";
import { useBilling } from "@/src/features/billing/billing-context";
import { addDays, dateLabel, localDate } from "@/src/features/progress/model";
import { matchingMeals, preferencesEqual, menuPreferenceStatus, favoritePreferences } from "@/src/features/wellness/model";
import { wellnessForOwner, type Commitment, type Partner, type Preferences, type Recipe, type WellnessState } from "@/src/features/wellness/api";

const defaults: Preferences = { diet: "any", exclude: [], servings: 1, maxPrepMinutes: 30, favoriteIds: [] };
const field = { color: C.ink, backgroundColor: C.elevated, borderRadius: 16, padding: 14, fontSize: 15 };
function monday(date: string) { const day = new Date(`${date}T12:00:00Z`).getUTCDay(); return addDays(date, -((day + 6) % 7)); }
export default function WellnessScreen() {
  const router = useRouter();
  const { user } = useSession();
  const [week, setWeek] = useState(() => monday(localDate()));
  const [tab, setTab] = useState<"meals" | "commitment">("meals");
  if (!user) return <View className="flex-1 items-center justify-center bg-bg p-6"><Txt className="mb-5 text-center">Sign in to open your meal plan and commitments.</Txt><PrimaryButton title="Sign in" onPress={() => router.replace("/(auth)/sign-in")} /></View>;
  return <WellnessWeek key={`${user.id}:${week}`} ownerId={user.id} week={week} setWeek={setWeek} tab={tab} setTab={setTab} />;
}
function WellnessWeek({ ownerId, week, setWeek, tab, setTab }: { ownerId: string; week: string; setWeek: (week: string) => void; tab: "meals" | "commitment"; setTab: (tab: "meals" | "commitment") => void }) {
  const api = useMemo(() => wellnessForOwner(ownerId), [ownerId]);
  const router = useRouter(); const Alert = useAppAlert(); const { isPro } = useBilling();
  const active = useRef(true);
  const sequence = useRef(0);
  const locked = useRef(false);
  useLayoutEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const today = localDate();
  const [state, setState] = useState<WellnessState | null>(null); const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [prefs, setPrefs] = useState(defaults); const [partners, setPartners] = useState<Partner[]>([]);
  const [target, setTarget] = useState(3); const [habit, setHabit] = useState<Commitment["habit"]>("train"); const [reflection, setReflection] = useState("");
  const [joinCode, setJoinCode] = useState(""); const [inviteCode, setInviteCode] = useState("");
  const [openRecipe, setOpenRecipe] = useState<string | null>(null); const [swap, setSwap] = useState<{ date: string; slot: Recipe["meal"] } | null>(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const load = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    try {
      const [next, library, peers] = await Promise.all([api.state(week), api.recipes(), api.partners(week)]);
      if (!active.current || sequence.current !== request) return;
      setState(next); setPrefs(next.preferences); setRecipes(library.recipes); setPartners(peers.partners);
      setTarget(next.commitment?.target ?? 3); setHabit(next.commitment?.habit ?? "train"); setReflection(next.commitment?.reflection ?? ""); setError("");
    } catch (e) { if (active.current && sequence.current === request) setError(e instanceof Error ? e.message : "Could not open your plan."); }
    finally { if (active.current && sequence.current === request) setLoading(false); }
  }, [api, week]);
  useFocusEffect(useCallback(() => { void load(); return () => { sequence.current++; }; }, [load]));
  async function act(operation: () => Promise<unknown>, reload = true) {
    if (locked.current || !active.current) return false;
    locked.current = true; setBusy(true);
    try {
      await operation();
      if (!active.current) return false;
      if (reload) await load();
      return true;
    } catch (e) {
      if (active.current) Alert.alert("Could not save", e instanceof Error ? e.message : "Please try again.", undefined, "error");
      return false;
    } finally { locked.current = false; if (active.current) setBusy(false); }
  }
  async function favorite(recipe: Recipe) {
    await act(async () => {
      const saved = state?.preferences ?? defaults;
      const result = await api.preferences(favoritePreferences(saved, recipe.id));
      if (!active.current) return;
      setState(value => value ? { ...value, preferences: result } : value);
      // A favorite action must not silently save or discard unsaved diet,
      // ingredient, portion, or preparation-time edits.
      setPrefs(value => ({ ...value, favoriteIds: result.favoriteIds }));
    }, false);
  }
  const draftChanged = state ? !preferencesEqual(prefs, state.preferences) : false;
  const menuStatus = state?.plan ? menuPreferenceStatus(state.plan, state.preferences) : null;
  const filterPreferences = swap ? state?.preferences ?? prefs : prefs;
  const recipe = recipes.find(r => r.id === openRecipe);
  const choices = matchingMeals(recipes, filterPreferences);
  const missingMeals = (["breakfast", "lunch", "dinner"] as const).filter(slot => !choices.some(item => item.meal === slot));
  const canPlan = missingMeals.length === 0;
  return <View className="flex-1 bg-bg"><ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={C.brand} />} contentContainerStyle={{ padding: 22, paddingBottom: 130 }}>
    <View className="mb-6 flex-row items-center gap-3"><MotionPressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/train")} className="rounded-full bg-panel p-3"><MaterialCommunityIcons name="arrow-left" size={22} color={C.ink} /></MotionPressable><View className="flex-1"><Txt weight="semibold" className="text-2xl">Your everyday plan</Txt><Txt className="mt-1 text-sm text-muted">Simple meals. A commitment you can keep.</Txt></View></View>
    <View className="mb-5 flex-row gap-2"><OptionPill disabled={busy} label="Meals" active={tab === "meals"} onPress={() => setTab("meals")} /><OptionPill disabled={busy} label="Accountability" active={tab === "commitment"} onPress={() => setTab("commitment")} /></View>
    <View className="mb-5 flex-row items-center justify-between"><MotionPressable accessibilityRole="button" accessibilityLabel="Previous week" disabled={busy} className="h-11 w-11 items-center justify-center" onPress={() => setWeek(addDays(week, -7))}><MaterialCommunityIcons name="chevron-left" size={28} color={C.ink} /></MotionPressable><Txt weight="semibold">{dateLabel(week)} – {dateLabel(addDays(week, 6))}</Txt><MotionPressable accessibilityRole="button" accessibilityLabel="Next week" disabled={busy} className="h-11 w-11 items-center justify-center" onPress={() => setWeek(addDays(week, 7))}><MaterialCommunityIcons name="chevron-right" size={28} color={C.ink} /></MotionPressable></View>
    {loading && <ActivityIndicator color={C.ink} />}
    {!!error && <Card><Txt className="text-sm text-muted">{error}</Txt><PrimaryButton title="Retry" onPress={() => void load()} disabled={busy} /></Card>}
    {!loading && !error && tab === "meals" && <>
      <Card><Txt weight="semibold" className="text-lg">Make it yours</Txt><Txt className="mb-4 mt-2 text-xs leading-5 text-muted">Flexible meal ideas. Adjust portions to your appetite and needs. These menus do not set calorie or weight-loss targets.</Txt><View className="flex-row flex-wrap gap-2">{(["any", "vegetarian", "vegan"] as const).map(diet => <OptionPill disabled={busy} key={diet} label={diet === "any" ? "All foods" : diet} active={prefs.diet === diet} onPress={() => setPrefs(p => ({ ...p, diet }))} />)}</View>
        <Txt className="mb-2 mt-4 text-sm">Exclude ingredients</Txt><View className="flex-row flex-wrap gap-2">{["dairy", "eggs", "soy", "gluten", "nuts"].map(item => <OptionPill disabled={busy} key={item} label={item} active={prefs.exclude.includes(item)} onPress={() => setPrefs(p => ({ ...p, exclude: p.exclude.includes(item) ? p.exclude.filter(t => t !== item) : [...p.exclude, item] }))} />)}</View>
        <Txt className="mb-2 mt-4 text-sm">Servings per meal</Txt><View className="flex-row flex-wrap gap-2">{[1, 2, 3, 4, 5, 6].map(servings => <OptionPill disabled={busy} key={servings} label={`${servings}`} active={prefs.servings === servings} onPress={() => setPrefs(p => ({ ...p, servings }))} />)}</View>
        <Txt className="mb-2 mt-4 text-sm">Preparation time</Txt><View className="mb-5 flex-row flex-wrap gap-2">{[10, 20, 30, 45].map(maxPrepMinutes => <OptionPill disabled={busy} key={maxPrepMinutes} label={`${maxPrepMinutes} min`} active={prefs.maxPrepMinutes === maxPrepMinutes} onPress={() => setPrefs(p => ({ ...p, maxPrepMinutes }))} />)}</View>
        {isPro && !canPlan && <Txt className="mb-3 text-xs leading-5 text-muted">No {missingMeals.join(" / ")} ideas match these settings yet. You can save preferences, or choose more preparation time to build a complete menu.</Txt>}
        {draftChanged && <Txt className="mb-3 text-xs text-ink">You have unsaved preference changes.</Txt>}
        <PrimaryButton title={isPro && canPlan ? "Save preferences & plan my week" : "Save preferences"} loading={busy} onPress={() => void act(async () => { await api.preferences(prefs); if (active.current && isPro && canPlan) await api.plan(week); })} />
        {!isPro && <MotionPressable accessibilityRole="button" onPress={() => router.push("/pro")} className="mt-3 min-h-11 justify-center"><Txt weight="semibold" className="text-center text-sm text-ink">Get weekly menus and shopping lists with Pro</Txt></MotionPressable>}
      </Card>
      {state?.plan && <View className="mt-5"><Txt weight="semibold" className="mb-3 text-lg">Your menu · {state.plan.servings} serving{state.plan.servings > 1 ? "s" : ""}</Txt><Txt className="mb-4 text-xs leading-5 text-muted">{menuStatus === "changed" ? "Your saved food preferences have changed since this menu was built. Generate a new menu to apply them; review the existing recipe ingredients." : menuStatus === "unknown" ? "This older menu has no saved preference snapshot. Review its ingredients or generate a new menu using your current preferences." : "Built around your saved food preferences. Ingredients are shown in each recipe."}</Txt>{state.plan.days.map(day => <View key={day.date} className="mb-3 rounded-2xl bg-panel p-4"><Txt weight="semibold" className="mb-2">{dateLabel(day.date, { weekday: "long", month: "short", day: "numeric" })}</Txt>{day.meals.map(meal => <View key={meal.slot} className="mt-3 flex-row items-center gap-2"><MotionPressable accessibilityRole="button" onPress={() => setOpenRecipe(meal.recipeId)} className="flex-1"><Txt className="text-[11px] capitalize text-muted">{meal.slot}</Txt><Txt className="mt-1 text-sm">{recipes.find(r => r.id === meal.recipeId)?.name ?? "Meal"}</Txt></MotionPressable>{isPro && <MotionPressable accessibilityRole="button" accessibilityLabel={`Swap ${meal.slot} on ${day.date}`} disabled={busy} className="h-11 w-11 items-center justify-center" onPress={() => setSwap({ date: day.date, slot: meal.slot })}><MaterialCommunityIcons name="swap-horizontal" size={24} color={C.ink} /></MotionPressable>}</View>)}</View>)}
        <Card><View className="flex-row items-center justify-between"><Txt weight="semibold" className="text-lg">Shopping list</Txt><MotionPressable accessibilityRole="button" accessibilityLabel="Share shopping list" className="h-11 w-11 items-center justify-center" onPress={() => void Share.share({ message: `FitSync shopping list\n${state.groceries.map(i => `${i.name}: ${i.amount} ${i.unit}`).join("\n")}` }).catch(e => Alert.alert("Could not share", e instanceof Error ? e.message : "Please try again."))}><MaterialCommunityIcons name="share-variant-outline" size={22} color={C.ink} /></MotionPressable></View>{state.groceries.map(i => <Txt key={`${i.name}:${i.unit}`} className="mt-3 text-sm">{i.name} · {i.amount} {i.unit}</Txt>)}</Card>
      </View>}
      <Txt weight="semibold" className="mb-3 mt-6 text-lg">Meal ideas</Txt><Txt className="mb-3 text-xs leading-5 text-muted">Ingredients are listed for one serving. Check packaged ingredients for allergens. Favorite meals get priority in new menus.</Txt>{!choices.length && <View className="rounded-2xl bg-panel p-5"><Txt className="text-sm leading-6 text-muted">No meal ideas match these preferences. Try a longer preparation time or review your food preferences.</Txt></View>}{choices.map(r => <MotionPressable key={r.id} accessibilityRole="button" onPress={() => setOpenRecipe(r.id)} className="mb-3 rounded-2xl bg-panel p-4"><View className="flex-row items-center justify-between"><Txt weight="semibold" className="flex-1">{r.name}</Txt><MaterialCommunityIcons name={prefs.favoriteIds.includes(r.id) ? "heart" : "chevron-right"} size={20} color={C.ink} /></View><Txt className="mt-2 text-xs text-muted">{r.minutes} min · {r.meal} · {r.diet === "any" ? "Includes meat or fish" : r.diet}</Txt></MotionPressable>)}
    </>}
    {!loading && !error && tab === "commitment" && <>
      <Card><Txt weight="semibold" className="text-lg">Your weekly commitment</Txt><Txt className="mb-4 mt-2 text-sm leading-5 text-muted">Choose a realistic target. Check-ins are self-reported; your reflection stays private.</Txt><View className="flex-row flex-wrap gap-2">{(["train", "walk", "mobility"] as const).map(value => <OptionPill disabled={busy} key={value} label={value} active={habit === value} onPress={() => setHabit(value)} />)}</View><View className="my-4 flex-row flex-wrap gap-2">{[1, 2, 3, 4, 5, 6, 7].map(value => <OptionPill disabled={busy} key={value} label={`${value}d`} active={target === value} onPress={() => setTarget(value)} />)}</View><TextInput editable={!busy} accessibilityLabel="Private weekly reflection" multiline maxLength={500} placeholder="What will help you show up this week?" placeholderTextColor={C.muted} value={reflection} onChangeText={setReflection} style={field} /><View className="mt-4"><PrimaryButton title="Save commitment" loading={busy} onPress={() => void act(() => api.commitment({ week, target, habit, reflection }))} /></View></Card>
      {state?.commitment && <View className="my-5 rounded-2xl bg-panel p-5"><Txt weight="semibold" className="mb-4">{state.commitment.completed_dates.length} / {state.commitment.target} days completed</Txt><View className="flex-row justify-between">{Array.from({ length: 7 }, (_, i) => addDays(week, i)).map(date => { const done = state.commitment!.completed_dates.includes(date); return <MotionPressable key={date} disabled={busy || date > today} accessibilityRole="checkbox" accessibilityState={{ checked: done, disabled: date > today || busy }} accessibilityLabel={`Check in ${dateLabel(date)}`} onPress={() => void act(() => api.checkIn(week, date, !done, today))} className="min-h-14 items-center justify-center"><Txt className="mb-2 text-xs text-muted">{dateLabel(date, { weekday: "narrow" })}</Txt><View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: done ? C.brand : C.elevated, opacity: date > today ? 0.3 : 1, alignItems: "center", justifyContent: "center" }}><MaterialCommunityIcons name={done ? "check" : "plus"} color={done ? C.bg : C.muted} size={18} /></View></MotionPressable>; })}</View></View>}
      <View className="mt-5"><Card><Txt weight="semibold" className="text-lg">A little encouragement</Txt><Txt className="my-3 text-sm leading-6 text-muted">Connect with someone you choose. Both of you can see each other’s weekly target and self-reported completed days. Meals, measurements, workout details and reflections stay private. Either person can disconnect.</Txt><Txt className="mb-4 text-xs leading-5 text-muted">A new code replaces your earlier unused code. Disconnect an existing outgoing partner before creating a new invitation.</Txt><PrimaryButton title="Create a private invitation" loading={busy} onPress={() => void act(async () => { const invitation = await api.invite(); if (active.current) setInviteCode(invitation.code); })} />{inviteCode && <><Txt selectable className="mt-4 text-center text-sm text-ink">{inviteCode}</Txt><Txt className="mt-2 text-xs text-muted">Share this code yourself. It expires in 7 days and can be used once. A new invitation replaces your previous unused code.</Txt></>}<TextInput editable={!busy} accessibilityLabel="Partner invitation code" value={joinCode} onChangeText={value => setJoinCode(value.trim().slice(0, 24))} autoCapitalize="none" placeholder="Paste an invitation code" placeholderTextColor={C.muted} maxLength={100} style={{ ...field, marginTop: 18 }} /><View className="mt-3"><PrimaryButton title="Accept invitation & share my weekly progress" disabled={joinCode.trim().length !== 24} loading={busy} onPress={() => void act(async () => { await api.join(joinCode.trim()); if (active.current) setJoinCode(""); })} /></View></Card></View>
      {partners.map(peer => <View key={peer.id} className="mt-4 rounded-2xl bg-panel p-5"><Txt weight="semibold">{peer.name}</Txt><Txt className="mt-2 text-sm text-muted">{peer.commitment ? `${peer.commitment.completed} / ${peer.commitment.target} days · ${peer.commitment.habit}` : "No commitment for this week yet"}</Txt><MotionPressable accessibilityRole="button" disabled={busy} onPress={() => void act(() => api.removePartner(peer.id))} className="mt-3 min-h-11 justify-center"><Txt className="text-sm text-ink">Disconnect</Txt></MotionPressable></View>)}
    </>}
  </ScrollView>
    {swap && <Sheet title="Choose a replacement" subtitle={`${dateLabel(swap.date)} · ${swap.slot}`} busy={busy} onClose={() => setSwap(null)}>
      <Txt className="mb-4 text-sm leading-6 text-muted">These meals match your current food preferences and preparation time.</Txt>
      {!choices.some(item => item.meal === swap.slot) && <Txt className="mb-5 text-sm leading-6 text-muted">No matching replacements are available. Close this sheet and review your preferences.</Txt>}
      {choices.filter(item => item.meal === swap.slot).map(item => <MotionPressable key={item.id} accessibilityRole="button" disabled={busy} className="mb-3 min-h-16 rounded-2xl bg-elevated p-4" onPress={() => void act(async () => { await api.swap(week, swap.date, swap.slot, item.id); if (active.current) setSwap(null); })}><Txt weight="semibold" className="text-sm text-ink">{item.name}</Txt><Txt className="mt-1 text-xs text-muted">{item.minutes} min · {item.diet === "any" ? "Includes meat or fish" : item.diet}</Txt></MotionPressable>)}
    </Sheet>}
    {recipe && <Sheet title={recipe.name} subtitle={`Ingredients for one serving · ${recipe.minutes} min`} busy={busy} onClose={() => setOpenRecipe(null)}>
      <View className="mb-5 rounded-2xl bg-elevated p-4"><Txt weight="semibold" className="mb-2 text-base">What you need</Txt>{recipe.ingredients.map(item => <Txt key={item.name} className="mt-2 text-sm leading-6">{item.name} · {item.amount} {item.unit}</Txt>)}</View>
      <Txt weight="semibold" className="mb-2 text-base">Make it</Txt>{recipe.steps.map((step, index) => <View key={`${index}:${step}`} className="mb-4 flex-row items-start gap-3"><View className="h-7 w-7 items-center justify-center rounded-full bg-elevated"><Txt className="text-xs text-ink">{index + 1}</Txt></View><Txt className="flex-1 text-sm leading-6">{step}</Txt></View>)}
      <Txt className="mb-5 text-xs leading-5 text-muted">Check packaged ingredients for allergens. Adjust portions for your appetite and needs.</Txt>
      <PrimaryButton title={prefs.favoriteIds.includes(recipe.id) ? "Remove from favorites" : "Save as favorite"} loading={busy} onPress={() => void favorite(recipe)} />
    </Sheet>}
  </View>;
}

function OptionPill({ label, active = false, onPress, disabled = false }: { label: string; active?: boolean; onPress?: () => void; disabled?: boolean }) {
  return <MotionPressable accessibilityRole="button" accessibilityState={{ selected: active, disabled }} disabled={disabled} onPress={onPress} className={`min-h-11 justify-center rounded-full  px-4 py-2.5 ${active ? " bg-ink" : " bg-panel"}`} style={{ opacity: disabled ? 0.5 : 1 }}><Txt weight="semibold" className={`text-sm ${active ? "text-bg" : "text-ink"}`}>{label}</Txt></MotionPressable>;
}
