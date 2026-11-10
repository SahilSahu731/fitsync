import { MotionPressable as Pressable } from "@/src/components/motion";
import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { localDate, METRICS, METRIC_GROUPS, RATING_LABELS, validMetric, weightKg, weightValue, type Goals, type Metric, type MetricEvent } from "./model";

const inputStyle = { color: C.ink, fontSize: 18, backgroundColor: "#FFFFFF08", borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 15, fontFamily: "Inter_500Medium" };
export function Sheet({ title, subtitle, onClose, children, busy = false }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; busy?: boolean }) {
  return <Modal visible transparent animationType="slide" onRequestClose={() => { if (!busy) onClose(); }} statusBarTranslucent><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "#00000099" }}><View style={{ maxHeight: "90%", backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 12, width: "100%", maxWidth: 760, alignSelf: "center" }}><View style={{ width: 40, height: 4, borderRadius: 4, backgroundColor: C.border, alignSelf: "center" }} /><View className="flex-row items-center justify-between px-6 pb-4 pt-5"><View className="flex-1 pr-3"><Txt weight="bold" className="text-[24px]">{title}</Txt>{subtitle && <Txt className="mt-1 text-xs leading-5 text-muted">{subtitle}</Txt>}</View><Pressable accessibilityRole="button" accessibilityLabel="Close editor" disabled={busy} onPress={onClose} className="h-11 w-11 items-center justify-center rounded-full bg-elevated"><MaterialCommunityIcons name="close" size={22} color={C.ink} /></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 45 }}>{children}</ScrollView></View></KeyboardAvoidingView></Modal>;
}
function Field({ label, value, onChange, decimal = true, disabled = false }: { label: string; value: string; onChange: (value: string) => void; decimal?: boolean; disabled?: boolean }) {
  return <View className="mb-4"><Txt weight="medium" className="mb-2 text-xs text-muted">{label}</Txt><TextInput editable={!disabled} accessibilityLabel={label} style={inputStyle} keyboardType={decimal ? "decimal-pad" : "default"} value={value} onChangeText={onChange} placeholderTextColor="#676772" placeholder={decimal ? "Not set" : "YYYY-MM-DD"} /></View>;
}
export function MetricEditor({ initialMetric, date: initialDate, events, unit, onClose, onSave }: { initialMetric: Metric; date: string; events: MetricEvent[]; unit: "kg" | "lb"; onClose: () => void; onSave: (metric: Metric, date: string, value: number | null, notes: string) => Promise<void> }) {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<string>(() => Object.entries(METRIC_GROUPS).find(([, group]) => (group.metrics as readonly Metric[]).includes(initialMetric))?.[0] ?? "activity");
  const [metric, setMetric] = useState(initialMetric); const [date, setDate] = useState(initialDate);
  const existing = events.find(entry => entry.metric === metric && entry.date === date);
  const existingDisplay = (entry: MetricEvent | undefined, m: Metric) => entry?.value == null ? "" : String(m === "weight" ? Math.round(weightValue(entry.value, unit) * 100) / 100 : entry.value);
  const [value, setValue] = useState(existingDisplay(existing, metric)); const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const spec = METRICS[metric];
  const rating = RATING_LABELS[metric];
  const choices = (Object.keys(METRICS) as Metric[]).filter(key => search.trim() ? METRICS[key].label.toLowerCase().includes(search.trim().toLowerCase()) : group === "all" || (METRIC_GROUPS[group as keyof typeof METRIC_GROUPS].metrics as readonly Metric[]).includes(key));
  const select = (nextMetric: Metric, nextDate: string) => { const entry = events.find(e => e.metric === nextMetric && e.date === nextDate); setMetric(nextMetric); setDate(nextDate); setValue(existingDisplay(entry, nextMetric)); setNotes(entry?.notes ?? ""); setError(""); };
  async function save(clear = false) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date || date > localDate()) { setError("Choose a valid date up to today (YYYY-MM-DD)."); return; }
    const amount = clear ? null : metric === "weight" ? weightKg(Number(value), unit) : Number(value);
    if (!clear && (!value.trim() || !validMetric(metric, amount))) { setError(`Enter ${metric === "weight" ? `${weightValue(spec.min, unit).toFixed(1)}–${weightValue(spec.max, unit).toFixed(1)} ${unit}` : `${spec.min}–${spec.max} ${spec.unit}`}${"integer" in spec && spec.integer ? " in whole numbers" : ""}.`); return; }
    setBusy(true); setError("");
    try { await onSave(metric, date, amount, notes.trim()); onClose(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save."); } finally { setBusy(false); }
  }
  return <Sheet title="Log a check-in" subtitle="Choose a metric and enter a daily total or measurement." onClose={onClose} busy={busy}>
    <TextInput accessibilityLabel="Search tracking metrics" editable={!busy} value={search} onChangeText={setSearch} placeholder="Find a metric…" placeholderTextColor={C.muted} style={[inputStyle, { marginBottom: 14, fontSize: 14 }]} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3"><View className="flex-row gap-2">{Object.entries(METRIC_GROUPS).map(([key, item]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: group === key }} disabled={busy} onPress={() => { setGroup(key); setSearch(""); }} style={{ paddingHorizontal: 13, minHeight: 44, justifyContent: "center", borderRadius: 16, backgroundColor: group === key ? `${C.brand}25` : "#FFFFFF08" }}><Txt weight="semibold" className="text-xs" style={{ color: C.brand }}>{item.label}</Txt></Pressable>)}</View></ScrollView>
    <View className="mb-5 flex-row flex-wrap gap-2">{choices.map(key => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: metric === key }} disabled={busy} onPress={() => select(key, date)} style={{ paddingHorizontal: 12, minHeight: 44, justifyContent: "center", borderRadius: 20, backgroundColor: metric === key ? C.brand : "#FFFFFF08" }}><Txt weight="semibold" className="text-xs" style={{ color: metric === key ? "#121218" : C.muted }}>{METRICS[key].label}</Txt></Pressable>)}</View>
    {!choices.length && <Txt className="mb-4 text-sm text-muted">No metrics match your search.</Txt>}
    <Field disabled={busy} label="Date (YYYY-MM-DD)" decimal={false} value={date} onChange={next => select(metric, next)} />
    {rating ? <View className="mb-5"><Txt className="mb-3 text-sm">{spec.label}</Txt><View className="flex-row gap-2">{rating.map((label, index) => <Pressable key={label} disabled={busy} accessibilityRole="button" accessibilityLabel={`${index + 1}: ${label}`} accessibilityState={{ selected: Number(value) === index + 1 }} onPress={() => setValue(String(index + 1))} style={{ flex: 1, minHeight: 52, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: Number(value) === index + 1 ? C.brand : "#FFFFFF0A" }}><Txt weight="bold" style={{ color: Number(value) === index + 1 ? C.bg : C.ink, fontSize: 20 }}>{index + 1}</Txt></Pressable>)}</View><Txt className="mt-3 text-xs text-muted">{value ? rating[Number(value) - 1] : `1 · ${rating[0]}  →  5 · ${rating[4]}`}</Txt></View> : <Field disabled={busy} label={`${spec.label} (${metric === "weight" ? unit : spec.unit})`} value={value} onChange={setValue} />}
    {metric === "water" && <View className="mb-4 flex-row gap-2">{[250, 500, 750].map(amount => <Pressable key={amount} disabled={busy} accessibilityRole="button" onPress={() => setValue(String((Number(value) || 0) + amount))} className="min-h-11 flex-1 items-center justify-center rounded-xl bg-white/5"><Txt className="text-xs" style={{ color: C.brand }}>+ {amount} ml</Txt></Pressable>)}</View>}
    {metric === "hrv" && <Txt className="mb-4 text-xs leading-5 text-muted">Use readings from the same wearable and measurement method for a consistent trend.</Txt>}
    {metric === "caloriesActive" && <Txt className="mb-4 text-xs leading-5 text-muted">Enter active energy from your wearable or activity log. This excludes resting energy. FitSync does not invent calorie burn from workout duration.</Txt>}
    {metric === "caloriesIn" && <Txt className="mb-4 text-xs leading-5 text-muted">Enter the day’s total food energy from your food log. This is a daily total, not an individual meal.</Txt>}
    <Txt className="mb-2 text-xs text-muted">Notes (optional)</Txt><TextInput editable={!busy} accessibilityLabel="Check-in notes" multiline maxLength={500} value={notes} onChangeText={setNotes} style={[inputStyle, { minHeight: 90, textAlignVertical: "top" }]} />
    {error && <Txt accessibilityRole="alert" className="mt-4 text-sm" style={{ color: "#FF9A94" }}>{error}</Txt>}
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => void save()} style={{ marginTop: 22, backgroundColor: C.brand, padding: 17, borderRadius: 18, alignItems: "center" }}>{busy ? <ActivityIndicator color="#111" /> : <Txt weight="bold" style={{ color: "#15151B" }}>Save check-in</Txt>}</Pressable>
    {existing && <Pressable accessibilityRole="button" disabled={busy} onPress={() => void save(true)} className="items-center py-5"><Txt className="text-sm text-muted">Clear this day’s value</Txt></Pressable>}
  </Sheet>;
}
const goalLabels: Record<keyof Goals, string> = { steps: "Daily steps", caloriesIn: "Food intake (kcal/day)", caloriesActive: "Active calories (kcal/day)", protein: "Protein (g/day)", carbs: "Carbs (g/day)", fat: "Fat (g/day)", activeMinutes: "Active minutes per day", weight: "Body weight", water: "Water (ml/day)", sleep: "Sleep (hours/night)", weeklyWorkouts: "Workouts per week" };
export function GoalsEditor({ goals, unit, onClose, onSave }: { goals: Goals; unit: "kg" | "lb"; onClose: () => void; onSave: (goals: Goals) => Promise<void> }) {
  const [values, setValues] = useState(() => Object.fromEntries(Object.entries(goals).map(([key, value]) => [key, value == null ? "" : String(key === "weight" ? Math.round(weightValue(value, unit) * 100) / 100 : value)])));
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function save() {
    const result = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim() ? key === "weight" ? weightKg(Number(value), unit) : Number(value) : null])) as Goals;
    for (const key of Object.keys(goalLabels) as (keyof Goals)[]) {
      const n = result[key];
      if (key === "weeklyWorkouts" ? n == null || !Number.isInteger(n) || n < 1 || n > 14 : n !== null && (!Number.isFinite(n) || n <= 0 || !validMetric(key, n) || ["steps", "water", "caloriesIn", "caloriesActive"].includes(key) && !Number.isInteger(n) || key === "sleep" && n < 1 || key === "steps" && n > 100000)) { setError(`Check your ${goalLabels[key].toLowerCase()} target.`); return; }
    }
    setBusy(true); setError(""); try { await onSave(result); onClose(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save goals."); } finally { setBusy(false); }
  }
  return <Sheet title="Your goals" subtitle="Targets are yours to choose. Leave optional goals blank to track without a target. These are tracking preferences, not a nutrition or medical plan." onClose={onClose} busy={busy}>{(Object.keys(goalLabels) as (keyof Goals)[]).map(key => <Field key={key} label={`${goalLabels[key]}${key === "weight" ? ` (${unit})` : ""}`} value={values[key]} disabled={busy} onChange={value => setValues(v => ({ ...v, [key]: value }))} />)}{error && <Txt className="mb-4 text-sm" style={{ color: "#FF9A94" }}>{error}</Txt>}<Pressable accessibilityRole="button" disabled={busy} onPress={() => void save()} className="items-center rounded-2xl bg-brand p-4"><Txt weight="bold" className="text-bg">{busy ? "Saving…" : "Save goals"}</Txt></Pressable></Sheet>;
}
