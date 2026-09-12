import { Ionicons } from "@expo/vector-icons";

import { router, useLocalSearchParams } from "expo-router";

import { useMemo, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { LineChart } from "@/features/progress/components/line-chart";

import { RangeSelector } from "@/features/progress/components/range-selector";

import {
  useExerciseProgress,
  useExerciseProgressSessions,
} from "@/features/progress/queries";

import type { ProgressRange } from "@/features/progress/types";

import { prettifyEnum } from "@/features/progress/utils";

type Metric = "STRENGTH" | "WEIGHT" | "VOLUME";

export default function ExerciseProgressScreen() {
  const params = useLocalSearchParams<{
    exerciseId?: string;
  }>();

  const exerciseId =
    typeof params.exerciseId === "string" ? params.exerciseId : "";

  const [range, setRange] = useState<ProgressRange>("12W");

  const [metric, setMetric] = useState<Metric>("STRENGTH");

  const progress = useExerciseProgress(exerciseId, range);

  const sessions = useExerciseProgressSessions(exerciseId);

  const chartPoints = useMemo(() => {
    if (!progress.data) {
      return [];
    }

    return progress.data.points
      .map((point) => {
        const value =
          metric === "STRENGTH"
            ? point.best_estimated_1rm
            : metric === "WEIGHT"
              ? point.best_weight
              : point.volume;

        if (value === null) {
          return null;
        }

        return {
          id: point.workout_session_id,

          value,

          label: new Date(point.completed_at).toLocaleDateString(undefined, {
            month: "short",

            day: "numeric",
          }),
        };
      })
      .filter(
        (
          point,
        ): point is {
          id: string;

          value: number;

          label: string;
        } => point !== null,
      );
  }, [progress.data, metric]);

  if (progress.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#3B82F6" />
      </SafeAreaView>
    );
  }

  if (!progress.data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-white/50">Exercise progress unavailable.</Text>
      </SafeAreaView>
    );
  }

  const data = progress.data;

  const records = data.current_records;

  const sessionItems = sessions.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 90,
        }}
      >
        <View className="flex-row items-center px-5 pt-3">
          <Pressable
            onPress={router.back}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/[0.05]"
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </Pressable>

          <View className="ml-4 flex-1">
            <Text
              numberOfLines={1}
              className="text-[21px] font-extrabold text-white"
            >
              {data.exercise.name}
            </Text>

            <Text className="mt-1 text-[11px] text-white/30">
              {[...data.exercise.primary_muscles, ...data.exercise.equipment]
                .slice(0, 3)
                .map(prettifyEnum)
                .join(" · ")}
            </Text>
          </View>
        </View>

        <View className="px-5 pt-7">
          <View className="rounded-[26px] border border-white/[0.08] bg-white/[0.025] p-5">
            <Text className="text-[10px] font-bold uppercase tracking-[1.4px] text-white/25">
              Current best
            </Text>

            <View className="mt-5 flex-row">
              <Record
                label="Weight"
                value={
                  records.heaviest_weight !== null
                    ? `${records.heaviest_weight} ${data.weight_unit}`
                    : "—"
                }
              />

              <Record
                label="Est. 1RM"
                value={
                  records.best_estimated_1rm !== null
                    ? `${records.best_estimated_1rm} ${data.weight_unit}`
                    : "—"
                }
              />

              <Record
                label="Most Reps"
                value={
                  records.most_reps !== null ? String(records.most_reps) : "—"
                }
              />
            </View>
          </View>

          <View className="mt-6">
            <RangeSelector value={range} onChange={setRange} />
          </View>

          <View className="mt-5 flex-row rounded-xl bg-white/[0.04] p-1">
            {(
              [
                ["STRENGTH", "Strength"],
                ["WEIGHT", "Weight"],
                ["VOLUME", "Volume"],
              ] as const
            ).map((option) => {
              const selected = metric === option[0];

              return (
                <Pressable
                  key={option[0]}
                  onPress={() => {
                    setMetric(option[0]);
                  }}
                  className="min-h-[36px] flex-1 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: selected ? "#2563EB" : "transparent",
                  }}
                >
                  <Text
                    className="text-[11px] font-bold"
                    style={{
                      color: selected ? "#FFFFFF" : "rgba(255,255,255,.35)",
                    }}
                  >
                    {option[1]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-5 rounded-[24px] border border-white/[0.07] bg-white/[0.02] p-3">
            <LineChart
              points={chartPoints}
              suffix={
                metric === "VOLUME"
                  ? ` ${data.weight_unit}`
                  : ` ${data.weight_unit}`
              }
            />
          </View>

          <View className="mt-8 flex-row rounded-[24px] border border-white/[0.07] bg-white/[0.02] p-5">
            <Record
              label="Sessions"
              value={String(data.summary.session_count)}
            />

            <Record
              label="Working Sets"
              value={String(data.summary.working_set_count)}
            />

            <Record
              label="Volume"
              value={`${Math.round(
                data.summary.total_volume,
              ).toLocaleString()} ${data.weight_unit}`}
            />
          </View>

          <Text className="mt-9 text-[19px] font-extrabold text-white">
            Recent Sessions
          </Text>

          <View className="mt-4 gap-3">
            {sessionItems.map((session) => (
              <Pressable
                key={session.workout_session_id}
                onPress={() => {
                  router.push(`/workout-history/${session.workout_session_id}`);
                }}
                className="rounded-[22px] border border-white/[0.07] bg-white/[0.02] p-4"
              >
                <View className="flex-row">
                  <View className="flex-1">
                    <Text className="text-[14px] font-bold text-white">
                      {session.workout_name}
                    </Text>

                    <Text className="text-white/27 mt-1 text-[10px]">
                      {new Date(session.completed_at).toLocaleDateString(
                        undefined,
                        {
                          month: "short",

                          day: "numeric",

                          year: "numeric",
                        },
                      )}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color="rgba(255,255,255,.18)"
                  />
                </View>

                <View className="mt-4 gap-2">
                  {session.sets.map((set, index) => (
                    <View
                      key={`${session.workout_session_id}-${index}`}
                      className="flex-row"
                    >
                      <Text
                        className="w-8 text-[11px] font-bold"
                        style={{
                          color:
                            set.type === "WARMUP"
                              ? "#F59E0B"
                              : "rgba(255,255,255,.35)",
                        }}
                      >
                        {set.type === "WARMUP" ? "W" : index + 1}
                      </Text>

                      <Text className="flex-1 text-[12px] font-semibold text-white/55">
                        {set.weight !== null
                          ? `${set.weight} ${set.weight_unit}`
                          : "Bodyweight"}
                      </Text>

                      <Text className="w-16 text-right text-[12px] font-semibold text-white/55">
                        {set.reps !== null ? `${set.reps} reps` : "—"}
                      </Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            ))}
          </View>

          {sessions.hasNextPage ? (
            <Pressable
              onPress={() => {
                void sessions.fetchNextPage();
              }}
              className="mt-4 min-h-[48px] items-center justify-center rounded-2xl bg-white/[0.04]"
            >
              {sessions.isFetchingNextPage ? (
                <ActivityIndicator color="#3B82F6" />
              ) : (
                <Text className="text-[12px] font-bold text-white/55">
                  Load more
                </Text>
              )}
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Record({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <View className="flex-1">
      <Text className="text-white/22 text-[9px] font-bold uppercase tracking-[1px]">
        {label}
      </Text>

      <Text
        numberOfLines={1}
        className="mt-2 text-[14px] font-extrabold text-white"
      >
        {value}
      </Text>
    </View>
  );
}
