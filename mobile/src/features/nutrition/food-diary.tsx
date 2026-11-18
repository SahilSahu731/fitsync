import React, { useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { useSession } from "@/src/context/session";
import { useBilling } from "../billing/billing-context";
import { useProgress } from "../progress/use-progress";
import {
  addDays,
  dateLabel,
  localDate,
  validMetric,
  type Goals,
  type Metric,
} from "../progress/model";
import { Sheet } from "../progress/editors";
import {
  amountLabel,
  FoodButton,
  FoodDatePicker,
  FoodField,
  FoodPill,
  PlateArt,
} from "./components";
import {
  dayNutrition,
  portionNutrition,
  SLOT_LABELS,
  type FoodEntry,
  type MealSlot,
  type Nutrients,
} from "./model";
import { useFoodDiary } from "./use-food-diary";
import { useFoodReminderStatus } from "./reminders";
import { FoodEditor } from "./food-editor";

const SLOTS = Object.keys(SLOT_LABELS) as MealSlot[];
const SLOT_ICONS = {
  breakfast: "weather-sunset-up",
  lunch: "white-balance-sunny",
  dinner: "weather-night",
  snack: "food-apple-outline",
} as const;
const MACROS = [
  { key: "protein", label: "Protein" },
  { key: "carbs", label: "Carbs" },
  { key: "fat", label: "Fat" },
] as const;
function isDate(value?: string) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  );
}

export function FoodDiaryScreen() {
  const { user } = useSession();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = isDate(params.date) ? params.date : undefined;
  return (
    <View className="flex-1 bg-black">
      <View className="flex-row items-center gap-3 px-5 pb-3 pt-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/pro"))}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/5"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" />
        </Pressable>
        <View className="flex-1">
          <Txt weight="medium" className="text-xl tracking-[-0.5px]">
            Your food diary
          </Txt>
          <Txt className="mt-1 text-[10px] text-muted">Your foods. Your portions. Your day.</Txt>
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-full bg-white/5">
          <MaterialCommunityIcons name="silverware-fork-knife" size={21} color="#FFFFFF" />
        </View>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100 }}
      >
        <FoodDiaryPanel key={`${user?.id ?? "signed-out"}:${date ?? "today"}`} initialDate={date} />
      </ScrollView>
    </View>
  );
}
export function FoodDiaryPanel({ initialDate }: { initialDate?: string } = {}) {
  const food = useFoodDiary(),
    progress = useProgress(),
    billing = useBilling(),
    { user } = useSession();
  const today = localDate();
  const [date, setDate] = useState(initialDate && isDate(initialDate) ? initialDate : today);
  const [calendar, setCalendar] = useState(false),
    [editor, setEditor] = useState<{ meal: MealSlot; entry?: FoodEntry } | null>(null),
    [goalsOpen, setGoalsOpen] = useState(false);
  const [view, setView] = useState<"eaten" | "planned">("eaten"),
    [more, setMore] = useState(false),
    [message, setMessage] = useState(""),
    [working, setWorking] = useState(false);
  const reminders = useFoodReminderStatus(user?.id ?? "");
  const day = food.diary.entries
    .filter((entry) => entry.date === date)
    .sort((a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name));
  const eaten = dayNutrition(food.diary.entries, date, "eaten"),
    planned = dayNutrition(food.diary.entries, date, "planned");
  const eatenCount = day.filter((entry) => entry.status === "eaten").length;
  const totals = view === "eaten" ? eaten : planned;
  const calorieGoal = progress.goals.caloriesIn;
  const upcoming = day.find((entry) => entry.status === "planned");
  const allowed = !!user && billing.isPro && !food.loading && !food.error;
  const chooseDate = (value: string) => {
    setDate(value);
    setCalendar(false);
    setMessage("");
    if (value > today) setView("planned");
  };
  function open(meal: MealSlot, entry?: FoodEntry) {
    if (!user) {
      router.push("/(auth)/sign-in");
      return;
    }
    if (!billing.isPro) {
      router.push("/membership");
      return;
    }
    setEditor({ meal, entry });
  }
  async function mark(entry: FoodEntry) {
    if (!allowed || working || date > today) return;
    setWorking(true);
    setMessage("");
    try {
      await food.saveEntry({
        ...entry,
        status: entry.status === "eaten" ? "planned" : "eaten",
        remind: entry.status === "eaten" ? entry.remind : false,
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not update your food.");
    } finally {
      setWorking(false);
    }
  }
  async function syncTotals() {
    if (working || progress.loading || date > today || !billing.isPro || !eatenCount) return;
    setWorking(true);
    setMessage("");
    try {
      const fields: [keyof Nutrients, Metric][] = [
        ["calories", "caloriesIn"],
        ["protein", "protein"],
        ["carbs", "carbs"],
        ["fat", "fat"],
        ["fiber", "fiber"],
        ["sugar", "sugar"],
        ["sodium", "sodium"],
      ];
      if (fields.some(([key, metric]) => !validMetric(metric, eaten[key])))
        throw new Error(
          "Your food totals exceed a Progress field’s limit. Review the amounts before saving.",
        );
      for (const [key, metric] of fields)
        await progress.log(metric, date, eaten[key], "Eaten food diary total");
      setMessage("Eaten totals saved to Progress and queued for sync.");
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Could not save all totals. Retry to finish; this replaces totals without adding them twice.",
      );
    } finally {
      setWorking(false);
    }
  }
  return (
    <View className="gap-5">
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous food day"
          onPress={() => chooseDate(addDays(date, -1))}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/5"
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color="#FFFFFF" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose food date"
          onPress={() => setCalendar(true)}
          className="min-h-12 min-w-0 flex-1 flex-row items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-3"
        >
          <MaterialCommunityIcons name="calendar-blank-outline" size={17} color="#A3A3A3" />
          <Txt weight="medium" className="text-xs">
            {date === today
              ? "Today"
              : dateLabel(date, { month: "short", day: "numeric", year: "numeric" })}
          </Txt>
          <MaterialCommunityIcons name="chevron-down" size={17} color="#A3A3A3" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next food day"
          onPress={() => chooseDate(addDays(date, 1))}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/5"
        >
          <MaterialCommunityIcons name="chevron-right" size={24} color="#FFFFFF" />
        </Pressable>
      </View>
      <View className="overflow-hidden rounded-[30px] border border-white/10 bg-[#151515] p-5">
        <View className="flex-row items-center gap-3">
          <View className="min-w-0 flex-1">
            <Txt className="text-[10px] tracking-[1.5px] text-muted">FUEL FOR YOUR DAY</Txt>
            <Txt weight="medium" className="mt-2 text-[27px] leading-9 tracking-[-1px]">
              Your food.{"\n"}Your way.
            </Txt>
          </View>
          <PlateArt size={72} />
        </View>
        <View className="mb-5 mt-5 flex-row flex-wrap gap-2">
          <FoodPill title="Eaten" active={view === "eaten"} onPress={() => setView("eaten")} />
          <FoodPill
            title="Planned"
            active={view === "planned"}
            onPress={() => setView("planned")}
          />
        </View>
        <View className="flex-row flex-wrap items-baseline gap-x-2">
          <Txt weight="medium" className="text-[46px] leading-[60px] tracking-[-2px]">
            {amountLabel(totals.calories)}
          </Txt>
          <Txt className="text-sm text-muted">kcal {view === "eaten" ? "eaten" : "planned"}</Txt>
        </View>
        {!!calorieGoal && calorieGoal > 0 && (
          <>
            <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <View
                className="h-full rounded-full bg-white"
                style={{ width: `${Math.min(100, (totals.calories / calorieGoal) * 100)}%` }}
              />
            </View>
            <Txt className="mt-2 text-[10px] leading-5 text-muted">
              Your daily target · {amountLabel(calorieGoal)} kcal
            </Txt>
          </>
        )}
        <View className="mt-5 flex-row gap-3 border-t border-white/10 pt-5">
          {MACROS.map((m) => (
            <View key={m.key} className="min-w-0 flex-1">
              <Txt className="text-[10px] text-muted">{m.label}</Txt>
              <View className="mt-2 flex-row flex-wrap items-baseline gap-x-1">
                <Txt weight="medium" className="text-xl tracking-[-0.5px]">
                  {amountLabel(totals[m.key])}
                </Txt>
                <Txt className="text-[10px] text-muted">g</Txt>
              </View>
              {!!progress.goals[m.key] && (
                <Txt className="mt-1 text-[9px] leading-4 text-muted">
                  of {amountLabel(progress.goals[m.key]!)} g
                </Txt>
              )}
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show additional nutrients"
          accessibilityState={{ expanded: more }}
          onPress={() => setMore(!more)}
          className="mt-3 min-h-11 flex-row items-center justify-between"
        >
          <Txt className="text-[11px] text-muted">{more ? "Show less" : "Show more nutrition"}</Txt>
          <MaterialCommunityIcons
            name={more ? "chevron-up" : "chevron-down"}
            size={18}
            color="#A3A3A3"
          />
        </Pressable>
        {more && (
          <View className="gap-3 border-t border-white/10 pt-3">
            {(
              [
                { key: "fiber", label: "Fiber", unit: "g" },
                { key: "sugar", label: "Sugar", unit: "g" },
                { key: "sodium", label: "Sodium", unit: "mg" },
              ] as const
            ).map((n) => (
              <View key={n.key} className="flex-row justify-between gap-3">
                <Txt className="text-xs text-muted">{n.label}</Txt>
                <Txt className="text-xs">
                  {amountLabel(totals[n.key])} {n.unit}
                </Txt>
              </View>
            ))}
          </View>
        )}
      </View>
      {!user ? (
        <FoodButton
          title="Sign in to build your food diary"
          onPress={() => router.push("/(auth)/sign-in")}
        />
      ) : !billing.isPro ? (
        <View className="gap-3 rounded-[24px] border border-white/10 p-5">
          <Txt weight="medium" className="text-base">
            Your personal food plan, with Pro.
          </Txt>
          <Txt className="text-xs leading-5 text-muted">
            Add your foods, keep a reusable library and set meal reminders.
          </Txt>
          <FoodButton title="Explore Pro" onPress={() => router.push("/membership")} />
        </View>
      ) : null}
      {food.loading && <ActivityIndicator color="#FFFFFF" />}
      {!!food.error && (
        <View className="gap-3 rounded-2xl border border-white/10 p-4">
          <Txt accessibilityRole="alert" className="text-xs leading-5 text-muted">
            {food.error}
          </Txt>
          <FoodButton title="Retry food diary" quiet onPress={() => void food.refresh()} />
        </View>
      )}
      <View className="flex-row items-center gap-3">
        <Txt
          accessibilityRole="header"
          weight="medium"
          className="flex-1 text-xl tracking-[-0.5px]"
        >
          On your menu
        </Txt>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Set nutrition targets"
          onPress={() => {
            if (billing.isPro) setGoalsOpen(true);
            else router.push("/membership");
          }}
          className="min-h-11 justify-center"
        >
          <Txt className="text-xs text-muted">Daily targets ↗</Txt>
        </Pressable>
      </View>
      {allowed && (
        <FoodButton title="Add your food" icon="plus" onPress={() => open("breakfast")} />
      )}
      {upcoming && (
        <View className="flex-row items-start gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
          <MaterialCommunityIcons name="clock-outline" size={22} color="#FFFFFF" />
          <View className="min-w-0 flex-1">
            <Txt className="text-[10px] text-muted">ON YOUR FOOD PLAN · {upcoming.time}</Txt>
            <Txt weight="medium" className="mt-1 text-sm">
              {upcoming.name}
            </Txt>
            <Txt className="mt-1 text-[10px] leading-5 text-muted">
              {amountLabel(upcoming.quantity)} {upcoming.unit}
              {upcoming.remind ? " · Meal reminder on" : ""}
            </Txt>
          </View>
        </View>
      )}
      {!food.loading &&
        SLOTS.map((slot) => {
          const rows = day.filter((entry) => entry.meal === slot);
          const countEaten = rows.filter((entry) => entry.status === "eaten").length;
          return (
            <View
              key={slot}
              className="overflow-hidden rounded-[26px] border border-white/10 bg-[#111111] p-5"
            >
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-white/5">
                  <MaterialCommunityIcons name={SLOT_ICONS[slot]} size={21} color="#FFFFFF" />
                </View>
                <View className="min-w-0 flex-1">
                  <Txt weight="medium" className="text-base">
                    {SLOT_LABELS[slot]}
                  </Txt>
                  <Txt className="mt-1 text-[10px] text-muted">
                    {rows.length
                      ? `${countEaten} eaten · ${rows.length - countEaten} planned`
                      : "Your choice, your portion"}
                  </Txt>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add food to ${SLOT_LABELS[slot]}`}
                  disabled={food.loading || !!food.error}
                  onPress={() => open(slot)}
                  className="h-11 w-11 items-center justify-center rounded-full bg-white/5"
                >
                  <MaterialCommunityIcons name="plus" size={21} color="#FFFFFF" />
                </Pressable>
              </View>
              {!rows.length ? (
                <Txt className="mt-4 text-xs leading-5 text-muted">
                  Add what you’ll eat. We’ll total the nutrition for your portion.
                </Txt>
              ) : (
                <View className="mt-4 gap-3">
                  {rows.map((entry) => {
                    const total = portionNutrition(entry);
                    return (
                      <View key={entry.id} className="border-t border-white/5 pt-4">
                        <View className="flex-row items-start gap-2">
                          <Pressable
                            accessibilityRole="checkbox"
                            accessibilityLabel={`Mark ${entry.name} as ${entry.status === "eaten" ? "planned" : "eaten"}`}
                            accessibilityState={{
                              checked: entry.status === "eaten",
                              disabled: !allowed || working || date > today,
                            }}
                            disabled={!allowed || working || date > today}
                            onPress={() => void mark(entry)}
                            className="h-11 w-9 items-start justify-center"
                          >
                            <MaterialCommunityIcons
                              name={entry.status === "eaten" ? "check-circle" : "circle-outline"}
                              size={23}
                              color={entry.status === "eaten" ? "#FFFFFF" : "#666666"}
                            />
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${entry.name}`}
                            onPress={() => open(slot, entry)}
                            className="min-w-0 flex-1 py-1"
                          >
                            <Txt weight="medium" className="text-sm leading-6">
                              {entry.name}
                            </Txt>
                            <Txt className="mt-1 text-[11px] leading-5 text-muted">
                              {amountLabel(entry.quantity)} {entry.unit} · {entry.time} ·{" "}
                              {amountLabel(total.calories)} kcal
                            </Txt>
                            <Txt className="mt-1 text-[10px] leading-5 text-muted">
                              P {amountLabel(total.protein)} g / C {amountLabel(total.carbs)} g / F{" "}
                              {amountLabel(total.fat)} g
                            </Txt>
                          </Pressable>
                          <MaterialCommunityIcons
                            name="pencil-outline"
                            size={17}
                            color="#777777"
                            style={{ marginTop: 12 }}
                          />
                        </View>
                        {!!entry.note && (
                          <Txt className="ml-11 mt-2 text-[10px] leading-5 text-muted">
                            {entry.note}
                          </Txt>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      {!!message && (
        <Txt accessibilityRole="alert" className="text-xs leading-5 text-white">
          {message}
        </Txt>
      )}
      {billing.isPro && day.length > 0 && date <= today && (
        <View className="gap-3 rounded-[24px] border border-white/10 p-5">
          <Txt weight="medium" className="text-sm">
            Bring your day into Progress.
          </Txt>
          <Txt className="text-[11px] leading-5 text-muted">
            Save the eaten food totals for this date. This replaces its existing nutrition totals.
            Planned foods stay out.
            {!eatenCount ? " Mark a food eaten to save your totals." : ""}
          </Txt>
          <FoodButton
            title={working ? "Saving…" : "Save eaten totals to Progress"}
            quiet
            disabled={working || progress.loading || !!food.error || !eatenCount}
            onPress={() => void syncTotals()}
            icon="chart-timeline-variant"
          />
        </View>
      )}
      <View className="gap-3 rounded-[24px] border border-white/10 bg-white/[0.02] p-5">
        <View className="flex-row items-center gap-3">
          <MaterialCommunityIcons name="bell-outline" size={21} color="#FFFFFF" />
          <Txt weight="medium" className="flex-1 text-sm">
            Food, at your rhythm.
          </Txt>
        </View>
        <Txt className="text-[11px] leading-5 text-muted">
          Add a time and switch on a reminder inside any planned food. Marking it eaten cancels that
          reminder.
        </Txt>
        <Txt className="text-[10px] leading-5 text-muted">
          {reminders.permission === "granted"
            ? `${reminders.scheduled} upcoming reminders on this phone.`
            : reminders.permission === "denied"
              ? "Notifications are off in your phone settings."
              : "Notifications are optional. You choose when to enable them."}
        </Txt>
        {!!reminders.error && (
          <Txt accessibilityRole="alert" className="text-[11px] leading-5 text-white">
            {reminders.error}
          </Txt>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open recipe ideas and shopping lists"
        onPress={() => router.push("/wellness")}
        className="min-h-14 flex-row items-center justify-between gap-3 rounded-[22px] border border-white/10 px-5 py-4"
      >
        <View className="min-w-0 flex-1">
          <Txt className="text-sm">Need a little inspiration?</Txt>
          <Txt className="mt-1 text-[10px] text-muted">Recipe ideas & shopping lists</Txt>
        </View>
        <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
      </Pressable>
      <Txt className="text-[10px] leading-5 text-muted">
        Food entries and saved foods stay on this device. Nutrition totals you save to Progress use
        your existing account sync.
      </Txt>
      {calendar && (
        <FoodDatePicker
          date={date}
          today={today}
          dates={new Set(food.diary.entries.map((entry) => entry.date))}
          onSelect={chooseDate}
          onClose={() => setCalendar(false)}
        />
      )}
      {editor && (
        <FoodEditor
          date={date}
          meal={editor.meal}
          entry={editor.entry}
          library={food.diary.library}
          onSave={async (entry) => {
            if (!billing.isPro) throw new Error("Pro is required to save your food diary.");
            await food.saveEntry(entry);
          }}
          onDelete={async (id) => {
            if (!billing.isPro) throw new Error("Pro is required to edit your food diary.");
            await food.removeEntry(id);
          }}
          onClose={() => setEditor(null)}
        />
      )}
      {goalsOpen && (
        <NutritionTargets
          goals={progress.goals}
          onSave={async (goals) => {
            if (!billing.isPro) throw new Error("Pro is required to edit these targets.");
            await progress.saveGoals(goals);
          }}
          onClose={() => setGoalsOpen(false)}
        />
      )}
    </View>
  );
}
function NutritionTargets({
  goals,
  onSave,
  onClose,
}: {
  goals: Goals;
  onSave: (goals: Goals) => Promise<void>;
  onClose: () => void;
}) {
  const fields = [
    { key: "caloriesIn", label: "Daily calories", unit: "kcal", max: 20000 },
    { key: "protein", label: "Daily protein", unit: "g", max: 1000 },
    { key: "carbs", label: "Daily carbs", unit: "g", max: 2000 },
    { key: "fat", label: "Daily fat", unit: "g", max: 1000 },
  ] as const;
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.key, goals[f.key]?.toString() ?? ""])),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Sheet
      title="Your daily targets"
      subtitle="Use your own targets. Leave a field blank to keep it open."
      onClose={onClose}
      busy={busy}
      footer={
        <FoodButton
          title={busy ? "Saving…" : "Save targets"}
          disabled={busy}
          icon="check"
          onPress={() => {
            if (busy) return;
            setBusy(true);
            setError("");
            void (async () => {
              const next = { ...goals };
              for (const field of fields) {
                const text = values[field.key].trim(),
                  value = text ? Number(text.replace(",", ".")) : null;
                if (value !== null && (!Number.isFinite(value) || value < 0 || value > field.max))
                  throw new Error(`${field.label} must be between 0 and ${field.max}.`);
                next[field.key] = value;
              }
              await onSave(next);
              onClose();
            })()
              .catch((e) => setError(e instanceof Error ? e.message : "Could not save targets."))
              .finally(() => setBusy(false));
          }}
        />
      }
    >
      <View className="gap-4">
        {fields.map((field) => (
          <FoodField
            key={field.key}
            label={field.label}
            numeric
            value={values[field.key]}
            onChange={(text) => setValues((current) => ({ ...current, [field.key]: text }))}
            placeholder="Optional"
            unit={field.unit}
          />
        ))}
        {!!error && (
          <Txt accessibilityRole="alert" className="text-xs leading-5">
            {error}
          </Txt>
        )}
        <Txt className="text-xs leading-5 text-muted">
          These are your personal targets, shared with Progress. FitSync does not choose calorie or
          macro targets for you.
        </Txt>
      </View>
    </Sheet>
  );
}
