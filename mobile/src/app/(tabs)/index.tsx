import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TabScrollView } from "@/src/components/tab-bar-motion";
import { MotionPressable as Pressable, ScreenEntrance } from "@/src/components/motion";
import { SectionHeading, Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useSession } from "@/src/context/session";
import { useProgress } from "@/src/features/progress/use-progress";
import { dateLabel, localDate, METRICS, type Metric } from "@/src/features/progress/model";
import { MetricEditor } from "@/src/features/progress/editors";
import { useWorkout } from "@/src/features/workouts/workout-context";
import { WorkoutSyncNotice } from "@/src/features/workouts/components/workout-sync-notice";
import { StartWorkoutDialog } from "@/src/features/workouts/components/start-workout-dialog";
import { HomeWorkoutCard, type HomeWorkoutCardHandle } from "@/src/features/home/workout-card";
import { HomeTopBar } from "@/src/features/home/top-bar";
import { HomeReminderSheet } from "@/src/features/home/reminder-sheet";
import { HomeQuickLog, HomeEssentials } from "@/src/features/home/quick-access";
import { useBilling } from "@/src/features/billing/billing-context";
import { useProgram } from "@/src/features/program-follow/program-context";
import { DailyOverview } from "@/src/features/home/daily-overview";
import { WeekOverview } from "@/src/features/home/week-overview";
import { homeSnapshot } from "@/src/features/home/model";

import { HomeHeroCarousel } from "@/src/features/home/hero-carousel";
import { ProPromoCard } from "@/src/features/home/pro-promo-card";
import { StreakCard, computeStreak } from "@/src/features/home/streak-card";

export default function HomeScreen() {
  const router = useRouter();
  const { user, settings } = useSession();
  const workout = useWorkout();
  const billing = useBilling();
  const program = useProgram();
  const progress = useProgress();
  const ownerId = user?.id ?? "";
  const [remindersOwner, setRemindersOwner] = useState<string | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const [startOwner, setStartOwner] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editor, setEditor] = useState<{
    ownerId: string;
    metric: Metric;
    date: string;
    picker?: boolean;
  } | null>(null);
  const [notice, setNotice] = useState<{ ownerId: string; text: string } | null>(null);
  const [waterOwners, setWaterOwners] = useState<string[]>([]);
  const waterLock = useRef(new Set<string>());
  const todayCard = useRef<HomeWorkoutCardHandle>(null);
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
  const streak = useMemo(
    () => computeStreak(progress.journal.workouts, today),
    [progress.journal.workouts, today],
  );
  const unit = settings?.weightUnit ?? "kg";
  const canLog = Boolean(ownerId) && !progress.loading && !progress.storageError;
  const syncIssue = progress.syncError || progress.workoutError || progress.storageError;
  const unavailable = progress.loading || Boolean(progress.storageError);
  const waterBusy = Boolean(ownerId) && waterOwners.includes(ownerId);
  const trainingBlocked = workout.busy || workout.loading || workout.pendingCompletion;
  const openLog = (metric: Metric, picker = false) => {
    if (canLog) setEditor({ ownerId, metric, date: today, picker });
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
    if (!canLog || waterLock.current.has(ownerId)) return;
    const writingOwner = ownerId;
    waterLock.current.add(writingOwner);
    setWaterOwners((current) => [...current, writingOwner]);
    try {
      await progress.increment("water", today, 250, "Added 250 ml of water.");
      setNotice({ ownerId: writingOwner, text: "250 ml added to today’s water." });
    } catch (error) {
      setNotice({
        ownerId: writingOwner,
        text: error instanceof Error ? error.message : "Could not save water. Please try again.",
      });
    } finally {
      waterLock.current.delete(writingOwner);
      setWaterOwners((current) => current.filter((id) => id !== writingOwner));
    }
  }
  function openTraining() {
    if (!ownerId) return;
    if (workout.session) router.push("/workout");
    else if (!trainingBlocked) setStartOwner(ownerId);
  }
  function openFood() {
    if (billing.isPro) router.push({ pathname: "/nutrition", params: { date: today } });
    else openLog("caloriesIn");
  }

  return (
    <ScreenEntrance className="flex-1 bg-bg">
      <TabScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName={`w-full max-w-2xl self-center px-5 pt-4 ${workout.session ? "pb-56" : "pb-44"}`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || (progress.refreshing && !progress.loading)}
            onRefresh={() => void refresh()}
            tintColor="#FFFFFF"
          />
        }
      >
        <HomeTopBar
          key={`home-topbar:${ownerId}`}
          user={user}
          isPro={billing.isPro}
          onPro={() => router.push("/(tabs)/pro")}
          onReminders={() => setRemindersOwner(ownerId)}
          onProfile={() => router.push("/profile")}
        />
        <View className="mb-5">
          <View className=" flex-row flex-wrap items-center gap-x-2 gap-y-1">
            <Txt className="text-[10px]  text-muted">
              {dateLabel(today, { weekday: "short", month: "short", day: "numeric" })}
            </Txt>
            {billing.isPro && (
              <View className="rounded-full bg-yellow-400 px-2 py-0.5">
                <Txt weight="medium" className="text-[9px] tracking-[0.5px]">
                  PRO
                </Txt>
              </View>
            )}
          </View>
          <Txt
            accessibilityRole="header"
            weight="medium"
            className="text-[28px] leading-[38px] tracking-[-1px]"
          >
            {greeting}, {firstName}.
          </Txt>
        </View>
        <WorkoutSyncNotice />
        <View className="-mx-5">
          <HomeHeroCarousel
            initialIndex={1}
            slides={[
              <StreakCard key="streak" streak={streak} onPress={() => router.push("/calendar")} />,
              <HomeWorkoutCard
                key={`home-workout:${ownerId}`}
                today={today}
                onStart={openTraining}
                refreshRef={todayCard}
              />,
              <ProPromoCard
                key="pro"
                isPro={billing.isPro}
                onPress={() => router.push("/(tabs)/pro")}
              />,
            ]}
          />
        </View>
        <View className="mb-7 mt-6">
          <SectionHeading
            title="Quick log"
            action="Progress"
            onAction={() => router.push("/(tabs)/progress")}
          />
          <HomeQuickLog
            disabled={!canLog}
            onWater={() => openLog("water")}
            onSteps={() => openLog("steps")}
            onFood={openFood}
            onMore={() => openLog("weight", true)}
          />
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
            <MaterialCommunityIcons name="refresh" size={19} color="#FFFFFF" />
          </Pressable>
        )}
        <ScreenEntrance delay={100}>
          <SectionHeading
            title="Today at a glance"
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
            onNutrition={() => router.push({ pathname: "/nutrition", params: { date: today } })}
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
        <ScreenEntrance delay={120} className="mt-7">
          <WeekOverview
            snapshot={snapshot}
            today={today}
            target={progress.hasGoals ? progress.goals.weeklyWorkouts : null}
            loading={unavailable}
            onGoals={() => router.push("/goals")}
            onCalendar={() => router.push("/calendar")}
          />
        </ScreenEntrance>
        <ScreenEntrance delay={140} className="mt-7">
          <SectionHeading
            title="Recent sessions"
            action="History"
            onAction={() => router.push("/(tabs)/train")}
          />
          <View className="overflow-hidden rounded-[24px] border border-white/5 bg-panel px-4">
            {unavailable ? (
              <View className="flex-row items-center gap-3 py-7">
                {progress.loading && <ActivityIndicator size="small" color="#FFFFFF" />}
                <Txt className="text-xs text-muted">
                  {progress.loading
                    ? "Opening your workout history…"
                    : "Refresh to open your workout history."}
                </Txt>
              </View>
            ) : snapshot.recent.length ? (
              snapshot.recent.slice(0, 2).map((item, index) => {
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
                      <MaterialCommunityIcons name="check" size={21} color="#FFFFFF" />
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
                  accessibilityState={{ disabled: !workout.session && trainingBlocked }}
                  disabled={!workout.session && trainingBlocked}
                  onPress={progress.workoutError ? () => void refresh() : openTraining}
                  className="mt-3 min-h-11 flex-row items-center gap-2 self-start"
                >
                  <Txt weight="medium" className="text-xs text-white">
                    {progress.workoutError
                      ? "Try again"
                      : workout.session
                        ? "Resume workout"
                        : "Start a workout"}
                  </Txt>
                  <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            )}
          </View>
        </ScreenEntrance>
        <ScreenEntrance delay={180} className="mt-8">
          <SectionHeading
            title="Your essentials"
            action="Explore"
            onAction={() => router.push("/(tabs)/library")}
          />
          <HomeEssentials onNavigate={(route) => router.push(route)} />
        </ScreenEntrance>
      </TabScrollView>
      {remindersOwner === ownerId && Boolean(ownerId) && (
        <HomeReminderSheet
          key={`home-reminders:${ownerId}`}
          onClose={() => setRemindersOwner(null)}
        />
      )}
      {editor?.ownerId === ownerId && canLog && (
        <MetricEditor
          key={`home-check-in:${editor.ownerId}:${editor.metric}:${editor.date}`}
          initialMetric={editor.metric}
          startWithPicker={editor.picker}
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
          key={`home-start:${ownerId}`}
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
