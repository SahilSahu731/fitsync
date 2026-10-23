import React, { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";
import { type WorkoutSet, type SetType, type workoutApi } from "../api";
import { useWorkout } from "../workout-context";
import { NumberEntry, WorkoutDrawer } from "./workout-controls";

const TYPES: { value: SetType; label: string; description: string }[] = [
  { value: "normal", label: "Working", description: "Your regular training set" },
  { value: "warmup", label: "Warm-up", description: "Preparation before working sets" },
  { value: "heavy", label: "Heavy", description: "Mark a heavier set" },
  { value: "failure", label: "Failure", description: "Mark a set taken to failure" },
  { value: "drop", label: "Drop", description: "Reduced load after another set" },
];
type Patch = Parameters<typeof workoutApi.updateSet>[2];
export const SetRow = React.memo(function SetRow({ set, number, restSeconds, trackingType = "reps_weight", onFocus, exerciseId }: { exerciseId: string; set: WorkoutSet; number: number; restSeconds: number; trackingType?: string; onFocus?: (exerciseId: string) => void }) {
  const { updateSet, startRest, busy } = useWorkout();
  const [weight, setWeight] = useState(String(set.weight_kg ?? 0));
  const [reps, setReps] = useState(String(set.reps ?? 8));
  const [duration, setDuration] = useState(String(set.duration_seconds ?? 30));
  const [distance, setDistance] = useState(String(set.distance_meters ?? 100));
  const [type, setType] = useState(set.set_type);
  const [notes, setNotes] = useState(set.notes ?? "");
  const [rpe, setRpe] = useState(set.rpe?.toString() ?? "");
  const [rir, setRir] = useState(set.rir?.toString() ?? "");
  const [rest, setRest] = useState(String(restSeconds));
  const [completed, setCompleted] = useState(Boolean(set.completed_at));
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const [drawer, setDrawer] = useState<"type" | "details" | null>(null);
  const inFlight = useRef(false);
  const restKey = `fitsync.set-rest.v1.${set.id}`;
  useEffect(() => { let active = true; void AsyncStorage.getItem(restKey).then(value => { if (active && value !== null && Number.isFinite(Number(value))) setRest(value); }).catch(console.warn); return () => { active = false; }; }, [restKey]);
  const timed = trackingType === "duration" || trackingType === "distance_duration";
  const weighted = !timed;
  const focus = () => onFocus?.(exerciseId);
  async function save(patch: Patch, toggle = false) {
    if (inFlight.current || busy) return;
    onFocus?.(exerciseId);
    setError(""); inFlight.current = true; setSaving(true);
    const before = completed;
    if (toggle) { setCompleted(!before); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }
    try {
      await updateSet(set.id, patch);
      if (toggle && !before && Number(rest) > 0) startRest(Number(rest));
    } catch (e) { if (toggle) setCompleted(before); setError(e instanceof Error ? e.message : "Not saved. Try again."); }
    finally { inFlight.current = false; setSaving(false); }
  }
  const validNumber = (value: string, max: number, integer = false) => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= max && (!integer || Number.isInteger(Number(value)));
  function metrics(): Patch | null {
    if ((weighted && !validNumber(weight, 100000)) || (!timed && !validNumber(reps, 1000, true)) || (timed && !validNumber(duration, 86400, true)) || (trackingType === "distance_duration" && !validNumber(distance, 1000000))) { setError("Enter valid, non-negative numbers before saving."); return null; }
    return { ...(weighted ? { weightKg: Number(weight) } : {}), ...(!timed ? { reps: Number(reps) } : { durationSeconds: Number(duration) }), ...(trackingType === "distance_duration" ? { distanceMeters: Number(distance) } : {}) };
  }
  return <View className={`mb-2 rounded-2xl border p-3 ${completed ? "border-green-500/30 bg-green-500/10" : "border-transparent bg-elevated"}`}>
    <View className="mb-3 flex-row items-center justify-between"><Txt weight="bold" className="text-xs text-muted">SET {number}</Txt><Pressable disabled={saving || busy} onPress={() => { onFocus?.(exerciseId); setDrawer("type"); }} accessibilityLabel="Choose set type" className="flex-row items-center gap-1 rounded-full bg-panel px-3 py-2"><Txt className="text-xs">{TYPES.find(item => item.value === type)?.label}</Txt><MaterialCommunityIcons name="chevron-down" size={16} color={C.muted} /></Pressable></View>
    <View className="flex-row items-end gap-2">{weighted && <NumberEntry onFocus={focus} label={trackingType === "reps" ? "Added weight · kg" : "Weight · kg"} value={weight} onChange={setWeight} step={0.5} max={100000} disabled={saving || busy || completed} />}{!timed && <NumberEntry onFocus={focus} label="Reps" value={reps} onChange={setReps} disabled={saving || busy || completed} />}{timed && <NumberEntry onFocus={focus} label="Time · sec" value={duration} onChange={setDuration} max={86400} disabled={saving || busy || completed} />}{trackingType === "distance_duration" && <NumberEntry onFocus={focus} label="Distance · m" value={distance} onChange={setDistance} max={1000000} disabled={saving || busy || completed} />}
    </View><View className="mt-2 flex-row items-center justify-between"><Txt className="mr-3 flex-1 text-xs text-muted">{trackingType === "reps" ? "Bodyweight only? Leave added weight at 0 kg." : "Tap a value to type, or slide ↕ to adjust."}</Txt>
      <Pressable accessibilityLabel={completed ? "Undo completed set" : "Log set"} disabled={saving || busy} onPress={() => { const values = metrics(); if (values) void save({ ...values, setType: type, completed: !completed }, true); }} className={`h-12 min-w-[70px] items-center justify-center rounded-xl px-3 ${completed ? "bg-green-400" : "bg-white"}`}><Txt weight="bold" className="text-bg">{completed ? "Done ↶" : "Log set"}</Txt></Pressable>
    </View><View className="mt-3 flex-row items-center justify-between"><Pressable onPress={() => { onFocus?.(exerciseId); setDrawer("details"); }} disabled={saving || busy} className="flex-row items-center gap-1 py-1"><MaterialCommunityIcons name="timer-outline" size={15} color={C.muted} /><Txt className="text-xs text-muted">{Number(rest) ? `${rest}s rest` : "No rest"} · {notes ? "Notes added" : "Notes & effort"}</Txt><MaterialCommunityIcons name="chevron-down" size={15} color={C.muted} /></Pressable><Txt className="text-[10px] text-muted">{saving ? "Saving…" : completed ? "Undo to edit" : "Type or slide ↕"}</Txt></View>{!!error && <Txt accessibilityRole="alert" className="mt-2 text-xs text-red-300">{error} Your input is kept; tap Log set or save again.</Txt>}
    {drawer === "type" && <WorkoutDrawer title={`Set ${number} type`} onClose={() => setDrawer(null)}>{TYPES.map(item => <Pressable disabled={saving || busy} key={item.value} onPress={() => { const previous = type; setType(item.value); setDrawer(null); void updateSet(set.id, { setType: item.value }).catch(e => { setType(previous); setError(e.message); }); }} className={`mb-2 rounded-2xl p-4 ${type === item.value ? "bg-brand/15" : "bg-elevated"}`}><Txt weight="bold" className={type === item.value ? "text-brand" : "text-ink"}>{item.label}</Txt><Txt className="mt-1 text-sm text-muted">{item.description}</Txt></Pressable>)}</WorkoutDrawer>}
    {drawer === "details" && <WorkoutDrawer title={`Set ${number} · notes & recovery`} onClose={() => setDrawer(null)}><Txt className="mb-2 text-muted">Rest after this set · saved on this device</Txt><NumberEntry onFocus={focus} label="Rest · seconds (0 = off)" value={rest} onChange={setRest} max={900} /><Txt className="mb-2 mt-5 text-muted">Set notes</Txt><TextInput multiline maxLength={1000} placeholder="Technique, discomfort, equipment…" placeholderTextColor={C.muted} value={notes} onChangeText={setNotes} className="min-h-[90px] rounded-xl bg-bg p-4 text-ink" /><View className="mt-5 flex-row gap-3"><View className="flex-1"><Txt className="mb-2 text-xs text-muted">RPE · effort 1–10 (optional)</Txt><TextInput keyboardType="decimal-pad" value={rpe} onChangeText={setRpe} placeholder="—" placeholderTextColor={C.muted} className="rounded-xl bg-bg p-4 text-ink" /></View><View className="flex-1"><Txt className="mb-2 text-xs text-muted">RIR · reps left 0–10</Txt><TextInput keyboardType="number-pad" value={rir} onChangeText={setRir} placeholder="—" placeholderTextColor={C.muted} className="rounded-xl bg-bg p-4 text-ink" /></View></View>{!!error && <Txt className="mt-3 text-red-300">{error}</Txt>}<Pressable disabled={saving} onPress={async () => {
      if (!validNumber(rest, 900, true) || (rpe !== "" && (!validNumber(rpe, 10) || Number(rpe) < 1)) || (rir !== "" && !validNumber(rir, 10, true))) { setError("Rest must be 0–900 seconds, RPE 1–10, and RIR a whole number from 0–10."); return; }
      setSaving(true); setError(""); try { await updateSet(set.id, { notes, rpe: rpe === "" ? null : Number(rpe), rir: rir === "" ? null : Number(rir) }); await AsyncStorage.setItem(restKey, rest); setDrawer(null); } catch (e) { setError(e instanceof Error ? e.message : "Could not save details."); } finally { setSaving(false); }
    }} className="mt-6 items-center rounded-2xl bg-brand p-4"><Txt weight="bold" className="text-bg">{saving ? "Saving…" : "Save set details"}</Txt></Pressable></WorkoutDrawer>}
  </View>;
});
