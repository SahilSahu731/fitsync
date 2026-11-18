import { MotionPressable as Pressable } from "@/src/components/motion";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useKeyboardForm } from "./keyboard-visibility";
import {
  addDays,
  dateLabel,
  isTotalMetric,
  latestMetrics,
  localDate,
  METRICS,
  METRIC_GROUPS,
  RATING_LABELS,
  validMetric,
  weightKg,
  weightValue,
  type Metric,
  type MetricEvent,
  type MetricGroup,
} from "./model";

export function Sheet({
  title,
  subtitle,
  onClose,
  children,
  busy = false,
  eyebrow,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  busy?: boolean;
  eyebrow?: string;
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const {
    viewportRef,
    scrollRef,
    bottomInset,
    keyboardOpen,
    onViewportLayout,
    onFocus,
    onScroll,
    revealInput,
  } = useKeyboardForm();
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View ref={viewportRef} onLayout={onViewportLayout} className="flex-1 bg-black/70">
        <View
          className="flex-1 justify-end"
          style={{ paddingTop: insets.top + 12, paddingBottom: bottomInset }}
        >
          <View
            accessibilityViewIsModal
            className="w-full max-w-2xl self-center rounded-t-[32px] bg-panel pt-3"
            style={{ maxHeight: keyboardOpen ? "100%" : "92%", flexShrink: 1 }}
          >
            <View className="h-1 w-10 self-center rounded-full bg-white/20" />
            <View
              className={`flex-row items-center justify-between px-6 ${keyboardOpen ? "py-2" : "pb-4 pt-5"}`}
            >
              <View className="flex-1 pr-3">
                {/* {!!eyebrow && !keyboardOpen && (
                  <Txt weight="semibold" className="mb-1 text-[10px] tracking-[2px] text-muted">
                    {eyebrow}
                  </Txt>
                )} */}
                <Txt
                  accessibilityRole="header"
                  weight="medium"
                  className="text-2xl tracking-[-0.7px]"
                  style={{ lineHeight: 32 }}
                >
                  {title}
                </Txt>
                {subtitle && !keyboardOpen && (
                  <Txt className="mt-1 text-xs leading-5 text-muted">{subtitle}</Txt>
                )}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close editor"
                disabled={busy}
                onPress={onClose}
                className="h-11 w-11 items-center justify-center rounded-full bg-elevated"
              >
                <MaterialCommunityIcons name="close" size={22} color={C.ink} />
              </Pressable>
            </View>
            <ScrollView
              ref={scrollRef}
              onFocus={onFocus}
              onScroll={onScroll}
              onLayout={revealInput}
              onContentSizeChange={revealInput}
              scrollEventThrottle={16}
              automaticallyAdjustKeyboardInsets={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1, minHeight: 0 }}
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingBottom: footer == null ? Math.max(48, insets.bottom + 16) : 20,
              }}
            >
              {children}
            </ScrollView>
            {footer != null && (
              <View
                className="border-t border-white/5 px-6 pt-4"
                style={{
                  paddingBottom: keyboardOpen ? 12 : Math.max(insets.bottom, 16),
                }}
              >
                {footer}
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const GROUP_ACCENTS: Record<MetricGroup, string> = {
  activity: C.brand,
  nutrition: "#EBC887",
  body: "#8FC8F5",
  recovery: "#BEAAED",
};
function metricGroup(metric: Metric): MetricGroup {
  return (
    (Object.keys(METRIC_GROUPS) as MetricGroup[]).find((key) =>
      (METRIC_GROUPS[key].metrics as readonly Metric[]).includes(metric),
    ) ?? "activity"
  );
}
function validDate(date: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(`${date}T12:00:00Z`)) &&
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date &&
    date <= localDate()
  );
}
// Native pickers use the device's calendar day, rather than a UTC timestamp.
function calendarDate(date: string) {
  return validDate(date) ? new Date(`${date}T12:00:00`) : new Date();
}
function metricHint(metric: Metric) {
  if (metric === "water") return "Your total for the day. Quick adds build on the amount above.";
  if (metric === "sleep") return "Log the hours you slept, including partial hours like 7.5.";
  if (metric === "hrv")
    return "Use the same wearable and measurement method for a consistent trend.";
  if (metric === "caloriesActive")
    return "Active energy from your wearable or activity log, excluding resting energy.";
  if (metric === "caloriesIn")
    return "Total food energy for the day, rather than an individual meal.";
  return isTotalMetric(metric)
    ? "Enter your total for this day."
    : "A single measurement for this day.";
}
export function MetricEditor({
  initialMetric,
  startWithPicker = false,
  date: initialDate,
  events,
  unit,
  onClose,
  onSave,
}: {
  initialMetric: Metric;
  startWithPicker?: boolean;
  date: string;
  events: MetricEvent[];
  unit: "kg" | "lb";
  onClose: () => void;
  onSave: (metric: Metric, date: string, value: number | null, notes: string) => Promise<void>;
}) {
  const entries = useMemo(() => latestMetrics(events), [events]);
  const [metric, setMetric] = useState(initialMetric);
  const [date, setDate] = useState(initialDate);
  const existing = entries.find((entry) => entry.metric === metric && entry.date === date);
  const existingDisplay = (entry: MetricEvent | undefined, m: Metric) =>
    entry?.value == null
      ? ""
      : String(
          m === "weight" ? Math.round(weightValue(entry.value, unit) * 100) / 100 : entry.value,
        );
  const [value, setValue] = useState(() => existingDisplay(existing, metric));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [notesOpen, setNotesOpen] = useState(Boolean(existing?.notes));
  const [choosingMetric, setChoosingMetric] = useState(startWithPicker);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<MetricGroup>(() => metricGroup(initialMetric));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState(initialDate);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const drafts = useRef(new Map<string, { value: string; notes: string }>());
  const draftKey = `${date}:${metric}`;
  const spec = METRICS[metric];
  const rating = RATING_LABELS[metric];
  const selectedGroup = metricGroup(metric);
  const accent = GROUP_ACCENTS[selectedGroup];
  const displayUnit = metric === "weight" ? unit : spec.unit;
  const today = localDate();
  const yesterday = addDays(today, -1);
  const dateTitle = validDate(date)
    ? dateLabel(date, { month: "short", day: "numeric", year: "numeric" })
    : "Choose a date";
  const choices = (Object.keys(METRICS) as Metric[]).filter((key) =>
    search.trim()
      ? METRICS[key].label.toLowerCase().includes(search.trim().toLowerCase())
      : (METRIC_GROUPS[group].metrics as readonly Metric[]).includes(key),
  );

  function updateValue(next: string) {
    if (saving.current) return;
    drafts.current.set(draftKey, {
      value: next,
      notes: drafts.current.get(draftKey)?.notes ?? notes,
    });
    setValue(next);
    setError("");
  }
  function updateNotes(next: string) {
    if (saving.current) return;
    drafts.current.set(draftKey, {
      value: drafts.current.get(draftKey)?.value ?? value,
      notes: next,
    });
    setNotes(next);
  }
  function select(nextMetric: Metric, nextDate: string) {
    if (saving.current) return;
    if (!drafts.current.has(draftKey)) drafts.current.set(draftKey, { value, notes });
    const entry = entries.find((item) => item.metric === nextMetric && item.date === nextDate);
    const draft = drafts.current.get(`${nextDate}:${nextMetric}`) ?? {
      value: existingDisplay(entry, nextMetric),
      notes: entry?.notes ?? "",
    };
    setMetric(nextMetric);
    setDate(nextDate);
    setValue(draft.value);
    setNotes(draft.notes);
    setNotesOpen(Boolean(draft.notes));
    setError("");
  }
  function close() {
    if (saving.current) return;
    Keyboard.dismiss();
    onClose();
  }
  function chooseDate() {
    if (saving.current) return;
    Keyboard.dismiss();
    const commit = (selected: Date) => {
      const next = localDate(selected);
      if (validDate(next)) select(metric, next);
      else setError("Choose a valid date up to today.");
    };
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        mode: "date",
        value: calendarDate(date),
        maximumDate: new Date(),
        onValueChange: (_, selected) => commit(selected),
      });
    } else {
      setCustomDate(date);
      setShowDatePicker((current) => !current);
    }
  }
  async function save(clear = false) {
    if (saving.current) return;
    if (!validDate(date)) {
      setError("Choose a valid date up to today.");
      return;
    }
    const amount = clear
      ? null
      : metric === "weight"
        ? weightKg(Number(value), unit)
        : Number(value);
    if (!clear && (!value.trim() || !validMetric(metric, amount))) {
      setError(
        `Enter ${metric === "weight" ? `${weightValue(spec.min, unit).toFixed(1)}–${weightValue(spec.max, unit).toFixed(1)} ${unit}` : `${spec.min}–${spec.max} ${spec.unit}`}${"integer" in spec && spec.integer ? " in whole numbers" : ""}.`,
      );
      return;
    }
    // State updates alone cannot prevent two taps before React's next render.
    saving.current = true;
    setBusy(true);
    setError("");
    Keyboard.dismiss();
    try {
      await onSave(metric, date, amount, notes.trim());
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to save. Please try again.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <Sheet
      eyebrow="YOUR PROGRESS"
      title={choosingMetric ? "Choose a metric" : "Daily check-in"}
      subtitle={
        choosingMetric
          ? "Make space for every part of your progress."
          : "Small check-ins. A clearer picture of you."
      }
      onClose={close}
      busy={busy}
      footer={
        choosingMetric ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to check-in"
            onPress={() => setChoosingMetric(false)}
            className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-elevated"
          >
            <MaterialCommunityIcons name="arrow-left" size={18} color={C.ink} />
            <Txt weight="medium" className="text-sm">
              Back to check-in
            </Txt>
          </Pressable>
        ) : (
          <>
            {!!error && (
              <Txt
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                className="mb-3 text-xs leading-5"
                style={{ color: "#FF9A94" }}
              >
                {error}
              </Txt>
            )}
            <View className="flex-row items-center gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save check-in"
                accessibilityState={{ disabled: busy, busy }}
                disabled={busy}
                onPress={() => void save()}
                className="min-h-14 flex-1 flex-row items-center justify-center gap-2 rounded-2xl px-4"
                style={{ backgroundColor: C.brand }}
              >
                {busy ? (
                  <ActivityIndicator color={C.bg} />
                ) : (
                  <MaterialCommunityIcons name="check" size={20} color={C.bg} />
                )}
                <Txt weight="semibold" className="text-sm text-bg">
                  {busy ? "Saving…" : "Save check-in"}
                </Txt>
              </Pressable>
              {existing?.value != null && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear this day’s value"
                  accessibilityHint="Removes the saved value for this metric and date."
                  disabled={busy}
                  onPress={() => void save(true)}
                  className="h-14 w-14 items-center justify-center rounded-2xl bg-elevated"
                >
                  <MaterialCommunityIcons name="delete-outline" size={22} color={C.muted} />
                </Pressable>
              )}
            </View>
            <Txt className="mt-2 text-center text-[10px] leading-5 text-muted">
              {existing?.value != null ? "Updates" : "Saves"} {spec.label.toLowerCase()} ·{" "}
              {dateTitle}
            </Txt>
          </>
        )
      }
    >
      {choosingMetric ? (
        <>
          <View className="mb-4 flex-row items-center gap-3 rounded-2xl bg-elevated px-4">
            <MaterialCommunityIcons name="magnify" size={21} color={C.muted} />
            <TextInput
              accessibilityLabel="Search tracking metrics"
              value={search}
              onChangeText={setSearch}
              placeholder="Find a metric…"
              placeholderTextColor={C.muted}
              autoCorrect={false}
              className="min-h-14 flex-1 font-poppins-regular text-sm text-ink"
              style={{ paddingVertical: 14, lineHeight: 22 }}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <View className="flex-row gap-2">
              {(Object.keys(METRIC_GROUPS) as MetricGroup[]).map((key) => (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${METRIC_GROUPS[key].label} metrics`}
                  accessibilityState={{ selected: group === key && !search.trim() }}
                  onPress={() => {
                    setGroup(key);
                    setSearch("");
                  }}
                  className="min-h-11 items-center justify-center rounded-full px-4"
                  style={{
                    backgroundColor:
                      group === key && !search.trim() ? `${GROUP_ACCENTS[key]}20` : C.elevated,
                  }}
                >
                  <Txt
                    weight="medium"
                    className="text-xs"
                    style={{
                      color: group === key && !search.trim() ? GROUP_ACCENTS[key] : C.muted,
                    }}
                  >
                    {METRIC_GROUPS[key].label}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View className="overflow-hidden rounded-2xl bg-white/[0.025]">
            {choices.map((key, index) => {
              const itemGroup = metricGroup(key);
              const itemAccent = GROUP_ACCENTS[itemGroup];
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${METRICS[key].label}`}
                  accessibilityState={{ selected: metric === key }}
                  onPress={() => {
                    select(key, date);
                    setChoosingMetric(false);
                    setShowDatePicker(false);
                    setGroup(itemGroup);
                    setSearch("");
                    Keyboard.dismiss();
                  }}
                  className="min-h-16 flex-row items-center gap-3 px-4 py-3"
                  style={{ borderTopWidth: index ? 1 : 0, borderTopColor: "#FFFFFF08" }}
                >
                  <View
                    className="h-9 w-9 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${itemAccent}12` }}
                  >
                    <MaterialCommunityIcons
                      name={METRIC_GROUPS[itemGroup].icon}
                      size={19}
                      color={itemAccent}
                    />
                  </View>
                  <Txt className="flex-1 text-sm">{METRICS[key].label}</Txt>
                  {metric === key ? (
                    <MaterialCommunityIcons name="check-circle" size={21} color={itemAccent} />
                  ) : (
                    <Txt className="text-[11px] text-muted">
                      {key === "weight" ? unit : METRICS[key].unit}
                    </Txt>
                  )}
                </Pressable>
              );
            })}
          </View>
          {!choices.length && (
            <Txt className="py-8 text-center text-sm text-muted">No metrics match your search.</Txt>
          )}
        </>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change tracking metric"
            accessibilityHint={`Currently tracking ${spec.label}. Opens all tracking metrics.`}
            disabled={busy}
            onPress={() => {
              Keyboard.dismiss();
              setGroup(selectedGroup);
              setSearch("");
              setChoosingMetric(true);
              setShowDatePicker(false);
            }}
            className="mb-5 flex-row items-center gap-3 rounded-2xl border border-white/5 bg-elevated p-3"
          >
            <View
              className="h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${accent}16` }}
            >
              <MaterialCommunityIcons
                name={METRIC_GROUPS[selectedGroup].icon}
                size={25}
                color={accent}
              />
            </View>
            <View className="flex-1">
              <Txt className="mb-0.5 text-[10px] text-muted">
                {METRIC_GROUPS[selectedGroup].label.toUpperCase()}
              </Txt>
              <Txt weight="medium" className="text-base">
                {spec.label}
              </Txt>
            </View>
            <View className="items-end gap-1 pr-1">
              <MaterialCommunityIcons name="unfold-more-horizontal" size={20} color={C.muted} />
              <Txt className="text-[9px] text-muted">Change</Txt>
            </View>
          </Pressable>

          <View className="mb-5 flex-row gap-2">
            {[
              [today, "Today", "Log for today"],
              [yesterday, "Yesterday", "Log for yesterday"],
            ].map(([day, label, accessibilityLabel]) => (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityState={{ selected: date === day }}
                disabled={busy}
                onPress={() => {
                  select(metric, day);
                  setShowDatePicker(false);
                }}
                className="min-h-11 flex-1 items-center justify-center rounded-xl border"
                style={{
                  borderColor: date === day ? `${accent}50` : "#FFFFFF0A",
                  backgroundColor: date === day ? `${accent}12` : "transparent",
                }}
              >
                <Txt
                  weight="medium"
                  className="text-xs"
                  style={{ color: date === day ? accent : C.muted }}
                >
                  {label}
                </Txt>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose check-in date"
              accessibilityHint={`Selected date: ${dateTitle}`}
              accessibilityState={{
                selected: date !== today && date !== yesterday,
                expanded: showDatePicker,
              }}
              disabled={busy}
              onPress={chooseDate}
              className="min-h-11 flex-row items-center justify-center gap-1.5 rounded-xl border px-3"
              style={{
                borderColor: date !== today && date !== yesterday ? `${accent}50` : "#FFFFFF0A",
                backgroundColor:
                  date !== today && date !== yesterday ? `${accent}12` : "transparent",
              }}
            >
              <MaterialCommunityIcons
                name="calendar-blank-outline"
                size={17}
                color={date !== today && date !== yesterday ? accent : C.muted}
              />
              <Txt
                className="text-xs"
                style={{ color: date !== today && date !== yesterday ? accent : C.muted }}
              >
                {date !== today && date !== yesterday && validDate(date) ? dateLabel(date) : "Date"}
              </Txt>
            </Pressable>
          </View>
          {showDatePicker && Platform.OS === "ios" && (
            <View className="mb-5 overflow-hidden rounded-2xl bg-elevated">
              <DateTimePicker
                value={calendarDate(date)}
                mode="date"
                display="spinner"
                themeVariant="dark"
                maximumDate={new Date()}
                disabled={busy}
                onValueChange={(_, selected) => {
                  const next = localDate(selected);
                  if (validDate(next)) select(metric, next);
                }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done choosing date"
                onPress={() => setShowDatePicker(false)}
                className="min-h-11 items-center justify-center"
              >
                <Txt weight="medium" className="text-sm" style={{ color: accent }}>
                  Done
                </Txt>
              </Pressable>
            </View>
          )}
          {showDatePicker && Platform.OS === "web" && (
            <View className="mb-5 flex-row items-center gap-3 rounded-2xl bg-elevated px-4">
              <TextInput
                accessibilityLabel="Custom check-in date"
                value={customDate}
                onChangeText={setCustomDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.muted}
                maxLength={10}
                className="min-h-14 flex-1 font-poppins-regular text-sm text-ink"
                style={{ paddingVertical: 14, lineHeight: 22 }}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (validDate(customDate)) {
                    select(metric, customDate);
                    setShowDatePicker(false);
                  } else setError("Choose a valid date up to today.");
                }}
                className="min-h-11 justify-center px-3"
              >
                <Txt weight="medium" className="text-xs" style={{ color: accent }}>
                  Apply
                </Txt>
              </Pressable>
            </View>
          )}

          <View
            className="mb-4 rounded-[24px] border px-5 pb-5 pt-4"
            style={{ backgroundColor: `${accent}08`, borderColor: `${accent}25` }}
          >
            <View className="mb-2 flex-row items-center justify-between gap-2">
              <Txt weight="medium" className="text-[10px] tracking-[1.5px] text-muted">
                {rating
                  ? "HOW DID IT FEEL?"
                  : isTotalMetric(metric)
                    ? "DAILY TOTAL"
                    : "MEASUREMENT"}
              </Txt>
              {existing?.value != null && (
                <Txt className="text-[9px]" style={{ color: accent }}>
                  EDITING SAVED ENTRY
                </Txt>
              )}
            </View>
            {rating ? (
              <>
                <Txt
                  weight="medium"
                  className="mb-4 mt-2 text-xl"
                  style={{ color: value ? accent : C.muted }}
                >
                  {value ? rating[Number(value) - 1] : "Choose your rating"}
                </Txt>
                <View className="flex-row gap-2">
                  {rating.map((label, index) => (
                    <Pressable
                      key={label}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel={`${index + 1}: ${label}`}
                      accessibilityState={{ selected: Number(value) === index + 1 }}
                      onPress={() => updateValue(String(index + 1))}
                      className="min-h-16 flex-1 items-center justify-center gap-1 rounded-2xl border"
                      style={{
                        backgroundColor: Number(value) === index + 1 ? accent : "#FFFFFF05",
                        borderColor: Number(value) === index + 1 ? accent : "#FFFFFF0A",
                      }}
                    >
                      <Txt
                        weight="medium"
                        className="text-2xl"
                        style={{ color: Number(value) === index + 1 ? C.bg : C.ink }}
                      >
                        {index + 1}
                      </Txt>
                      <View
                        className="h-1 w-4 rounded-full"
                        style={{
                          backgroundColor:
                            Number(value) === index + 1 ? "#00000055" : `${accent}80`,
                        }}
                      />
                    </Pressable>
                  ))}
                </View>
                <View className="mt-3 flex-row justify-between gap-3">
                  <Txt className="flex-1 text-[10px] text-muted">1 · {rating[0]}</Txt>
                  <Txt className="flex-1 text-right text-[10px] text-muted">5 · {rating[4]}</Txt>
                </View>
              </>
            ) : (
              <>
                <View className="min-h-[104px] flex-row items-center gap-2">
                  <TextInput
                    editable={!busy}
                    accessibilityLabel={`${spec.label} in ${displayUnit}`}
                    value={value}
                    onChangeText={updateValue}
                    selectTextOnFocus
                    keyboardType={"integer" in spec && spec.integer ? "number-pad" : "decimal-pad"}
                    returnKeyType="done"
                    onSubmitEditing={() => void save()}
                    maxLength={12}
                    placeholder="—"
                    placeholderTextColor={`${accent}50`}
                    selectionColor={accent}
                    className="min-h-[100px] flex-1 font-poppins-medium text-[48px] text-ink"
                    style={{ paddingVertical: 12, lineHeight: 64, textAlignVertical: "center" }}
                  />
                  <Txt className="text-lg text-muted">{displayUnit}</Txt>
                </View>
                <Txt className="text-[11px] leading-5 text-muted">{metricHint(metric)}</Txt>
              </>
            )}
          </View>
          {metric === "water" && (
            <View className="mb-4 flex-row gap-2">
              {[250, 500, 750].map((amount) => (
                <Pressable
                  key={amount}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${amount} ml`}
                  onPress={() =>
                    updateValue(
                      String((Number(drafts.current.get(draftKey)?.value ?? value) || 0) + amount),
                    )
                  }
                  className="min-h-12 flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-elevated"
                >
                  <MaterialCommunityIcons name="water-outline" size={16} color={accent} />
                  <Txt weight="medium" className="text-xs">
                    + {amount} ml
                  </Txt>
                </Pressable>
              ))}
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={notesOpen ? "Hide check-in notes" : "Add a note"}
            accessibilityState={{ expanded: notesOpen }}
            disabled={busy}
            onPress={() => setNotesOpen((current) => !current)}
            className="min-h-12 flex-row items-center gap-2"
          >
            <MaterialCommunityIcons name="text-box-outline" size={19} color={C.muted} />
            <Txt className="flex-1 text-xs text-muted">
              {notesOpen || notes ? "Your note" : "Add a note"}{" "}
              <Txt className="text-[10px] text-muted">· optional</Txt>
            </Txt>
            {!!notes.length && <Txt className="text-[10px] text-muted">{notes.length}/500</Txt>}
            <MaterialCommunityIcons
              name={notesOpen ? "chevron-up" : "plus"}
              size={18}
              color={C.muted}
            />
          </Pressable>
          {notesOpen && (
            <TextInput
              editable={!busy}
              accessibilityLabel="Check-in notes"
              multiline
              maxLength={500}
              value={notes}
              onChangeText={updateNotes}
              placeholder="Anything you’d like to remember?"
              placeholderTextColor={C.muted}
              textAlignVertical="top"
              className="min-h-[112px] rounded-2xl bg-elevated px-4 py-3 font-poppins-regular text-sm leading-6 text-ink"
            />
          )}
        </>
      )}
    </Sheet>
  );
}
