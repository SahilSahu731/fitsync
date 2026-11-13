import { TabScrollView } from "@/src/components/tab-bar-motion";
import React, { useMemo } from "react";
import { ActivityIndicator, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable, ProgressFill, ScreenEntrance } from "@/src/components/motion";
import { Txt, SectionHeading } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useSession } from "@/src/context/session";
import { useProgress } from "@/src/features/progress/use-progress";
import { buildProgress } from "@/src/features/progress/analytics";
import { addDays, dateLabel, latestMetrics, localDate } from "@/src/features/progress/model";
import { useWorkout } from "@/src/features/workouts/workout-context";
import { WorkoutSyncNotice } from "@/src/features/workouts/components/workout-sync-notice";
import { CoachHomeCard } from "@/src/features/coaching/home-card";
import { ActiveProgramCard } from "@/src/features/program-follow/active-program-card";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { session } = useWorkout();
  const progress = useProgress();
  const today = localDate();
  const firstName = user?.name.trim().split(/\s+/)[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const data = useMemo(
    () =>
      buildProgress(
        progress.journal.workouts,
        progress.journal.events,
        7,
        today,
        progress.goals.weeklyWorkouts,
      ),
    [progress.journal.workouts, progress.journal.events, progress.goals.weeklyWorkouts, today],
  );
  const currentWeek = data.weeks.at(-1)!;
  const daily = latestMetrics(progress.journal.events).filter((entry) => entry.date === today);
  const quickStats: { label: string; value: string; unit: string; icon: IconName }[] = [
    {
      label: "Steps today",
      value: daily.find((entry) => entry.metric === "steps")?.value?.toLocaleString() ?? "—",
      unit: "steps",
      icon: "shoe-print",
    },
    {
      label: "Sleep",
      value:
        daily
          .find((entry) => entry.metric === "sleep")
          ?.value?.toLocaleString(undefined, { maximumFractionDigits: 1 }) ?? "—",
      unit: "hours",
      icon: "weather-night",
    },
  ];
  return (
    <ScreenEntrance className="flex-1 bg-bg">
      <TabScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName={`w-full max-w-2xl self-center px-6 pt-6 ${session ? "pb-56" : "pb-44"}`}
        refreshControl={
          <RefreshControl
            refreshing={progress.refreshing && !progress.loading}
            onRefresh={() => void progress.refresh()}
            tintColor={C.ink}
          />
        }
      >
        <View className="mb-9 flex-row items-center justify-between gap-4">
          <View className="flex-1">
            <Txt weight="medium" className="text-[11px] tracking-[1.5px] text-muted">
              {dateLabel(today, { weekday: "long", month: "short", day: "numeric" }).toUpperCase()}
            </Txt>
            <Txt className="mt-5 text-sm text-muted">{greeting},</Txt>
            <Txt
              accessibilityRole="header"
              weight="medium"
              className="mt-1 text-[36px] leading-[44px] tracking-[-1.5px]"
            >
              {firstName}.
            </Txt>
          </View>
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel="Open your profile"
            onPress={() => router.push("/profile")}
            className="h-12 w-12 items-center justify-center rounded-full bg-panel"
          >
            <Txt weight="medium" className="text-lg">
              {firstName[0].toUpperCase()}
            </Txt>
          </MotionPressable>
        </View>
        <WorkoutSyncNotice />
        <ScreenEntrance delay={50}>
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel={session ? `Resume ${session.name}` : "Open your training"}
            onPress={() => router.push(session ? "/workout" : "/(tabs)/train")}
            className="overflow-hidden rounded-[30px] bg-panel p-7"
          >
            <View accessible={false} className="absolute -right-8 top-12 -rotate-12 opacity-5">
              <MaterialCommunityIcons name="dumbbell" size={230} color={C.ink} />
            </View>
            <View className="flex-row items-center gap-2">
              <View
                className={`h-1.5 w-1.5 rounded-full ${session ? "bg-brand" : "bg-white/50"}`}
              />
              <Txt weight="medium" className="text-[11px] tracking-[1.5px] text-muted">
                {session ? "READY WHEN YOU ARE" : "A MOMENT FOR YOURSELF"}
              </Txt>
            </View>
            <Txt
              weight="medium"
              className="mt-7 max-w-xs text-[32px] leading-[39px] tracking-[-1px]"
            >
              {session ? session.name : "A little time.\nAll yours."}
            </Txt>
            <Txt className="mt-4 max-w-[230px] text-sm leading-6 text-muted">
              {session
                ? "Your workout is right where you left it."
                : "Start with the next rep. We’ll keep the work you put in."}
            </Txt>
            <View className="mt-7 flex-row items-center justify-center gap-3 self-start rounded-full bg-brand px-5 py-3.5">
              <Txt weight="semibold" className="text-xs text-black">
                {session ? "Resume workout" : "Let’s train"}
              </Txt>
              <MaterialCommunityIcons name="arrow-top-right" size={18} color={C.bg} />
            </View>
          </MotionPressable>
        </ScreenEntrance>
        <ScreenEntrance delay={100} className="mt-9">
          <SectionHeading
            title="Your week"
            action="Calendar"
            onAction={() => router.push("/calendar")}
          />
          <View className="rounded-[28px] bg-panel p-6">
            <View className="flex-row items-end justify-between gap-4">
              <View>
                <Txt weight="medium" className="text-[42px] leading-[50px] tracking-[-1.5px]">
                  {progress.loading ? "—" : currentWeek.workouts}
                  <Txt className="text-xl text-muted"> / {progress.goals.weeklyWorkouts}</Txt>
                </Txt>
                <Txt className="mt-1 text-xs text-muted">Sessions completed</Txt>
              </View>
              <View className="items-end pb-1">
                <Txt weight="medium" className="text-xl">
                  {progress.loading ? "—" : currentWeek.minutes}
                  <Txt className="text-xs text-muted"> min</Txt>
                </Txt>
                <Txt className="mt-1 text-[11px] text-muted">Time for you</Txt>
              </View>
            </View>
            <View className="mt-5">
              <ProgressFill
                ratio={currentWeek.workouts / Math.max(1, progress.goals.weeklyWorkouts)}
                color={C.ink}
                height={4}
              />
            </View>
            <View className="mt-6 flex-row justify-between gap-1">
              {Array.from({ length: 7 }, (_, index) => addDays(currentWeek.date, index)).map(
                (date) => {
                  const count = data.calendar.find((day) => day.date === date)?.workouts ?? 0;
                  return (
                    <View key={date} className={`items-center ${date > today ? "opacity-40" : ""}`}>
                      <Txt className="mb-2 text-[11px] text-muted">
                        {dateLabel(date, { weekday: "narrow" })}
                      </Txt>
                      <View
                        className={`h-8 w-8 items-center justify-center rounded-full ${count ? "bg-ink" : date === today ? "bg-elevated" : "bg-white/5"}`}
                      >
                        <MaterialCommunityIcons
                          name={count ? "check" : "minus"}
                          size={14}
                          color={count ? C.bg : C.muted}
                        />
                      </View>
                    </View>
                  );
                },
              )}
            </View>
          </View>
        </ScreenEntrance>
        <ScreenEntrance delay={150} className="mt-9">
          <SectionHeading title="A little direction" />
          <CoachHomeCard />
          <ActiveProgramCard />
        </ScreenEntrance>
        {progress.loading && (
          <View className="mt-4 flex-row items-center gap-2">
            <ActivityIndicator size="small" color={C.ink} />
            <Txt className="text-xs text-muted">Opening your dashboard…</Txt>
          </View>
        )}
        {!!(progress.syncError || progress.workoutError || progress.storageError) && (
          <MotionPressable
            accessibilityRole="button"
            onPress={() => void progress.refresh()}
            className="mt-4 flex-row items-center gap-3 rounded-2xl bg-panel p-4"
          >
            <MaterialCommunityIcons name="cloud-off-outline" size={20} color={C.muted} />
            <Txt className="flex-1 text-xs leading-5 text-muted">
              {progress.storageError
                ? "Could not open saved progress. Tap to retry."
                : "Showing saved data. Tap to refresh your progress."}
            </Txt>
          </MotionPressable>
        )}
        <ScreenEntrance delay={180} className="mt-9">
          <SectionHeading
            title="Your daily picture"
            action="Check in"
            onAction={() => router.push("/(tabs)/progress")}
          />
          <View className="flex-row gap-3">
            {quickStats.map((stat) => (
              <MotionPressable
                key={stat.label}
                accessibilityRole="button"
                onPress={() => router.push("/(tabs)/progress")}
                className="min-w-0 flex-1 rounded-[24px] bg-panel p-5"
              >
                <MaterialCommunityIcons name={stat.icon} size={23} color={C.muted} />
                <Txt
                  weight="medium"
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  className="mt-6 text-[28px] tracking-[-1px]"
                >
                  {stat.value}
                </Txt>
                <Txt className="mt-1 text-[11px] text-muted">
                  {stat.unit} · {stat.label}
                </Txt>
              </MotionPressable>
            ))}
          </View>
        </ScreenEntrance>
        <ScreenEntrance delay={220} className="mt-9">
          <SectionHeading title="Make it your own" />
          <View className="gap-3">
            {[
              {
                label: "Find your next movement",
                subtitle: "Exercises, mobility and a little know-how",
                icon: "bookshelf" as const,
                route: "/(tabs)/library" as const,
              },
              {
                label: "See how far you’ve come",
                subtitle: "Your training, health and everyday progress",
                icon: "chart-areaspline" as const,
                route: "/(tabs)/progress" as const,
              },
            ].map((item) => (
              <MotionPressable
                key={item.label}
                accessibilityRole="button"
                onPress={() => router.push(item.route)}
                className="flex-row items-center gap-4 rounded-[24px] bg-panel p-5"
              >
                <MaterialCommunityIcons name={item.icon} size={24} color={C.muted} />
                <View className="flex-1">
                  <Txt weight="medium" className="text-sm">
                    {item.label}
                  </Txt>
                  <Txt className="mt-2 text-xs leading-5 text-muted">{item.subtitle}</Txt>
                </View>
                <MaterialCommunityIcons name="arrow-top-right" size={19} color={C.muted} />
              </MotionPressable>
            ))}
          </View>
        </ScreenEntrance>
        <Txt className="mt-10 text-center text-[11px] text-muted">A little more in sync.</Txt>
      </TabScrollView>
    </ScreenEntrance>
  );
}
