import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useSession } from "@/src/context/session";
import { useProgress } from "./use-progress";
import { Icon, IconButton, SmallButton, type IconName } from "./visuals";
import { goalsToDraft, parseGoalsDraft } from "./goal-draft";
import type { Goals } from "./model";

type OptionalGoal = Exclude<keyof Goals, "weeklyWorkouts">;
const options: { key: OptionalGoal; label: string; unit: string; icon: IconName; color: string }[] =
  [
    { key: "water", label: "Water", unit: "ml / day", icon: "water-outline", color: "#7DCFFF" },
    { key: "weight", label: "Body weight", unit: "", icon: "scale-bathroom", color: "#FFB38A" },
    { key: "steps", label: "Steps", unit: "steps / day", icon: "shoe-print", color: "#C5F460" },
    {
      key: "sleep",
      label: "Sleep",
      unit: "hours / night",
      icon: "moon-waning-crescent",
      color: "#D4B5FF",
    },
    { key: "protein", label: "Protein", unit: "g / day", icon: "food-steak", color: "#D4B5FF" },
    {
      key: "caloriesIn",
      label: "Food energy",
      unit: "kcal / day",
      icon: "silverware-fork-knife",
      color: "#D4B5FF",
    },
    { key: "carbs", label: "Carbohydrates", unit: "g / day", icon: "barley", color: "#D4B5FF" },
    { key: "fat", label: "Fat", unit: "g / day", icon: "peanut-outline", color: "#D4B5FF" },
    {
      key: "activeMinutes",
      label: "Active time",
      unit: "min / day",
      icon: "timer-outline",
      color: "#C5F460",
    },
    {
      key: "caloriesActive",
      label: "Active energy",
      unit: "kcal / day",
      icon: "fire",
      color: "#FFB38A",
    },
  ];
export function GoalSetup() {
  const router = useRouter();
  const { settings } = useSession();
  const progress = useProgress();
  const unit = settings?.weightUnit ?? "kg";
  const [values, setValues] = useState<Record<keyof Goals, string> | null>(null);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<OptionalGoal | null>(null);
  const [more, setMore] = useState(false);
  const [customWeekly, setCustomWeekly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [wasEditing, setWasEditing] = useState(false);
  if (
    !values &&
    !progress.loading &&
    !progress.refreshing &&
    !progress.storageError &&
    !(progress.syncError && !progress.hasGoals)
  ) {
    setValues(goalsToDraft(progress.goals, unit));
    setWasEditing(progress.hasGoals);
    setCustomWeekly(progress.goals.weeklyWorkouts > 7);
  }
  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/progress");
  }
  function change(key: keyof Goals, value: string) {
    setValues((current) => (current ? { ...current, [key]: value } : current));
    setError("");
  }
  const active = options.find((option) => option.key === selected);
  const optionalCount = values ? options.filter((option) => values[option.key].trim()).length : 0;
  async function save() {
    if (!values || busy) return;
    try {
      const next = parseGoalsDraft(values, unit);
      setBusy(true);
      setError("");
      await progress.saveGoals(next);
      setSaved(true);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not save your goals. Your draft is still here.",
      );
    } finally {
      setBusy(false);
    }
  }
  function next() {
    if (!values) return;
    const weekly = Number(values.weeklyWorkouts);
    if (!Number.isInteger(weekly) || weekly < 1 || weekly > 14) {
      setError("Choose between 1 and 14 workouts per week.");
      return;
    }
    setError("");
    setStep(1);
  }
  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="w-full max-w-2xl self-center flex-row items-center gap-3 px-6 py-3">
          <IconButton
            icon="arrow-left"
            label={step === 1 && !saved ? "Back to weekly goal" : "Back"}
            disabled={busy}
            onPress={() => {
              if (step === 1 && !saved) {
                setStep(0);
                setError("");
              } else leave();
            }}
          />
          <Txt accessibilityRole="header" weight="medium" className="flex-1 text-lg">
            {wasEditing ? "Edit goals" : "Set my goals"}
          </Txt>
          {!saved && <Txt className="text-xs text-muted">{step + 1} of 2</Txt>}
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="w-full max-w-2xl self-center px-6 pb-8"
        >
          {!values ? (
            <View className="gap-4 py-12">
              {progress.storageError || progress.syncError ? (
                <>
                  <Icon name="cloud-alert-outline" size={30} color="#FFB38A" />
                  <Txt weight="medium" className="text-lg">
                    Let’s load your saved goals first
                  </Txt>
                  <Txt className="text-sm leading-6 text-muted">
                    {progress.storageError || progress.syncError}
                  </Txt>
                  <SmallButton
                    label="Try again"
                    icon="sync"
                    onPress={() => void progress.refresh()}
                  />
                </>
              ) : (
                <View className="items-center gap-3">
                  <ActivityIndicator color="#C5F460" />
                  <Txt className="text-sm text-muted">Loading your plan…</Txt>
                </View>
              )}
            </View>
          ) : saved ? (
            <View className="items-center py-12">
              <View
                className="h-24 w-24 items-center justify-center rounded-full"
                style={{ backgroundColor: "#C5F4601A" }}
              >
                <Icon name="check-decagram-outline" size={48} color="#C5F460" />
              </View>
              <Txt
                accessibilityRole="header"
                weight="semibold"
                className="mt-7 text-center text-[28px]"
              >
                {wasEditing ? "Your plan is updated" : "Your goals are ready"}
              </Txt>
              <Txt className="mt-4 text-center text-sm leading-6 text-muted">
                {values.weeklyWorkouts} workouts this week
                {optionalCount
                  ? `, plus ${optionalCount} personal ${optionalCount === 1 ? "target" : "targets"}`
                  : ""}
                . Start with your next small step.
              </Txt>
              <View className="mt-8 w-full">
                <SmallButton
                  label="View my goals"
                  icon="bullseye-arrow"
                  color="#C5F460"
                  onPress={() =>
                    router.replace({ pathname: "/(tabs)/progress", params: { showGoals: "1" } })
                  }
                />
              </View>
            </View>
          ) : (
            <>
              <View className="mb-5 mt-5 flex-row gap-2">
                {[0, 1].map((index) => (
                  <View
                    key={index}
                    className="h-1 flex-1 rounded-full"
                    style={{ backgroundColor: index <= step ? "#C5F460" : C.elevated }}
                  />
                ))}
              </View>
              <View
                className="mb-5 h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: "#C5F46018" }}
              >
                <Icon name={step === 0 ? "dumbbell" : "heart-outline"} size={29} color="#C5F460" />
              </View>
              <Txt
                accessibilityRole="header"
                weight="semibold"
                className="text-[28px] leading-10 tracking-[-0.8px]"
              >
                {step === 0 ? "A week that works for you" : "Make it personal"}
              </Txt>
              <Txt className="mb-6 mt-3 text-sm leading-6 text-muted">
                {step === 0
                  ? "How many workouts would you like to complete each week? Choose a pace that fits your life."
                  : "Your weekly workout goal is enough to start. Add a personal target only if it helps you."}
              </Txt>
              {step === 0 ? (
                <>
                  <View className="rounded-[26px] bg-panel p-6">
                    <Txt className="text-xs text-muted">My weekly goal</Txt>
                    <View className="my-5 flex-row items-baseline gap-2">
                      <Txt
                        weight="semibold"
                        className="text-[56px] leading-[68px]"
                        style={{ color: "#C5F460" }}
                      >
                        {values.weeklyWorkouts || "—"}
                      </Txt>
                      <Txt className="text-sm text-muted">workouts</Txt>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                      {[1, 2, 3, 4, 5, 6, 7].map((count) => (
                        <Pressable
                          key={count}
                          accessibilityRole="button"
                          accessibilityLabel={`${count} workouts per week`}
                          accessibilityState={{ selected: Number(values.weeklyWorkouts) === count }}
                          onPress={() => {
                            change("weeklyWorkouts", String(count));
                            setCustomWeekly(false);
                          }}
                          className="min-h-12 min-w-12 items-center justify-center rounded-2xl px-3"
                          style={{
                            backgroundColor:
                              Number(values.weeklyWorkouts) === count ? "#C5F460" : C.elevated,
                          }}
                        >
                          <Txt
                            weight="semibold"
                            style={{
                              color: Number(values.weeklyWorkouts) === count ? C.bg : C.ink,
                            }}
                          >
                            {count}
                          </Txt>
                        </Pressable>
                      ))}
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setCustomWeekly(!customWeekly)}
                      className="mt-3 min-h-11 justify-center"
                    >
                      <Txt className="text-xs text-muted">
                        {customWeekly
                          ? "Hide custom target"
                          : "More than 7 sessions? Set a custom target"}
                      </Txt>
                    </Pressable>
                    {customWeekly && (
                      <TextInput
                        accessibilityLabel="Weekly workout target"
                        value={values.weeklyWorkouts}
                        onChangeText={(value) => change("weeklyWorkouts", value)}
                        keyboardType="number-pad"
                        className="min-h-14 rounded-2xl bg-elevated px-4 font-poppins-medium text-xl text-ink"
                      />
                    )}
                  </View>
                  <Txt className="mt-4 text-xs leading-5 text-muted">
                    Rest days are part of your routine. You can adjust this goal anytime.
                  </Txt>
                </>
              ) : (
                <>
                  <View
                    className="mb-5 flex-row items-center gap-2 rounded-2xl p-4"
                    style={{ backgroundColor: "#C5F46012" }}
                  >
                    <Icon name="check-circle-outline" size={20} color="#C5F460" />
                    <Txt className="text-sm">{values.weeklyWorkouts} workouts / week</Txt>
                  </View>
                  <View className="flex-row flex-wrap gap-3">
                    {(more ? options : options.slice(0, 4)).map((option) => (
                      <Pressable
                        key={option.key}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: selected === option.key, disabled: busy }}
                        onPress={() => setSelected(selected === option.key ? null : option.key)}
                        className="min-h-24 grow rounded-[20px] border p-4"
                        style={{
                          width: "45%",
                          backgroundColor: selected === option.key ? `${option.color}12` : C.panel,
                          borderColor:
                            selected === option.key ? `${option.color}70` : "transparent",
                        }}
                      >
                        <View className="flex-row items-center justify-between">
                          <Icon name={option.icon} color={option.color} size={22} />
                          {values[option.key] ? (
                            <Icon name="check-circle" color={option.color} size={17} />
                          ) : (
                            <Icon name="plus" color={C.muted} size={17} />
                          )}
                        </View>
                        <Txt weight="medium" className="mt-3 text-sm">
                          {option.label}
                        </Txt>
                        <Txt className="mt-1 text-[10px] text-muted">
                          {values[option.key]
                            ? `${values[option.key]} ${option.key === "weight" ? unit : option.unit}`
                            : "Optional"}
                        </Txt>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    disabled={busy}
                    accessibilityRole="button"
                    onPress={() => setMore(!more)}
                    className="min-h-12 flex-row items-center justify-center gap-1"
                  >
                    <Txt className="text-xs text-muted">
                      {more ? "Show fewer targets" : "Nutrition & more targets"}
                    </Txt>
                    <Icon name={more ? "chevron-up" : "chevron-down"} color={C.muted} size={17} />
                  </Pressable>
                  {active && (
                    <View className="mt-2 rounded-[22px] bg-panel p-5">
                      <Txt weight="medium" className="text-base">
                        My {active.label.toLowerCase()} target
                      </Txt>
                      <Txt className="mb-3 mt-1 text-xs text-muted">
                        {active.key === "weight" ? `Target weight in ${unit}` : active.unit}
                      </Txt>
                      <TextInput
                        accessibilityLabel={`${active.label} target ${active.key === "weight" ? unit : active.unit}`}
                        editable={!busy}
                        value={values[active.key]}
                        onChangeText={(value) => change(active.key, value)}
                        keyboardType="decimal-pad"
                        placeholder="Enter your target"
                        placeholderTextColor={C.muted}
                        className="min-h-14 rounded-2xl bg-elevated px-4 font-poppins-medium text-xl text-ink"
                      />
                      <Pressable
                        accessibilityRole="button"
                        disabled={busy}
                        onPress={() => {
                          change(active.key, "");
                          setSelected(null);
                        }}
                        className="min-h-11 items-center justify-center"
                      >
                        <Txt className="text-xs text-muted">Remove this target</Txt>
                      </Pressable>
                    </View>
                  )}
                  <Txt className="mt-3 text-xs leading-5 text-muted">
                    {optionalCount
                      ? `${optionalCount} personal ${optionalCount === 1 ? "target" : "targets"} added. Leave the rest unset.`
                      : "No extra targets selected. You can add them anytime."}
                  </Txt>
                </>
              )}
              {!!error && (
                <Txt
                  accessibilityRole="alert"
                  className="mt-4 text-sm leading-5"
                  style={{ color: "#FF9A94" }}
                >
                  {error}
                </Txt>
              )}
            </>
          )}
        </ScrollView>
        {values && !saved && (
          <View className="w-full max-w-2xl self-center px-6 pb-3 pt-3">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              onPress={() => (step === 0 ? next() : void save())}
              className="min-h-14 flex-row items-center justify-center gap-2 rounded-full"
              style={{ backgroundColor: "#C5F460" }}
            >
              {busy ? (
                <ActivityIndicator color={C.bg} />
              ) : (
                <Icon name={step === 0 ? "arrow-right" : "check"} color={C.bg} size={20} />
              )}
              <Txt weight="semibold" className="text-sm text-bg">
                {busy
                  ? "Saving…"
                  : step === 0
                    ? "Continue"
                    : wasEditing
                      ? "Save changes"
                      : "Save my goals"}
              </Txt>
            </Pressable>
            {step === 1 && (
              <Txt className="mt-2 text-center text-[10px] text-muted">
                {optionalCount
                  ? "Only the targets you choose will be saved."
                  : "Just your weekly goal. No extra targets needed."}
              </Txt>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
