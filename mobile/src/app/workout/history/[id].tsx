import React, { useCallback, useEffect, useMemo, useState } from "react";

import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useWorkout } from "@/src/features/workouts/workout-context";
import { workingSetVolume } from "@/src/features/workouts/summary";
import { setAppearance } from "@/src/features/workouts/set-types";
import { WorkoutSyncNotice } from "@/src/features/workouts/components/workout-sync-notice";
import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

import { workoutApi, type WorkoutSession } from "@/src/features/workouts/api";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const GREEN = "#B8B8B8";
const BLUE = "#9C9C9C";
const GOLD = "#C9C9C9";

function formatDuration(seconds: number | null | undefined) {
  const total = Math.max(0, seconds ?? 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

function formatVolume(kg: number) {
  const rounded = Math.round(kg);
  return rounded >= 10000 ? `${(rounded / 1000).toFixed(1)}t` : `${rounded.toLocaleString()} kg`;
}

function StatTile({
  icon,
  color,
  label,
  value,
}: {
  icon: IconName;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 rounded-[20px] bg-panel p-4">
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}26` }}
      >
        <MaterialCommunityIcons name={icon} size={19} color={color} />
      </View>

      <Txt weight="semibold" className="mt-3 text-xl" numberOfLines={1}>
        {value}
      </Txt>

      <Txt className="mt-0.5 text-[11px] tracking-wider text-muted">{label}</Txt>
    </View>
  );
}

export default function WorkoutHistoryDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { completedWorkout, pendingCompletion, dataRevision } = useWorkout();
  const [attempt, setAttempt] = useState(0);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [error, setError] = useState(false);

  const localSession = completedWorkout?.id === id ? completedWorkout : null;
  const displayedSession = localSession ?? (session?.id === id ? session : null);
  const hasLocalSession = !!localSession;
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    if (!id) return;
    let active = true;
    void workoutApi
      .session(id)
      .then((value) => {
        if (active && value.status === "completed") {
          setError(false);
          setSession(value);
        } else if (active && !hasLocalSession) setError(true);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [id, dataRevision, pendingCompletion, attempt, hasLocalSession]);

  const { exercises, stats } = useMemo(() => {
    const rows = [...(displayedSession?.workout_session_exercises ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((exercise) => {
        const sets = [...exercise.workout_logged_sets]
          .filter((set) => Boolean(set.completed_at))
          .sort((a, b) => a.position - b.position);

        const volume = sets.reduce(
          (total, set) => total + workingSetVolume(set, exercise.tracking_type),
          0,
        );

        // Best set = highest weight × reps (only if there is any weight)
        let bestId: string | null = null;
        let bestScore = 0;
        for (const set of sets) {
          const score = workingSetVolume(set, exercise.tracking_type);
          if (score > bestScore) {
            bestScore = score;
            bestId = set.id;
          }
        }

        return { exercise, sets, volume, bestId };
      })
      // Hide exercises where nothing was completed
      .filter((row) => row.sets.length > 0);

    return {
      exercises: rows,
      stats: {
        exercises: rows.length,
        sets: rows.reduce((total, row) => total + row.sets.length, 0),
        volume: rows.reduce((total, row) => total + row.volume, 0),
      },
    };
  }, [displayedSession]);

  if (error && !displayedSession) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-8">
        <MaterialCommunityIcons name="cloud-off-outline" size={44} color={C.muted} />
        <Txt weight="semibold" className="mt-4 text-lg">
          Could not load workout
        </Txt>
        <Pressable onPress={retry} className="mt-5 rounded-full bg-ink px-6 py-3">
          <Txt weight="semibold" className="text-bg">
            Try again
          </Txt>
        </Pressable>
      </View>
    );
  }

  if (!displayedSession) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={C.ink} />
      </View>
    );
  }

  const workout = displayedSession;
  const started = new Date(workout.started_at);

  return (
    <ScrollView
      className="flex-1 bg-bg"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 22, paddingBottom: 80 }}
    >
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/train"))}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        className="mb-6 h-11 w-11 items-center justify-center rounded-full bg-panel"
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color={C.ink} />
      </Pressable>

      {pendingCompletion && localSession && <WorkoutSyncNotice />}
      {/* Header */}
      <View className="overflow-hidden rounded-[28px] bg-white/5 p-6">
        <MaterialCommunityIcons
          name="trophy"
          size={150}
          color={C.ink}
          style={{
            position: "absolute",
            right: -20,
            top: -14,
            opacity: 0.12,
            transform: [{ rotate: "12deg" }],
          }}
        />

        <View className="flex-row items-center self-start rounded-full bg-ink/15 px-3 py-1.5">
          <MaterialCommunityIcons name="check-circle" size={14} color={GREEN} />
          <Txt weight="semibold" className="ml-1.5 text-xs text-green-400">
            {pendingCompletion && localSession ? "Saved on this device" : "Workout complete"}
          </Txt>
        </View>

        <Txt weight="semibold" className="mt-4 text-[32px] leading-10">
          {workout.name}
        </Txt>

        <View className="mt-3 flex-row flex-wrap items-center">
          <MaterialCommunityIcons name="calendar-month-outline" size={18} color={C.muted} />
          <Txt className="ml-1.5 text-lg text-white">
            {started.toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Txt>

          <MaterialCommunityIcons
            name="clock-outline"
            size={18}
            color={C.muted}
            style={{ marginLeft: 10, width: 20 }}
          />
          <Txt className="ml-1.5 text-lg text-ink">
            {started.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </Txt>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace("/(tabs)/train")}
        className="mt-4 min-h-12 items-center justify-center rounded-full bg-ink"
      >
        <Txt weight="semibold" className="text-sm text-bg">
          Back to Train
        </Txt>
      </Pressable>
      {/* Stats */}
      <View className="my-4 flex-row gap-3">
        <StatTile
          icon="timer-outline"
          color={C.ink}
          label="DURATION"
          value={formatDuration(workout.elapsed_seconds)}
        />
        <StatTile
          icon="layers-triple-outline"
          color={BLUE}
          label="LOGGED SETS"
          value={String(stats.sets)}
        />
        <StatTile
          icon="weight-kilogram"
          color={GREEN}
          label="WORKING VOLUME"
          value={formatVolume(stats.volume)}
        />
      </View>

      {!!workout.notes && (
        <View className="mb-5 rounded-2xl bg-panel p-4">
          <Txt weight="semibold">Workout notes</Txt>
          <Txt className="mt-2 text-muted">{workout.notes}</Txt>
        </View>
      )}
      {/* Exercises */}
      <View className="mb-3 mt-3 flex-row items-center justify-between">
        <Txt weight="semibold" className="text-[20px]">
          Exercises
        </Txt>
        <Txt className="text-sm text-muted">{stats.exercises} done</Txt>
      </View>

      {exercises.length === 0 ? (
        <View className="items-center rounded-[22px] p-8">
          <MaterialCommunityIcons name="dumbbell" size={34} color={C.muted} />
          <Txt className="mt-3 text-sm text-muted">
            No completed sets were logged in this workout.
          </Txt>
        </View>
      ) : (
        exercises.map(({ exercise, sets, volume, bestId }, exerciseIndex) => {
          let working = 0;

          return (
            <View key={exercise.id} className="mb-4 overflow-hidden rounded-[22px] bg-panel">
              {/* Exercise header */}
              <View className="flex-row items-center p-4">
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                  <Txt weight="semibold" className="text-ink">
                    {exerciseIndex + 1}
                  </Txt>
                </View>

                <View className="ml-3 flex-1">
                  <Txt weight="semibold" className="text-[16px]" numberOfLines={2}>
                    {exercise.exercise_name}
                  </Txt>
                  <Txt className="mt-0.5 text-xs text-muted">
                    {sets.length} {sets.length === 1 ? "set" : "sets"}
                    {volume > 0 ? ` · ${formatVolume(volume)}` : ""}
                  </Txt>
                </View>
              </View>

              {/* Column labels */}
              <View className="flex-row bg-elevated/60 px-4 py-2">
                <Txt className="w-24 text-[11px] tracking-wider text-muted">SET</Txt>
                <Txt className="flex-1 text-right text-[11px] tracking-wider text-muted">
                  LOGGED PERFORMANCE
                </Txt>
              </View>

              {/* Sets */}
              {sets.map((set, index) => {
                const type = set.set_type ?? "normal";
                const style = setAppearance(type);
                if (type === "normal") working += 1;
                const isBest = set.id === bestId && sets.length > 1;

                return (
                  <View
                    key={set.id}
                    className={`flex-row items-center px-4 py-3 ${
                      index === sets.length - 1 ? "" : " "
                    }`}
                  >
                    <View className="w-24 flex-row items-center">
                      <View
                        className="h-7 min-w-[28px] items-center justify-center rounded-lg px-1.5"
                        style={{ backgroundColor: `${style.color}26` }}
                      >
                        <Txt weight="semibold" className="text-xs" style={{ color: style.color }}>
                          {type === "normal" ? working : style.label.charAt(0)}
                        </Txt>
                      </View>

                      {type !== "normal" ? (
                        <Txt className="ml-2 text-xs" style={{ color: style.color }}>
                          {style.label}
                        </Txt>
                      ) : null}
                    </View>

                    <View className="flex-1 flex-row items-center justify-end">
                      {isBest ? (
                        <MaterialCommunityIcons
                          name="trophy"
                          size={16}
                          color={GOLD}
                          style={{ marginRight: 8 }}
                        />
                      ) : null}

                      <View className="flex-1 items-end">
                        <Txt weight="semibold" className="text-[15px]">
                          {exercise.tracking_type === "duration"
                            ? `${set.duration_seconds ?? "—"} sec`
                            : exercise.tracking_type === "distance_duration"
                              ? `${set.distance_meters ?? "—"} m · ${set.duration_seconds ?? "—"} sec`
                              : exercise.tracking_type === "reps"
                                ? `${set.reps ?? "—"} reps${set.weight_kg ? ` · +${set.weight_kg} kg` : ""}`
                                : `${set.weight_kg ?? "—"} kg × ${set.reps ?? "—"}`}
                        </Txt>
                        {(set.rpe !== null || set.rir !== null) && (
                          <Txt className="mt-1 text-xs text-muted">
                            {[
                              set.rpe != null ? `RPE ${set.rpe}` : "",
                              set.rir != null ? `RIR ${set.rir}` : "",
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </Txt>
                        )}
                        {!!set.notes && (
                          <Txt className="mt-2 text-right text-xs text-muted">{set.notes}</Txt>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
