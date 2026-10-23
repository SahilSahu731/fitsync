import React, { useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppAlert } from "@/src/components/app-dialog";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { workoutApi } from "@/src/features/workouts/api";
import { newDraftExercise, newDraftSet, routineInput, type DraftExercise, type DraftSet } from "@/src/features/workouts/routine-draft";
import { ExerciseImage } from "@/src/features/workouts/components/exercise-image";
import { ExercisePicker } from "@/src/features/workouts/components/exercise-picker";
import { NumberEntry, WorkoutDrawer } from "@/src/features/workouts/components/workout-controls";
import { SetTypePicker } from "@/src/features/workouts/components/set-type-picker";
import { setAppearance } from "@/src/features/workouts/set-types";
import { ReorderTraining, TrainActions } from "@/src/features/workouts/components/train-actions";

export default function CreateWorkoutScreen() {
  const Alert = useAppAlert(); const router = useRouter();
  const [name, setName] = useState(""); const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [picker, setPicker] = useState(false); const [reordering, setReordering] = useState(false);
  const [menu, setMenu] = useState<string | null>(null); const [details, setDetails] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [saving, setSaving] = useState(false); const savingRef = useRef(false);
  const [error, setError] = useState("");
  const selected = exercises.find(item => item.id === menu);
  const detail = exercises.find(item => item.id === details);
  const patch = (id: string, change: Partial<DraftExercise>) => setExercises(rows => rows.map(row => row.id === id ? { ...row, ...change } : row));
  const patchSet = (id: string, setId: string, change: Partial<DraftSet>) => setExercises(rows => rows.map(row => row.id === id ? { ...row, sets: row.sets.map(set => set.id === setId ? { ...set, ...change } : set) } : row));
  const addSet = (id: string) => setExercises(rows => rows.map(row => row.id === id && row.sets.length < 30 ? { ...row, sets: [...row.sets, newDraftSet(row.sets.at(-1))] } : row));
  const close = () => {
    if (savingRef.current) return;
    if (!name && !description && !exercises.length) { router.back(); return; }
    Alert.alert("Discard this draft?", "Your unsaved routine changes will be lost.", [{ text: "Keep editing", style: "cancel" }, { text: "Discard", style: "destructive", onPress: () => router.back() }]);
  };
  const save = async () => {
    if (savingRef.current) return;
    setError("");
    try {
      const input = routineInput(name, description, exercises);
      savingRef.current = true; setSaving(true);
      await workoutApi.createTemplate(input);
      router.replace("/(tabs)/train");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save your routine. Try again."); }
    finally { savingRef.current = false; setSaving(false); }
  };
  const totalSets = exercises.reduce((sum, item) => sum + item.sets.length, 0);
  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-bg">
    <View className="flex-row items-center justify-between px-4 py-3"><Pressable disabled={saving} accessibilityLabel="Back" onPress={close} className="h-11 w-11 items-center justify-center"><MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} /></Pressable><Txt weight="bold" className="text-xl">New routine</Txt><Pressable disabled={saving} onPress={() => void save()} className="min-w-16 items-center rounded-xl bg-white px-4 py-3">{saving ? <ActivityIndicator color={C.bg} /> : <Txt weight="bold" className="text-bg">Save</Txt>}</Pressable></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
      {!!error && <View className="mb-4 rounded-xl bg-red-500/10 p-4"><Txt accessibilityRole="alert" className="text-red-300">{error}</Txt></View>}
      <View className="mb-5 rounded-2xl bg-panel p-4"><Txt className="mb-2 text-xs text-muted">ROUTINE NAME</Txt><TextInput value={name} onChangeText={setName} editable={!saving} maxLength={100} accessibilityLabel="Routine name" placeholder="e.g. Upper body A" placeholderTextColor={C.muted} className="min-h-12 font-outfit-bold text-2xl text-ink" /><View className="mt-3 flex-row items-center border-t border-border pt-3"><MaterialCommunityIcons name="note-text-outline" size={20} color={C.muted} /><TextInput value={description} onChangeText={setDescription} editable={!saving} multiline maxLength={2000} accessibilityLabel="Routine notes" placeholder="Goals or notes for this session" placeholderTextColor={C.muted} className="ml-2 min-h-11 flex-1 text-sm text-ink" /></View></View>
      <View className="mb-4 flex-row items-center justify-between"><View><Txt weight="bold" className="text-lg">{exercises.length ? "Your session" : "Build your session"}</Txt><Txt className="mt-1 text-xs text-muted">{exercises.length} exercises · {totalSets} sets · reusable routine</Txt></View>{exercises.length > 1 && <Pressable disabled={saving} onPress={() => setReordering(true)} accessibilityLabel="Reorder exercises" className="h-11 w-11 items-center justify-center rounded-xl bg-panel"><MaterialCommunityIcons name="sort-variant" color={C.ink} size={23} /></Pressable>}</View>
      {!exercises.length && <View className="mb-5 items-center rounded-2xl border border-dashed border-border px-6 py-9"><MaterialCommunityIcons name="dumbbell" size={42} color={C.brand} /><Txt weight="semibold" className="mt-4 text-lg">Start with your exercises</Txt><Txt className="mt-2 text-center text-sm text-muted">Choose multiple exercises, then set your targets. Saving a routine won’t start a workout.</Txt></View>}
      {exercises.map(item => {
        const timed = ["duration", "distance_duration"].includes(item.exercise.trackingType);
        const isCollapsed = collapsed.includes(item.id);
        return <View key={item.id} className="mb-5 overflow-hidden rounded-[24px] bg-panel">
          <View className="flex-row items-center px-3 pb-3 pt-4"><Pressable className="min-w-0 flex-1 flex-row items-center" onPress={() => setCollapsed(rows => rows.includes(item.id) ? rows.filter(id => id !== item.id) : [...rows, item.id])}><ExerciseImage uri={item.exercise.imageUrl} name={item.exercise.name} /><View className="ml-3 flex-1"><Txt weight="bold" className="text-lg" numberOfLines={2}>{item.exercise.name}</Txt><Txt className="mt-1 text-xs text-muted">{item.sets.length} sets · {timed ? "Time targets" : "Weight & reps"}</Txt></View><MaterialCommunityIcons name={isCollapsed ? "chevron-down" : "chevron-up"} size={24} color={C.ink} /></Pressable><Pressable disabled={saving} onPress={() => setMenu(item.id)} accessibilityLabel={`Options for ${item.exercise.name}`} className="ml-1 h-11 w-11 items-center justify-center"><MaterialCommunityIcons name="dots-horizontal" color={C.ink} size={26} /></Pressable></View>
          {!isCollapsed && <View className="px-3 pb-3">{item.sets.map((set, index) => <View key={set.id} className="mb-2 flex-row items-end gap-2 rounded-xl bg-elevated p-2" style={{ borderLeftWidth: 3, borderLeftColor: setAppearance(set.type).color }}><SetTypePicker value={set.type} number={index + 1} disabled={saving} onChange={type => patchSet(item.id, set.id, { type })} />{timed ? <NumberEntry compact label="Seconds" value={set.duration} onChange={duration => patchSet(item.id, set.id, { duration })} max={86400} disabled={saving} /> : <><NumberEntry compact label={item.exercise.trackingType === "reps" ? "Added kg" : "Kg"} value={set.weight} onChange={weight => patchSet(item.id, set.id, { weight })} step={0.5} max={100000} disabled={saving} /><NumberEntry compact label="Reps" value={set.reps} onChange={reps => patchSet(item.id, set.id, { reps })} disabled={saving} /></>}<Pressable disabled={saving || item.sets.length <= 1} onPress={() => patch(item.id, { sets: item.sets.filter(row => row.id !== set.id) })} accessibilityLabel={`Remove set ${index + 1}`} className="h-11 w-11 items-center justify-center"><MaterialCommunityIcons name="minus-circle-outline" size={21} color={item.sets.length <= 1 ? C.border : C.muted} /></Pressable></View>)}
            {item.exercise.trackingType === "distance_duration" && <Txt className="mb-2 text-xs text-muted">Plan duration here; log actual distance during your workout.</Txt>}
            <View className="flex-row items-center justify-between"><Pressable disabled={saving} onPress={() => setDetails(item.id)} className="min-h-11 flex-1 flex-row items-center gap-1"><MaterialCommunityIcons name="timer-outline" size={16} color={C.muted} /><Txt className="text-xs text-muted">{Number(item.rest) ? `${item.rest}s rest` : "No rest"} · {item.notes ? "Notes added" : "Notes"}</Txt><MaterialCommunityIcons name="chevron-down" size={15} color={C.muted} /></Pressable><Pressable disabled={saving || item.sets.length >= 30} onPress={() => addSet(item.id)} className="min-h-11 justify-center px-3"><Txt weight="semibold" className="text-brand">+ Add set</Txt></Pressable></View>
          </View>}
        </View>;
      })}
      <Pressable disabled={saving || exercises.length >= 50} onPress={() => setPicker(true)} className="flex-row items-center justify-center rounded-2xl bg-brand py-4"><MaterialCommunityIcons name="plus" size={23} color={C.bg} /><Txt weight="bold" className="ml-2 text-bg">Add exercises</Txt></Pressable>
      <Txt className="mt-4 text-center text-xs text-muted">Tap values to type, or slide up and down to adjust. Tap a colored letter to change the set type.</Txt>
    </ScrollView>
    {picker && <Modal animationType="slide" onRequestClose={() => setPicker(false)}><SafeAreaView edges={["top"]} className="flex-1 bg-bg"><ExercisePicker existingIds={exercises.map(item => item.exercise.id)} onClose={() => setPicker(false)} onConfirm={async items => { setExercises(rows => [...rows, ...items.filter(item => !rows.some(row => row.exercise.id === item.id)).map(newDraftExercise)]); setPicker(false); }} /></SafeAreaView></Modal>}
    {selected && <TrainActions title={selected.exercise.name} onClose={() => setMenu(null)} actions={[
      ...(selected.sets.length < 30 ? [{ label: "Add set", icon: "plus-circle-outline" as const, run: () => addSet(selected.id) }] : []),
      { label: "Rest & notes", icon: "note-text-outline", run: () => setDetails(selected.id) },
      ...(exercises.length > 1 ? [{ label: "Reorder exercises", icon: "sort-variant" as const, run: () => setReordering(true) }] : []),
      { label: "Remove exercise", icon: "trash-can-outline", danger: true, run: () => Alert.alert(`Remove ${selected.exercise.name}?`, "This removes its planned sets from this draft.", [{ text: "Keep", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => setExercises(rows => rows.filter(row => row.id !== selected.id)) }]) }
    ]} />}
    {reordering && <ReorderTraining title="exercises" hint="This sets the exercise order for your routine." items={exercises.map(item => ({ id: item.id, name: item.exercise.name, imageUrl: item.exercise.imageUrl }))} onClose={() => setReordering(false)} onSave={async ids => setExercises(rows => ids.map(id => rows.find(row => row.id === id)!))} />}
    {detail && <RoutineDetails key={detail.id} item={detail} onClose={() => setDetails(null)} onSave={change => { patch(detail.id, change); setDetails(null); }} />}
  </KeyboardAvoidingView>;
}
function RoutineDetails({ item, onClose, onSave }: { item: DraftExercise; onClose: () => void; onSave: (change: Partial<DraftExercise>) => void }) {
  const [rest, setRest] = useState(item.rest); const [notes, setNotes] = useState(item.notes); const [error, setError] = useState("");
  return <WorkoutDrawer title="Rest & exercise notes" onClose={onClose}><Txt className="mb-4 text-muted">{item.exercise.name}</Txt><NumberEntry label="Rest between sets · seconds" value={rest} onChange={setRest} max={900} /><TextInput multiline value={notes} onChangeText={setNotes} maxLength={1000} placeholder="Technique cues or setup notes" placeholderTextColor={C.muted} accessibilityLabel="Exercise notes" className="mt-5 min-h-28 rounded-xl bg-bg p-4 text-ink" />{!!error && <Txt className="mt-3 text-red-300">{error}</Txt>}<Pressable onPress={() => { if (!rest.trim() || !Number.isInteger(Number(rest)) || Number(rest) < 0 || Number(rest) > 900) { setError("Rest must be a whole number from 0 to 900 seconds."); return; } onSave({ rest, notes }); }} className="mt-5 items-center rounded-xl bg-brand p-4"><Txt weight="bold" className="text-bg">Save details</Txt></Pressable></WorkoutDrawer>;
}
