import { useAppAlert } from "@/src/components/app-dialog";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { cachedExercisePicker, loadExercisePicker, type PickerExercise } from "@/src/features/exercises/picker-cache";
import { matchesExercise } from "@/src/features/exercises/picker-search";
import { useWorkout } from "@/src/features/workouts/workout-context";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

export default function AddWorkoutExercise() {
  const Alert = useAppAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, addExercises, busy } = useWorkout();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PickerExercise[]>(cachedExercisePicker);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    let active = true;
    void loadExercisePicker(retry > 0).then(rows => {
      if (active) { setItems(rows); setLoadError(""); }
    }).catch(error => {
      if (active) setLoadError(error instanceof Error ? error.message : "Could not load exercises.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  const visible = useMemo(() => items.filter(item => matchesExercise(item, query)), [items, query]);
  const existing = new Set(session?.workout_session_exercises.map(item => item.exercise_id) ?? []);
  const pendingSelection = selected.filter(id => !existing.has(id));
  const toggle = (id: string) => {
    setSelected(current => current.includes(id) ? current.filter(value => value !== id) : current.length < 50 ? [...current, id] : current);
  };
  const handleAdd = async () => {
    if (busy || submitting.current || !pendingSelection.length) return;
    submitting.current = true; setAdding(true);
    try {
      await addExercises(pendingSelection);
      router.back();
    } catch (error) {
      Alert.alert("Could not add exercises", error instanceof Error ? error.message : "Please try again. Your selection is kept.");
    } finally { submitting.current = false; setAdding(false); }
  };

  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-bg">
    <View className="flex-row items-center px-5 py-5">
      <Pressable accessibilityLabel="Back" disabled={adding} onPress={() => router.back()} className="h-11 w-11 items-center justify-center"><MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} /></Pressable>
      <View className="ml-3 flex-1"><Txt weight="bold" className="text-2xl">Add exercises</Txt><Txt className="mt-1 text-xs text-muted">Select up to 50 in your training order</Txt></View>
    </View>
    <View className="mx-5 mb-3 flex-row items-center rounded-2xl border border-border bg-panel px-4">
      <MaterialCommunityIcons name="magnify" size={22} color={C.muted} />
      <TextInput value={query} onChangeText={setQuery} placeholder="Name, muscle or equipment" placeholderTextColor={C.muted} autoCorrect={false} accessibilityLabel="Search exercises" className="h-14 flex-1 px-3 text-ink" />
      {!!query && <Pressable accessibilityLabel="Clear search" onPress={() => setQuery("")} className="p-2"><MaterialCommunityIcons name="close-circle" color={C.muted} size={22} /></Pressable>}
    </View>
    <View className="mx-5 mb-2 flex-row justify-between"><Txt className="text-xs text-muted">{visible.length} exercises{loading ? " · Updating…" : ""}</Txt><Pressable disabled={!selected.length || adding} onPress={() => setSelected([])}><Txt className="text-xs text-brand">Clear selection</Txt></Pressable></View>
    {!!loadError && <Pressable disabled={loading} onPress={() => { setLoading(true); setRetry(value => value + 1); }} className="mx-5 mb-3 rounded-xl bg-panel p-4"><Txt className="text-red-300">{loadError} Tap to retry.</Txt></Pressable>}
    <FlatList data={visible} keyExtractor={item => item.id} extraData={{ selected, adding, busy, session }} keyboardShouldPersistTaps="handled" initialNumToRender={10} windowSize={7} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
      ListEmptyComponent={loading ? <ActivityIndicator color={C.brand} className="mt-8" /> : <Txt className="mt-8 text-center text-muted">{loadError ? "Exercises could not be loaded." : "No exercises found. Try another name or muscle."}</Txt>}
      renderItem={({ item }) => {
        const position = pendingSelection.indexOf(item.id);
        const alreadyAdded = existing.has(item.id);
        return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: position >= 0 || alreadyAdded, disabled: alreadyAdded || adding || busy }} accessibilityLabel={`${item.name}${alreadyAdded ? ", already in workout" : ""}`} onPress={() => toggle(item.id)} disabled={adding || busy || alreadyAdded} className={`mb-2 flex-row items-center rounded-2xl border p-3 ${position >= 0 ? "border-brand bg-brand/10" : "border-border bg-panel"}`}>
          <ExerciseThumbnail exercise={item} />
          <View className="mx-3 flex-1"><Txt weight="semibold" className="text-base">{item.name}</Txt><Txt numberOfLines={2} className="mt-1 text-xs text-muted">{item.primaryMuscles.join(" · ").replace(/-/g, " ") || item.regionLabel} · {item.equipment.join(", ").replace(/-/g, " ")}</Txt>{alreadyAdded && <Txt className="mt-1 text-xs text-muted">In this workout</Txt>}</View>
          <View className={`h-8 w-8 items-center justify-center rounded-full ${position >= 0 ? "bg-brand" : "bg-elevated"}`}>{position >= 0 ? <Txt weight="bold" className="text-bg">{position + 1}</Txt> : <MaterialCommunityIcons name={alreadyAdded ? "minus" : "plus"} size={22} color={alreadyAdded ? C.muted : C.brand} />}</View>
        </Pressable>;
      }} />
    <View className="border-t border-border bg-panel px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
      <Pressable accessibilityRole="button" disabled={!pendingSelection.length || adding || busy} onPress={() => void handleAdd()} className={`h-14 flex-row items-center justify-center rounded-2xl ${pendingSelection.length ? "bg-brand" : "bg-elevated"}`}>{adding && <ActivityIndicator color={C.bg} style={{ marginRight: 10 }} />}<Txt weight="bold" className={pendingSelection.length ? "text-bg" : "text-muted"}>{adding ? "Adding exercises…" : pendingSelection.length ? `Add ${pendingSelection.length} exercise${pendingSelection.length === 1 ? "" : "s"}` : "Select exercises to add"}</Txt></Pressable>
    </View>
  </KeyboardAvoidingView>;
}

function ExerciseThumbnail({ exercise }: { exercise: PickerExercise }) {
  const [failed, setFailed] = useState(false);
  return <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-elevated">{exercise.imageUrl && !failed ? <Image source={{ uri: exercise.imageUrl }} style={{ width: 64, height: 64 }} contentFit="contain" cachePolicy="memory-disk" recyclingKey={exercise.id} accessibilityLabel={`${exercise.name} demonstration`} onError={() => setFailed(true)} /> : <MaterialCommunityIcons name="dumbbell" size={27} color={C.brand} />}</View>;
}
