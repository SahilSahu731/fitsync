import { useExperience } from "@/src/features/experience/experience-context";
import { useWorkoutAwake } from "@/src/features/experience/keep-workout-awake";
import { useAppAlert } from "@/src/components/app-dialog";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedAppMotion } from "@/src/components/motion";

import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

import { useWorkout } from "@/src/features/workouts/workout-context";
import { WorkoutDrawer } from "@/src/features/workouts/components/workout-controls";
import { TrainActions, ReorderTraining } from "@/src/features/workouts/components/train-actions";
import { type SessionExercise } from "@/src/features/workouts/api";
import { workoutSummary } from "@/src/features/workouts/summary";
import { SessionExerciseCard } from "@/src/features/workouts/components/session-exercise-card";
import { SessionOverview } from "@/src/features/workouts/components/session-overview";
import {
  WorkoutGlassScene,
  WorkoutGlassSurface,
} from "@/src/features/workouts/components/workout-glass";
import { RestTimer } from "@/src/features/workouts/components/rest-timer";
import {
  nextWorkoutSet,
  workoutTime as formatTime,
} from "@/src/features/workouts/session-progress";

export default function LiveWorkoutScreen() {
  const Alert = useAppAlert();
  const { feedback } = useExperience();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedAppMotion();
  const scroll = useRef<ScrollView>(null);
  const viewport = useRef<View>(null);
  const setNodes = useRef<Record<string, View | null>>({});
  const scrollOffset = useRef(0);
  const pendingJump = useRef<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const {
    session,
    loading,
    busy,
    addingSetExerciseIds = [],
    restTimer,
    addSet,
    removeExercise,
    reorderExercises,
    finish,
    discard,
    stopRest,
    startRest,
    pendingSaves,
    syncError,
    updateNotes,
    refresh,
    pendingCompletion,
  } = useWorkout();

  useWorkoutAwake(!!session);

  const [now, setNow] = useState(() => Date.now());
  const [focusedExercise, setFocusedExercise] = useState<string>();
  const [notesOpen, setNotesOpen] = useState(false);
  const [finishReview, setFinishReview] = useState(false);
  const [restOpen, setRestOpen] = useState(false);
  const [exerciseMenu, setExerciseMenu] = useState<SessionExercise | null>(null);
  const [reordering, setReordering] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const exercises = useMemo(() => {
    return [...(session?.workout_session_exercises ?? [])].sort((a, b) => a.position - b.position);
  }, [session]);

  const elapsed = session ? Math.floor((now - new Date(session.started_at).getTime()) / 1000) : 0;

  const restRemaining = restTimer ? Math.max(0, Math.ceil((restTimer.endsAt - now) / 1000)) : 0;

  const { completedSets, totalSets, volume } = workoutSummary(session);
  const next = useMemo(
    () => nextWorkoutSet(exercises, focusedExercise),
    [exercises, focusedExercise],
  );
  const allCollapsed =
    exercises.length > 0 && exercises.every((exercise) => !expanded.includes(exercise.id));
  const finishedExercises = exercises.filter(
    (exercise) =>
      exercise.workout_logged_sets.length > 0 &&
      exercise.workout_logged_sets.every((set) => !!set.completed_at),
  ).length;

  useEffect(() => {
    const shown = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const hidden = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false),
    );
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  const toggleExercise = useCallback((id: string) => {
    setFocusedExercise(id);
    setExpanded((rows) => (rows.includes(id) ? rows.filter((item) => item !== id) : [...rows, id]));
  }, []);
  const openExerciseMenu = useCallback((exercise: SessionExercise) => {
    setFocusedExercise(exercise.id);
    setExerciseMenu(exercise);
  }, []);
  const addExerciseSet = useCallback(
    (id: string) => {
      setFocusedExercise(id);
      void addSet(id).catch((error) =>
        Alert.alert(
          "Could not add set",
          error instanceof Error ? error.message : "Please try again.",
        ),
      );
    },
    [addSet, Alert],
  );
  const recordSetMount = useCallback((id: string, node: View | null) => {
    setNodes.current[id] = node;
  }, []);
  const measurePendingSet = useCallback(
    (setId: string) => {
      if (pendingJump.current !== setId) return;
      requestAnimationFrame(() => {
        const row = setNodes.current[setId];
        if (pendingJump.current !== setId || !row || !viewport.current) return;
        viewport.current.measureInWindow((_x, viewportY, _width, viewportHeight) => {
          row.measureInWindow((_rowX, rowY, _rowWidth, rowHeight) => {
            if (pendingJump.current !== setId || !viewportHeight || !rowHeight) return;
            pendingJump.current = null;
            scroll.current?.scrollTo({
              y: Math.max(0, scrollOffset.current + rowY - viewportY - 16),
              animated: !reducedMotion,
            });
          });
        });
      });
    },
    [reducedMotion],
  );
  const jumpToNext = () => {
    if (!next) return;
    setFocusedExercise(next.exercise.id);
    pendingJump.current = next.set.id;
    setExpanded((rows) => (rows.includes(next.exercise.id) ? rows : [...rows, next.exercise.id]));
    measurePendingSet(next.set.id);
  };

  const handleFinish = () => {
    if (!completedSets) {
      Alert.alert("No sets logged yet", "Log at least one set before finishing your workout.");
      return;
    }
    setFinishReview(true);
  };
  const confirmFinish = async () => {
    const id = session?.id;
    if (!id || busy) return;
    try {
      await finish();
      setFinishReview(false);
      feedback("workout");
      router.replace({ pathname: "/workout/history/[id]", params: { id } });
    } catch (error) {
      Alert.alert("Could not finish", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const handleDiscard = () => {
    Alert.alert("Discard workout?", "This workout will not appear in your completed history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: async () => {
          try {
            await discard();
            router.replace("/(tabs)/train");
          } catch {
            Alert.alert("Error", "Could not discard the workout.");
          }
        },
      },
    ]);
  };

  const confirmRemove = (exercise: SessionExercise) => {
    const logged = exercise.workout_logged_sets.filter((set) => set.completed_at).length;
    Alert.alert(
      `Remove ${exercise.exercise_name}?`,
      `This removes the exercise and its ${exercise.workout_logged_sets.length} set(s) from this workout${logged ? `, including ${logged} logged set(s)` : ""}. Your saved routine stays unchanged.`,
      [
        { text: "Keep exercise", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeExercise(exercise.id);
            } catch (error) {
              Alert.alert(
                "Could not remove exercise",
                error instanceof Error ? error.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={C.ink} />
        <Txt className="mt-4 text-sm text-muted">Getting your workout ready…</Txt>
      </View>
    );
  }

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-white/5">
          <MaterialCommunityIcons
            name={pendingCompletion ? "check-all" : "dumbbell"}
            size={36}
            color={C.ink}
          />
        </View>

        <Txt weight="semibold" className="mt-5 text-2xl">
          {pendingCompletion ? "Workout saved" : "No active workout"}
        </Txt>
        <Txt className="mt-3 text-center text-sm leading-6 text-muted">
          {pendingCompletion
            ? "Your session is saved on this device and will sync when connected."
            : "Your next session starts in Train. Choose a routine or build your own."}
        </Txt>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(tabs)/train")}
          className="mt-6 min-h-14 items-center justify-center rounded-2xl bg-white px-8"
        >
          <Txt weight="semibold" className="text-bg">
            Back to Train
          </Txt>
        </Pressable>
      </View>
    );
  }

  return (
    <WorkoutGlassScene>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Minimize workout"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/train"))}
            className="h-11 w-11 items-center justify-center rounded-full bg-panel"
          >
            <MaterialCommunityIcons name="chevron-down" size={24} color={C.ink} />
          </Pressable>
          <View className="min-w-0 flex-1">
            <Txt weight="medium" className="text-sm" numberOfLines={1}>
              Your workout
            </Txt>
            <View className="mt-0.5 flex-row items-center gap-1.5">
              <View className="h-1.5 w-1.5 rounded-full bg-brand" />
              <Txt className="min-w-0 shrink text-[10px] text-ink" numberOfLines={1}>
                In progress
              </Txt>
            </View>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="items-end justify-center">
              <Txt
                accessibilityLabel={`Workout duration ${formatTime(elapsed)}`}
                weight="semibold"
                numberOfLines={1}
                className="text-[15px] text-[#25d22d]"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {formatTime(elapsed)}
              </Txt>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={handleFinish}
              className={`min-h-11 flex-row items-center justify-center gap-1.5 rounded-xl bg-white px-5 ${busy ? "opacity-50" : ""}`}
            >
              <Txt weight="semibold" className="text-sm text-bg">
                Finish
              </Txt>
            </Pressable>
          </View>
        </View>

        {restRemaining > 0 && (
          <RestTimer
            remaining={restRemaining}
            duration={restTimer?.duration ?? restRemaining}
            onExtend={() => startRest(restRemaining + 30)}
            onSkip={stopRest}
          />
        )}

        <View ref={viewport} collapsable={false} className="flex-1">
          <ScrollView
            ref={scroll}
            onScroll={(event) => {
              scrollOffset.current = Math.max(0, event.nativeEvent.contentOffset.y);
            }}
            scrollEventThrottle={16}
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom:
                24 + (keyboardVisible || (!next && !completedSets) ? insets.bottom : 0),
            }}
          >
            <SessionOverview
              name={session.name}
              completedSets={completedSets}
              totalSets={totalSets}
              volume={volume}
              exercises={exercises}
              currentId={focusedExercise}
            />
            <View className="mb-3 flex-row items-center gap-2 px-1">
              <MaterialCommunityIcons
                name={
                  syncError
                    ? "cloud-off-outline"
                    : pendingSaves
                      ? "cloud-upload-outline"
                      : "cloud-check-outline"
                }
                size={14}
                color={syncError ? C.ink : C.muted}
              />
              <Txt className="flex-1 text-[10px] text-muted">
                {syncError
                  ? "Saved on device · will sync when connected"
                  : pendingSaves
                    ? "Saved on device · syncing…"
                    : "All changes synced"}
              </Txt>
              {syncError && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry syncing workout"
                  onPress={() => void refresh().catch(() => {})}
                  className="min-h-11 justify-center px-2"
                >
                  <Txt weight="medium" className="text-xs text-ink">
                    Retry
                  </Txt>
                </Pressable>
              )}
            </View>
            <View className="mb-6 flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={session.notes ? "Edit workout notes" : "Add workout notes"}
                onPress={() => setNotesOpen(true)}
                className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-panel px-2"
              >
                <MaterialCommunityIcons
                  name={session.notes ? "note-text" : "note-text-outline"}
                  color={session.notes ? C.ink : C.muted}
                  size={18}
                />
                <Txt className="text-[11px] text-muted">Notes</Txt>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start a rest timer"
                onPress={() => setRestOpen(true)}
                className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-panel px-2"
              >
                <MaterialCommunityIcons name="timer-outline" color={C.muted} size={18} />
                <Txt className="text-[11px] text-muted">Timer</Txt>
              </Pressable>
            </View>
            {exercises.length > 0 ? (
              <>
                <View className="mb-1 flex-row items-center justify-between gap-3 px-1">
                  <View>
                    <Txt weight="semibold" className="text-lg tracking-[-0.4px]">
                      Your exercises
                    </Txt>
                    <Txt className="mt-0.5 text-[11px] text-muted">
                      {finishedExercises} of {exercises.length} complete
                    </Txt>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      allCollapsed ? "Expand all exercises" : "Collapse all exercises"
                    }
                    onPress={() =>
                      setExpanded(allCollapsed ? exercises.map((exercise) => exercise.id) : [])
                    }
                    className="min-h-11 flex-row items-center gap-1 px-2"
                  >
                    <Txt className="text-[11px] text-muted">
                      {allCollapsed ? "Expand all" : "Collapse all"}
                    </Txt>
                    <MaterialCommunityIcons
                      name={allCollapsed ? "unfold-more-horizontal" : "unfold-less-horizontal"}
                      size={16}
                      color={C.muted}
                    />
                  </Pressable>
                </View>
                <Txt className="mb-4 px-1 text-[11px] leading-5 text-muted">
                  Open an exercise, enter your numbers, and tap the circle to log a set.
                </Txt>
              </>
            ) : (
              <View className="mb-5 items-center rounded-3xl border border-dashed border-white/15 bg-panel px-6 py-8">
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
                  <MaterialCommunityIcons name="dumbbell" size={30} color={C.ink} />
                </View>
                <Txt weight="semibold" className="mt-5 text-xl">
                  Build your workout
                </Txt>
                <Txt className="mt-2 text-center text-sm leading-6 text-muted">
                  Add your first exercise below. We’ll keep track, one set at a time.
                </Txt>
              </View>
            )}
            {exercises.map((exercise, index) => (
              <SessionExerciseCard
                key={exercise.id}
                exercise={exercise}
                index={index}
                nextSetId={next?.exercise.id === exercise.id ? next.set.id : undefined}
                collapsed={!expanded.includes(exercise.id)}
                adding={addingSetExerciseIds.includes(exercise.id)}
                busy={busy}
                onToggle={toggleExercise}
                onMenu={openExerciseMenu}
                onAddSet={addExerciseSet}
                onFocus={setFocusedExercise}
                onSetMount={recordSetMount}
                onSetLayout={measurePendingSet}
              />
            ))}
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => router.push("/workout/add-exercise")}
              className={`min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-white/15 bg-panel ${busy ? "opacity-50" : ""}`}
            >
              <MaterialCommunityIcons name="plus" size={20} color={C.ink} />
              <Txt weight="medium" className="text-sm">
                Add exercise
              </Txt>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={handleDiscard}
              className="mt-3 min-h-12 items-center justify-center"
            >
              <Txt className="text-xs text-muted">Discard workout</Txt>
            </Pressable>
          </ScrollView>
        </View>
        {!keyboardVisible && (next || completedSets > 0) && (
          <View
            className="overflow-hidden border-t border-white/10 px-4 pt-3"
            style={{ paddingBottom: Math.max(12, insets.bottom) }}
          >
            <WorkoutGlassSurface />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                next
                  ? `Go to ${next.exercise.exercise_name}, set ${next.number}`
                  : "Review and finish workout"
              }
              disabled={busy}
              onPress={next ? jumpToNext : handleFinish}
              className={`min-h-14 flex-row items-center gap-3 ${busy ? "opacity-50" : ""}`}
            >
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-white/5">
                <MaterialCommunityIcons
                  name={next ? "arrow-down" : "check-all"}
                  size={21}
                  color={C.ink}
                />
              </View>
              <View className="min-w-0 flex-1">
                <Txt className="text-[10px] tracking-wider text-ink">
                  {next
                    ? `${restRemaining ? "AFTER REST" : "UP NEXT"} · SET ${next.number}`
                    : "ALL SETS LOGGED"}
                </Txt>
                <Txt weight="medium" className="mt-0.5 text-sm" numberOfLines={1}>
                  {next ? next.exercise.exercise_name : "Ready when you are. Nice work."}
                </Txt>
              </View>
              <View className="min-h-11 items-center justify-center rounded-xl bg-white px-3">
                <Txt weight="semibold" className="text-xs text-bg">
                  {next ? "Go to set" : "Finish"}
                </Txt>
              </View>
            </Pressable>
          </View>
        )}
        {exerciseMenu && (
          <TrainActions
            title={exerciseMenu.exercise_name}
            onClose={() => setExerciseMenu(null)}
            actions={[
              {
                label: "Exercise instructions",
                icon: "information-outline",
                run: () =>
                  router.push({
                    pathname: "/exercise/[id]",
                    params: { id: exerciseMenu.exercise_id },
                  }),
              },
              {
                label: "Add set",
                icon: "plus-circle-outline",
                run: () => {
                  void addSet(exerciseMenu.id).catch((error) =>
                    Alert.alert("Could not add set", error.message),
                  );
                },
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
                run: () => confirmRemove(exerciseMenu),
              },
            ]}
          />
        )}
        {reordering && (
          <ReorderTraining
            title="exercises"
            hint="Saved with this workout."
            items={exercises.map((item) => ({
              id: item.id,
              name: item.exercise_name,
              imageUrl: item.image_url,
            }))}
            onClose={() => setReordering(false)}
            onSave={reorderExercises}
          />
        )}
        {restOpen && (
          <WorkoutDrawer title="Rest timer" onClose={() => setRestOpen(false)}>
            <Txt className="mb-4 text-sm text-muted">
              Start a break whenever you need one. Logging a set starts its own rest timer.
            </Txt>
            <View className="flex-row flex-wrap gap-3">
              {[30, 60, 90, 120, 180, 300].map((seconds) => (
                <Pressable
                  key={seconds}
                  accessibilityRole="button"
                  accessibilityLabel={`Rest for ${seconds} seconds`}
                  onPress={() => {
                    startRest(seconds);
                    setRestOpen(false);
                  }}
                  className="min-h-14 min-w-20 flex-1 items-center justify-center rounded-2xl bg-elevated px-4"
                >
                  <Txt weight="medium">{seconds < 60 ? `${seconds}s` : `${seconds / 60} min`}</Txt>
                </Pressable>
              ))}
            </View>
          </WorkoutDrawer>
        )}
        {finishReview && (
          <WorkoutDrawer
            title="Finish your workout"
            onClose={() => {
              if (!busy) setFinishReview(false);
            }}
          >
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
              <MaterialCommunityIcons name="check-all" size={28} color={C.ink} />
            </View>
            <Txt weight="semibold" className="text-xl">
              Nice work.
            </Txt>
            <Txt className="mt-1 text-sm text-muted">{session.name}</Txt>
            <View className="mt-5 flex-row rounded-2xl bg-elevated p-4">
              <View className="flex-1">
                <Txt className="text-[10px] text-muted">Duration</Txt>
                <Txt weight="medium" className="mt-1 text-lg">
                  {formatTime(elapsed)}
                </Txt>
              </View>
              <View className="flex-1">
                <Txt className="text-[10px] text-muted">Logged sets</Txt>
                <Txt weight="medium" className="mt-1 text-lg">
                  {completedSets}
                </Txt>
              </View>
              <View className="flex-1">
                <Txt className="text-[10px] text-muted">Volume · kg</Txt>
                <Txt
                  weight="medium"
                  className="mt-1 text-lg"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {Math.round(volume).toLocaleString()}
                </Txt>
              </View>
            </View>
            <Txt className="mt-4 text-sm leading-6 text-muted">
              {totalSets > completedSets
                ? `${totalSets - completedSets} unlogged set${totalSets - completedSets === 1 ? "" : "s"} will be left out of your results. `
                : "Every set is logged. "}
              Your completed sets and notes will be saved to history.
            </Txt>
            <Txt className="mt-3 text-[11px] leading-5 text-muted">
              Volume includes logged working sets with external load. Warm-ups and bodyweight are
              excluded.
            </Txt>
            {!!session.notes && (
              <Txt className="mt-4 text-sm" numberOfLines={4}>
                {session.notes}
              </Txt>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void confirmFinish()}
              className="mt-6 min-h-14 items-center justify-center rounded-2xl bg-white"
            >
              <Txt weight="semibold" className="text-bg">
                {busy ? "Saving…" : "Save & finish workout"}
              </Txt>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => setFinishReview(false)}
              className="mt-2 min-h-12 items-center justify-center"
            >
              <Txt className="text-sm text-muted">Keep training</Txt>
            </Pressable>
          </WorkoutDrawer>
        )}
        {notesOpen && (
          <WorkoutNotes
            initial={session.notes ?? ""}
            onSave={updateNotes}
            onClose={() => setNotesOpen(false)}
          />
        )}
      </KeyboardAvoidingView>
    </WorkoutGlassScene>
  );
}

function WorkoutNotes({
  initial,
  onSave,
  onClose,
}: {
  initial: string;
  onSave: (notes: string) => Promise<void>;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <WorkoutDrawer
      title="Workout notes"
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <Txt className="mb-3 text-xs text-muted">
        Keep context for your whole session. These notes are saved with your workout.
      </Txt>
      <TextInput
        accessibilityLabel="Workout notes"
        autoFocus
        multiline
        maxLength={2000}
        value={notes}
        onChangeText={setNotes}
        editable={!saving}
        placeholder="Energy, sleep, goals, technique reminders…"
        placeholderTextColor={C.muted}
        keyboardAppearance="dark"
        className="font-poppins-regular min-h-[60px] rounded-2xl bg-bg p-1 text-ink"
      />
      {!!error && <Txt className="mt-3 text-red-300">{error}</Txt>}
      <Pressable
        accessibilityRole="button"
        disabled={saving}
        onPress={async () => {
          setSaving(true);
          try {
            await onSave(notes);
            onClose();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save notes.");
          } finally {
            setSaving(false);
          }
        }}
        className="mt-5 min-h-5 items-center justify-center rounded-2xl bg-white p-2"
      >
        <Txt weight="semibold" className="text-bg">
          {saving ? "Saving…" : "Save workout notes"}
        </Txt>
      </Pressable>
    </WorkoutDrawer>
  );
}
