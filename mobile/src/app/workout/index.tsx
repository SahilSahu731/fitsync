import { useAppAlert } from "@/src/components/app-dialog";
import React, { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
  TextInput,
} from "react-native";

import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

import { useWorkout } from "@/src/features/workouts/workout-context";
import { MuscleFocus } from "@/src/features/workouts/components/muscle-focus";
import { WorkoutDrawer } from "@/src/features/workouts/components/workout-controls";
import { ExerciseImage } from "@/src/features/workouts/components/exercise-image";
import {
  TrainActions,
  ReorderTraining,
} from "@/src/features/workouts/components/train-actions";
import { type SessionExercise } from "@/src/features/workouts/api";
import { SetRow } from "@/src/features/workouts/components/set-row";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function LiveWorkoutScreen() {
  const Alert = useAppAlert();
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
  } = useWorkout();

  const [now, setNow] = useState(() => Date.now());
  const [focusedExercise, setFocusedExercise] = useState<string>();
  const [notesOpen, setNotesOpen] = useState(false);
  const [exerciseMenu, setExerciseMenu] = useState<SessionExercise | null>(
    null,
  );
  const [reordering, setReordering] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const exercises = useMemo(() => {
    return [...(session?.workout_session_exercises ?? [])].sort(
      (a, b) => a.position - b.position,
    );
  }, [session]);

  const elapsed = session
    ? Math.floor((now - new Date(session.started_at).getTime()) / 1000)
    : 0;

  const restRemaining = restTimer
    ? Math.max(0, Math.ceil((restTimer.endsAt - now) / 1000))
    : 0;

  const completedSets = exercises.reduce(
    (total, item) =>
      total +
      item.workout_logged_sets.filter((set) => set.completed_at !== null)
        .length,
    0,
  );

  const totalSets = exercises.reduce(
    (total, item) => total + item.workout_logged_sets.length,
    0,
  );

  const handleFinish = () => {
    Alert.alert(
      "Finish workout?",
      "Your completed sets will be saved to your history.",
      [
        { text: "Keep training", style: "cancel" },
        {
          text: "Finish",
          onPress: async () => {
            try {
              await finish();
              router.replace("/(tabs)/train");
            } catch (error) {
              Alert.alert(
                "Could not finish",
                error instanceof Error ? error.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const handleDiscard = () => {
    Alert.alert(
      "Discard workout?",
      "This workout will not appear in your completed history.",
      [
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
      ],
    );
  };

  const confirmRemove = (exercise: SessionExercise) => {
    const logged = exercise.workout_logged_sets.filter(
      (set) => set.completed_at,
    ).length;
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
        <ActivityIndicator color={C.brand} />
      </View>
    );
  }

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <MaterialCommunityIcons name="dumbbell" size={50} color={C.brand} />

        <Txt weight="bold" className="mt-5 text-2xl">
          No active workout
        </Txt>

        <Pressable
          onPress={() => router.replace("/(tabs)/train")}
          className="mt-6 rounded-2xl bg-brand px-8 py-4"
        >
          <Txt weight="bold" className="text-bg">
            GO TO WORKOUTS
          </Txt>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row items-center justify-between px-5 pb-4 pt-3">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full"
        >
          <MaterialCommunityIcons
            name="chevron-down"
            size={28}
            color={"white"}
          />
        </Pressable>

        <View className="items-center">
          <Txt weight="bold" className="text-[20px]">
            {session.name}
          </Txt>
        </View>
        <Txt weight="semibold" className="text-green-400">
          {formatTime(Math.max(0, elapsed))}
        </Txt>

        <Pressable
          onPress={handleFinish}
          disabled={busy || pendingSaves > 0}
          className="rounded-xl bg-white px-2 py-1"
        >
          <Txt weight="bold" className="text-lg text-bg">
            Finish
          </Txt>
        </Pressable>
      </View>

      <View className="mx-5 mb-3 flex-row items-center rounded-2xl bg-panel p-4">
        <View className="flex-1">
          <View className="flex-row justify-between">
            <Txt weight="medium" className="text-sm text-muted">
              Session Progress
            </Txt>
            <Txt weight="bold" className="text-green-400">
              {completedSets}/{totalSets}
            </Txt>
          </View>
          <View className="mt-3 h-2 overflow-hidden rounded-full bg-elevated">
            <View
              className="h-full rounded-full bg-green-400"
              style={{
                width: `${totalSets ? (completedSets / totalSets) * 100 : 0}%`,
              }}
            />
          </View>
          <Txt className="mt-3 text-sm text-white">
            {exercises.length} exercises ·{" "}
            {Math.round(
              exercises.reduce(
                (total, e) =>
                  total +
                  e.workout_logged_sets.reduce(
                    (sum, s) =>
                      sum +
                      (s.completed_at ? (s.weight_kg ?? 0) * (s.reps ?? 0) : 0),
                    0,
                  ),
                0,
              ),
            ).toLocaleString()}{" "}
            kg volume
          </Txt>
          <Txt className="mt-1 text-[12px] text-white">
            {pendingSaves
              ? `Saving ${pendingSaves} update${pendingSaves > 1 ? "s" : ""}…`
              : syncError
                ? "Some updates failed · retry the marked sets"
                : "Updates saved"}
          </Txt>
        </View>
        <MuscleFocus exercises={exercises} currentId={focusedExercise} />
      </View>
      <Pressable
        onPress={() => setNotesOpen(true)}
        className="mx-5 mb-4 flex-row items-center gap-2 rounded-xl bg-panel px-4 py-3"
      >
        <MaterialCommunityIcons
          name="note-text-outline"
          color={"white"}
          size={22}
        />
        <Txt className="flex-1 text-white" numberOfLines={1}>
          {session.notes || "Add workout notes · energy, goals, how you feel"}
        </Txt>
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={"white"}
        />
      </Pressable>

      {restRemaining > 0 && (
        <View className="mx-5 mb-4 flex-row items-center rounded-2xl bg-brand/10 p-4">
          <MaterialCommunityIcons
            name="timer-outline"
            size={28}
            color={"red"}
          />

          <View className="ml-3 flex-1">
            <Txt weight="semibold">Rest Timer</Txt>
            <Txt weight="extra" className="text-[26px] text-red-600">
              {formatTime(restRemaining)}
            </Txt>
          </View>

          <Pressable
            accessibilityLabel="Add thirty seconds rest"
            onPress={() => startRest(restRemaining + 30)}
            className="mr-2 rounded-xl bg-green-500/40 px-3 py-3"
          >
            <Txt>+30s</Txt>
          </Pressable>
          <Pressable
            onPress={stopRest}
            className="rounded-xl  bg-red-400/60 px-4 py-3"
          >
            <Txt weight="medium" className="text-sm">
              Skip
            </Txt>
          </Pressable>
        </View>
      )}

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 120,
        }}
      >
        <Txt className="mb-4 text-xs text-muted">
          Values are prefilled targets. Adjust to what you performed, then tap
          Log set to save. New sets reuse the previous set’s values.
        </Txt>
        {exercises.map((exercise) => {
          const sets = [...exercise.workout_logged_sets].sort(
            (a, b) => a.position - b.position,
          );

          return (
            <View
              key={exercise.id}
              className="mb-5 overflow-hidden rounded-[26px] bg-panel"
            >
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
                  accessibilityLabel={`Expand or collapse ${exercise.exercise_name}`}
                  className="min-w-0 flex-1 flex-row items-center"
                >
                  <ExerciseImage
                    uri={exercise.image_url}
                    name={exercise.exercise_name}
                  />
                  <View className="ml-3 flex-1">
                    <Txt weight="bold" className="text-lg" numberOfLines={2}>
                      {exercise.exercise_name}
                    </Txt>
                    <Txt className="mt-1 text-sm text-muted">
                      {sets.length} sets ·{" "}
                      {exercise.tracking_type === "reps"
                        ? "Bodyweight + optional load"
                        : exercise.tracking_type === "reps_weight"
                          ? "Weight & reps"
                          : "Timed exercise"}
                    </Txt>
                  </View>
                  <MaterialCommunityIcons
                    name={
                      collapsed.includes(exercise.id)
                        ? "chevron-down"
                        : "chevron-up"
                    }
                    size={26}
                    color={"white"}
                  />
                </Pressable>
                <Pressable
                  disabled={busy || pendingSaves > 0}
                  onPress={() => {
                    setFocusedExercise(exercise.id);
                    setExerciseMenu(exercise);
                  }}
                  accessibilityLabel={`Options for ${exercise.exercise_name}`}
                  className="ml-1 h-11 w-11 items-center justify-center"
                >
                  <MaterialCommunityIcons
                    name="dots-horizontal"
                    size={26}
                    color={C.ink}
                  />
                </Pressable>
              </View>

              {!collapsed.includes(exercise.id) && (
                <>
                  <View className="px-3">
                    {!!exercise.notes && <Txt className="mb-3 px-1 text-sm text-muted">{exercise.notes}</Txt>}
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
                    className="mx-3 mb-4 mt-2 flex-row items-center justify-center rounded-xl border border-dashed border-border py-3"
                  >
                    <MaterialCommunityIcons
                      name="plus"
                      size={20}
                      color={C.brand}
                    />

                    <Txt weight="semibold" className="ml-2 text-brand">
                      ADD SET
                    </Txt>
                  </Pressable>
                </>
              )}
            </View>
          );
        })}

        <Pressable
          onPress={() => router.push("/workout/add-exercise")}
          className="mb-4 flex-row items-center justify-center rounded-2xl bg-brand py-5"
        >
          <MaterialCommunityIcons name="plus" size={22} color={C.bg} />

          <Txt weight="bold" className="ml-2 text-bg">
            ADD EXERCISE
          </Txt>
        </Pressable>

        <Pressable onPress={handleDiscard} className="items-center py-5">
          <Txt weight="semibold" className="text-red-400">
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
        Keep context for your whole session. These notes are saved with your
        workout.
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
        className="min-h-[150px] rounded-2xl bg-bg p-4 text-ink"
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
        className="mt-5 items-center rounded-2xl bg-brand p-4"
      >
        <Txt weight="bold" className="text-bg">
          {saving ? "Saving…" : "Save workout notes"}
        </Txt>
      </Pressable>
    </WorkoutDrawer>
  );
}
