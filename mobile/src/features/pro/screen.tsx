import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect, type Href } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { useSession } from "@/src/context/session";
import { MotionPressable, ScreenEntrance } from "@/src/components/motion";
import { TabScrollView } from "@/src/components/tab-bar-motion";
import { PageHeading, Txt } from "@/src/components/ui";
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
  type ProIcon,
} from "./hub-ui";

type Section = "overview" | "analytics" | "trainer" | "tools" | "companion";
const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "companion", label: "For you" },
  { id: "analytics", label: "Analytics" },
  { id: "trainer", label: "Trainer" },
  { id: "tools", label: "Tools" },
] as const;

// Keep paid hooks and private training content behind the verified entitlement boundary.
export function ProHubScreen() {
  const { user } = useSession();
  const billing = useBilling();
  return (
    <ProScene>
      {billing.isPro && user?.id ? (
        <ProHub key={user.id} />
      ) : (
        <ProBenefits
          checking={billing.loading}
          error={billing.error}
          onRetry={() => void billing.refresh()}
        />
      )}
    </ProScene>
  );
}

function ProBrand({ member = false }: { member?: boolean }) {
  return (
    <View className="mb-6 flex-row items-center justify-between gap-3">
      <View className="flex-row items-center gap-2">
        <MaterialCommunityIcons name="star-four-points" size={19} color="white" />
        <Txt weight="semibold" className="text-[12px] tracking-[1.8px]">
          FITSync
        </Txt>
        <View className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5">
          <Txt weight="medium" className="text-[9px] tracking-wider">
            PRO
          </Txt>
        </View>
      </View>
      {member && (
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Manage Pro membership"
          onPress={() => router.push("/membership")}
          className="min-h-11 flex-row items-center gap-1.5 rounded-full bg-white/5 px-3"
        >
          <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRO.accent }} />
          <Txt className="text-[10px]">Member</Txt>
          <MaterialCommunityIcons name="chevron-right" size={14} color={PRO.muted} />
        </MotionPressable>
      )}
    </View>
  );
}

const BENEFITS: { icon: ProIcon; title: string; description: string; detail: string }[] = [
  {
    icon: "chart-timeline-variant",
    title: "Go deeper into your progress",
    description:
      "Unlimited graph history, personal records and training-block comparisons. See the evidence behind plateaus and exercise trends.",
    detail: "Deep analytics",
  },
  {
    icon: "human",
    title: "Understand every muscle",
    description:
      "Explore muscle workload, balance and estimated recovery. Preview a specialisation block before changing your plan.",
    detail: "Muscle insights",
  },
  {
    icon: "creation-outline",
    title: "A trainer in your corner",
    description:
      "Build a plan around your goals, equipment and schedule. Get working-set targets and recommendations that explain why.",
    detail: "FitSync trainer",
  },
  {
    icon: "playlist-plus",
    title: "Make training your own",
    description:
      "Unlimited routines, custom exercises, warm-up and plate calculators. Plan supersets, drop sets, tempo and rest times.",
    detail: "Your training toolbox",
  },
  {
    icon: "weather-sunset",
    title: "A little guidance, every day",
    description:
      "Your daily briefing, optional readiness check-ins, goal milestones and personal reminders that fit your day.",
    detail: "Daily support",
  },
  {
    icon: "shield-lock-outline",
    title: "Keep your whole story together",
    description:
      "Track measurements, compare private photos and explore optional nutrition. Use desktop planning, monthly reports and sharing you control.",
    detail: "Connected to your account",
  },
];

function ProBenefits({
  checking,
  error,
  onRetry,
}: {
  checking: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <ScreenEntrance className="flex-1">
      <TabScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="w-full max-w-2xl self-center px-6 pt-6 pb-48"
        refreshControl={
          <RefreshControl refreshing={checking} onRefresh={onRetry} tintColor="white" />
        }
      >
        <ProBrand />
        <Reveal>
          <GlassCard accent>
            <View className="mb-7 flex-row items-center justify-between">
              <View className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <Txt className="text-[10px] text-white/80">A little more possibility</Txt>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5">
                <MaterialCommunityIcons name="star-four-points" size={25} color="white" />
              </View>
            </View>
            <Txt
              accessibilityRole="header"
              weight="medium"
              className="text-[34px] leading-[44px] tracking-[-1.5px]"
            >
              Your training.{"\n"}A level deeper.
            </Txt>
            <Txt className="mb-6 mt-3 text-sm leading-6 text-muted">
              Understand your progress. Find your next step. Make every session feel more yours.
            </Txt>
            <ProButton title="Become a Pro" onPress={() => router.push("/membership")} />
            <Txt className="mt-3 text-center text-[10px] leading-5 text-muted">
              Explore plans and everything included.
            </Txt>
          </GlassCard>
        </Reveal>
        {checking ? (
          <View accessibilityLiveRegion="polite" className="mt-4 flex-row items-center gap-2 px-1">
            <ActivityIndicator size="small" color="white" />
            <Txt className="text-xs text-muted">Checking your membership…</Txt>
          </View>
        ) : error ? (
          <View className="mt-4">
            <ProAction
              icon="refresh"
              title="Check membership again"
              subtitle="We couldn’t verify your membership. Retry to open your Pro workspace."
              onPress={onRetry}
            />
          </View>
        ) : null}
        <ProSection
          eyebrow="Made for the way you train"
          title="More insight. More possibilities."
        />
        <View className="gap-3">
          {BENEFITS.map((benefit, index) => (
            <Reveal key={benefit.title} delay={Math.min(index * 45, 180)}>
              <GlassCard blur={false}>
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/5">
                    <MaterialCommunityIcons
                      name={benefit.icon}
                      size={23}
                      color={index === 0 ? PRO.accent : "white"}
                    />
                  </View>
                  <Txt className="text-[10px] text-muted">{benefit.detail}</Txt>
                </View>
                <Txt weight="medium" className="mt-4 text-[17px] leading-6 tracking-[-0.3px]">
                  {benefit.title}
                </Txt>
                <Txt className="mt-2 text-xs leading-[21px] text-muted">{benefit.description}</Txt>
              </GlassCard>
            </Reveal>
          ))}
        </View>
        <View className="mb-3 mt-7">
          <ProButton title="Become a Pro" onPress={() => router.push("/membership")} />
        </View>
        <MotionPressable
          accessibilityRole="button"
          onPress={() => router.push("/membership")}
          className="min-h-11 items-center justify-center"
        >
          <Txt className="text-xs text-muted">Membership & billing ↗</Txt>
        </MotionPressable>
        <View className="mt-3 flex-row items-center justify-center gap-2">
          <MaterialCommunityIcons name="shield-check-outline" size={13} color={PRO.muted} />
          <Txt className="text-[10px] text-muted">Your progress. Your account. Your control.</Txt>
        </View>
      </TabScrollView>
    </ScreenEntrance>
  );
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
    <ScreenEntrance className="flex-1">
      <TabScrollView
        ref={scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="w-full max-w-2xl self-center px-6 pt-6 pb-48"
        refreshControl={
          <RefreshControl
            refreshing={progress.refreshing && !progress.loading}
            onRefresh={refresh}
            tintColor="white"
          />
        }
      >
        <ProBrand member />
        <PageHeading
          eyebrow="A little more direction"
          title="Your Pro workspace."
          subtitle="Your training, understood."
        />
        <View className="mb-6 mt-2 flex-row border-b border-white/10">
          {SECTIONS.map((s) => (
            <MotionPressable
              key={s.id}
              accessibilityRole="tab"
              accessibilityLabel={s.label}
              accessibilityState={{ selected: section === s.id }}
              onPress={() => navigate(s.id)}
              className="min-h-12 min-w-0 flex-1 items-center justify-center border-b-2 px-0.5"
              style={{ borderBottomColor: section === s.id ? "#FFFFFF" : "transparent" }}
            >
              <Txt
                weight="medium"
                className="text-[11px]"
                style={{ color: section === s.id ? "#FFFFFF" : PRO.muted }}
              >
                {s.label}
              </Txt>
            </MotionPressable>
          ))}
        </View>
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
              <ActivityIndicator color="white" />
              <Txt className="text-sm text-muted">Opening your training history…</Txt>
            </View>
          </GlassCard>
        ) : (
          <Reveal key={section}>
            {section === "overview" && (
              <>
                <GlassCard accent>
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="min-w-0 flex-1">
                      <Txt className="text-[10px] text-muted">YOUR WEEK SO FAR</Txt>
                      <Txt
                        weight="medium"
                        className="mt-3 text-[46px] leading-[58px] tracking-[-2px]"
                      >
                        {historyUnavailable ? "—" : thisWeek}
                        <Txt className="text-lg tracking-normal text-muted">
                          {" "}
                          / {progress.goals.weeklyWorkouts}
                        </Txt>
                      </Txt>
                      <Txt className="mt-1 text-xs text-muted">workouts completed</Txt>
                    </View>
                    {!historyUnavailable && (
                      <Orbit value={thisWeek} target={progress.goals.weeklyWorkouts} />
                    )}
                  </View>
                  <View className="mt-5 flex-row gap-5 border-t border-white/10 pt-4">
                    <ProStat
                      label="TOTAL SESSIONS"
                      value={historyUnavailable ? "—" : compact(data.allTime.workouts)}
                    />
                    <ProStat
                      label="TIME INVESTED"
                      value={historyUnavailable ? "—" : compact(data.allTime.minutes / 60)}
                      unit="hrs"
                    />
                  </View>
                </GlassCard>
                <View className="mt-3">
                  <ProAction
                    icon="weather-sunset"
                    title="Your daily Pro companion"
                    subtitle="Your next session, readiness and one useful insight"
                    onPress={() => navigate("companion")}
                  />
                </View>
                <ProSection
                  title="Explore your progress"
                  action="View all"
                  onAction={() => navigate("analytics")}
                />
                <View className="flex-row flex-wrap justify-between gap-y-3">
                  {(
                    [
                      [
                        "training",
                        "chart-timeline-variant",
                        "Training trends",
                        "Your full history",
                      ],
                      ["muscles", "human", "Muscle insights", "Workload & balance"],
                      [
                        "records",
                        "trophy-outline",
                        "Personal records",
                        "Every exercise, every best",
                      ],
                      ["body", "tape-measure", "Measurements", "Your whole picture"],
                    ] as const
                  ).map(([id, icon, title, subtitle]) => (
                    <InsightTile
                      key={id}
                      icon={icon}
                      title={title}
                      subtitle={subtitle}
                      onPress={() => navigate("analytics", id)}
                    />
                  ))}
                </View>
                <ProSection title="Built around you" />
                <View className="gap-3">
                  <ProAction
                    icon="creation-outline"
                    title="FitSync trainer"
                    subtitle="Build your plan. Review your progress. Understand why."
                    onPress={() => navigate("trainer")}
                  />
                  <ProAction
                    icon="calculator-variant-outline"
                    title="Your training toolbox"
                    subtitle="Warm-ups, custom exercises and unlimited routines"
                    onPress={() => navigate("tools")}
                  />
                  <ProAction
                    icon="flag-checkered"
                    title="Goals & milestones"
                    subtitle="Keep the next meaningful step in sight"
                    onPress={() => router.push("/companion?tab=goals")}
                  />
                </View>
              </>
            )}
            {section === "analytics" && (
              <>
                <View className="mb-5">
                  <Txt className="mb-3 text-[10px] text-muted">ANALYSIS RANGE</Txt>
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
                  <Txt className="mb-3 text-xs text-muted">Updating exercise muscle labels…</Txt>
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
            )}
            {section === "companion" && <CompanionShortcuts />}
            {section === "trainer" && <TrainerPanel builderOpen={builder} onBuilder={setBuilder} />}
            {section === "tools" && (
              <>
                <TrainingTools tool={tool} onTool={setTool} />
                <RoutineLibrary ownerId={user?.id ?? ""} />
              </>
            )}
          </Reveal>
        )}
        <View className="mt-8 flex-row items-center justify-center gap-2">
          <MaterialCommunityIcons
            name={issue ? "cloud-off-outline" : "shield-check-outline"}
            size={13}
            color={PRO.muted}
          />
          <Txt className="text-[10px] text-muted">
            {progress.refreshing
              ? "Syncing your training"
              : issue
                ? "Showing saved history"
                : progress.journal.workoutsUpdatedAt
                  ? `Training synced · ${dateLabel(localDate(new Date(progress.journal.workoutsUpdatedAt)))}`
                  : "Private to your FitSync account"}
          </Txt>
        </View>
      </TabScrollView>
    </ScreenEntrance>
  );
}

function InsightTile({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: ProIcon;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={{ width: "48.5%" }}
      className="overflow-hidden rounded-[22px] border border-white/5 bg-white/5 p-4"
    >
      <View className="mb-6 flex-row items-center justify-between">
        <MaterialCommunityIcons name={icon} size={23} color="white" />
        <MaterialCommunityIcons name="arrow-top-right" size={15} color={PRO.muted} />
      </View>
      <Txt weight="medium" className="text-[13px]">
        {title}
      </Txt>
      <Txt className="mt-1 text-[10px] leading-4 text-muted">{subtitle}</Txt>
    </MotionPressable>
  );
}

function Orbit({ value, target }: { value: number; target: number }) {
  const ratio = target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
  return (
    <View
      className="h-24 w-24 items-center justify-center"
      accessibilityLabel={`${value} of ${target} weekly workouts completed`}
    >
      <Svg width={96} height={96} viewBox="0 0 96 96" style={{ position: "absolute" }}>
        <Circle cx={48} cy={48} r={38} fill="none" stroke="#FFFFFF0D" strokeWidth={5} />
        <Circle
          cx={48}
          cy={48}
          r={38}
          fill="none"
          stroke={PRO.accent}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 38}
          strokeDashoffset={2 * Math.PI * 38 * (1 - ratio)}
          rotation={-90}
          origin="48,48"
        />
      </Svg>
      <MaterialCommunityIcons
        name={ratio >= 1 ? "check" : "dumbbell"}
        size={25}
        color={ratio >= 1 ? PRO.accent : "white"}
      />
    </View>
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
    {
      tab: "desktop",
      icon: "monitor",
      title: "Your desktop planning workspace",
      subtitle:
        "Edit routines and plans, manage sharing and download reports with the same account",
    },
  ];
  return (
    <>
      <TodayForYouCard />
      <ProSection eyebrow="Connected to your actual progress" title="Your daily companion" />
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
