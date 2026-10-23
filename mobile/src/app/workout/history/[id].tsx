import React, { useEffect, useMemo, useState } from "react";

import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

import {
  workoutApi,
  type SetType,
  type WorkoutSession,
} from "@/src/features/workouts/api";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const GREEN = "#4ADE80";
const BLUE = "#60A5FA";
const GOLD = "#FACC15";

const SET_STYLE: Record<SetType, { label: string; color: string }> = {
  normal: { label: "Working", color: C.muted },
  warmup: { label: "Warm-up", color: GOLD },
  heavy: { label: "Heavy", color: "#F87171" },
  failure: { label: "Failure", color: "#FB7185" },
  drop: { label: "Drop", color: BLUE },
};

function formatDuration(seconds: number | null | undefined) {
  const total = Math.max(0, seconds ?? 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

function formatVolume(kg: number) {
  const rounded = Math.round(kg);
  return rounded >= 10000
    ? `${(rounded / 1000).toFixed(1)}t`
    : `${rounded.toLocaleString()} kg`;
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

      <Txt weight="extra" className="mt-3 text-xl" numberOfLines={1}>
        {value}
      </Txt>

      <Txt className="mt-0.5 text-[10px] tracking-wider text-muted">
        {label}
      </Txt>
    </View>
  );
}

export default function WorkoutHistoryDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;

    setError(false);
    workoutApi
      .session(id)
      .then(setSession)
      .catch((e) => {
        console.warn(e);
        setError(true);
      });
  }, [id]);

  const { exercises, stats } = useMemo(() => {
    const rows = [...(session?.workout_session_exercises ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((exercise) => {
        const sets = [...exercise.workout_logged_sets]
          .filter((set) => Boolean(set.completed_at))
          .sort((a, b) => a.position - b.position);

        const volume = sets.reduce(
          (total, set) => total + (set.weight_kg ?? 0) * (set.reps ?? 0),
          0,
        );

        // Best set = highest weight × reps (only if there is any weight)
        let bestId: string | null = null;
        let bestScore = 0;
        for (const set of sets) {
          const score = (set.weight_kg ?? 0) * (set.reps ?? 0);
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
  }, [session]);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-8">
        <MaterialCommunityIcons
          name="cloud-off-outline"
          size={44}
          color={C.muted}
        />
        <Txt weight="bold" className="mt-4 text-lg">
          Could not load workout
        </Txt>
        <Pressable
          onPress={() => router.back()}
          className="mt-5 rounded-full bg-brand px-6 py-3"
        >
          <Txt weight="bold" className="text-bg">
            Go back
          </Txt>
        </Pressable>
      </View>
    );
  }

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={C.brand} />
      </View>
    );
  }

  const started = new Date(session.started_at);

  return (
    <ScrollView
      className="flex-1 bg-bg"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 22, paddingBottom: 80 }}
    >
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        className="mb-6 h-11 w-11 items-center justify-center rounded-full bg-panel"
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color={C.ink} />
      </Pressable>

      {/* Header */}
      <View className="overflow-hidden rounded-[28px] bg-brand/10 p-6">
        <MaterialCommunityIcons
          name="trophy"
          size={150}
          color={C.brand}
          style={{
            position: "absolute",
            right: -20,
            top: -14,
            opacity: 0.12,
            transform: [{ rotate: "12deg" }],
          }}
        />

        <View className="flex-row items-center self-start rounded-full bg-green-500/15 px-3 py-1.5">
          <MaterialCommunityIcons name="check-circle" size={14} color={GREEN} />
          <Txt weight="semibold" className="ml-1.5 text-xs text-green-400">
            Workout complete
          </Txt>
        </View>

        <Txt weight="bold" className="mt-4 text-[32px] leading-10">
          {session.name}
        </Txt>

        <View className="mt-3 flex-row flex-wrap items-center">
          <MaterialCommunityIcons
            name="calendar-month-outline"
            size={18}
            color={"white"}
          />
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
            color={"green"}
            style={{ marginLeft: 10, width:20 }}
          />
          <Txt className="ml-1.5 text-lg text-green-500">
            {started.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </Txt>
        </View>
      </View>

      {/* Stats */}
      <View className="my-4 flex-row gap-3">
        <StatTile
          icon="timer-outline"
          color={C.brand}
          label="DURATION"
          value={formatDuration(session.elapsed_seconds)}
        />
        <StatTile
          icon="layers-triple-outline"
          color={BLUE}
          label="SETS"
          value={String(stats.sets)}
        />
        <StatTile
          icon="weight-kilogram"
          color={GREEN}
          label="VOLUME"
          value={formatVolume(stats.volume)}
        />
      </View>

      {/* Exercises */}
      <View className="mb-3 mt-3 flex-row items-center justify-between">
        <Txt weight="bold" className="text-[20px]">
          Exercises
        </Txt>
        <Txt className="text-sm text-muted">{stats.exercises} done</Txt>
      </View>

      {exercises.length === 0 ? (
        <View className="items-center rounded-[22px] border border-dashed border-border p-8">
          <MaterialCommunityIcons name="dumbbell" size={34} color={C.muted} />
          <Txt className="mt-3 text-sm text-muted">
            No completed sets were logged in this workout.
          </Txt>
        </View>
      ) : (
        exercises.map(({ exercise, sets, volume, bestId }, exerciseIndex) => {
          let working = 0;

          return (
            <View
              key={exercise.id}
              className="mb-4 overflow-hidden rounded-[22px] bg-panel"
            >
              {/* Exercise header */}
              <View className="flex-row items-center p-4">
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand/15">
                  <Txt weight="bold" className="text-brand">
                    {exerciseIndex + 1}
                  </Txt>
                </View>

                <View className="ml-3 flex-1">
                  <Txt weight="bold" className="text-[16px]" numberOfLines={2}>
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
                <Txt className="w-24 text-[10px] tracking-wider text-muted">
                  SET
                </Txt>
                <Txt className="flex-1 text-right text-[10px] tracking-wider text-muted">
                  WEIGHT × REPS
                </Txt>
              </View>

              {/* Sets */}
              {sets.map((set, index) => {
                const type = set.set_type ?? "normal";
                const style = SET_STYLE[type];
                if (type === "normal") working += 1;
                const isBest = set.id === bestId && sets.length > 1;

                return (
                  <View
                    key={set.id}
                    className={`flex-row items-center px-4 py-3 ${
                      index === sets.length - 1 ? "" : "border-b border-border"
                    }`}
                  >
                    <View className="w-24 flex-row items-center">
                      <View
                        className="h-7 min-w-[28px] items-center justify-center rounded-lg px-1.5"
                        style={{ backgroundColor: `${style.color}26` }}
                      >
                        <Txt
                          weight="bold"
                          className="text-xs"
                          style={{ color: style.color }}
                        >
                          {type === "normal" ? working : style.label.charAt(0)}
                        </Txt>
                      </View>

                      {type !== "normal" ? (
                        <Txt
                          className="ml-2 text-xs"
                          style={{ color: style.color }}
                        >
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

                      <Txt weight="semibold" className="text-[15px]">
                        {set.weight_kg ?? "—"}
                        <Txt className="text-xs text-muted"> kg </Txt>
                        <Txt className="text-muted">× </Txt>
                        {set.reps ?? "—"}
                      </Txt>
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
