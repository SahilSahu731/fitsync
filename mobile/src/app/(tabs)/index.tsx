import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, RefreshControl, View } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TabScrollView } from "@/src/components/tab-bar-motion";
import { MotionPressable as Pressable, ScreenEntrance } from "@/src/components/motion";
import { SectionHeading, Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useSession } from "@/src/context/session";
import { HomeGoals } from "@/src/features/progress/home-goals";
import { useProgress } from "@/src/features/progress/use-progress";
import { dateLabel, localDate, METRICS, type Metric } from "@/src/features/progress/model";
import { MetricEditor } from "@/src/features/progress/editors";
import { useWorkout } from "@/src/features/workouts/workout-context";
import { WorkoutSyncNotice } from "@/src/features/workouts/components/workout-sync-notice";
import { StartWorkoutDialog } from "@/src/features/workouts/components/start-workout-dialog";
import { TodayForYouCard, type TodayCardHandle } from "@/src/features/companion/today-card";
import { useProgram } from "@/src/features/program-follow/program-context";
import { DailyOverview } from "@/src/features/home/daily-overview";
import { WeekOverview } from "@/src/features/home/week-overview";
import { homeSnapshot } from "@/src/features/home/model";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
const TOOLKIT: { title: string; subtitle: string; icon: IconName; route: Href }[] = [
  {
    title: "Personal coach",
    subtitle: "A plan built for you",
    icon: "star-four-points-outline",
    route: "/coach",
  },
  {
    title: "Meals & habits",
    subtitle: "Plan, shop, stay on track",
    icon: "food-apple-outline",
    route: "/wellness",
  },
  {
    title: "Companion",
    subtitle: "Check in & find your focus",
    icon: "account-heart-outline",
    route: "/companion",
  },
  {
    title: "Health sync",
    subtitle: "Connect your health data",
    icon: "heart-pulse",
    route: "/health-sync",
  },
  {
    title: "Fitness tools",
    subtitle: "Calculators & more",
    icon: "tune-variant",
    route: "/explore/tools",
  },
  {
    title: "FitSync Pro",
    subtitle: "Explore your Pro workspace",
    icon: "crown-outline",
    route: "/(tabs)/pro",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user, settings } = useSession();
  const workout = useWorkout();
  const program = useProgram();
  const progress = useProgress();
  const ownerId = user?.id ?? "";
  const [clock, setClock] = useState(() => new Date());
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const [startOwner, setStartOwner] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editor, setEditor] = useState<{ ownerId: string; metric: Metric; date: string } | null>(
    null,
  );
  const [notice, setNotice] = useState<{ ownerId: string; text: string } | null>(null);
  const [waterOwner, setWaterOwner] = useState<string | null>(null);
  const waterLock = useRef<string | null>(null);
  const todayCard = useRef<TodayCardHandle>(null);
  useFocusEffect(
    useCallback(() => {
      // Return from background and midnight rollover both refresh the logging date.
      setClock(new Date());
      const timer = setInterval(() => setClock(new Date()), 60_000);
      return () => clearInterval(timer);
    }, []),
  );
  const today = localDate(clock);
  const firstName = user?.name.trim().split(/\s+/)[0] || "there";
  const greeting =
    clock.getHours() < 12
      ? "Good morning"
      : clock.getHours() < 17
        ? "Good afternoon"
        : "Good evening";
  const snapshot = useMemo(
    () => homeSnapshot(progress.journal.workouts, progress.journal.events, today),
    [progress.journal.workouts, progress.journal.events, today],
  );
  const unit = settings?.weightUnit ?? "kg";
  const canLog = Boolean(ownerId) && !progress.loading && !progress.storageError;
  const syncIssue = progress.syncError || progress.workoutError || progress.storageError;
  const unavailable = progress.loading || Boolean(progress.storageError);
  const waterBusy = Boolean(ownerId) && waterOwner === ownerId;
  const trainingBlocked =
    workout.busy || workout.loading || workout.pendingCompletion || program.loading;
  const openLog = (metric: Metric) => {
    if (canLog) setEditor({ ownerId, metric, date: today });
  };
  async function refresh() {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        progress.refresh(),
        program.refresh(),
        workout.refresh(),
        todayCard.current?.refresh(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }
  async function addWater() {
    if (!canLog || waterLock.current === ownerId) return;
    const writingOwner = ownerId;
    waterLock.current = writingOwner;
    setWaterOwner(writingOwner);
    try {
      await progress.increment("water", today, 250, "Added 250 ml of water.");
      setNotice({ ownerId: writingOwner, text: "250 ml added to today’s water." });
    } catch (error) {
      setNotice({
        ownerId: writingOwner,
        text: error instanceof Error ? error.message : "Could not save water. Please try again.",
      });
    } finally {
      if (waterLock.current === writingOwner) waterLock.current = null;
      setWaterOwner((current) => (current === writingOwner ? null : current));
    }
  }
  function openTraining() {
    if (!ownerId || trainingBlocked) return;
    if (workout.session) router.push("/workout");
    else if (program.active?.enrollment.status === "active") {
      router.push({ pathname: "/programs/[id]", params: { id: program.active.enrollment.id } });
    } else if (program.error) router.push("/(tabs)/train");
    else setStartOwner(ownerId);
  }

  return (
    <ScreenEntrance className="flex-1 bg-bg">
      <TabScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName={`w-full max-w-2xl self-center px-6 pt-6 ${workout.session ? "pb-56" : "pb-44"}`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || (progress.refreshing && !progress.loading)}
            onRefresh={() => void refresh()}
            tintColor={C.brand}
          />
        }
      >
        <View className="mb-7 flex-row items-center justify-between gap-4">
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-2">
              <View className="h-1.5 w-1.5 rounded-full bg-brand" />
              <Txt weight="medium" className="text-[10px] tracking-[1px] text-muted">
                {dateLabel(today, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                }).toUpperCase()}
              </Txt>
            </View>
            <Txt className="mt-4 text-sm text-muted">{greeting},</Txt>
            <Txt
              accessibilityRole="header"
              weight="medium"
              numberOfLines={1}
              adjustsFontSizeToFit
              className="mt-0.5 text-[34px] leading-[44px] tracking-[-1.3px]"
            >
              {firstName}.
            </Txt>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open your profile"
            onPress={() => router.push("/profile")}
            className="h-14 w-14 items-center justify-center overflow-hidden rounded-full border  bg-panel"
          >
            {user?.avatarUrl && failedAvatar !== user.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                onError={() => setFailedAvatar(user.avatarUrl ?? null)}
                className="h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <Txt weight="medium" className="text-xl text-brand">
                {firstName[0].toUpperCase()}
              </Txt>
            )}
          </Pressable>
        </View>

        <WorkoutSyncNotice />
        <TodayForYouCard refreshRef={todayCard} />
        <View className="mb-8 mt-1 flex-row gap-2">
          {(
            [
              {
                label: workout.session ? "Resume" : "Train",
                icon: "dumbbell",
                action: openTraining,
                disabled: trainingBlocked,
              },
              { label: "Log", icon: "plus", action: () => openLog("weight"), disabled: !canLog },
              {
                label: "Calendar",
                icon: "calendar-month-outline",
                action: () => router.push("/calendar"),
                disabled: false,
              },
              {
                label: "Explore",
                icon: "compass-outline",
                action: () => router.push("/(tabs)/library"),
                disabled: false,
              },
            ] satisfies { label: string; icon: IconName; action: () => void; disabled: boolean }[]
          ).map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label === "Log" ? "Log a daily check-in" : item.label}
              accessibilityState={{ disabled: item.disabled }}
              disabled={item.disabled}
              onPress={item.action}
              className="min-w-0 flex-1 items-center gap-2 rounded-[20px] bg-panel px-1 py-4"
              style={{ opacity: item.disabled ? 0.45 : 1 }}
            >
              <MaterialCommunityIcons name={item.icon} size={23} color={C.ink} />
              <Txt weight="medium" numberOfLines={1} className="text-[10px]">
                {item.label}
              </Txt>
            </Pressable>
          ))}
        </View>

        {!!syncIssue && (
          <Pressable
            accessibilityRole="button"
            onPress={() => void refresh()}
            className="mb-5 flex-row items-center gap-3 rounded-2xl border border-white/10 bg-panel p-4"
          >
            <MaterialCommunityIcons name="cloud-off-outline" size={21} color={C.muted} />
            <View className="flex-1">
              <Txt weight="medium" className="text-xs">
                {progress.storageError ? "Your journal couldn’t open" : "Showing saved progress"}
              </Txt>
              <Txt className="mt-1 text-[11px] leading-5 text-muted">
                Tap to reconnect and refresh your dashboard.
              </Txt>
            </View>
            <MaterialCommunityIcons name="refresh" size={19} color={C.brand} />
          </Pressable>
        )}
        <ScreenEntrance delay={60}>
          <WeekOverview
            snapshot={snapshot}
            today={today}
            target={progress.hasGoals ? progress.goals.weeklyWorkouts : null}
            loading={unavailable}
            onCalendar={() => router.push("/calendar")}
          />
        </ScreenEntrance>
        <ScreenEntrance delay={100} className="mt-8">
          <SectionHeading
            title="Your daily picture"
            action="All progress"
            onAction={() => router.push("/(tabs)/progress")}
          />
          <DailyOverview
            snapshot={snapshot}
            today={today}
            goals={progress.goals}
            unit={unit}
            loading={unavailable}
            disabled={!canLog}
            waterBusy={waterBusy}
            onLog={openLog}
            onWater={() => void addWater()}
          />
          {notice?.ownerId === ownerId && (
            <View
              accessibilityLiveRegion="polite"
              className="mt-3 flex-row items-center gap-3 rounded-2xl bg-elevated py-2 pl-4 pr-1"
            >
              <Txt className="flex-1 text-xs leading-5">{notice.text}</Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss update"
                onPress={() => setNotice(null)}
                className="h-11 w-11 items-center justify-center"
              >
                <MaterialCommunityIcons name="close" size={17} color={C.muted} />
              </Pressable>
            </View>
          )}
        </ScreenEntrance>
        <View className="mt-5">
          <HomeGoals
            ownerId={ownerId}
            hasGoals={progress.hasGoals}
            ready={!progress.loading && !progress.refreshing && !syncIssue}
            activeWorkout={Boolean(workout.session)}
            goals={progress.goals}
            events={progress.journal.events}
            workouts={progress.journal.workouts}
            unit={unit}
            completed={snapshot.weeklyCount}
            onRetry={() => void refresh()}
          />
        </View>
        <ScreenEntrance delay={140} className="mt-3">
          <SectionHeading
            title="Recent sessions"
            action="History"
            onAction={() => router.push("/(tabs)/train")}
          />
          <View className="overflow-hidden rounded-[24px] border border-white/5 bg-panel px-4">
            {unavailable ? (
              <View className="flex-row items-center gap-3 py-7">
                {progress.loading && <ActivityIndicator size="small" color={C.brand} />}
                <Txt className="text-xs text-muted">
                  {progress.loading
                    ? "Opening your workout history…"
                    : "Refresh to open your workout history."}
                </Txt>
              </View>
            ) : snapshot.recent.length ? (
              snapshot.recent.map((item, index) => {
                const date = localDate(new Date(item.finished_at!));
                const sets = item.workout_session_exercises.reduce(
                  (total, exercise) =>
                    total + exercise.workout_logged_sets.filter((set) => set.completed_at).length,
                  0,
                );
                const minutes =
                  item.elapsed_seconds != null && Number.isFinite(item.elapsed_seconds)
                    ? Math.max(0, Math.round(item.elapsed_seconds / 60))
                    : null;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${item.name}, ${dateLabel(date)}`}
                    onPress={() =>
                      router.push({ pathname: "/workout/history/[id]", params: { id: item.id } })
                    }
                    className={`min-h-20 flex-row items-center gap-3 py-4 ${index ? "border-t border-white/5" : ""}`}
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-2xl bg-elevated">
                      <MaterialCommunityIcons name="check" size={21} color={C.brand} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Txt weight="medium" numberOfLines={1} className="text-sm">
                        {item.name}
                      </Txt>
                      <Txt className="mt-1 text-[10px] leading-5 text-muted">
                        {date === today ? "Today" : dateLabel(date)} · {sets} sets
                        {minutes == null ? "" : ` · ${minutes} min`}
                      </Txt>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={C.muted} />
                  </Pressable>
                );
              })
            ) : (
              <View className="py-6">
                <MaterialCommunityIcons name="dumbbell" size={27} color={C.muted} />
                <Txt weight="medium" className="mt-4 text-base">
                  {progress.workoutError
                    ? "History couldn’t refresh."
                    : "Your first session starts a story."}
                </Txt>
                <Txt className="mt-2 text-xs leading-6 text-muted">
                  {progress.workoutError
                    ? "Reconnect to load your completed sessions."
                    : "Finish a workout and it will appear here. Every rep has a place."}
                </Txt>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: trainingBlocked }}
                  disabled={trainingBlocked}
                  onPress={progress.workoutError ? () => void refresh() : openTraining}
                  className="mt-3 min-h-11 flex-row items-center gap-2 self-start"
                >
                  <Txt weight="medium" className="text-xs text-brand">
                    {progress.workoutError
                      ? "Try again"
                      : workout.session
                        ? "Resume workout"
                        : "Start a workout"}
                  </Txt>
                  <MaterialCommunityIcons name="arrow-right" size={16} color={C.brand} />
                </Pressable>
              </View>
            )}
          </View>
        </ScreenEntrance>
        <ScreenEntrance delay={180} className="mt-8">
          <SectionHeading title="Built around you" />
          <Txt className="-mt-1 mb-4 text-xs text-muted">Everything you need, a little closer.</Txt>
          <View className="gap-3">
            {[TOOLKIT.slice(0, 2), TOOLKIT.slice(2, 4), TOOLKIT.slice(4, 6)].map((row, index) => (
              <View key={index} className="flex-row gap-3">
                {row.map((item) => (
                  <Pressable
                    key={item.title}
                    accessibilityRole="button"
                    onPress={() => router.push(item.route)}
                    className="min-w-0 flex-1 rounded-[22px] bg-panel p-4"
                  >
                    <View className="flex-row items-center justify-between">
                      <MaterialCommunityIcons name={item.icon} size={23} color={C.ink} />
                      <MaterialCommunityIcons name="arrow-right" size={16} color={C.muted} />
                    </View>
                    <Txt weight="medium" className="mt-5 text-xs">
                      {item.title}
                    </Txt>
                    <Txt className="mt-1 text-[10px] leading-5 text-muted">{item.subtitle}</Txt>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </ScreenEntrance>
        <View className="mt-9 flex-row items-center justify-center gap-2">
          <View className="h-1 w-1 rounded-full bg-brand" />
          <Txt className="text-[10px] tracking-[1px] text-muted">A LITTLE MORE IN SYNC.</Txt>
        </View>
      </TabScrollView>
      {editor?.ownerId === ownerId && canLog && (
        <MetricEditor
          key={`${editor.ownerId}-${editor.metric}-${editor.date}`}
          initialMetric={editor.metric}
          date={editor.date}
          events={snapshot.metrics}
          unit={unit}
          onClose={() => setEditor(null)}
          onSave={async (metric, date, value, notes) => {
            await progress.log(metric, date, value, notes);
            setNotice({
              ownerId,
              text: value == null ? "Check-in cleared." : `${METRICS[metric].label} saved.`,
            });
          }}
        />
      )}
      {startOwner === ownerId && Boolean(ownerId) && (
        <StartWorkoutDialog
          key={ownerId}
          disabled={trainingBlocked || Boolean(workout.session)}
          onStart={workout.start}
          onClose={() => setStartOwner(null)}
          onStarted={() => {
            setStartOwner(null);
            router.push("/workout");
          }}
        />
      )}
    </ScreenEntrance>
  );
}
