import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Txt } from "@/src/components/ui";
import { useSession, type Equipment, type Experience, type Goal } from "@/src/context/session";
import { useBilling } from "../billing/billing-context";
import { useCoaching } from "../coaching/use-coaching";
import {
  EQUIPMENT_LABELS,
  GOAL_LABELS,
  displayDate,
  exerciseTarget,
  localDate,
  localTimezone,
  nextSession,
} from "../coaching/model";
import type { CoachingProfile, PlanPreview, WeeklyReview } from "../coaching/api";
import { Sheet } from "../progress/editors";
import {
  GlassCard,
  ProAction,
  ProButton,
  ProPill,
  ProSection,
  ProStat,
  PRO,
  Reveal,
} from "./hub-ui";
import { OneRepMax, WarmupCalculator } from "./tool-calculators";
export { OneRepMax, WarmupCalculator } from "./tool-calculators";

export type ProTool = "warmup" | "one-rep-max" | null;
export function TrainingTools({
  tool,
  onTool,
}: {
  tool: ProTool;
  onTool: (value: ProTool) => void;
}) {
  return (
    <>
      <GlassCard accent>
        <Txt className="text-[10px] tracking-[2px]" style={{ color: PRO.accent }}>
          THE TRAINING TOOLBOX
        </Txt>
        <Txt weight="medium" className="mt-3 text-[32px] leading-10 tracking-[-1px]">
          Less guessing.{`\n`}More good sessions.
        </Txt>
        <Txt className="mt-3 text-sm leading-6 text-muted">
          Calculate your warm-up, build your own movements and keep every routine ready for your
          next session.
        </Txt>
      </GlassCard>
      <ProSection title="Made for the gym" />
      <View className="gap-3">
        <ProAction
          icon="weight-lifter"
          title="Warm-up & plate calculator"
          subtitle="Gradual practice sets, available plates and per-side loading"
          onPress={() => onTool("warmup")}
        />
        <ProAction
          icon="calculator-variant-outline"
          title="Estimated one-rep max"
          subtitle="Compare Epley and Brzycki estimates from your logged reps"
          onPress={() => onTool("one-rep-max")}
        />
        <ProAction
          icon="playlist-plus"
          title="Unlimited routines"
          subtitle="Build as many reusable routines as you need"
          onPress={() => router.push("/workout/create")}
        />
        <ProAction
          icon="dumbbell"
          title="Custom exercise library"
          subtitle="Your movements, equipment, instructions and muscle labels"
          onPress={() => router.push("/exercises/custom")}
        />
        <ProAction
          icon="calendar-month-outline"
          title="Training calendar"
          subtitle="Plan your next session and revisit completed workouts"
          onPress={() => router.push("/calendar")}
        />
        <ProAction
          icon="silverware-fork-knife"
          title="Weekly meals & shopping list"
          subtitle="Preferences, meal swaps, portions and a practical grocery list"
          onPress={() => router.push("/wellness")}
        />
        <ProAction
          icon="book-open-page-variant-outline"
          title="Your program archive"
          subtitle="Current and past programs, with real session history"
          onPress={() => router.push("/programs")}
        />
        <ProAction
          icon="heart-pulse"
          title="Health connections"
          subtitle="Manage opt-in Health Connect imports"
          onPress={() => router.push("/health-sync")}
        />
      </View>
      <ProSection
        title="The principles behind your plan"
        description="Practical guidance, with the sources available to read."
      />
      <GlassCard>
        <Txt weight="medium" className="text-base">
          Consistency, progression, recovery.
        </Txt>
        <Txt className="mt-3 text-sm leading-6 text-muted">
          Training should fit your experience, available equipment and schedule. Your starting plan
          repeats key movements, leaves recovery space and changes loads only when comparable logs
          and your recorded effort support it.
        </Txt>
        <Txt className="mt-3 text-xs leading-5 text-muted">
          Warm-up needs differ by movement and person. Calculator percentages are editable starting
          points; they are not a validated prescription or a guarantee of performance.
        </Txt>
        <View className="mt-5 gap-3">
          <ProAction
            icon="open-in-new"
            title="ACSM training guidance · 2026"
            subtitle="Read the resistance-training overview"
            onPress={() => {
              void Linking.openURL(
                "https://acsm.org/resistance-training-guidelines-update-2026/",
              ).catch(() => {});
            }}
          />
          <ProAction
            icon="open-in-new"
            title="Warm-up evidence review"
            subtitle="Read the 2025 systematic review"
            onPress={() => {
              void Linking.openURL("https://pubmed.ncbi.nlm.nih.gov/39864808/").catch(() => {});
            }}
          />
        </View>
      </GlassCard>
      {tool === "warmup" && <WarmupCalculator onClose={() => onTool(null)} />}
      {tool === "one-rep-max" && <OneRepMax onClose={() => onTool(null)} />}
    </>
  );
}
function Field({
  label,
  value,
  onChange,
  disabled = false,
  numeric: numberInput = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  numeric?: boolean;
}) {
  return (
    <View className="mb-4 flex-1">
      <Txt className="mb-2 text-xs text-muted">{label}</Txt>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        keyboardType={numberInput ? "decimal-pad" : "default"}
        autoCorrect={false}
        maxLength={numberInput ? 12 : 200}
        placeholderTextColor={PRO.muted}
        className="min-h-14 rounded-2xl bg-white/5 px-4 font-poppins-medium text-base text-ink"
      />
    </View>
  );
}

export function TrainerPanel({
  builderOpen,
  onBuilder,
}: {
  builderOpen: boolean;
  onBuilder: (open: boolean) => void;
}) {
  const resource = useCoaching();
  const billing = useBilling();
  const plan = resource.data?.plan ?? null;
  const next = nextSession(plan);
  const [review, setReview] = useState<WeeklyReview | null>(null),
    [reviewError, setReviewError] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  useEffect(() => {
    if (!billing.isPro) return;
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setReviewLoading(true);
      setReviewError("");
      try {
        const value = await resource.api.review();
        if (active) setReview(value);
      } catch (e) {
        if (active) setReviewError(e instanceof Error ? e.message : "Could not load your review.");
      } finally {
        if (active) setReviewLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [billing.isPro, resource.api]);
  return (
    <>
      <GlassCard accent>
        <Txt className="text-[10px] tracking-[2px]" style={{ color: PRO.accent }}>
          FITSYNC TRAINER
        </Txt>
        <Txt weight="medium" className="mt-3 text-[34px] leading-10 tracking-[-1px]">
          A plan with{`\n`}a reason behind it.
        </Txt>
        <Txt className="mt-3 text-sm leading-6 text-muted">
          Your goals, experience, equipment and real schedule. Review the prescription before you
          commit; adapt it as life changes.
        </Txt>
        <View className="mt-6">
          <ProButton
            title={plan ? "Make a new plan" : "Build my training plan"}
            onPress={() => onBuilder(true)}
          />
        </View>
      </GlassCard>
      <ProSection title="Your current plan" action="Open" onAction={() => router.push("/coach")} />
      {resource.loading && <ActivityIndicator color={PRO.accent} className="my-4" />}
      {resource.error && (
        <ProAction
          title="Reload your plan"
          subtitle={resource.error}
          icon="refresh"
          onPress={() => void resource.refresh()}
        />
      )}
      {plan ? (
        <GlassCard>
          <Txt weight="medium" className="text-xl">
            {plan.name}
          </Txt>
          <Txt className="mt-2 text-xs leading-5 text-muted">
            {GOAL_LABELS[plan.goal]} · {plan.trainingDays} training days · {plan.minutesPerWorkout}{" "}
            min · {EQUIPMENT_LABELS[plan.equipment]}
          </Txt>
          <View className="mt-5 flex-row gap-4">
            <ProStat
              label="SESSIONS COMPLETED"
              value={plan.sessions.filter((d) => d.status === "completed").length}
              detail={`of ${plan.sessions.length} scheduled`}
            />
            <ProStat
              label="NEXT SESSION"
              value={next ? `W${next.week}` : "Done"}
              detail={next ? displayDate(next.date) : "All sessions logged"}
            />
          </View>
          {next && (
            <View className="mt-5">
              <ProAction
                icon="dumbbell"
                title={next.name}
                subtitle={`${next.prescription.exercises.length} exercises · open, adapt or start`}
                onPress={() => router.push("/coach")}
              />
            </View>
          )}
        </GlassCard>
      ) : (
        !resource.loading &&
        !resource.error && (
          <GlassCard>
            <Txt className="text-sm leading-6 text-muted">
              No active personal plan yet. Build a preview using your preferences, then save it when
              you’re happy with the sessions.
            </Txt>
          </GlassCard>
        )
      )}
      <ProSection title="This week's direction" />
      {billing.isPro && reviewLoading ? (
        <ActivityIndicator color={PRO.accent} className="my-5" />
      ) : billing.isPro && review ? (
        <GlassCard accent>
          <Txt weight="medium" className="text-xl leading-7">
            {review.headline}
          </Txt>
          <Txt className="mt-2 text-[10px] text-muted">
            {review.period.start} – {review.period.end}
          </Txt>
          <View className="mt-5 gap-3">
            {review.actions.map((text, i) => (
              <Txt key={i} className="text-sm leading-6">
                <Txt style={{ color: PRO.accent }}>0{i + 1} </Txt>
                {text}
              </Txt>
            ))}
          </View>
          <View className="mt-5">
            <ProAction
              icon="text-box-search-outline"
              title="Read your full review"
              subtitle="Observations, comparisons and missing-data notes"
              onPress={() => router.push("/coach/review")}
            />
          </View>
        </GlassCard>
      ) : billing.isPro && reviewError ? (
        <ProAction
          icon="refresh"
          title="Open weekly review"
          subtitle={reviewError}
          onPress={() => router.push("/coach/review")}
        />
      ) : (
        <GlassCard>
          <Txt className="text-sm leading-6 text-muted">
            Weekly reviews use your completed workouts and available health check-ins. Pro adds
            guidance and explained adjustments to your free starting plan.
          </Txt>
        </GlassCard>
      )}
      <ProSection title="Make the plan fit today" />
      <View className="gap-3">
        <ProAction
          icon="calendar-refresh-outline"
          title="Adjust a session"
          subtitle="Time, equipment, easier effort or a suitable exercise swap"
          onPress={() => router.push("/coach")}
        />
        <ProAction
          icon="trending-up"
          title="Review your next progression"
          subtitle="Comparable sets and effort, with an explanation for each suggestion"
          onPress={() => router.push("/coach")}
        />
        <ProAction
          icon="calendar-clock"
          title="Move a missed workout"
          subtitle="Reschedule future sessions while keeping recovery spacing"
          onPress={() => router.push("/coach")}
        />
      </View>
      {builderOpen && <PlanMaker resource={resource} onClose={() => onBuilder(false)} />}
    </>
  );
}
function PlanMaker({
  resource,
  onClose,
}: {
  resource: ReturnType<typeof useCoaching>;
  onClose: () => void;
}) {
  const { profile, settings } = useSession();
  const [preferences, setPreferences] = useState<CoachingProfile>({
    goal: profile?.goal ?? "fitness",
    experience: profile?.experience ?? "beginner",
    equipment: profile?.equipment ?? "bodyweight",
    trainingDays: profile?.trainingDays ?? 3,
    minutesPerWorkout: profile?.minutesPerWorkout ?? 45,
  });
  const [date, setDate] = useState(localDate());
  const [preview, setPreview] = useState<PlanPreview | null>(null);
  const [week, setWeek] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const change = <K extends keyof CoachingProfile>(key: K, value: CoachingProfile[K]) => {
    setPreview(null);
    setPreferences((p) => ({ ...p, [key]: value }));
  };
  const build = async () => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const value = await resource.api.preview({
        preferences,
        startDate: date,
        timezone: localTimezone(),
      });
      if (alive.current) {
        setPreview(value);
        setWeek(1);
      }
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : "Could not preview this plan.");
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const save = async () => {
    if (locked.current || !preview) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await resource.mutate(
        `pro-create:${JSON.stringify(preferences)}:${date}:${resource.data?.plan?.id ?? "new"}`,
        (requestId) =>
          resource.api.create({
            requestId,
            preferences,
            startDate: date,
            timezone: localTimezone(),
            ...(resource.data?.plan ? { replacePlanId: resource.data.plan.id } : {}),
          }),
      );
      if (result && alive.current) {
        onClose();
        router.push("/coach");
      }
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Could not save. Your preview is kept.");
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  };
  return (
    <Sheet
      title="Your plan maker"
      subtitle="Preview four weeks. Save when the prescription fits."
      onClose={onClose}
      busy={busy || resource.busy}
    >
      {!preview ? (
        <>
          <ProSection title="Your main goal" />
          <View className="flex-row flex-wrap gap-2">
            {(Object.keys(GOAL_LABELS) as Goal[]).map((value) => (
              <ProPill
                key={value}
                label={GOAL_LABELS[value]}
                selected={preferences.goal === value}
                disabled={busy}
                onPress={() => change("goal", value)}
              />
            ))}
          </View>
          <ProSection title="Your experience" />
          <View className="flex-row flex-wrap gap-2">
            {(["beginner", "intermediate", "advanced"] as Experience[]).map((value) => (
              <ProPill
                key={value}
                label={value}
                selected={preferences.experience === value}
                disabled={busy}
                onPress={() => change("experience", value)}
              />
            ))}
          </View>
          <ProSection title="Your equipment" />
          <View className="flex-row flex-wrap gap-2">
            {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((value) => (
              <ProPill
                key={value}
                label={EQUIPMENT_LABELS[value]}
                selected={preferences.equipment === value}
                disabled={busy}
                onPress={() => change("equipment", value)}
              />
            ))}
          </View>
          <ProSection title="Available days per week" />
          <View className="flex-row flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((value) => (
              <ProPill
                key={value}
                label={String(value)}
                selected={preferences.trainingDays === value}
                disabled={busy}
                onPress={() => change("trainingDays", value)}
              />
            ))}
          </View>
          <Txt className="mt-3 text-xs leading-5 text-muted">
            Beginners receive up to 3 strength days; other levels up to 4, with recovery space.
            Extra available days can support comfortable activity.
          </Txt>
          <ProSection title="Session length" />
          <View className="flex-row gap-2">
            {([30, 45, 60] as const).map((value) => (
              <ProPill
                key={value}
                label={`${value} min`}
                selected={preferences.minutesPerWorkout === value}
                disabled={busy}
                onPress={() => change("minutesPerWorkout", value)}
              />
            ))}
          </View>
          <ProSection title="Start date" />
          <Field
            label="Start date · YYYY-MM-DD"
            value={date}
            onChange={setDate}
            disabled={busy}
            numeric={false}
          />
          <Txt className="mb-5 text-xs leading-5 text-muted">
            Timezone: {localTimezone()}. Four training days alternate upper and lower body; shorter
            weeks use full-body sessions. No starting load is guessed from your body size.
          </Txt>
          <ProButton
            title="Preview my plan"
            onPress={() => void build()}
            loading={busy}
            disabled={!profile}
          />
        </>
      ) : (
        <Reveal>
          <GlassCard accent>
            <Txt weight="medium" className="text-xl">
              {preview.name}
            </Txt>
            <Txt className="mt-2 text-xs leading-5 text-muted">
              {preview.trainingDays} training days/week · {preview.sessions.length} sessions ·{" "}
              {preview.minutesPerWorkout} min
            </Txt>
            <View className="mt-4 gap-2">
              {preview.explanation.map((text, i) => (
                <Txt key={i} className="text-xs leading-5 text-muted">
                  {text}
                </Txt>
              ))}
            </View>
          </GlassCard>
          <View className="my-5 flex-row gap-2">
            {[1, 2, 3, 4].map((value) => (
              <ProPill
                key={value}
                label={`Week ${value}`}
                selected={week === value}
                onPress={() => setWeek(value)}
              />
            ))}
          </View>
          <View className="gap-3">
            {preview.sessions
              .filter((day) => day.week === week)
              .map((day) => (
                <GlassCard key={`${day.week}:${day.day}`}>
                  <Txt className="text-[10px] text-muted">{displayDate(day.date)}</Txt>
                  <Txt weight="medium" className="mt-2 text-lg">
                    {day.name}
                  </Txt>
                  <View className="mt-4 gap-4">
                    {day.prescription.exercises.map((e) => (
                      <View key={e.exerciseId}>
                        <Txt weight="medium" className="text-sm">
                          {e.name}
                        </Txt>
                        <Txt className="mt-1 text-xs" style={{ color: PRO.accent }}>
                          {exerciseTarget(e, settings?.weightUnit)} · {e.restSeconds}s rest
                        </Txt>
                        <Txt className="mt-1 text-[10px] leading-4 text-muted">{e.reason}</Txt>
                      </View>
                    ))}
                  </View>
                  {day.prescription.explanation.map((text, i) => (
                    <Txt key={i} className="mt-3 text-[11px] leading-5 text-muted">
                      {text}
                    </Txt>
                  ))}
                </GlassCard>
              ))}
          </View>
          {resource.data?.plan && (
            <Txt className="my-5 text-xs leading-5 text-muted">
              Saving replaces your current personal plan. Completed workouts and records are
              preserved. Finish any active workout first.
            </Txt>
          )}
          <View className="mt-5 gap-3">
            <ProButton
              title="Save & open my plan"
              onPress={() => void save()}
              loading={busy || resource.busy}
              disabled={resource.loading || (!!resource.error && !resource.data)}
            />
            <ProPill
              label="Adjust my preferences"
              selected={false}
              disabled={busy}
              onPress={() => setPreview(null)}
            />
          </View>
        </Reveal>
      )}
      {!!error && (
        <Txt accessibilityRole="alert" className="mt-5 text-sm leading-6 text-red-300">
          {error}
        </Txt>
      )}
    </Sheet>
  );
}
