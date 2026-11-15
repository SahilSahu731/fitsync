import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppAlert } from "@/src/components/app-dialog";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useSession } from "@/src/context/session";
import { ScreenEntrance } from "@/src/components/motion";
import { workoutApi } from "@/src/features/workouts/api";
import {
  newDraftExercise,
  newDraftSet,
  routineInput,
  type DraftExercise,
  type DraftSet,
  validTempo,
  validSupersetGroup,
} from "@/src/features/workouts/routine-draft";
import { RoutineExerciseCard } from "@/src/features/workouts/components/routine-exercise-card";
import {
  WorkoutGlassScene,
  WorkoutGlassSurface,
} from "@/src/features/workouts/components/workout-glass";
import { ExercisePicker } from "@/src/features/workouts/components/exercise-picker";
import { NumberEntry, WorkoutDrawer } from "@/src/features/workouts/components/workout-controls";
import { ReorderTraining, TrainActions } from "@/src/features/workouts/components/train-actions";

export default function CreateWorkoutScreen() {
  const { user } = useSession();
  return <RoutineBuilder key={user?.id ?? "signed-out"} ownerId={user?.id ?? ""} />;
}

function RoutineBuilder({ ownerId }: { ownerId: string }) {
  const insets = useSafeAreaInsets();
  const notesInput = useRef<TextInput>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const Alert = useAppAlert();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [picker, setPicker] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [setOptions, setSetOptions] = useState<{ exerciseId: string; setId: string } | null>(null);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState("");
  const selected = exercises.find((item) => item.id === menu);
  const detail = exercises.find((item) => item.id === details);
  const patch = (id: string, change: Partial<DraftExercise>) =>
    setExercises((rows) => rows.map((row) => (row.id === id ? { ...row, ...change } : row)));
  const patchSet = (id: string, setId: string, change: Partial<DraftSet>) =>
    setExercises((rows) =>
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              sets: row.sets.map((set) => (set.id === setId ? { ...set, ...change } : set)),
            }
          : row,
      ),
    );
  const addSet = (id: string) =>
    setExercises((rows) =>
      rows.map((row) =>
        row.id === id && row.sets.length < 30
          ? { ...row, sets: [...row.sets, newDraftSet(row.sets.at(-1))] }
          : row,
      ),
    );
  const back = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/train"));
  const close = () => {
    if (savingRef.current) return;
    if (!name && !description && !exercises.length) {
      back();
      return;
    }
    Alert.alert("Discard this draft?", "Your unsaved routine changes will be lost.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: back },
    ]);
  };
  const save = async () => {
    if (savingRef.current) return;
    Keyboard.dismiss();
    setError("");
    try {
      if (!ownerId) throw Error("Sign in again before saving your routine.");
      const input = routineInput(name, description, exercises);
      savingRef.current = true;
      setSaving(true);
      await workoutApi.createTemplate(input, ownerId);
      if (alive.current) router.replace("/(tabs)/train");
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Could not save your routine. Try again.");
    } finally {
      savingRef.current = false;
      if (alive.current) setSaving(false);
    }
  };
  const totalSets = exercises.reduce((sum, item) => sum + item.sets.length, 0);
  return (
    <WorkoutGlassScene>
      <ScreenEntrance className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={insets.top}
          className="flex-1"
        >
          <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close routine builder"
              accessibilityState={{ disabled: saving }}
              disabled={saving}
              onPress={close}
              className="h-11 w-11 items-center justify-center rounded-full bg-panel"
            >
              <MaterialCommunityIcons name="arrow-left" size={23} color={C.ink} />
            </Pressable>
            <View className="min-w-0 flex-1">
              <Txt weight="medium" className="text-sm" numberOfLines={1}>
                New routine
              </Txt>
              <Txt className="mt-0.5 text-[10px] text-muted">Plan it once. Make it yours.</Txt>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save routine"
              accessibilityState={{ disabled: saving, busy: saving }}
              disabled={saving}
              onPress={() => void save()}
              className={`min-h-11 min-w-20 items-center justify-center rounded-xl bg-white px-5 ${saving ? "opacity-60" : ""}`}
            >
              {saving ? (
                <ActivityIndicator color={C.bg} />
              ) : (
                <Txt weight="semibold" className="text-sm text-bg">
                  Save
                </Txt>
              )}
            </Pressable>
          </View>
          {!!error && (
            <View className="mx-4 mb-3 rounded-2xl border border-red-300/20 bg-red-500/10 p-3">
              <Txt
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                className="text-xs leading-5 text-red-300"
              >
                {error}
              </Txt>
            </View>
          )}
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: Math.max(24, insets.bottom + 16),
            }}
          >
            <View className="mb-3 pt-2">
              <TextInput
                value={name}
                onChangeText={setName}
                editable={!saving}
                maxLength={100}
                accessibilityLabel="Routine name"
                placeholder="Name your routine"
                placeholderTextColor={C.muted}
                returnKeyType="next"
                onSubmitEditing={() => notesInput.current?.focus()}
                keyboardAppearance="dark"
                className="min-h-14 font-poppins-semibold text-[24px] leading-9 tracking-[-0.8px] text-ink"
              />
              <View className="mt-2 overflow-hidden rounded-3xl border border-white/10 p-4">
                <WorkoutGlassSurface />
                <View className="flex-row items-center gap-4">
                  <View className="flex-1">
                    <Txt className="text-[11px] text-muted">Exercises</Txt>
                    <Txt weight="semibold" className="mt-1 text-2xl">
                      {exercises.length}
                    </Txt>
                  </View>
                  <View className="flex-1 border-l border-white/10 pl-4">
                    <Txt className="text-[11px] text-muted">Planned sets</Txt>
                    <Txt weight="semibold" className="mt-1 text-2xl">
                      {totalSets}
                    </Txt>
                  </View>
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                    <MaterialCommunityIcons name="playlist-edit" size={26} color={C.muted} />
                  </View>
                </View>
                <View className="mt-4 flex-row items-start gap-2 border-t border-white/10 pt-3">
                  <MaterialCommunityIcons
                    name="note-text-outline"
                    size={18}
                    color={C.muted}
                    style={{ marginTop: 12 }}
                  />
                  <TextInput
                    ref={notesInput}
                    value={description}
                    onChangeText={setDescription}
                    editable={!saving}
                    multiline
                    maxLength={2000}
                    accessibilityLabel="Routine notes"
                    placeholder="Add goals or routine notes (optional)"
                    placeholderTextColor={C.muted}
                    keyboardAppearance="dark"
                    textAlignVertical="top"
                    className="min-h-11 flex-1 font-poppins-regular py-2.5 text-xs leading-5 text-ink"
                  />
                </View>
              </View>
            </View>
            <View className="mb-4 mt-3 flex-row items-center justify-between gap-3 px-1">
              <View className="flex-1">
                <Txt weight="semibold" className="text-lg tracking-[-0.4px]">
                  Your exercises
                </Txt>
                <Txt className="mt-0.5 text-[11px] text-muted">
                  {exercises.length
                    ? "Set your targets before you train."
                    : "Build the session you want to repeat."}
                </Txt>
              </View>
              {exercises.length > 1 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reorder exercises"
                  disabled={saving}
                  onPress={() => setReordering(true)}
                  className="h-11 w-11 items-center justify-center rounded-xl bg-white/5"
                >
                  <MaterialCommunityIcons name="sort-variant" size={20} color={C.muted} />
                </Pressable>
              )}
            </View>
            {!exercises.length && (
              <View className="mb-4 overflow-hidden rounded-3xl border border-white/10 px-6 py-7">
                <WorkoutGlassSurface />
                <View>
                  <View className="mb-5 h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
                    <MaterialCommunityIcons name="dumbbell" size={27} color={C.ink} />
                  </View>
                  <Txt weight="semibold" className="text-lg tracking-[-0.4px]">
                    Start with your exercises
                  </Txt>
                  <Txt className="mt-2 text-xs leading-5 text-muted">
                    Choose your movements, then plan sets, reps and rest. Your routine will be ready
                    in Train whenever you are.
                  </Txt>
                </View>
              </View>
            )}
            {exercises.map((item, index) => (
              <RoutineExerciseCard
                key={item.id}
                item={item}
                index={index}
                collapsed={collapsed.includes(item.id)}
                disabled={saving}
                onToggle={() =>
                  setCollapsed((rows) =>
                    rows.includes(item.id)
                      ? rows.filter((id) => id !== item.id)
                      : [...rows, item.id],
                  )
                }
                onMenu={() => setMenu(item.id)}
                onDetails={() => setDetails(item.id)}
                onSetOptions={(setId) => setSetOptions({ exerciseId: item.id, setId })}
                onPatchSet={(setId, change) => patchSet(item.id, setId, change)}
                onAddSet={() => addSet(item.id)}
              />
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add exercises"
              accessibilityState={{ disabled: saving || exercises.length >= 50 }}
              disabled={saving || exercises.length >= 50}
              onPress={() => setPicker(true)}
              className={`min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-white/15 bg-panel ${saving || exercises.length >= 50 ? "opacity-50" : ""}`}
            >
              <MaterialCommunityIcons name="plus" size={20} color={C.ink} />
              <Txt weight="medium" className="text-sm">
                {exercises.length >= 50 ? "50-exercise limit reached" : "Add exercises"}
              </Txt>
            </Pressable>
            <Txt className="mt-4 text-center text-[10px] leading-5 text-muted">
              {exercises.length
                ? "Tap a target to edit. Set type, tempo and rest are yours to adjust."
                : "Saving a routine won’t start a workout."}
            </Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Discard routine draft"
              disabled={saving}
              onPress={close}
              className="mt-3 min-h-12 items-center justify-center"
            >
              <Txt className="text-xs text-muted">Discard draft</Txt>
            </Pressable>
          </ScrollView>
          {picker && (
            <Modal animationType="slide" onRequestClose={() => setPicker(false)}>
              <SafeAreaView edges={["top"]} className="flex-1 bg-bg">
                <ExercisePicker
                  existingIds={exercises.map((item) => item.exercise.id)}
                  disabled={saving}
                  onClose={() => setPicker(false)}
                  onConfirm={async (items) => {
                    setExercises((rows) => [
                      ...rows,
                      ...items
                        .filter(
                          (item, index) =>
                            !rows.some((row) => row.exercise.id === item.id) &&
                            items.findIndex((other) => other.id === item.id) === index,
                        )
                        .slice(0, Math.max(0, 50 - rows.length))
                        .map(newDraftExercise),
                    ]);
                    setPicker(false);
                  }}
                />
              </SafeAreaView>
            </Modal>
          )}
          {selected && (
            <TrainActions
              title={selected.exercise.name}
              onClose={() => setMenu(null)}
              actions={[
                ...(selected.sets.length < 30
                  ? [
                      {
                        label: "Add set",
                        icon: "plus-circle-outline" as const,
                        run: () => addSet(selected.id),
                      },
                    ]
                  : []),
                {
                  label: "Rest & notes",
                  icon: "note-text-outline",
                  run: () => setDetails(selected.id),
                },
                ...(exercises.length > 1
                  ? [
                      {
                        label: "Reorder exercises",
                        icon: "sort-variant" as const,
                        run: () => setReordering(true),
                      },
                    ]
                  : []),
                {
                  label: "Remove exercise",
                  icon: "trash-can-outline",
                  danger: true,
                  run: () =>
                    Alert.alert(
                      `Remove ${selected.exercise.name}?`,
                      "This removes its planned sets from this draft.",
                      [
                        { text: "Keep", style: "cancel" },
                        {
                          text: "Remove",
                          style: "destructive",
                          onPress: () =>
                            setExercises((rows) => rows.filter((row) => row.id !== selected.id)),
                        },
                      ],
                    ),
                },
              ]}
            />
          )}
          {reordering && (
            <ReorderTraining
              title="exercises"
              hint="This sets the exercise order for your routine."
              items={exercises.map((item) => ({
                id: item.id,
                name: item.exercise.name,
                imageUrl: item.exercise.imageUrl,
              }))}
              onClose={() => setReordering(false)}
              onSave={async (ids) =>
                setExercises((rows) => ids.map((id) => rows.find((row) => row.id === id)!))
              }
            />
          )}
          {detail && (
            <RoutineDetails
              key={detail.id}
              item={detail}
              onClose={() => setDetails(null)}
              onSave={(change) => {
                patch(detail.id, change);
                setDetails(null);
              }}
            />
          )}
          {setOptions &&
            (() => {
              const item = exercises.find((e) => e.id === setOptions.exerciseId);
              const selectedSet = item?.sets.find((s) => s.id === setOptions.setId);
              return selectedSet ? (
                <RoutineSetDetails
                  key={selectedSet.id}
                  set={selectedSet}
                  exerciseName={item!.exercise.name}
                  number={item!.sets.findIndex((set) => set.id === selectedSet.id) + 1}
                  canRemove={item!.sets.length > 1}
                  onRemove={() => {
                    patch(item!.id, {
                      sets: item!.sets.filter((set) => set.id !== selectedSet.id),
                    });
                    setSetOptions(null);
                  }}
                  onClose={() => setSetOptions(null)}
                  onSave={(change) => {
                    patchSet(setOptions.exerciseId, setOptions.setId, change);
                    setSetOptions(null);
                  }}
                />
              ) : null;
            })()}
        </KeyboardAvoidingView>
      </ScreenEntrance>
    </WorkoutGlassScene>
  );
}
function RoutineDetails({
  item,
  onClose,
  onSave,
}: {
  item: DraftExercise;
  onClose: () => void;
  onSave: (change: Partial<DraftExercise>) => void;
}) {
  const [rest, setRest] = useState(item.rest);
  const [notes, setNotes] = useState(item.notes);
  const [group, setGroup] = useState(item.supersetGroup ?? "");
  const [error, setError] = useState("");
  return (
    <WorkoutDrawer title="Rest & exercise notes" onClose={onClose}>
      <Txt className="mb-4 text-white text-lg">{item.exercise.name}</Txt>
      <NumberEntry label="Rest between sets · seconds" value={rest} onChange={setRest} max={900} />
      <TextInput
        multiline
        value={notes}
        onChangeText={setNotes}
        maxLength={1000}
        placeholder="Technique cues or setup notes"
        placeholderTextColor={C.muted}
        accessibilityLabel="Exercise notes"
        className="font-poppins-regular mt-5 min-h-24 rounded-xl bg-bg p-4 text-sm leading-6 text-ink"
      />
      <Txt className="mb-2 mt-5 text-xs text-muted">Superset group (optional)</Txt>
      <TextInput
        value={group}
        onChangeText={setGroup}
        maxLength={24}
        autoCapitalize="characters"
        placeholder="A"
        placeholderTextColor={C.muted}
        accessibilityLabel="Routine superset group"
        className="min-h-12 rounded-xl bg-bg p-4 text-ink"
      />
      <Txt className="mt-2 text-xs leading-5 text-muted">
        Use the same group on paired exercises. Sets alternate by round, with rest after the last
        member.
      </Txt>
      {!!error && <Txt className="mt-3 text-red-300">{error}</Txt>}
      <Pressable
        onPress={() => {
          if (
            !rest.trim() ||
            !Number.isInteger(Number(rest)) ||
            Number(rest) < 0 ||
            Number(rest) > 900
          ) {
            setError("Rest must be a whole number from 0 to 900 seconds.");
            return;
          }
          try {
            if (group.trim()) validSupersetGroup(group);
            onSave({ rest, notes, supersetGroup: group.trim() });
          } catch (error) {
            setError(error instanceof Error ? error.message : "Check the superset group.");
          }
        }}
        className="mt-5 items-center rounded-xl bg-ink p-4"
      >
        <Txt weight="semibold" className="text-bg">
          Save details
        </Txt>
      </Pressable>
    </WorkoutDrawer>
  );
}

function RoutineSetDetails({
  set,
  exerciseName,
  number,
  canRemove,
  onRemove,
  onClose,
  onSave,
}: {
  set: DraftSet;
  exerciseName: string;
  number: number;
  canRemove: boolean;
  onRemove: () => void;
  onClose: () => void;
  onSave: (change: Partial<DraftSet>) => void;
}) {
  const [rest, setRest] = useState(set.rest ?? "");
  const [tempo, setTempo] = useState(set.tempo ?? "");
  const [error, setError] = useState("");
  return (
    <WorkoutDrawer title={`Set ${number} options`} onClose={onClose}>
      <Txt className="mb-4 text-sm text-muted">{exerciseName}</Txt>
      <Txt className="mb-2 text-xs text-muted">
        Rest override · seconds (blank uses exercise default)
      </Txt>
      <TextInput
        value={rest}
        onChangeText={setRest}
        keyboardType="number-pad"
        placeholder="Default"
        placeholderTextColor={C.muted}
        accessibilityLabel="Routine set rest override"
        className="min-h-12 rounded-xl bg-bg p-4 text-ink"
      />
      <Txt className="mb-2 mt-5 text-xs text-muted">Tempo · lowering / pause / lifting / pause</Txt>
      <TextInput
        value={tempo}
        onChangeText={setTempo}
        autoCapitalize="characters"
        maxLength={7}
        placeholder="3-1-X-0"
        placeholderTextColor={C.muted}
        accessibilityLabel="Routine set tempo"
        className="min-h-12 rounded-xl bg-bg p-4 text-ink"
      />
      <Txt className="mt-2 text-xs leading-5 text-muted">
        Numbers are seconds. X means an intended explosive movement. For drop sets or rest-pause,
        log each segment as a separate set with its own load and rest.
      </Txt>
      {!!error && (
        <Txt accessibilityRole="alert" className="mt-3 text-red-300">
          {error}
        </Txt>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (
            rest.trim() &&
            (!Number.isInteger(Number(rest)) || Number(rest) < 0 || Number(rest) > 900)
          ) {
            setError("Set rest must be blank or a whole number from 0 to 900 seconds.");
            return;
          }
          try {
            onSave({ rest: rest.trim(), tempo: tempo.trim() ? validTempo(tempo) : "" });
          } catch (error) {
            setError(error instanceof Error ? error.message : "Check the tempo.");
          }
        }}
        className="mt-5 min-h-12 items-center justify-center rounded-xl bg-ink"
      >
        <Txt weight="medium" className="text-bg">
          Save set options
        </Txt>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Remove planned set"
        disabled={!canRemove}
        onPress={onRemove}
        className="mt-3 min-h-12 items-center justify-center"
      >
        <Txt className={canRemove ? "text-xs text-red-300" : "text-xs text-muted"}>
          {canRemove ? "Remove set" : "Keep at least one set per exercise"}
        </Txt>
      </Pressable>
    </WorkoutDrawer>
  );
}
