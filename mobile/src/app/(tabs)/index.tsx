import { WorkoutSyncNotice } from "@/src/features/workouts/components/workout-sync-notice";
import { CoachHomeCard } from "@/src/features/coaching/home-card";
import React, { useMemo } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable, OrbitAccent, ProgressFill, ScreenEntrance } from "@/src/components/motion";
import { Txt, SectionHeading } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useSession } from "@/src/context/session";
import { useProgress } from "@/src/features/progress/use-progress";
import { buildProgress } from "@/src/features/progress/analytics";
import { addDays, dateLabel, latestMetrics, localDate } from "@/src/features/progress/model";
import { useWorkout } from "@/src/features/workouts/workout-context";
import { ActiveProgramCard } from "@/src/features/program-follow/active-program-card";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const { user } = useSession();
  const { session } = useWorkout();
  const progress = useProgress();
  const today = localDate();
  const firstName = user?.name.trim().split(/\s+/)[0] || "Athlete";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const data = useMemo(() => buildProgress(progress.journal.workouts, progress.journal.events, 7, today, progress.goals.weeklyWorkouts), [progress.journal.workouts, progress.journal.events, progress.goals.weeklyWorkouts, today]);
  const currentWeek = data.weeks.at(-1)!;
  const daily = latestMetrics(progress.journal.events).filter(entry => entry.date === today);
  const steps = daily.find(entry => entry.metric === "steps")?.value;
  const sleep = daily.find(entry => entry.metric === "sleep")?.value;
  const quickStats: { label: string; value: string; unit: string; icon: IconName }[] = [
    { label: "Steps today", value: steps == null ? "—" : steps.toLocaleString(), unit: "steps", icon: "shoe-print" },
    { label: "Last night’s sleep", value: sleep == null ? "—" : sleep.toLocaleString(undefined, { maximumFractionDigits: 1 }), unit: "hours", icon: "weather-night" },
  ];

  return <ScreenEntrance style={{ flex: 1 }}>
    <ScrollView className="flex-1 bg-bg" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: compact ? 16 : 24, paddingTop: Math.max(insets.top, 20) + 12, paddingBottom: insets.bottom + (session ? 210 : 150), maxWidth: 720, width: "100%", alignSelf: "center" }} refreshControl={<RefreshControl refreshing={progress.refreshing && !progress.loading} onRefresh={() => void progress.refresh()} tintColor={C.brand} />}>
      <View className="mb-6 flex-row items-center justify-between gap-3"><View className="flex-1"><Txt weight="semibold" className="mb-2 text-[10px] tracking-[3px] text-brand">YOUR DAILY MOMENTUM</Txt><Txt className="text-sm text-muted">{greeting}</Txt><Txt accessibilityRole="header" weight="semibold" className="mt-1 text-[32px] tracking-tight">{firstName}</Txt></View><MotionPressable accessibilityRole="button" accessibilityLabel="Open your profile" onPress={() => router.push("/(tabs)/profile")} className="h-12 w-12 items-center justify-center rounded-full bg-panel"><MaterialCommunityIcons name="account-circle-outline" size={30} color={C.ink} /></MotionPressable></View>
      <WorkoutSyncNotice />
      <ScreenEntrance delay={60}>
      <MotionPressable accessibilityRole="button" onPress={() => router.push(session ? "/workout" : "/(tabs)/train")} className="overflow-hidden rounded-[28px] bg-brand" style={{ shadowColor: C.brand, shadowOpacity: 0.16, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 4 }}>
        <LinearGradient colors={["#83E6CE", C.brand, "#2BA990"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 26 }}>
        <OrbitAccent />
        <MaterialCommunityIcons name="dumbbell" size={170} color={C.bg} style={{ position: "absolute", right: -28, bottom: -34, opacity: 0.1, transform: [{ rotate: "-18deg" }] }} />
        <View className="mb-4 flex-row items-center gap-2"><MaterialCommunityIcons name={session ? "play-circle-outline" : "lightning-bolt-outline"} size={18} color={C.bg} /><Txt weight="semibold" className="text-xs text-bg">{session ? "WORKOUT IN PROGRESS" : "MAKE TIME FOR YOU"}</Txt></View>
        <Txt weight="bold" className="max-w-[240px] text-[30px] leading-9 text-bg">{session ? session.name : "Your next session\nstarts here."}</Txt>
        <Txt className="mt-3 max-w-[230px] text-sm leading-5 text-bg/75">{session ? "Pick up where you left off." : "Open your routines or start a new workout."}</Txt>
        <View className="mt-6 flex-row items-center self-start gap-2 rounded-full bg-bg px-5 py-3"><MaterialCommunityIcons name="play" size={18} color={C.ink} /><Txt weight="semibold" className="text-sm">{session ? "Resume workout" : "Let’s train"}</Txt></View>
        </LinearGradient>
      </MotionPressable>
      </ScreenEntrance>
      <ScreenEntrance delay={130} style={{ marginTop: 28 }}><SectionHeading title="This week" action="Progress" onAction={() => router.push("/(tabs)/progress")} />
        <View className="rounded-[24px] border border-border bg-panel p-5">
          <View className="flex-row items-end justify-between"><View><Txt weight="bold" className="text-[34px]">{progress.loading ? "—" : currentWeek.workouts}<Txt className="text-lg text-muted"> / {progress.goals.weeklyWorkouts}</Txt></Txt><Txt className="mt-1 text-xs text-muted">Workouts completed</Txt></View><View className="items-end"><Txt weight="semibold" className="text-lg">{progress.loading ? "—" : currentWeek.minutes}<Txt className="text-xs text-muted"> min</Txt></Txt><Txt className="mt-1 text-xs text-muted">Training time</Txt></View></View>
          <View className="mt-4"><ProgressFill ratio={currentWeek.workouts / progress.goals.weeklyWorkouts} color={C.brand} height={7} /></View>
          <View className="mt-5 flex-row justify-between">{Array.from({ length: 7 }, (_, index) => addDays(currentWeek.date, index)).map(date => {
            const count = data.calendar.find(day => day.date === date)?.workouts ?? 0;
            const future = date > today;
            return <View key={date} className="items-center"><Txt className="mb-2 text-[11px] text-muted">{dateLabel(date, { weekday: "narrow" })}</Txt><View style={{ width: compact ? 30 : 36, height: compact ? 30 : 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: count ? C.brand : C.elevated, opacity: future ? 0.35 : 1, borderWidth: date === today ? 1 : 0, borderColor: C.brand }}><MaterialCommunityIcons name={count ? "check" : "minus"} size={16} color={count ? C.bg : C.muted} /></View></View>;
          })}</View>
        </View>
      </ScreenEntrance>
      <ScreenEntrance delay={200} style={{ marginTop: 28 }}><SectionHeading title="Your training" /><CoachHomeCard /><ActiveProgramCard /></ScreenEntrance>
      {progress.loading && <View className="mt-4 flex-row items-center gap-2"><ActivityIndicator size="small" color={C.brand} /><Txt className="text-xs text-muted">Opening your dashboard…</Txt></View>}
      {!!(progress.syncError || progress.workoutError || progress.storageError) && <MotionPressable accessibilityRole="button" onPress={() => void progress.refresh()} className="mt-4 flex-row items-center gap-2 rounded-2xl bg-panel p-4"><MaterialCommunityIcons name="cloud-off-outline" size={19} color={C.muted} /><Txt className="flex-1 text-xs leading-5 text-muted">{progress.storageError ? "Could not open your saved progress. Tap to retry." : "Could not refresh all progress. Showing saved data. Tap to retry."}</Txt></MotionPressable>}
      <ScreenEntrance delay={260} style={{ marginTop: 28 }}><SectionHeading title="Daily check-in" action="View all" onAction={() => router.push("/(tabs)/progress")} /><View className="flex-row gap-3">{quickStats.map(stat => <MotionPressable key={stat.label} accessibilityRole="button" onPress={() => router.push("/(tabs)/progress")} className="flex-1 rounded-[22px] border border-border bg-panel p-4"><MaterialCommunityIcons name={stat.icon} size={24} color={C.brand} /><Txt weight="bold" className="mt-4 text-[28px]">{stat.value}<Txt className="text-xs text-muted"> {stat.unit}</Txt></Txt><Txt className="mt-1 text-xs text-muted">{stat.label}</Txt></MotionPressable>)}</View></ScreenEntrance>
      <ScreenEntrance delay={320} style={{ marginTop: 28 }}><SectionHeading title="Explore more" /><View className="flex-row gap-3">{[{ label: "Library", subtitle: "Programs & guidance", icon: "bookshelf" as const, route: "/(tabs)/library" as const }, { label: "Progress", subtitle: "Your activity & trends", icon: "chart-areaspline" as const, route: "/(tabs)/progress" as const }].map(item => <MotionPressable key={item.label} accessibilityRole="button" onPress={() => router.push(item.route)} className="flex-1 rounded-[22px] border border-border bg-panel p-4"><View className="flex-row items-center justify-between"><MaterialCommunityIcons name={item.icon} color={C.brand} size={24} /><MaterialCommunityIcons name="arrow-top-right" color={C.muted} size={18} /></View><Txt weight="semibold" className="mt-4 text-base">{item.label}</Txt><Txt className="mt-1 text-xs text-muted">{item.subtitle}</Txt></MotionPressable>)}</View></ScreenEntrance>
    </ScrollView>
  </ScreenEntrance>;
}
