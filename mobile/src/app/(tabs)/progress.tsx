import { Ionicons } from "@expo/vector-icons";

import { router } from "expo-router";

import { useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { ActivityCalendar } from "@/features/progress/components/activity-calendar";

import { MuscleBars } from "@/features/progress/components/muscle-bars";

import { RangeSelector } from "@/features/progress/components/range-selector";

import { RecentPRs } from "@/features/progress/components/recent-prs";

import { StrengthList } from "@/features/progress/components/strength-list";

import { SummaryStats } from "@/features/progress/components/summary-stats";

import { VolumeChart } from "@/features/progress/components/volume-chart";

import { WeeklyGoalCard } from "@/features/progress/components/weekly-goal-card";

import { useSyncProgressTimezone } from "@/features/progress/hooks";

import {
  useActivityCalendar,
  useProgressOverview,
} from "@/features/progress/queries";

import type { ProgressRange } from "@/features/progress/types";

export default function ProgressScreen() {
  const [range, setRange] = useState<ProgressRange>("12W");

  const overview = useProgressOverview(range);

  const calendar = useActivityCalendar(3);

  const timezone = useSyncProgressTimezone();

  if (overview.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#3B82F6" />
      </SafeAreaView>
    );
  }

  if (overview.isError || !overview.data) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="stats-chart-outline" size={32} color="#525252" />

          <Text className="mt-4 text-[17px] font-bold text-white">
            Couldn&apos;t load progress
          </Text>

          <Pressable
            onPress={() => {
              void overview.refetch();
            }}
            className="mt-5 rounded-2xl bg-brand px-5 py-3"
          >
            <Text className="font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const data = overview.data;

  const hasTraining = data.totals.workouts > 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 20,

          paddingBottom: 110,
        }}
      >
        <View className="flex-row items-center">
          <View className="flex-1">
            <Text className="text-[34px] font-extrabold tracking-[-1.4px] text-white">
              Progress
            </Text>

            <Text className="text-white/32 mt-2 text-[13px]">
              See what your training is actually doing.
            </Text>
          </View>

          <Pressable
            onPress={() => {
              router.push("/progress/personal-records");
            }}
            className="h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.045]"
          >
            <Ionicons name="trophy-outline" size={19} color="#FFFFFF" />
          </Pressable>
        </View>

        <View className="mt-7">
          <RangeSelector value={range} onChange={setRange} />
        </View>

        {!hasTraining ? (
          <View className="mt-14 items-center px-7">
            <View className="h-20 w-20 items-center justify-center rounded-[28px] bg-brand-muted">
              <Ionicons name="trending-up" size={32} color="#60A5FA" />
            </View>

            <Text className="mt-7 text-center text-[23px] font-extrabold tracking-[-0.6px] text-white">
              Your progress starts with your first workout.
            </Text>

            <Text className="mt-3 text-center text-[13px] leading-6 text-white/35">
              Strength trends, PRs, volume and consistency will appear here as
              you train.
            </Text>

            <Pressable
              onPress={() => {
                router.push("/train");
              }}
              className="mt-7 min-h-[54px] items-center justify-center rounded-2xl bg-brand px-7"
            >
              <Text className="text-[14px] font-extrabold text-white">
                Start Workout
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="mt-7">
              <WeeklyGoalCard
                goal={data.weekly_goal}
                updating={timezone.updating}
                onChangeTarget={timezone.updateTarget}
              />
            </View>

            <View className="mt-4">
              <SummaryStats totals={data.totals} unit={data.weight_unit} />
            </View>

            <View className="mt-9">
              <RecentPRs
                records={data.recent_prs}
                onPressExercise={(exerciseId) => {
                  router.push(`/progress/exercises/${exerciseId}`);
                }}
                onViewAll={() => {
                  router.push("/progress/personal-records");
                }}
              />
            </View>

            <View className="mt-9">
              <StrengthList
                items={data.top_exercises}
                unit={data.weight_unit}
                onPress={(exerciseId) => {
                  router.push(`/progress/exercises/${exerciseId}`);
                }}
              />
            </View>

            <View className="mt-9">
              <VolumeChart
                points={data.weekly_volume}
                unit={data.weight_unit}
              />
            </View>

            <View className="mt-9">
              <MuscleBars items={data.muscle_groups} />
            </View>

            <View className="mt-10">
              <ActivityCalendar items={calendar.data?.items ?? []} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
