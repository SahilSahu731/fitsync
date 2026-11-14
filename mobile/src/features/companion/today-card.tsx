import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { router, type Href } from "expo-router";
import { Txt } from "@/src/components/ui";
import { useAppAlert } from "@/src/components/app-dialog";
import { useBilling } from "../billing/billing-context";
import { useProgress } from "../progress/use-progress";
import { dateLabel, localDate } from "../progress/model";
import { workoutDate } from "../progress/analytics";
import { useWorkout } from "../workouts/workout-context";
import { useCoaching } from "../coaching/use-coaching";
import { GlassCard, ProAction, ProButton, PRO } from "../pro/ui";
import { useCompanion } from "./companion-context";
import { effectiveReadiness, todayBriefing } from "./model";
import type { CompanionRecord } from "./api";
import type { AdaptInput, CoachingDay, CoachingPlan } from "../coaching/api";
import { useProgram } from "../program-follow/program-context";
import { programFocus } from "../program-follow/program-view";
import { WorkoutAction } from "../program-follow/workout-action";
import type { FollowedProgram } from "../program-follow/api";
import { suggestWorkingSetTargets } from "../pro/companion-insights";

export function TodayForYouCard() {
  const program = useProgram();
  const companion = useCompanion(),
    progress = useProgress(),
    coaching = useCoaching(),
    workout = useWorkout(),
    billing = useBilling();
  const { alert } = useAppAlert();
  const [why, setWhy] = useState(false),
    [preview, setPreview] = useState<{
      plan: CoachingPlan;
      day: CoachingDay;
      input: AdaptInput;
      sourceKey: string;
    } | null>(null);
  const [working, setWorking] = useState(false),
    [error, setError] = useState("");
  const today = localDate();
  const readinessRecord = companion.state.records.find(
    (item) => item.kind === "readiness" && item.date === today,
  ) as CompanionRecord<"readiness"> | undefined;
  const ready = effectiveReadiness(readinessRecord, progress.journal.events, today);
  const briefing = useMemo(
    () => todayBriefing(coaching.data?.plan ?? null, progress.journal.workouts, today, ready),
    [coaching.data?.plan, progress.journal.workouts, today, ready],
  );
  const day = briefing.day;
  const firstMovement = day?.prescription.exercises[0];
  const targetInsight = firstMovement
    ? suggestWorkingSetTargets(
        progress.journal.workouts,
        firstMovement.exerciseId,
        firstMovement.trackingType,
        today,
      )
    : null;
  const sourceKey = `${day?.id}:${day?.revision}:${day?.status}:${JSON.stringify(briefing.suggestion)}`;
  const validPreview = preview?.sourceKey === sourceKey ? preview : null;
  async function run(action: () => Promise<void>) {
    setWorking(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect. Please retry.");
    } finally {
      setWorking(false);
    }
  }
  const start = () =>
    void run(async () => {
      if (workout.session) {
        router.push("/workout");
        return;
      }
      if (!day) {
        router.push("/(tabs)/train");
        return;
      }
      await workout.ensureSynced();
      const result = await coaching.mutate(`briefing-start:${day.id}`, (id) =>
        coaching.api.start(day.id, id),
      );
      if (result) {
        await workout.refresh();
        await coaching.refresh();
        if (result.status === "active") router.push("/workout");
      }
    });
  const previewChange = () =>
    void run(async () => {
      if (!billing.isPro) {
        router.push("/membership");
        return;
      }
      if (!day || !briefing.suggestion) return;
      if (ready.availableMinutes != null && ready.availableMinutes < 15) {
        alert(
          "A shorter window",
          "The plan adapter supports sessions of at least 15 minutes. Choose rest today or open training for your own short session.",
        );
        return;
      }
      const value = await coaching.mutate(
        `readiness-preview:${day.id}:${day.revision}:${JSON.stringify(briefing.suggestion)}`,
        (id) => coaching.api.adapt(day, id, { ...briefing.suggestion!, preview: true }),
      );
      if (value) setPreview({ plan: value, day, input: briefing.suggestion, sourceKey });
    });
  const adapted = validPreview?.plan.sessions.find((item) => item.id === day?.id);
  if (program.active?.enrollment.status === "active")
    return <ProgramBriefing detail={program.active} />;
  return (
    <View className="mb-5">
      <GlassCard accent>
        <Txt className="text-[10px] tracking-[2px]" style={{ color: PRO.accent }}>
          TODAY FOR YOU
        </Txt>
        <Txt weight="medium" className="mt-3 text-[25px] leading-8">
          {workout.session?.name ??
            day?.name ??
            (briefing.completedToday.length
              ? "Your effort is recorded."
              : briefing.restDay
                ? "A little room to recover."
                : "Your next session starts here.")}
        </Txt>
        <Txt className="mt-2 text-sm leading-6 text-muted">
          {coaching.error
            ? "Your plan could not refresh. Reconnect before starting a planned session."
            : day
              ? `${day.prescription.minutes} minutes · ${day.date === today ? "scheduled today" : `scheduled ${dateLabel(day.date)}`}`
              : briefing.completedToday.length
                ? `${briefing.completedToday.length} completed ${briefing.completedToday.length === 1 ? "session" : "sessions"} today. Your plan and progress use the same workout log.`
                : briefing.restDay
                  ? `No session is scheduled today.${briefing.next ? ` Next: ${briefing.next.name}, ${dateLabel(briefing.next.date)}.` : " Review your week or choose your own activity."}`
                  : "Build a plan or choose a routine that fits your day."}
        </Txt>
        {!!briefing.previous && (
          <Txt className="mt-3 text-xs leading-5 text-muted">
            Last matching session: {briefing.previous.name} ·{" "}
            {dateLabel(workoutDate(briefing.previous))}. Your working-set history
            appears beside each exercise in the logger.
          </Txt>
        )}
        {billing.isPro && targetInsight && (
          <Txt className="mt-3 text-xs leading-5" style={{ color: PRO.accent }}>
            {firstMovement!.name}: {targetInsight.reason}
          </Txt>
        )}
        {billing.isPro && (
          <View className="mt-4">
            <ProAction
              icon="heart-pulse"
              title={readinessRecord ? "Update today’s check-in" : "How are you feeling?"}
              subtitle={
                readinessRecord
                  ? "Sleep, energy, soreness and available time"
                  : "An optional check-in before you train"
              }
              onPress={() => router.push("/companion?tab=readiness" as Href)}
            />
          </View>
        )}
        {billing.isPro && briefing.reasons.length > 0 && day?.status !== "active" && (
          <View className="mt-4">
            <Txt className="text-sm leading-6">
              A gentler or shorter session may fit your check-in.
            </Txt>
            <ProButton
              title={why ? "Hide why" : "Why this suggestion?"}
              onPress={() => setWhy((v) => !v)}
              secondary
            />
            {why && (
              <>
                <Txt className="mt-2 text-xs leading-5 text-muted">
                  {briefing.reasons.join(" ")} This uses your own check-in; it is not a recovery
                  measurement. Your saved plan stays as it is until you accept a preview.
                </Txt>
                <ProButton
                  title="Preview session changes"
                  onPress={previewChange}
                  disabled={working || !briefing.suggestion}
                  secondary
                />
              </>
            )}
          </View>
        )}
        {adapted && (
          <View className="mt-4 rounded-2xl bg-white/5 p-4">
            <Txt weight="medium">Review proposed session</Txt>
            <Txt className="mt-2 text-xs leading-5 text-muted">
              {adapted.prescription.minutes} min · {adapted.prescription.effort} effort{`\n`}
              {adapted.prescription.explanation.join("\n")}
            </Txt>
            {adapted.prescription.exercises.map((e, i) => (
              <Txt key={`${i}:${e.exerciseId}`} className="mt-2 text-xs">
                {e.name} · {e.sets} sets
              </Txt>
            ))}
            <ProButton
              title="Accept these changes"
              disabled={working || !billing.isPro}
              onPress={() =>
                void run(async () => {
                  if (!validPreview) return;
                  await coaching.mutate(
                    `readiness-apply:${validPreview.day.id}:${validPreview.day.revision}:${JSON.stringify(validPreview.input)}`,
                    (id) => coaching.api.adapt(validPreview.day, id, validPreview.input),
                    (value) => value,
                  );
                  setPreview(null);
                })
              }
            />
            <ProButton title="Keep my saved session" secondary onPress={() => setPreview(null)} />
          </View>
        )}
        {!!error && (
          <Txt accessibilityRole="alert" className="mt-3 text-xs text-red-300">
            {error}
          </Txt>
        )}
        <View className="mt-5">
          <ProButton
            title={
              working
                ? "Connecting…"
                : workout.session
                  ? "Resume workout"
                  : day
                    ? "Start today’s session"
                    : briefing.restDay || briefing.completedToday.length
                      ? "Review my week"
                      : "Choose a workout"
            }
            disabled={working || workout.busy || (!!coaching.error && !!day && !workout.session)}
            onPress={
              !workout.session && (briefing.restDay || (briefing.completedToday.length > 0 && !day))
                ? () => router.push("/(tabs)/progress")
                : start
            }
          />
        </View>
      </GlassCard>
    </View>
  );
}

function ProgramBriefing({ detail }: { detail: FollowedProgram }) {
  const workout = useWorkout(),
    billing = useBilling();
  const focus = programFocus(detail);
  const last = [...detail.slots]
    .filter((slot) => slot.status === "completed" && slot.completedAt)
    .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!))[0];
  const previewOnly = focus.kind === "rest" || focus.kind === "upcoming";
  return (
    <View className="mb-5">
      <GlassCard accent>
        <Txt className="text-[10px] tracking-[2px]" style={{ color: PRO.accent }}>
          TODAY FOR YOU · YOUR FOLLOWED PROGRAM
        </Txt>
        <Txt weight="medium" className="mt-3 text-[25px] leading-8">
          {workout.session?.name ?? focus.title}
        </Txt>
        <Txt className="mt-2 text-sm leading-6 text-muted">{focus.description}</Txt>
        {!!last && (
          <Txt className="mt-3 text-xs leading-5 text-muted">
            Last program session: {last.routineName} · {dateLabel(localDate(new Date(last.completedAt!)))} · {last.completedSets}{" "}
            completed sets
            {last.volumeKg > 0 ? ` · ${last.volumeKg.toLocaleString()} kg logged volume` : ""}.
          </Txt>
        )}
        {billing.isPro && (
          <View className="mt-4">
            <ProAction
              icon="heart-pulse"
              title="Your optional daily check-in"
              subtitle="Review how you feel before training; your program stays under your control"
              onPress={() => router.push("/companion?tab=readiness" as Href)}
            />
          </View>
        )}
        <View className="mt-5">
          {workout.session ? (
            <ProButton title="Resume workout" onPress={() => router.push("/workout")} />
          ) : focus.slot && !previewOnly ? (
            <WorkoutAction slot={focus.slot} />
          ) : (
            <ProButton
              title={previewOnly ? "Review my program" : "Open my program"}
              onPress={() =>
                router.push({ pathname: "/programs/[id]", params: { id: detail.enrollment.id } })
              }
            />
          )}
        </View>
      </GlassCard>
    </View>
  );
}
