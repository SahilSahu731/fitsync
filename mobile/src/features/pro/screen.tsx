import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle, Path } from "react-native-svg";
import { useSession } from "@/src/context/session";
import { MotionPressable, ScreenEntrance } from "@/src/components/motion";
import { TabScrollView } from "@/src/components/tab-bar-motion";
import { Txt } from "@/src/components/ui";
import { useBilling } from "../billing/billing-context";
import { useProgress } from "../progress/use-progress";
import { addDays, dateLabel, localDate } from "../progress/model";
import { compact } from "../progress/tracking-cards";
import { workoutDate } from "../progress/analytics";
import { workoutApi, type WorkoutTemplate } from "../workouts/api";
import { buildProAnalytics, type ProPeriod } from "./analytics";
import { AnalyticsPanels, type AnalyticsView } from "./analytics-panels";
import { TrainerPanel, TrainingTools, type ProTool } from "./training-tools";
import { useProCatalog } from "./use-pro-catalog";
import { TodayForYouCard } from "../companion/today-card";
import { type Href } from "expo-router";
import {
  GlassCard,
  ProAction,
  ProButton,
  ProPill,
  ProSection,
  ProStat,
  ProScene,
  PRO,
  Reveal,
} from "./ui";

type Section = "overview" | "analytics" | "trainer" | "tools" | "companion";
const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "companion", label: "For you" },
  { id: "analytics", label: "Analytics" },
  { id: "trainer", label: "Trainer" },
  { id: "tools", label: "Tools" },
] as const;
export function ProHubScreen() {
  const { user } = useSession();
  return <ProHub key={user?.id ?? "signed-out"} />;
}
function ProHub() {
  const { user, settings } = useSession();
  const billing = useBilling();
  const progress = useProgress();
  const catalog = useProCatalog(user?.id ?? "");
  const [section, setSection] = useState<Section>("overview"),
    [view, setView] = useState<AnalyticsView>("training"),
    [period, setPeriod] = useState<ProPeriod>(30),
    [tool, setTool] = useState<ProTool>(null),
    [builder, setBuilder] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const today = localDate();
  const unit = settings?.weightUnit ?? "kg";
  const data = useMemo(
    () =>
      buildProAnalytics(
        progress.journal.workouts,
        catalog.items,
        progress.journal.events,
        period,
        today,
      ),
    [progress.journal.workouts, progress.journal.events, catalog.items, period, today],
  );
  const weekStart = addDays(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7));
  const thisWeek = progress.journal.workouts.filter(
    (w) =>
      w.status === "completed" &&
      w.finished_at &&
      workoutDate(w) >= weekStart &&
      workoutDate(w) <= today,
  ).length;
  const navigate = (next: Section, analytics?: AnalyticsView) => {
    if (analytics) setView(analytics);
    setSection(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const refresh = () =>
    void Promise.allSettled([progress.refresh(), catalog.refresh(), billing.refresh()]);
  const issue = progress.storageError || progress.workoutError || progress.syncError;
  const historyUnavailable = Boolean(
    (progress.storageError || progress.workoutError) &&
    !progress.journal.workoutsUpdatedAt &&
    !data.allTime.workouts,
  );
  const initialLoading =
    progress.loading ||
    (!progress.journal.workoutsUpdatedAt && progress.refreshing && !data.allTime.workouts);
  return (
    <ProScene>
      <ScreenEntrance className="flex-1">
        <TabScrollView
          ref={scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="w-full max-w-2xl self-center px-6 pt-5 pb-56"
          refreshControl={
            <RefreshControl
              refreshing={progress.refreshing && !progress.loading}
              onRefresh={refresh}
              tintColor={PRO.accent}
            />
          }
        >
          <View className="mb-7 flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-2">
              <MaterialCommunityIcons name="star-four-points" size={20} color={PRO.accent} />
              <Txt weight="semibold" className="text-[13px] tracking-[2px]">
                FITSYNC <Txt style={{ color: PRO.accent }}>PRO</Txt>
              </Txt>
            </View>
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Manage Pro membership"
              onPress={() => router.push("/membership")}
              className="min-h-11 flex-row items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3"
            >
              <View
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: billing.isPro ? PRO.accent : PRO.muted }}
              />
              <Txt className="text-[10px]">
                {billing.loading ? "Checking…" : billing.isPro ? "Member" : "Explore Pro"}
              </Txt>
              <MaterialCommunityIcons name="chevron-right" size={14} color={PRO.muted} />
            </MotionPressable>
          </View>
          <Txt className="mb-2 text-xs text-muted">
            {user?.name?.split(" ")[0]
              ? `${user.name.split(" ")[0]}, make every session count.`
              : "Make every session count."}
          </Txt>
          <Txt weight="medium" className="mb-6 text-[36px] leading-[43px] tracking-[-1.3px]">
            A little more insight.{`\n`}A lot more direction.
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
            <View className="flex-row gap-2">
              {SECTIONS.map((s) => (
                <ProPill
                  key={s.id}
                  label={s.label}
                  selected={section === s.id}
                  onPress={() => navigate(s.id)}
                />
              ))}
            </View>
          </ScrollView>
          {!!billing.error && (
            <View className="mb-4">
              <ProAction
                icon="refresh"
                title="Membership needs a refresh"
                subtitle={billing.error}
                onPress={() => void billing.refresh()}
              />
            </View>
          )}
          {!!issue && (
            <View className="mb-4">
              <ProAction
                icon="cloud-alert-outline"
                title="Sync needs attention"
                subtitle={`${progress.journal.workoutsUpdatedAt ? "Showing saved history. " : ""}${issue}`}
                onPress={() => void progress.refresh()}
              />
            </View>
          )}
          {initialLoading && (section === "overview" || section === "analytics") ? (
            <GlassCard>
              <View className="flex-row items-center gap-3 py-5">
                <ActivityIndicator color={PRO.accent} />
                <Txt className="text-sm text-muted">Opening your training history…</Txt>
              </View>
            </GlassCard>
          ) : (
            <Reveal key={section}>
              {section === "overview" && (
                <>
                  <TodayForYouCard />
                  <View className="mb-4">
                    <ProAction
                      icon="star-four-points"
                      title="Your daily Pro companion"
                      subtitle="Check-ins, milestones, muscle focus, photos and personal reminders"
                      onPress={() => navigate("companion")}
                    />
                  </View>
                  <GlassCard accent>
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="min-w-0 flex-1">
                        <Txt className="text-[10px] tracking-[2px]" style={{ color: PRO.accent }}>
                          THIS WEEK’S MOMENTUM
                        </Txt>
                        <Txt
                          weight="medium"
                          className="mt-4 text-[52px] leading-[60px] tracking-[-2px]"
                        >
                          {historyUnavailable ? "—" : thisWeek}
                          <Txt className="text-xl tracking-normal text-muted">
                            {" "}
                            / {progress.goals.weeklyWorkouts}
                          </Txt>
                        </Txt>
                        <Txt className="mt-1 text-xs text-muted">workouts completed this week</Txt>
                      </View>
                      {!historyUnavailable && (
                        <Orbit value={thisWeek} target={progress.goals.weeklyWorkouts} />
                      )}
                    </View>
                    <View className="mt-6 flex-row gap-4 border-t border-white/10 pt-5">
                      <ProStat
                        label="LIFETIME SESSIONS"
                        value={historyUnavailable ? "—" : compact(data.allTime.workouts)}
                      />
                      <ProStat
                        label="TIME INVESTED"
                        value={historyUnavailable ? "—" : compact(data.allTime.minutes / 60)}
                        unit="hrs"
                      />
                    </View>
                    <View className="mt-5">
                      <ProButton title="Find my next session" onPress={() => navigate("trainer")} />
                    </View>
                  </GlassCard>
                  {!billing.isPro && (
                    <View className="mt-4">
                      <ProAction
                        icon="star-four-points"
                        title="Unlock FitSync Pro"
                        subtitle="Deep analytics, explained plan changes and weekly guidance"
                        onPress={() => router.push("/membership")}
                      />
                    </View>
                  )}
                  <ProSection
                    eyebrow="Go a little deeper"
                    title="The detail makes the difference."
                  />
                  <View className="gap-3">
                    <ProAction
                      icon="human"
                      title="Every muscle, understood"
                      subtitle="20 muscle groups · primary & supporting workload · exercise breakdowns"
                      onPress={() => navigate("analytics", "muscles")}
                    />
                    <ProAction
                      icon="trophy-outline"
                      title="Your personal record book"
                      subtitle="All-time bests · new records · every exercise and session"
                      onPress={() => navigate("analytics", "records")}
                    />
                    <ProAction
                      icon="chart-timeline-variant"
                      title="Unlimited graph history"
                      subtitle="Training, volume, sets, reps, time, distance and recorded effort"
                      onPress={() => navigate("analytics", "training")}
                    />
                    <ProAction
                      icon="tape-measure"
                      title="Your whole picture"
                      subtitle="31 metrics across body, nutrition, activity and recovery"
                      onPress={() => navigate("analytics", "body")}
                    />
                  </View>
                  <ProSection eyebrow="Built around your life" title="Meet your FitSync trainer." />
                  <GlassCard accent>
                    <Txt weight="medium" className="text-[27px] leading-8 tracking-[-.8px]">
                      Know what to do.{`\n`}Understand why.
                    </Txt>
                    <Txt className="mt-3 text-sm leading-6 text-muted">
                      Preview a plan that fits your goal and equipment. Review real progress, adapt
                      a busy day and move missed sessions without losing the thread.
                    </Txt>
                    <View className="mt-5">
                      <ProButton title="Open FitSync trainer" onPress={() => navigate("trainer")} />
                    </View>
                  </GlassCard>
                  <ProSection title="Make it yours" />
                  <View className="gap-3">
                    <ProAction
                      icon="calculator-variant-outline"
                      title="A smarter warm-up"
                      subtitle="Calculate achievable sets with your actual plate inventory"
                      onPress={() => {
                        setTool("warmup");
                        navigate("tools");
                      }}
                    />
                    <ProAction
                      icon="playlist-plus"
                      title="Unlimited routines & custom exercises"
                      subtitle="Reusable sessions and a private movement library"
                      onPress={() => navigate("tools")}
                    />
                  </View>
                  <RoutineLibrary ownerId={user?.id ?? ""} />
                  <ProSection title="Your data stays yours" />
                  <GlassCard blur={false}>
                    <Txt className="text-xs leading-6 text-muted">
                      Your ordinary workout logging, current health metrics, personal records,
                      history and raw export remain available in Progress. Pro adds deeper
                      interpretation, planning tools and guidance.
                    </Txt>
                    <View className="mt-4">
                      <ProPill
                        label="Membership & billing"
                        selected={false}
                        onPress={() => router.push("/membership")}
                      />
                    </View>
                  </GlassCard>
                </>
              )}
              {section === "analytics" &&
                (billing.loading ? (
                  <ActivityIndicator color={PRO.accent} className="my-10" />
                ) : billing.isPro ? (
                  <>
                    <View className="mb-5">
                      <Txt className="mb-3 text-[10px] tracking-[2px] text-muted">
                        YOUR ANALYSIS RANGE
                      </Txt>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row gap-2">
                          {([7, 30, 90, 365, "all"] as const).map((p) => (
                            <ProPill
                              key={p}
                              label={p === "all" ? "All time" : p === 365 ? "1 year" : `${p} days`}
                              selected={period === p}
                              onPress={() => setPeriod(p)}
                            />
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                    {catalog.loading && view === "muscles" && (
                      <Txt className="mb-3 text-xs text-muted">
                        Updating exercise muscle labels…
                      </Txt>
                    )}
                    <AnalyticsPanels
                      data={data}
                      unit={unit}
                      progress={progress}
                      view={view}
                      onView={setView}
                      metadataError={catalog.error}
                      onRetryMetadata={() => void catalog.refresh()}
                    />
                  </>
                ) : (
                  <LockedAnalytics view={view} onView={setView} />
                ))}
              {section === "companion" && <CompanionShortcuts />}
              {section === "trainer" && (
                <TrainerPanel builderOpen={builder} onBuilder={setBuilder} />
              )}
              {section === "tools" && (
                <>
                  <TrainingTools tool={tool} onTool={setTool} />
                  <RoutineLibrary ownerId={user?.id ?? ""} />
                </>
              )}
            </Reveal>
          )}
          <View className="mt-10 flex-row items-center justify-center gap-2">
            <MaterialCommunityIcons
              name={issue ? "cloud-off-outline" : "shield-check-outline"}
              size={13}
              color={PRO.muted}
            />
            <Txt className="text-[10px] text-muted">
              {progress.refreshing
                ? "Syncing your training"
                : issue
                  ? "Saved history on this device"
                  : progress.journal.workoutsUpdatedAt
                    ? `Training synced · ${dateLabel(localDate(new Date(progress.journal.workoutsUpdatedAt)))}`
                    : "Private to your FitSync account"}
            </Txt>
          </View>
        </TabScrollView>
      </ScreenEntrance>
    </ProScene>
  );
}
function CompanionShortcuts() {
  const features: {
    tab: string;
    icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    title: string;
    subtitle: string;
  }[] = [
    {
      tab: "readiness",
      icon: "heart-pulse",
      title: "Today’s readiness check-in",
      subtitle: "Sleep, energy, muscle soreness and available time",
    },
    {
      tab: "insights",
      icon: "chart-timeline-variant",
      title: "Understand what’s changing",
      subtitle: "Plateau evidence, exercise profiles, 4/8-week comparisons and estimated recovery",
    },
    {
      tab: "goals",
      icon: "flag-checkered",
      title: "Meaningful milestones",
      subtitle: "Strength, consistency and measurement goals from your logs",
    },
    {
      tab: "focus",
      icon: "human",
      title: "A muscle focus that fits your plan",
      subtitle: "Preview every set and session-time change before accepting",
    },
    {
      tab: "photos",
      icon: "image-multiple-outline",
      title: "Private progress photos",
      subtitle: "Crop before upload, compare matching views and delete any time",
    },
    {
      tab: "nutrition",
      icon: "silverware-fork-knife",
      title: "Nutrition on your terms",
      subtitle: "Optional daily totals connected to Progress and meal planning",
    },
    {
      tab: "experiments",
      icon: "flask-outline",
      title: "Learn from your own training",
      subtitle: "Compare personal experiments with their evidence and limitations",
    },
    {
      tab: "reminders",
      icon: "bell-outline",
      title: "FitSync where you need it",
      subtitle: "Quiet hours, snooze, Android widgets and paired-watch notification controls",
    },
    {
      tab: "sharing",
      icon: "account-check-outline",
      title: "Keep your coach in the loop",
      subtitle: "Choose the training information, expiry and when to revoke access",
    },
    {
      tab: "reports",
      icon: "file-document-outline",
      title: "Your monthly training report",
      subtitle: "Generate and share a report from synced training and measurements",
    },
    { tab: "desktop", icon: "monitor", title: "Your desktop planning workspace", subtitle: "Edit routines and plans, manage sharing and download reports with the same account" },
  ];
  return (
    <>
      <TodayForYouCard />
      <ProSection
        eyebrow="Connected to your actual progress"
        title="A little support, every day."
      />
      <View className="gap-3">
        {features.map((feature) => (
          <ProAction
            key={feature.tab}
            icon={feature.icon}
            title={feature.title}
            subtitle={feature.subtitle}
            onPress={() => router.push(`/companion?tab=${feature.tab}` as Href)}
          />
        ))}
      </View>
    </>
  );
}
function Orbit({ value, target }: { value: number; target: number }) {
  const ratio = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <View
      className="h-28 w-28 items-center justify-center"
      accessibilityLabel={`${value} of ${target} weekly workouts completed`}
    >
      <Svg width={112} height={112} viewBox="0 0 112 112" style={{ position: "absolute" }}>
        <Circle cx={56} cy={56} r={47} fill="none" stroke="#D4F89A10" strokeWidth={1} />
        <Circle cx={56} cy={56} r={37} fill="none" stroke="#D4F89A15" strokeWidth={5} />
        <Circle
          cx={56}
          cy={56}
          r={37}
          fill="none"
          stroke={PRO.accent}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 37}
          strokeDashoffset={2 * Math.PI * 37 * (1 - ratio)}
          rotation={-90}
          origin="56,56"
        />
        <Path d="M49 46 63 56 49 66Z" fill={PRO.accent} />
      </Svg>
    </View>
  );
}
function LockedAnalytics({
  view,
  onView,
}: {
  view: AnalyticsView;
  onView: (value: AnalyticsView) => void;
}) {
  const details: Record<AnalyticsView, { title: string; text: string; items: string[] }> = {
    training: {
      title: "See the whole training story.",
      text: "Explore your own completed workouts across any saved period.",
      items: [
        "8 training measures with interactive charts",
        "All-time history, with weekly and monthly views for long ranges",
        "Equal-period comparisons and recorded-effort context",
      ],
    },
    muscles: {
      title: "Make every muscle count.",
      text: "Understand the work each movement contributes, without a guessed recovery score.",
      items: [
        "20 muscle groups and a front/back muscle map",
        "Primary and supporting sets counted separately",
        "Training frequency, volume and exercise breakdowns",
      ],
    },
    records: {
      title: "A record book that goes deeper.",
      text: "Find the details behind your best sets and see how they evolved.",
      items: [
        "All-time bests and genuine record improvements",
        "Load, reps, estimated 1RM, volume, time and distance",
        "Exercise search and a link to every real session",
      ],
    },
    body: {
      title: "Connect every check-in.",
      text: "Explore body, recovery, activity and nutrition together.",
      items: [
        "All 31 existing measurements",
        "Full-range graphs and logged-day coverage",
        "Correct, clear and add entries to your private journal",
      ],
    },
  };
  const d = details[view];
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
        <View className="flex-row gap-2">
          {(
            [
              ["training", "Training"],
              ["muscles", "Muscles"],
              ["records", "PRs"],
              ["body", "Measurements"],
            ] as const
          ).map(([id, label]) => (
            <ProPill key={id} label={label} selected={view === id} onPress={() => onView(id)} />
          ))}
        </View>
      </ScrollView>
      <GlassCard accent>
        <View
          className="mb-5 h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "#D4F89A10" }}
        >
          <MaterialCommunityIcons name="lock-open-variant-outline" color={PRO.accent} size={28} />
        </View>
        <Txt weight="medium" className="text-[31px] leading-10 tracking-[-1px]">
          {d.title}
        </Txt>
        <Txt className="mt-3 text-sm leading-6 text-muted">{d.text}</Txt>
        <View className="my-6 gap-4">
          {d.items.map((text) => (
            <View key={text} className="flex-row items-start gap-3">
              <MaterialCommunityIcons name="check" color={PRO.accent} size={17} />
              <Txt className="flex-1 text-xs leading-5">{text}</Txt>
            </View>
          ))}
        </View>
        <ProButton title="Explore membership" onPress={() => router.push("/membership")} />
        <Txt className="mt-4 text-[11px] leading-5 text-muted">
          Your existing charts, personal records, logging and full history stay free in Progress.
        </Txt>
      </GlassCard>
    </>
  );
}
function RoutineLibrary({ ownerId }: { ownerId: string }) {
  const [items, setItems] = useState<WorkoutTemplate[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const alive = useRef(true),
    sequence = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const refresh = useCallback(async () => {
    const id = ++sequence.current;
    setLoading(true);
    setError("");
    try {
      const value = await workoutApi.templates(ownerId);
      if (alive.current && sequence.current === id) setItems(value);
    } catch (e) {
      if (alive.current && sequence.current === id)
        setError(e instanceof Error ? e.message : "Could not load routines.");
    } finally {
      if (alive.current && sequence.current === id) setLoading(false);
    }
  }, [ownerId]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  return (
    <>
      <ProSection
        eyebrow="Your own training library"
        title="Routines without a ceiling."
        action="Create"
        onAction={() => router.push("/workout/create")}
      />
      {loading ? (
        <ActivityIndicator color={PRO.accent} className="my-5" />
      ) : error ? (
        <ProAction
          title="Reload routines"
          subtitle={error}
          icon="refresh"
          onPress={() => void refresh()}
        />
      ) : (
        <GlassCard>
          <View className="mb-5 flex-row gap-4">
            <ProStat label="SAVED ROUTINES" value={items.length} />
            <ProStat label="ROUTINE LIMIT" value="∞" detail="No subscription cap" />
          </View>
          {items.length ? (
            <View className="gap-2">
              {items.slice(0, 3).map((item) => (
                <ProAction
                  key={item.id}
                  icon="dumbbell"
                  title={item.name}
                  subtitle={`${item.workout_template_exercises.length} exercises · saved routine`}
                  onPress={() => router.push("/(tabs)/train")}
                />
              ))}
            </View>
          ) : (
            <Txt className="text-xs leading-6 text-muted">
              Build your first reusable routine with exercises, sets, targets and rest times. It
              will appear here and in Train.
            </Txt>
          )}
          <View className="mt-4">
            <ProPill
              label="Open all routines"
              selected={false}
              onPress={() => router.push("/(tabs)/train")}
            />
          </View>
        </GlassCard>
      )}
    </>
  );
}
