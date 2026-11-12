import { useExperience } from "@/src/features/experience/experience-context";
import { useWorkoutAwake } from "@/src/features/experience/keep-workout-awake";
import { useAppAlert } from "@/src/components/app-dialog";
import React, { useEffect, useMemo, useState } from "react";

import { ActivityIndicator, Pressable, ScrollView, View, TextInput } from "react-native";

import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

import { useWorkout } from "@/src/features/workouts/workout-context";
import { MuscleFocus } from "@/src/features/workouts/components/muscle-focus";
import { WorkoutDrawer } from "@/src/features/workouts/components/workout-controls";
import { ExerciseImage } from "@/src/features/workouts/components/exercise-image";
import { TrainActions, ReorderTraining } from "@/src/features/workouts/components/train-actions";
import { type SessionExercise } from "@/src/features/workouts/api";
import { workoutSummary } from "@/src/features/workouts/summary";
import { SetRow } from "@/src/features/workouts/components/set-row";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function LiveWorkoutScreen() {
  const Alert = useAppAlert();
  const { feedback } = useExperience();
  const router = useRouter();

  const {
    session,
    loading,
    busy,
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
  const [collapsed, setCollapsed] = useState<string[]>([]);

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

  const { completedSets, totalSets, volume, completedExercises } = workoutSummary(session);

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
      </View>
    );
  }

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <MaterialCommunityIcons name="dumbbell" size={50} color={C.ink} />

        <Txt weight="semibold" className="mt-5 text-2xl">
          {pendingCompletion ? "Workout saved" : "No active workout"}
        </Txt>

        <Pressable
          onPress={() => router.replace("/(tabs)/train")}
          className="mt-6 rounded-2xl bg-ink px-8 py-4"
        >
          <Txt weight="semibold" className="text-bg">
            Back to Train
          </Txt>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row items-center gap-3 px-6 pb-5 pt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Minimize workout"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/train"))}
          className="h-11 w-11 items-center justify-center rounded-full bg-panel"
        >
          <MaterialCommunityIcons name="chevron-down" size={24} color={C.ink} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Txt weight="medium" numberOfLines={2} className="text-base leading-6 tracking-[-0.4px]">
            {session.name}
          </Txt>
          <Txt className="mt-1 text-xs text-muted">
            {formatTime(Math.max(0, elapsed))} · in progress
          </Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={handleFinish}
          className={`min-h-11 items-center justify-center rounded-full bg-ink px-5 ${busy ? "opacity-50" : ""}`}
        >
          <Txt weight="semibold" className="text-xs text-black">
            Finish
          </Txt>
        </Pressable>
      </View>

      {restRemaining > 0 && (
        <View className="mx-5 mb-3 flex-row items-center gap-3 rounded-2xl bg-panel px-4 py-3">
          <MaterialCommunityIcons name="timer-outline" size={22} color={C.ink} />
          <View className="flex-1">
            <Txt className="text-xs text-muted">Rest</Txt>
            <Txt weight="semibold" className="text-xl">
              {formatTime(restRemaining)}
            </Txt>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add thirty seconds rest"
            onPress={() => startRest(restRemaining + 30)}
            className="min-h-11 items-center justify-center rounded-xl bg-elevated px-3"
          >
            <Txt className="text-sm">+30s</Txt>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip rest timer"
            onPress={stopRest}
            className="min-h-11 items-center justify-center rounded-xl bg-elevated px-3"
          >
            <Txt className="text-sm">Skip</Txt>
          </Pressable>
        </View>
      )}

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 120,
        }}
      >
        <View className="mb-4 rounded-[22px] bg-panel p-4">
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <Txt weight="medium" className="text-sm">
                {completedSets} of {totalSets} sets logged
              </Txt>
              <Txt className="mt-1 text-xs text-muted">
                {completedExercises}/{exercises.length} exercises ·{" "}
                {Math.round(volume).toLocaleString()} kg working volume
              </Txt>
            </View>
            <MuscleFocus exercises={exercises} currentId={focusedExercise} />
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Sets logged"
            accessibilityValue={{ min: 0, max: Math.max(1, totalSets), now: completedSets }}
            className="mt-3 h-1 overflow-hidden rounded-full bg-elevated"
          >
            <View
              className="h-full rounded-full bg-ink"
              style={{ width: `${totalSets ? (completedSets / totalSets) * 100 : 0}%` }}
            />
          </View>
          <View className="mt-3 flex-row items-center gap-2">
            <MaterialCommunityIcons
              name={
                syncError
                  ? "cloud-off-outline"
                  : pendingSaves
                    ? "cloud-upload-outline"
                    : "cloud-check-outline"
              }
              size={15}
              color={C.muted}
            />
            <Txt className="flex-1 text-[11px] text-muted">
              {syncError
                ? "Saved on this device · connection unavailable"
                : pendingSaves
                  ? "Saved on this device · syncing…"
                  : "Synced to your account"}
            </Txt>
            {syncError && (
              <Pressable
                accessibilityRole="button"
                onPress={() => void refresh().catch(() => {})}
                className="min-h-11 justify-center px-2"
              >
                <Txt className="text-xs">Retry</Txt>
              </Pressable>
            )}
          </View>
        </View>
        <View className="mb-4 flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            onPress={() => setNotesOpen(true)}
            className="min-h-12 flex-1 flex-row items-center gap-2 rounded-2xl bg-panel px-4 py-3"
          >
            <MaterialCommunityIcons name="note-text-outline" color={C.ink} size={19} />
            <Txt className="flex-1 text-xs" numberOfLines={1}>
              {session.notes || "Workout notes"}
            </Txt>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start a rest timer"
            onPress={() => setRestOpen(true)}
            className="min-h-12 flex-row items-center gap-2 rounded-2xl bg-panel px-4 py-3"
          >
            <MaterialCommunityIcons name="timer-outline" color={C.ink} size={19} />
            <Txt className="text-xs">Rest timer</Txt>
          </Pressable>
        </View>
        {exercises.length ? (
          <Txt className="mb-4 text-xs leading-5 text-muted">
            Edit values as you go; they save automatically. Tap the circle to log a set. Tap a
            logged check to undo and edit it.
          </Txt>
        ) : (
          <View className="mb-5 items-center rounded-[26px] bg-panel px-6 py-8">
            <MaterialCommunityIcons name="dumbbell" size={38} color={C.ink} />
            <Txt weight="medium" className="mt-4 text-lg">
              Build today’s workout
            </Txt>
            <Txt className="mt-2 text-center text-sm leading-6 text-muted">
              Add exercises, record your sets, and keep your progress together here.
            </Txt>
          </View>
        )}
        {exercises.map((exercise) => {
          const sets = [...exercise.workout_logged_sets].sort((a, b) => a.position - b.position);

          return (
            <View key={exercise.id} className="mb-5 overflow-hidden rounded-[26px] bg-panel">
              <View className="flex-row items-center px-3 pb-3 pt-4">
                <Pressable
                  onPress={() => {
                    setFocusedExercise(exercise.id);
                    setCollapsed((rows) =>
                      rows.includes(exercise.id)
                        ? rows.filter((id) => id !== exercise.id)
                        : [...rows, exercise.id],
                    );
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: !collapsed.includes(exercise.id) }}
                  accessibilityLabel={`${exercise.exercise_name}, ${sets.filter((set) => !!set.completed_at).length} of ${sets.length} sets logged`}
                  className="min-w-0 flex-1 flex-row items-center"
                >
                  <ExerciseImage uri={exercise.image_url} name={exercise.exercise_name} />
                  <View className="ml-3 flex-1">
                    <Txt weight="semibold" className="text-lg" numberOfLines={2}>
                      {exercise.exercise_name}
                    </Txt>
                    <Txt className="mt-1 text-sm text-muted">
                      {sets.filter((set) => !!set.completed_at).length}/{sets.length} sets ·{" "}
                      {exercise.tracking_type === "reps"
                        ? "Bodyweight + optional load"
                        : exercise.tracking_type === "reps_weight"
                          ? "Weight & reps"
                          : "Timed exercise"}
                    </Txt>
                  </View>
                  <MaterialCommunityIcons
                    name={collapsed.includes(exercise.id) ? "chevron-down" : "chevron-up"}
                    size={26}
                    color={"white"}
                  />
                </Pressable>
                <Pressable
                  disabled={busy}
                  onPress={() => {
                    setFocusedExercise(exercise.id);
                    setExerciseMenu(exercise);
                  }}
                  accessibilityLabel={`Options for ${exercise.exercise_name}`}
                  className="ml-1 h-11 w-11 items-center justify-center"
                >
                  <MaterialCommunityIcons name="dots-horizontal" size={26} color={C.ink} />
                </Pressable>
              </View>

              {!collapsed.includes(exercise.id) && (
                <>
                  <View className="px-3">
                    {!!exercise.notes && (
                      <Txt className="mb-3 px-1 text-sm text-muted">{exercise.notes}</Txt>
                    )}
                    {sets.map((set, setIndex) => (
                      <SetRow
                        key={set.id}
                        set={set}
                        number={setIndex + 1}
                        restSeconds={exercise.rest_seconds}
                        trackingType={exercise.tracking_type}
                        exerciseId={exercise.id}
                        onFocus={setFocusedExercise}
                      />
                    ))}
                  </View>

                  <Pressable
                    onPress={() => {
                      setFocusedExercise(exercise.id);
                      void addSet(exercise.id).catch((error) =>
                        Alert.alert("Could not add set", error.message),
                      );
                    }}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={`Add set to ${exercise.exercise_name}`}
                    className="mx-3 mb-4 mt-2 flex-row items-center justify-center rounded-xl py-3"
                  >
                    <MaterialCommunityIcons name="plus" size={20} color={C.ink} />

                    <Txt weight="semibold" className="ml-2 text-ink">
                      ADD SET
                    </Txt>
                  </Pressable>
                </>
              )}
            </View>
          );
        })}

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => router.push("/workout/add-exercise")}
          className="mb-4 flex-row items-center justify-center rounded-2xl bg-ink py-5"
        >
          <MaterialCommunityIcons name="plus" size={22} color={C.bg} />

          <Txt weight="semibold" className="ml-2 text-bg">
            ADD EXERCISE
          </Txt>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={handleDiscard}
          className="items-center py-5"
        >
          <Txt weight="semibold" className="text-muted">
            Discard workout
          </Txt>
        </Pressable>
      </ScrollView>
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
          <Txt weight="medium" className="text-xl">
            {session.name}
          </Txt>
          <Txt className="mt-3 text-sm text-muted">
            {formatTime(Math.max(0, elapsed))} · {completedSets} logged sets ·{" "}
            {Math.round(volume).toLocaleString()} kg working volume
          </Txt>
          <Txt className="mt-4 text-sm leading-6 text-muted">
            {totalSets > completedSets
              ? `${totalSets - completedSets} unlogged set${totalSets - completedSets === 1 ? "" : "s"} will be left out of your results. `
              : "Every set is logged. "}
            Your completed sets and notes will be saved to history.
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
            className="mt-6 min-h-14 items-center justify-center rounded-full bg-ink"
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
    </View>
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
      <Txt className="mb-3 text-muted">
        Keep context for your whole session. These notes are saved with your workout.
      </Txt>
      <TextInput
        autoFocus
        multiline
        maxLength={2000}
        value={notes}
        onChangeText={setNotes}
        editable={!saving}
        placeholder="Energy, sleep, goals, technique reminders…"
        placeholderTextColor={C.muted}
        className="font-poppins-regular min-h-[150px] rounded-2xl bg-bg p-4 text-ink"
      />
      {!!error && <Txt className="mt-3 text-red-300">{error}</Txt>}
      <Pressable
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
        className="mt-5 items-center rounded-2xl bg-ink p-4"
      >
        <Txt weight="semibold" className="text-bg">
          {saving ? "Saving…" : "Save workout notes"}
        </Txt>
      </Pressable>
    </WorkoutDrawer>
  );
}
