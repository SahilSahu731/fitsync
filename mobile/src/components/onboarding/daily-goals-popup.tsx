import React, { useRef, useState } from "react";
import { ActivityIndicator, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { useSession } from "@/src/context/session";
import { OnboardingPopup } from "./popup";
import { useProgress } from "@/src/features/progress/use-progress";
import { goalsToDraft, parseGoalsDraft } from "@/src/features/progress/goal-draft";
import type { Goals } from "@/src/features/progress/model";

const TARGETS = [
  {
    key: "water",
    label: "Water",
    unit: "ml / day",
    hint: "e.g. 2000",
    icon: "water-outline",
    color: "#8DD9F2",
  },
  {
    key: "steps",
    label: "Steps",
    unit: "steps / day",
    hint: "e.g. 8000",
    icon: "shoe-print",
    color: "#C5F460",
  },
  {
    key: "caloriesIn",
    label: "Food energy",
    unit: "kcal / day",
    hint: "Your target",
    icon: "silverware-fork-knife",
    color: "#F5BF8F",
  },
  {
    key: "protein",
    label: "Protein",
    unit: "g / day",
    hint: "Your target",
    icon: "food-steak",
    color: "#E9D5A1",
  },
  {
    key: "sleep",
    label: "Sleep",
    unit: "hours / night",
    hint: "e.g. 8",
    icon: "moon-waning-crescent",
    color: "#CBB5F5",
  },
  {
    key: "weight",
    label: "Goal weight",
    unit: "",
    hint: "Your target",
    icon: "scale-bathroom",
    color: "#F5BF8F",
  },
] as const;

export function DailyGoalsPopup({ onClose }: { onClose: () => void }) {
  const { settings } = useSession();
  const progress = useProgress();
  const unit = settings?.weightUnit ?? "kg";
  const [draft, setDraft] = useState<Record<keyof Goals, string> | null>(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const values = draft ?? goalsToDraft(progress.goals, unit);
  const unavailable =
    progress.loading || progress.refreshing || !!progress.storageError || !!progress.syncError;
  async function save() {
    if (lock.current || unavailable) return;
    try {
      const goals = parseGoalsDraft(values, unit);
      lock.current = true;
      setBusy(true);
      setError("");
      await progress.saveGoals(goals);
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Could not save your goals. Try again.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <OnboardingPopup
      eyebrow="YOUR DAILY FOUNDATION"
      title="Your day. Your targets."
      subtitle="Choose what you want to work toward. Every target is optional, and yours to adjust."
      onClose={() => {
        if (!lock.current) onClose();
      }}
      busy={busy}
      footer={
        <View className="gap-2">
          {!!error && (
            <Txt accessibilityRole="alert" className="mb-2 text-xs leading-5 text-red-300">
              {error}
            </Txt>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save daily goals"
            accessibilityState={{ disabled: busy || unavailable, busy }}
            disabled={busy || unavailable}
            onPress={() => void save()}
            className="min-h-14 flex-row items-center justify-center gap-2 rounded-full bg-[#C5F460] px-5"
            style={{ opacity: busy || unavailable ? 0.45 : 1 }}
          >
            {busy ? (
              <ActivityIndicator color="#151912" />
            ) : (
              <MaterialCommunityIcons name="check" size={20} color="#151912" />
            )}
            <Txt weight="semibold" className="text-sm text-[#151912]">
              {busy ? "Saving your goals…" : "Save my daily goals"}
            </Txt>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onClose}
            className="min-h-11 items-center justify-center"
          >
            <Txt className="text-xs text-muted">I’ll do this later</Txt>
          </Pressable>
        </View>
      }
    >
      {unavailable && (
        <View className="mb-4 rounded-2xl bg-white/5 p-4">
          {progress.storageError || progress.syncError ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void progress.refresh()}
              className="min-h-11 justify-center"
            >
              <Txt className="text-xs leading-5 text-muted">
                {progress.storageError || progress.syncError} Tap to retry loading goals.
              </Txt>
            </Pressable>
          ) : (
            <View className="flex-row items-center gap-3">
              <ActivityIndicator color="#C5F460" />
              <Txt className="text-xs text-muted">Opening your goals…</Txt>
            </View>
          )}
        </View>
      )}
      <View className="gap-3">
        {TARGETS.filter((_, index) => more || index < 3).map((target) => (
          <View
            key={target.key}
            className="flex-row items-center gap-3 rounded-[20px] border border-white/[0.08] bg-white/[0.035] p-3.5"
          >
            <View
              className="h-11 w-11 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${target.color}14` }}
            >
              <MaterialCommunityIcons name={target.icon} size={22} color={target.color} />
            </View>
            <View className="flex-1">
              <Txt weight="medium" className="text-sm">
                {target.label}
              </Txt>
              <Txt className="mt-1 text-[10px] text-muted">
                {target.key === "weight" ? unit : target.unit}
              </Txt>
            </View>
            <TextInput
              accessibilityLabel={`${target.label} target`}
              editable={!busy && !unavailable}
              keyboardType={
                target.key === "sleep" || target.key === "weight" ? "decimal-pad" : "number-pad"
              }
              value={values[target.key]}
              placeholder={target.hint}
              placeholderTextColor="#777777"
              maxLength={8}
              onChangeText={(value) => {
                setDraft({ ...values, [target.key]: value });
                setError("");
              }}
              className="min-h-12 w-24 rounded-xl border border-white/10 bg-black/20 px-3 text-right text-lg text-white"
            />
          </View>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: more }}
        onPress={() => setMore(!more)}
        className="min-h-12 flex-row items-center justify-center gap-2"
      >
        <Txt className="text-xs text-muted">
          {more ? "Fewer targets" : "Add protein, sleep & goal weight"}
        </Txt>
        <MaterialCommunityIcons name={more ? "chevron-up" : "plus"} size={16} color="#A3A3A3" />
      </Pressable>
      <Txt className="mb-1 text-center text-[10px] leading-5 text-muted">
        Your targets will be waiting in Progress.
      </Txt>
    </OnboardingPopup>
  );
}
