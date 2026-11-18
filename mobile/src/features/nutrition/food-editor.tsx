import React, { useRef, useState } from "react";
import { Switch, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { Sheet } from "../progress/editors";
import { dateLabel, localDate } from "../progress/model";
import { amountLabel, FoodButton, FoodField, FoodPill, MealTimePicker } from "./components";
import {
  makeFoodId,
  portionNutrition,
  SLOT_LABELS,
  validateEntry,
  type FoodEntry,
  type FoodUnit,
  type MealSlot,
  type Nutrients,
  type StoredFood,
} from "./model";
import { foodReminderAt, requestFoodReminderPermission } from "./reminders";

const NUTRIENTS: { key: keyof Nutrients; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "fiber", label: "Fiber", unit: "g" },
  { key: "sugar", label: "Sugar", unit: "g" },
  { key: "sodium", label: "Sodium", unit: "mg" },
];
const TIMES: Record<MealSlot, string> = {
  breakfast: "08:00",
  lunch: "13:00",
  dinner: "20:00",
  snack: "16:00",
};
const readNumber = (text: string) => (text.trim() ? Number(text.replace(",", ".")) : NaN);
export function FoodEditor({
  date,
  meal,
  entry,
  library,
  onSave,
  onDelete,
  onClose,
}: {
  date: string;
  meal: MealSlot;
  entry?: FoodEntry;
  library: StoredFood[];
  onSave: (entry: FoodEntry) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(entry?.name ?? "");
  const [quantity, setQuantity] = useState(entry ? String(entry.quantity) : "100");
  const [unit, setUnit] = useState<FoodUnit>(entry?.unit ?? "g");
  const [basis, setBasis] = useState(entry ? String(entry.basisAmount) : "100");
  const [slot, setSlot] = useState<MealSlot>(entry?.meal ?? meal);
  const [status, setStatus] = useState<FoodEntry["status"]>(entry?.status ?? "planned");
  const [time, setTime] = useState(entry?.time ?? TIMES[meal]);
  const [remind, setRemind] = useState(entry?.remind ?? false);
  const [note, setNote] = useState(entry?.note ?? "");
  const [values, setValues] = useState<Record<keyof Nutrients, string>>(
    () =>
      Object.fromEntries(
        NUTRIENTS.map((n) => [n.key, entry ? String(entry.nutrition[n.key]) : ""]),
      ) as Record<keyof Nutrients, string>,
  );
  const [more, setMore] = useState(false),
    [showLibrary, setShowLibrary] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [requestingPermission, setRequestingPermission] = useState(false);
  const locked = useRef(false);
  const reminderRequest = useRef({ pending: false, sequence: 0, intent: false });
  const waiting = busy || requestingPermission;
  function close() {
    if (!locked.current && !reminderRequest.current.pending) onClose();
  }
  async function toggleReminder(enabled: boolean) {
    if (locked.current) return;
    const request = reminderRequest.current;
    // A second native callback can arrive before the disabled switch is rendered.
    // Honour an off intent while allowing only one OS permission prompt at a time.
    if (request.pending) {
      if (!enabled) {
        request.intent = false;
        request.sequence++;
        setRemind(false);
      }
      return;
    }
    request.intent = enabled;
    const sequence = ++request.sequence;
    setError("");
    if (!enabled) {
      setRemind(false);
      return;
    }
    request.pending = true;
    setRequestingPermission(true);
    try {
      const granted = await requestFoodReminderPermission();
      if (request.sequence !== sequence || !request.intent) return;
      setRemind(granted);
      if (!granted) setError("Allow notifications in your phone settings to use meal reminders.");
    } catch (e) {
      if (request.sequence === sequence && request.intent) {
        setRemind(false);
        setError(e instanceof Error ? e.message : "Could not enable meal reminders.");
      }
    } finally {
      request.pending = false;
      setRequestingPermission(false);
    }
  }
  function build(): FoodEntry {
    const nutrition = Object.fromEntries(
      NUTRIENTS.map((n, i) => [
        n.key,
        i >= 4 && !values[n.key].trim() ? 0 : readNumber(values[n.key]),
      ]),
    ) as Nutrients;
    const result: FoodEntry = {
      id: entry?.id ?? "draft",
      date,
      meal: slot,
      name: name.trim(),
      quantity: readNumber(quantity),
      unit,
      basisAmount: readNumber(basis),
      nutrition,
      status,
      time,
      remind: status === "planned" && remind,
      note: note.trim(),
    };
    validateEntry(result, localDate());
    return result;
  }
  let preview: Nutrients | null = null;
  try {
    preview = portionNutrition(build());
  } catch {
    /* Keep drafts editable until save. */
  }
  async function save() {
    if (locked.current || reminderRequest.current.pending) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const input = { ...build(), id: entry?.id ?? makeFoodId() };
      if (input.remind && (foodReminderAt(input.date, input.time) ?? 0) <= Date.now())
        throw new Error("Choose a future meal time or turn off this reminder.");
      await onSave(input);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your food. Your input is kept.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function chooseSavedFood(food: StoredFood) {
    setName(food.name);
    setUnit(food.unit);
    setBasis(String(food.basisAmount));
    setQuantity(String(food.basisAmount));
    setValues(
      Object.fromEntries(NUTRIENTS.map((n) => [n.key, String(food.nutrition[n.key])])) as Record<
        keyof Nutrients,
        string
      >,
    );
    setShowLibrary(false);
    setError("");
  }
  return (
    <Sheet
      title={showLibrary ? "Your saved foods" : entry ? "Edit your food" : "What’s on your plate?"}
      eyebrow="YOUR FOOD / YOUR PLAN"
      subtitle={dateLabel(date, { weekday: "long", month: "short", day: "numeric" })}
      busy={waiting}
      onClose={close}
      footer={
        !showLibrary ? (
          <FoodButton
            title={
              busy
                ? "Saving…"
                : requestingPermission
                  ? "Enabling reminder…"
                  : entry
                    ? "Save changes"
                    : "Add food"
            }
            onPress={() => void save()}
            disabled={waiting}
            icon="check"
          />
        ) : undefined
      }
    >
      {showLibrary ? (
        <>
          <FoodButton
            title="Back to food"
            quiet
            icon="arrow-left"
            onPress={() => setShowLibrary(false)}
          />
          <Txt className="my-4 text-xs leading-5 text-muted">
            Foods you enter are saved here with their nutrition, ready to use again.
          </Txt>
          {!library.length && (
            <Txt className="my-6 text-sm text-muted">
              Add your first food to start your library.
            </Txt>
          )}
          {library.map((food) => (
            <Pressable
              key={food.id}
              accessibilityRole="button"
              accessibilityLabel={`Use ${food.name}`}
              onPress={() => chooseSavedFood(food)}
              className="mb-3 rounded-[22px] border border-white/10 bg-white/5 p-4"
            >
              <Txt weight="medium" className="text-sm">
                {food.name}
              </Txt>
              <Txt className="mt-2 text-[11px] leading-5 text-muted">
                {amountLabel(food.nutrition.calories)} kcal per {amountLabel(food.basisAmount)}{" "}
                {food.unit} · P {amountLabel(food.nutrition.protein)} / C{" "}
                {amountLabel(food.nutrition.carbs)} / F {amountLabel(food.nutrition.fat)}
              </Txt>
            </Pressable>
          ))}
        </>
      ) : (
        <View className="gap-5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use a saved food"
            disabled={waiting}
            onPress={() => setShowLibrary(true)}
            className="min-h-14 flex-row items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5"
          >
            <MaterialCommunityIcons name="bookmark-outline" size={20} color="#FFFFFF" />
            <Txt className="flex-1 text-xs">Use a saved food</Txt>
            <Txt className="text-xs text-muted">{library.length}</Txt>
            <MaterialCommunityIcons name="chevron-right" size={19} color="#A3A3A3" />
          </Pressable>
          <FoodField
            label="Food name"
            value={name}
            onChange={setName}
            placeholder="e.g. oats, rice, your homemade lunch"
          />
          <View>
            <Txt className="mb-3 text-[11px] text-muted">Meal</Txt>
            <View className="flex-row flex-wrap gap-2">
              {(Object.keys(SLOT_LABELS) as MealSlot[]).map((value) => (
                <FoodPill
                  key={value}
                  title={SLOT_LABELS[value]}
                  active={slot === value}
                  onPress={() => {
                    setSlot(value);
                    if (!entry) setTime(TIMES[value]);
                  }}
                />
              ))}
            </View>
          </View>
          <View className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
            <Txt weight="medium" className="mb-4 text-base">
              How much?
            </Txt>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {(
                [
                  { value: "g", label: "Grams" },
                  { value: "ml", label: "Millilitres" },
                  { value: "serving", label: "Servings" },
                ] as const
              ).map((item) => (
                <FoodPill
                  key={item.value}
                  title={item.label}
                  active={unit === item.value}
                  onPress={() => {
                    if (item.value === unit) return;
                    setUnit(item.value);
                    setQuantity(item.value === "serving" ? "1" : "100");
                    setBasis(item.value === "serving" ? "1" : "100");
                  }}
                />
              ))}
            </View>
            <FoodField
              label="Amount you’ll eat"
              value={quantity}
              onChange={setQuantity}
              numeric
              unit={unit}
            />
          </View>
          <View>
            <Txt weight="medium" className="text-lg tracking-[-0.4px]">
              Add the nutrition.
            </Txt>
            <Txt className="mb-4 mt-2 text-xs leading-5 text-muted">
              Use the label or values you know. Enter 0 for a nutrient with none. Values below are
              for the reference amount, then scaled to your portion.
            </Txt>
            <FoodField
              label="Nutrition reference amount"
              value={basis}
              onChange={setBasis}
              numeric
              unit={unit}
            />
            <View className="mt-4 gap-3">
              {[0, 2].map((start) => (
                <View key={start} className="flex-row gap-3">
                  {NUTRIENTS.slice(start, start + 2).map((n) => (
                    <View key={n.key} className="min-w-0 flex-1">
                      <FoodField
                        label={n.label}
                        value={values[n.key]}
                        onChange={(text) => setValues((current) => ({ ...current, [n.key]: text }))}
                        numeric
                        placeholder="0"
                        unit={n.unit}
                      />
                    </View>
                  ))}
                </View>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={more ? "Show fewer nutrients" : "Show more nutrients"}
              accessibilityState={{ expanded: more }}
              onPress={() => setMore(!more)}
              className="min-h-12 flex-row items-center gap-2"
            >
              <Txt className="text-xs text-muted">
                {more ? "Show less" : "Show more · fiber, sugar, sodium"}
              </Txt>
              <MaterialCommunityIcons
                name={more ? "chevron-up" : "chevron-down"}
                size={18}
                color="#A3A3A3"
              />
            </Pressable>
            {more && (
              <View className="gap-3">
                {NUTRIENTS.slice(4).map((n) => (
                  <FoodField
                    key={n.key}
                    label={n.label}
                    value={values[n.key]}
                    onChange={(text) => setValues((current) => ({ ...current, [n.key]: text }))}
                    numeric
                    placeholder="Optional"
                    unit={n.unit}
                  />
                ))}
              </View>
            )}
          </View>
          {preview && (
            <View className="rounded-[24px] bg-white p-5">
              <Txt className="text-[10px] tracking-[1px] text-black/60">
                YOUR {quantity} {unit.toUpperCase()} PORTION
              </Txt>
              <Txt
                weight="medium"
                className="mt-2 text-[30px] leading-10 tracking-[-1px] text-black"
              >
                {amountLabel(preview.calories)} <Txt className="text-sm text-black/60">kcal</Txt>
              </Txt>
              <Txt className="mt-2 text-xs leading-5 text-black/60">
                {amountLabel(preview.protein)} g protein · {amountLabel(preview.carbs)} g carbs ·{" "}
                {amountLabel(preview.fat)} g fat
              </Txt>
            </View>
          )}
          <View className="flex-row flex-wrap gap-2">
            <FoodPill
              title="Plan to eat"
              active={status === "planned"}
              onPress={() => setStatus("planned")}
            />
            <FoodPill
              title="Already eaten"
              active={status === "eaten"}
              disabled={date > localDate()}
              onPress={() => {
                reminderRequest.current.intent = false;
                reminderRequest.current.sequence++;
                setStatus("eaten");
                setRemind(false);
              }}
            />
          </View>
          <MealTimePicker value={time} onChange={setTime} />
          {status === "planned" && (
            <View className="rounded-[22px] border border-white/10 p-4">
              <View className="flex-row items-center gap-3">
                <View className="min-w-0 flex-1">
                  <Txt weight="medium" className="text-sm">
                    Remind me for this meal
                  </Txt>
                  <Txt className="mt-1 text-[11px] leading-5 text-muted">
                    At {time}, using this phone’s local time.
                  </Txt>
                </View>
                <Switch
                  accessibilityLabel="Meal reminder"
                  value={remind}
                  disabled={waiting}
                  trackColor={{ false: "#333333", true: "#FFFFFF" }}
                  thumbColor={remind ? "#111111" : "#A3A3A3"}
                  onValueChange={toggleReminder}
                />
              </View>
            </View>
          )}
          <FoodField
            label="Meal note · optional"
            value={note}
            onChange={setNote}
            placeholder="Prep ahead, ingredients, or anything to remember"
            multiline
          />
          {!!error && (
            <Txt accessibilityRole="alert" className="text-xs leading-5 text-white">
              {error}
            </Txt>
          )}
          <Txt className="text-[10px] leading-5 text-muted">
            Your food details and reusable library are saved on this device. Eaten totals can be
            saved to Progress.
          </Txt>
          {entry && onDelete && (
            <FoodButton
              title="Delete food"
              quiet
              icon="trash-can-outline"
              disabled={waiting}
              onPress={() => {
                if (locked.current || reminderRequest.current.pending) return;
                locked.current = true;
                setBusy(true);
                setError("");
                void onDelete(entry.id)
                  .then(onClose)
                  .catch((e) =>
                    setError(e instanceof Error ? e.message : "Could not delete this food."),
                  )
                  .finally(() => {
                    locked.current = false;
                    setBusy(false);
                  });
              }}
            />
          )}
        </View>
      )}
    </Sheet>
  );
}
