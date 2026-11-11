import React, { useState } from "react";
import { View } from "react-native";
import type { Equipment } from "@/src/context/session";
import { PrimaryButton, Txt } from "@/src/components/ui";
import { Sheet } from "@/src/features/progress/editors";
import { Choice, Notes } from "./components";
import { EQUIPMENT_LABELS, changedExerciseNames } from "./model";
import type { AdaptInput, CoachingDay, CoachingPlan } from "./api";

export function AdaptSheet({ day, busy, error, onClose, onPreview, onApply }: { day: CoachingDay; busy: boolean; error: string | null; onClose: () => void; onPreview: (input: AdaptInput) => Promise<CoachingPlan | null>; onApply: (input: AdaptInput) => Promise<void> }) {
  const [minutes, setMinutes] = useState(day.prescription.minutes);
  const [equipment, setEquipment] = useState<Equipment>(day.prescription.equipment);
  const [effort, setEffort] = useState(day.prescription.effort);
  const [swap, setSwap] = useState<string | undefined>();
  const [preview, setPreview] = useState<CoachingDay | null>(null);
  const update = (action: () => void) => { action(); setPreview(null); };
  const input: AdaptInput = { minutes, equipment, effort, ...(swap ? { swapExerciseId: swap } : {}) };
  const inspect = async () => { const result = await onPreview(input); setPreview(result?.sessions.find(item => item.id === day.id) ?? null); };
  return <Sheet title="Adapt this session" subtitle="Tell your plan what today looks like. Preview the changes before you apply them." onClose={onClose} busy={busy}>
    <Txt weight="semibold" className="mb-3 text-base">Time available</Txt><View className="mb-6 flex-row flex-wrap gap-2">{[15, 30, 45, 60, 90].map(value => <Choice key={value} value={value} label={`${value} min`} selected={minutes === value} onSelect={value => update(() => setMinutes(value))} disabled={busy} />)}</View>
    <Txt weight="semibold" className="mb-3 text-base">Equipment today</Txt><View className="mb-6 flex-row flex-wrap gap-2">{(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map(value => <Choice key={value} value={value} label={EQUIPMENT_LABELS[value]} selected={equipment === value} onSelect={value => update(() => setEquipment(value))} disabled={busy} />)}</View>
    <Txt weight="semibold" className="mb-3 text-base">How much effort feels right?</Txt><View className="mb-6 flex-row flex-wrap gap-2"><Choice value="normal" label="My usual session" selected={effort === "normal"} onSelect={value => update(() => setEffort(value))} disabled={busy} /><Choice value="easy" label="Keep it easier" selected={effort === "easy"} onSelect={value => update(() => setEffort(value))} disabled={busy} /></View>
    <Txt weight="semibold" className="mb-3 text-base">Swap an exercise (optional)</Txt><View className="mb-6 gap-2"><Choice value="" label="Keep the exercises" selected={!swap} onSelect={() => update(() => setSwap(undefined))} disabled={busy} />{day.prescription.exercises.map(item => <Choice key={item.exerciseId} value={item.exerciseId} label={item.name} selected={swap === item.exerciseId} onSelect={value => update(() => setSwap(value))} disabled={busy} />)}</View>
    {preview && <View className="mb-5 rounded-2xl bg-elevated p-4"><Txt weight="semibold" className="text-lg">Your adjusted session</Txt><Txt className="mt-2 text-sm text-ink">{day.prescription.minutes} → {preview.prescription.minutes} min · {EQUIPMENT_LABELS[preview.prescription.equipment]}</Txt><Notes items={preview.prescription.explanation} />{changedExerciseNames(day, preview).length > 0 && <Txt className="mt-3 text-sm leading-6 text-muted">Updated: {changedExerciseNames(day, preview).join(", ")}</Txt>}</View>}
    {error && <Txt accessibilityRole="alert" className="mb-4 text-sm leading-6" style={{ color: "#FF9A94" }}>{error}</Txt>}
    <PrimaryButton title={preview ? "Apply these changes" : "Preview changes"} onPress={() => { void (preview ? onApply(input) : inspect()); }} loading={busy} />
  </Sheet>;
}
