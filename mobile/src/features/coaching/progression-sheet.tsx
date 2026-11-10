import React, { useState } from "react";
import { View } from "react-native";
import { useSession } from "@/src/context/session";
import { PrimaryButton, Txt } from "@/src/components/ui";
import { Sheet } from "@/src/features/progress/editors";
import { Choice, Notes } from "./components";
import { exerciseTarget } from "./model";
import type { CoachingDay, CoachingPlan } from "./api";

export function ProgressionSheet({ day, busy, error, onClose, onPreview, onApply }: { day: CoachingDay; busy: boolean; error: string | null; onClose: () => void; onPreview: (incrementKg?: number) => Promise<CoachingPlan | null>; onApply: (incrementKg?: number) => Promise<void> }) {
  const [incrementKg, setIncrement] = useState<number | undefined>();
  const [reviewed, setReviewed] = useState<CoachingDay | null>(null);
  const { settings } = useSession();
  const inspect = async () => { const plan = await onPreview(incrementKg); setReviewed(plan?.sessions.find(item => item.id === day.id) ?? null); };
  return <Sheet title="Your next progression" subtitle="Review the evidence before changing your targets." onClose={onClose} busy={busy}>
    <Txt className="mb-5 text-sm leading-6 text-muted">Your completed reps, loads and recorded effort guide this review. Missing data stays visible. A suggested weight is a starting point you can adjust in the workout.</Txt>
    <Txt weight="semibold" className="mb-3 text-base">Available load increase</Txt><View className="mb-5 flex-row flex-wrap gap-2"><Choice value="default" label="Use the default" selected={incrementKg === undefined} disabled={busy} onSelect={() => { setIncrement(undefined); setReviewed(null); }} />{[0.5, 1, 1.25, 2.5, 5].map(value => <Choice key={value} value={value} label={settings?.weightUnit === "lb" ? `${Math.round(value * 2.20462 * 10) / 10} lb` : `${value} kg`} selected={incrementKg === value} disabled={busy} onSelect={next => { setIncrement(next); setReviewed(null); }} />)}</View>
    {reviewed && <><Notes items={reviewed.prescription.explanation} /><View className="my-4">{reviewed.prescription.exercises.map((exercise, index) => <View key={`${index}:${exercise.exerciseId}`} className="mb-3 rounded-2xl bg-elevated p-4"><Txt weight="semibold" className="text-base">{exercise.name}</Txt>{day.prescription.exercises[index] && <Txt className="mt-2 text-xs text-muted">Before: {exerciseTarget(day.prescription.exercises[index], settings?.weightUnit)}</Txt>}<Txt className="mt-1 text-sm text-brand">Reviewed: {exerciseTarget(exercise, settings?.weightUnit)}</Txt><Txt className="mt-3 text-sm leading-6 text-muted">{exercise.reason}</Txt></View>)}</View></>}
    {error && <Txt accessibilityRole="alert" className="mb-4 text-sm leading-6" style={{ color: "#FF9A94" }}>{error}</Txt>}
    <PrimaryButton title={reviewed ? "Apply reviewed targets" : "Review my completed logs"} onPress={() => { void (reviewed ? onApply(incrementKg) : inspect()); }} loading={busy} />
  </Sheet>;
}
