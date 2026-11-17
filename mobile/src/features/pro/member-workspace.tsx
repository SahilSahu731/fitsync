import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSession } from "@/src/context/session";
import { MotionPressable as Pressable, ScreenEntrance } from "@/src/components/motion";
import { TabScrollView } from "@/src/components/tab-bar-motion";
import { Txt } from "@/src/components/ui";
import { useBilling } from "../billing/billing-context";
import { useProgress } from "../progress/use-progress";
import { addDays, dateLabel, localDate } from "../progress/model";
import { workoutDate } from "../progress/analytics";
import { Sheet } from "../progress/editors";
import { useProgram } from "../program-follow/program-context";
import { ActiveProgramCard } from "../program-follow/active-program-card";
import { useCoaching } from "../coaching/use-coaching";
import { nextSession } from "../coaching/model";
import { useCompanion } from "../companion/companion-context";
import type { CompanionRecord } from "../companion/api";
import { ReminderSettingsPanel } from "../companion/reminders-panel";
import { useCompanionNativeStatus } from "../companion/native-status";
import { buildProAnalytics, type ProPeriod } from "./analytics";
import { AnalyticsPanels, type AnalyticsView } from "./analytics-panels";
import { WarmupCalculator, OneRepMax, type ProTool } from "./training-tools";
import { useProCatalog } from "./use-pro-catalog";
import { useStudioResources } from "./use-studio-resources";
import { PRO, ProPill } from "./hub-ui";
import {
  MealBrief,
  MuscleBrief,
  StudioArt,
  StudioButton,
  StudioProgress,
  StudioSection,
  ToolTile,
  WeekRhythm,
} from "./studio-panels";

export function MemberWorkspace({ ownerId }: { ownerId: string }) {
  const { user, settings } = useSession();
  const billing = useBilling();
  const progress = useProgress();
  const program = useProgram();
  const coaching = useCoaching();
  const companion = useCompanion();
  const reminderStatus = useCompanionNativeStatus(ownerId);
  const catalog = useProCatalog(ownerId);
  const today = localDate();
  const week = addDays(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7));
  const resources = useStudioResources(ownerId, week);
  const unit = settings?.weightUnit ?? "kg";
  const [sheet, setSheet] = useState<"analytics" | "reminders" | null>(null);
  const [view, setView] = useState<AnalyticsView>("muscles");
  const [period, setPeriod] = useState<ProPeriod>(30);
  const [tool, setTool] = useState<ProTool>(null);
  const briefData = useMemo(
    () =>
      buildProAnalytics(
        progress.journal.workouts,
        catalog.items,
        progress.journal.events,
        30,
        today,
      ),
    [progress.journal.workouts, catalog.items, progress.journal.events, today],
  );
  const data = useMemo(
    () =>
      period === 30
        ? briefData
        : buildProAnalytics(
            progress.journal.workouts,
            catalog.items,
            progress.journal.events,
            period,
            today,
          ),
    [briefData, period, progress.journal.workouts, catalog.items, progress.journal.events, today],
  );
  const completed = briefData.selected.filter((workout) => workoutDate(workout) >= week);
  const doneDates = new Set(completed.map(workoutDate));
  const plannedDates = new Set(
    program.active
      ? program.active.slots.filter((slot) => slot.status !== "completed").map((slot) => slot.date)
      : (coaching.data?.plan?.sessions
          .filter((day) => day.status !== "completed")
          .map((day) => day.date) ?? []),
  );
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(week, index);
    return {
      date,
      today: date === today,
      done: doneDates.has(date),
      planned: plannedDates.has(date),
    };
  });
  const plan = coaching.data?.plan ?? null;
  const next = nextSession(plan);
  const warmupTarget = program.active
    ? undefined
    : next?.prescription.exercises.find(
        (exercise) =>
          exercise.trackingType === "reps_weight" &&
          exercise.weightKg !== null &&
          exercise.weightKg > 0,
      );
  const reminder = companion.state.records.find(
    (record) => record.kind === "reminders" && record.id === "reminders",
  ) as CompanionRecord<"reminders"> | undefined;
  const prefs = reminder?.data;
  const habits = Object.entries(prefs?.habits ?? {}).filter(([, value]) => value?.enabled);
  const remindersCount = habits.length + (prefs?.enabled ? 1 : 0);
  const issue = progress.storageError || progress.workoutError || progress.syncError;
  const historyUnavailable =
    !!issue && !progress.journal.workoutsUpdatedAt && !briefData.allTime.workouts;
  const historyOpening =
    progress.loading || (!progress.journal.workoutsUpdatedAt && progress.refreshing);
  const openAnalytics = useCallback((nextView: AnalyticsView) => {
    setView(nextView);
    setSheet("analytics");
  }, []);
  const refresh = () =>
    void Promise.allSettled([
      progress.refresh(),
      program.refresh(),
      coaching.refresh(),
      catalog.refresh(),
      resources.refresh(),
      companion.refresh(),
      billing.refresh(),
    ]);
  const coachRoute = plan ? ("/coach" as const) : ("/coach/setup" as const);
  return (
    <ScreenEntrance className="flex-1 bg-black">
      <TabScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="w-full max-w-2xl self-center px-5 pt-5 pb-48"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={progress.refreshing && !progress.loading}
            onRefresh={refresh}
            tintColor={PRO.accent}
          />
        }
      >
        <View className="mb-6 flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-brand">
            <MaterialCommunityIcons name="star-four-points" size={20} color="#10130B" />
          </View>
          <View className="flex-1">
            <Txt weight="semibold" className="text-[11px] tracking-[2px]">
              FITSync <Txt className="text-brand">PRO</Txt>
            </Txt>
            <Txt className="mt-1 text-[9px] text-muted">Your personal training studio</Txt>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Customize trainer reminders"
            onPress={() => setSheet("reminders")}
            className="h-11 w-11 items-center justify-center rounded-full border border-white/10"
          >
            <MaterialCommunityIcons name="bell-outline" color={PRO.accent} size={21} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Manage Pro membership"
            onPress={() => router.push("/membership")}
            className="h-11 w-11 items-center justify-center rounded-full border border-white/10"
          >
            <MaterialCommunityIcons name="cog-outline" color="#A3A3A3" size={21} />
          </Pressable>
        </View>
        <View className="mb-5 flex-row items-start gap-2">
          <View className="flex-1">
            <Txt className="mb-2 text-[10px] text-muted">
              {dateLabel(today)} · {user?.name?.trim().split(" ")[0] || "Your day"}
            </Txt>
            <Txt
              accessibilityRole="header"
              weight="medium"
              className="text-[36px] leading-[45px] tracking-[-1.4px]"
            >
              A plan.{"\n"}A little more you.
            </Txt>
          </View>
          <View className="-mr-2 mt-2 opacity-80">
            <StudioArt small />
          </View>
        </View>
        {!!billing.error && (
          <Notice
            title="Membership needs a refresh"
            text={billing.error}
            onPress={() => void billing.refresh()}
          />
        )}
        {!!issue && (
          <Notice
            title="Training sync needs attention"
            text={issue}
            onPress={() => void progress.refresh()}
          />
        )}

        <StudioSection
          index="01 / YOUR DIRECTION"
          title="Your program."
          action="Explore"
          onPress={() => router.push("/explore/programs")}
        />
        {program.active ? (
          <ActiveProgramCard />
        ) : program.loading || (coaching.loading && !plan) ? (
          <View className="min-h-40 items-center justify-center rounded-[28px] bg-panel">
            <ActivityIndicator color={PRO.accent} />
            <Txt className="mt-3 text-xs text-muted">Finding your place in the plan…</Txt>
          </View>
        ) : plan ? (
          <View className="overflow-hidden rounded-[28px] border border-brand/20 bg-[#141B0F] p-5">
            <View className="flex-row items-center justify-between">
              <Txt className="text-[9px] tracking-[1.5px] text-brand">PERSONAL TRAINING PLAN</Txt>
              <MaterialCommunityIcons name="creation-outline" color={PRO.accent} size={23} />
            </View>
            <Txt weight="medium" className="mt-5 text-[27px] leading-9 tracking-[-0.8px]">
              {plan.name}
            </Txt>
            <Txt className="mt-2 text-xs leading-6 text-muted">
              {plan.trainingDays} days a week · {plan.minutesPerWorkout} min ·{" "}
              {plan.equipment.replaceAll("_", " ")}
            </Txt>
            <StudioProgress
              completed={plan.sessions.filter((day) => day.status === "completed").length}
              total={plan.sessions.length}
            />
            <View className="my-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <Txt className="text-[9px] tracking-[1px] text-muted">
                {next?.status === "active"
                  ? "IN PROGRESS"
                  : next
                    ? `NEXT SESSION · ${dateLabel(next.date)}`
                    : "YOUR PLAN IS COMPLETE"}
              </Txt>
              <Txt weight="medium" className="mt-2 text-base">
                {next?.name ?? "Look how far you’ve come."}
              </Txt>
              {next && (
                <Txt className="mt-1 text-[10px] text-muted">
                  {next.prescription.exercises.length} exercises · {next.prescription.minutes} min
                </Txt>
              )}
            </View>
            <StudioButton
              title={next?.status === "active" ? "Resume my plan" : "Open my training plan"}
              onPress={() => router.push("/coach")}
            />
          </View>
        ) : program.error || coaching.error ? (
          <Notice
            title="Your program couldn’t refresh"
            text={program.error || coaching.error || "Try again to load your plan."}
            onPress={() => void Promise.allSettled([program.refresh(), coaching.refresh()])}
          />
        ) : (
          <View className="overflow-hidden rounded-[28px] border border-brand/20 bg-[#12180D]">
            <LinearGradient
              colors={["#24321A", "#11160D"]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ padding: 22 }}
            >
              <View className="flex-row items-center">
                <View className="flex-1">
                  <Txt className="text-[9px] tracking-[1.6px] text-brand">YOUR NEXT CHAPTER</Txt>
                  <Txt weight="medium" className="mt-3 text-[27px] leading-9 tracking-[-0.8px]">
                    Training with{"\n"}a direction.
                  </Txt>
                </View>
                <StudioArt small />
              </View>
              <Txt className="mb-5 mt-2 text-xs leading-6 text-muted">
                Choose a structured program, or build a personal plan around your goals, equipment
                and week.
              </Txt>
              <StudioButton
                title="Choose my program"
                onPress={() => router.push("/explore/programs")}
              />
              <View className="mt-2">
                <StudioButton
                  title="Build a personal plan"
                  onPress={() => router.push("/coach/setup")}
                  quiet
                />
              </View>
            </LinearGradient>
          </View>
        )}
        {!historyOpening && !historyUnavailable && (
          <WeekRhythm title="Your week, in motion" days={days} />
        )}
        <View className="mt-4 flex-row gap-3">
          <View className="flex-1 border-r border-white/10 py-2">
            <Txt weight="medium" className="text-2xl tracking-[-0.5px]">
              {historyOpening || historyUnavailable ? "—" : completed.length}
              <Txt className="text-xs text-muted"> / {progress.goals.weeklyWorkouts}</Txt>
            </Txt>
            <Txt className="mt-1 text-[9px] text-muted">workouts this week</Txt>
          </View>
          <View className="flex-1 py-2">
            <Txt weight="medium" className="text-2xl tracking-[-0.5px]">
              {historyOpening || historyUnavailable ? "—" : briefData.allTime.workouts}
              <Txt className="text-xs text-muted"> sessions</Txt>
            </Txt>
            <Txt className="mt-1 text-[9px] text-muted">your full saved history</Txt>
          </View>
        </View>

        <StudioSection
          index="02 / UNDERSTAND THE WORK"
          title="More than a mirror."
          subtitle="See where your training is going, muscle by muscle."
          action="All analytics"
          onPress={() => openAnalytics("training")}
        />
        {historyOpening ? (
          <View className="items-center rounded-[26px] bg-panel py-10">
            <ActivityIndicator color={PRO.accent} />
            <Txt className="mt-3 text-xs text-muted">Opening your training history…</Txt>
          </View>
        ) : historyUnavailable ? (
          <Notice
            title="Your insights need training history"
            text="Reconnect to load your saved workouts. Your tools and program remain available."
            onPress={() => void progress.refresh()}
          />
        ) : (
          <MuscleBrief
            data={briefData}
            error={catalog.error}
            loading={catalog.loading}
            onOpen={() => openAnalytics("muscles")}
            onRetry={() => void catalog.refresh()}
          />
        )}
        <View className="mt-3 flex-row gap-3">
          <ToolTile
            title="Your strength story"
            detail="Exercise records, rep history and recorded bests."
            icon="chart-timeline-variant"
            color={PRO.cyan}
            onPress={() => openAnalytics("records")}
          />
          <ToolTile
            title="The bigger picture"
            detail="All-time trends and body measurements."
            icon="tape-measure"
            color={PRO.violet}
            onPress={() => openAnalytics("body")}
          />
        </View>

        <StudioSection index="03 / FUEL & RECOVER" title="Good training starts here." />
        <MealBrief
          food={resources.food}
          recipes={resources.recipes}
          today={today}
          loading={resources.loading}
          error={resources.mealError}
          onOpen={() => router.push("/wellness")}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open readiness check-in"
          onPress={() => router.push("/companion?tab=readiness")}
          className="mt-3 flex-row items-center gap-4 rounded-[22px] border border-white/5 bg-[#17151C] p-5"
        >
          <MaterialCommunityIcons name="heart-pulse" color={PRO.violet} size={25} />
          <View className="flex-1">
            <Txt weight="medium" className="text-sm">
              How are you showing up today?
            </Txt>
            <Txt className="mt-1 text-[10px] leading-5 text-muted">
              Check in with sleep, energy and soreness before you train.
            </Txt>
          </View>
          <MaterialCommunityIcons name="arrow-top-right" color={PRO.violet} size={18} />
        </Pressable>

        <StudioSection index="04 / PREPARE WITH PURPOSE" title="Every set, considered." />
        <View className="flex-row gap-3">
          <ToolTile
            title="Warm-up & plates"
            detail="Build up to your working set. Know what goes on each side."
            icon="weight-lifter"
            onPress={() => setTool("warmup")}
          />
          <ToolTile
            title="Working weight guide"
            detail="Review next-session targets against your completed sets."
            icon="weight-kilogram"
            color={PRO.gold}
            onPress={() => router.push(coachRoute)}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open my exercise library"
          onPress={() => router.push("/exercises/custom")}
          className="mt-3 overflow-hidden rounded-[26px] border border-brand/15 bg-[#141B10] p-5"
        >
          <View className="flex-row items-center gap-4">
            <View className="h-14 w-14 items-center justify-center rounded-2xl border border-brand/20 bg-brand/5">
              <MaterialCommunityIcons name="playlist-plus" color={PRO.accent} size={29} />
            </View>
            <View className="flex-1">
              <Txt className="text-[9px] tracking-[1.2px] text-brand">BUILT BY YOU</Txt>
              <Txt weight="medium" className="mt-1 text-lg tracking-[-0.4px]">
                Your exercise library.
              </Txt>
            </View>
            <MaterialCommunityIcons name="arrow-top-right" color={PRO.accent} size={19} />
          </View>
          <Txt className="mt-4 text-xs leading-6 text-muted">
            Your movements, equipment, muscle labels and technique notes. Add the exercises that
            make your training yours.
          </Txt>
          <View className="mt-4 border-t border-brand/10 pt-4">
            <Txt className="text-[11px] text-brand">
              {resources.library === null
                ? "Open your custom movements"
                : `${resources.library.length} custom ${resources.library.length === 1 ? "exercise" : "exercises"} · Add or edit`}
            </Txt>
            {resources.library?.slice(0, 2).map((exercise) => (
              <Txt key={exercise.id} numberOfLines={1} className="mt-2 text-[10px] text-muted">
                {exercise.name}
              </Txt>
            ))}
          </View>
          {!!resources.libraryError && (
            <Txt className="mt-3 text-[10px] text-muted">{resources.libraryError}</Txt>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open estimated one-rep max calculator"
          onPress={() => setTool("one-rep-max")}
          className="min-h-12 flex-row items-center justify-between px-1"
        >
          <Txt className="text-[11px] text-muted">Estimate strength from a recorded set</Txt>
          <MaterialCommunityIcons name="arrow-right" color={PRO.muted} size={18} />
        </Pressable>

        <StudioSection index="05 / A TRAINER IN YOUR CORNER" title="Your rhythm. Your rules." />
        <View className="rounded-[26px] border border-white/10 bg-[#121212] p-5">
          <View className="mb-4 flex-row items-center gap-3">
            <MaterialCommunityIcons name="bell-badge-outline" color={PRO.accent} size={24} />
            <View className="flex-1">
              <Txt weight="medium" className="text-base">
                The right nudge.
              </Txt>
              <Txt className="mt-1 text-[10px] text-muted">
                {companion.loading
                  ? "Loading your preferences…"
                  : `${remindersCount} reminder ${remindersCount === 1 ? "preference" : "preferences"} enabled`}
              </Txt>
            </View>
            <View
              className={`h-2 w-2 rounded-full ${reminderStatus.scheduled > 0 && !reminderStatus.error && reminderStatus.permission !== "denied" ? "bg-brand" : "bg-white/20"}`}
            />
          </View>
          {program.active?.enrollment.reminder_enabled && (
            <Txt className="mb-3 text-[11px] leading-5 text-muted">
              Program reminders · {String(program.active.enrollment.reminder_hour).padStart(2, "0")}
              :{String(program.active.enrollment.reminder_minute).padStart(2, "0")}. Personal
              training reminders pause to avoid duplicates. Times use{" "}
              {program.active.enrollment.timezone.replaceAll("_", " ")}.
            </Txt>
          )}
          <Txt className="mb-4 text-xs leading-6 text-muted">
            Training, meals, hydration and wind-down. Choose the times, quiet hours and snooze that
            fit your day. Each reminder is yours to turn on.
          </Txt>
          {prefs?.enabled && (
            <View className="mb-4 flex-row items-center justify-between">
              <Txt className="text-[11px] text-muted">
                Training · {prefs.days.length} days / week
              </Txt>
              <Txt weight="medium" className="text-sm text-brand">
                {prefs.time}
              </Txt>
            </View>
          )}
          {!!companion.error && (
            <Txt className="mb-3 text-[10px] text-[#ECD7A8]">
              Preferences couldn’t refresh. Open settings to review.
            </Txt>
          )}
          <Txt className="mb-4 text-[10px] leading-5 text-muted">
            {reminderStatus.error
              ? `Scheduling needs attention: ${reminderStatus.error}`
              : reminderStatus.permission === "denied"
                ? "Notifications are off on this phone. Open reminder settings to enable permission."
                : `${reminderStatus.scheduled} upcoming reminders on this phone. ${reminderStatus.suppressedByQuietHours ? `${reminderStatus.suppressedByQuietHours} skipped during quiet hours.` : ""}`}
          </Txt>
          <StudioButton
            title="Customize my reminders"
            onPress={() => setSheet("reminders")}
            quiet
          />
        </View>
        <View className="mt-4 rounded-[25px] bg-[#1B1C16] p-5">
          <Txt className="text-[9px] tracking-[1.5px] text-brand">A LITTLE MORE DIRECTION</Txt>
          <Txt weight="medium" className="mt-3 text-xl leading-8 tracking-[-0.4px]">
            Keep the plan moving.
          </Txt>
          <Txt className="mt-2 text-xs leading-6 text-muted">
            Review your logged sets, adjust a session when life changes, and look back on the week
            with a clear next step.
          </Txt>
          <View className="mt-4">
            <StudioButton
              title="Open my weekly training review"
              onPress={() => router.push("/coach/review")}
              quiet
            />
          </View>
        </View>
        <View className="mt-6 flex-row flex-wrap gap-2">
          {(
            [
              { label: "Goals & milestones", icon: "flag-checkered", path: "/companion?tab=goals" },
              {
                label: "Photos & reports",
                icon: "file-document-outline",
                path: "/companion?tab=reports",
              },
              { label: "Training calendar", icon: "calendar-month-outline", path: "/calendar" },
            ] as const
          ).map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              onPress={() => router.push(item.path)}
              className="min-h-11 flex-row items-center gap-2 rounded-full border border-white/10 px-4"
            >
              <MaterialCommunityIcons name={item.icon} size={15} color={PRO.muted} />
              <Txt className="text-[9px] text-muted">{item.label}</Txt>
            </Pressable>
          ))}
        </View>
        <View className="mt-8 flex-row items-center justify-center gap-2">
          <MaterialCommunityIcons name="shield-check-outline" color={PRO.muted} size={13} />
          <Txt className="text-[9px] text-muted">
            Your plan. Your pace. Private to your account.
          </Txt>
        </View>
      </TabScrollView>
      {sheet === "analytics" && (
        <Sheet
          title="Your training, understood."
          subtitle="Full saved history · FitSync Pro"
          onClose={() => setSheet(null)}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
            <View className="flex-row gap-2">
              {([7, 30, 90, 365, "all"] as const).map((value) => (
                <ProPill
                  key={value}
                  label={value === "all" ? "All time" : value === 365 ? "1 year" : `${value} days`}
                  selected={period === value}
                  onPress={() => setPeriod(value)}
                />
              ))}
            </View>
          </ScrollView>
          {historyOpening ? (
            <View className="items-center py-10">
              <ActivityIndicator color={PRO.accent} />
              <Txt className="mt-3 text-xs text-muted">Opening your training history…</Txt>
            </View>
          ) : historyUnavailable ? (
            <Notice
              title="Your insights need training history"
              text="Reconnect to load your saved workouts."
              onPress={() => void progress.refresh()}
            />
          ) : (
            <AnalyticsPanels
              data={data}
              unit={unit}
              progress={progress}
              view={view}
              onView={setView}
              metadataError={catalog.error}
              onRetryMetadata={() => void catalog.refresh()}
            />
          )}
        </Sheet>
      )}
      {sheet === "reminders" && (
        <Sheet
          title="Make room for your day."
          subtitle="Your reminders, on your terms"
          onClose={() => setSheet(null)}
        >
          <ReminderSettingsPanel />
        </Sheet>
      )}
      {tool === "warmup" && (
        <WarmupCalculator
          onClose={() => setTool(null)}
          initialLoadKg={warmupTarget?.weightKg ?? undefined}
          exerciseName={warmupTarget?.name}
        />
      )}
      {tool === "one-rep-max" && <OneRepMax onClose={() => setTool(null)} />}
    </ScreenEntrance>
  );
}

function Notice({ title, text, onPress }: { title: string; text: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="mb-4 flex-row items-center gap-3 rounded-[20px] border border-[#ECD7A825] bg-[#201B12] p-4"
    >
      <MaterialCommunityIcons name="refresh" color={PRO.gold} size={20} />
      <View className="flex-1">
        <Txt weight="medium" className="text-xs">
          {title}
        </Txt>
        <Txt className="mt-1 text-[10px] leading-5 text-muted">{text}</Txt>
      </View>
    </Pressable>
  );
}
