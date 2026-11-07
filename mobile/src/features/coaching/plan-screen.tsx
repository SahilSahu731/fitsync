import React, { useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable } from "@/src/components/motion";
import { Card, PrimaryButton, Txt } from "@/src/components/ui";
import { useAppAlert } from "@/src/components/app-dialog";
import { useSession } from "@/src/context/session";
import { useWorkout } from "@/src/features/workouts/workout-context";
import { useBilling } from "@/src/features/billing/billing-context";
import { C } from "@/src/constants/theme";
import { type AdaptInput } from "./api";
import { CoachHeader, CoachLink, Notes } from "./components";
import { ProgressionSheet } from "./progression-sheet";
import { AdaptSheet } from "./adapt-sheet";
import { GOAL_LABELS, EQUIPMENT_LABELS, displayDate, exerciseTarget, localDate, nextSession, shiftDate } from "./model";
import { useCoaching } from "./use-coaching";

export function CoachPlanScreen() {
  const resource = useCoaching();
  const billing = useBilling();
  const workout = useWorkout();
  const { settings } = useSession();
  const { alert } = useAppAlert();
  const [week, setWeek] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adapting, setAdapting] = useState(false);
  const [progressing, setProgressing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const plan = resource.data?.plan ?? null;
  const day = plan?.sessions.find(item => item.id === selectedId) ?? nextSession(plan);
  const changeable = day?.status === "planned" || day?.status === "overdue";
  const pro = (action: () => void) => billing.isPro ? action() : router.push("/pro");
  const run = async (action: () => Promise<unknown>) => {
    setNotice(null);
    try { return await action(); } catch (failure) { alert("Could not update your plan", failure instanceof Error ? failure.message : "Please try again.", undefined, "error"); return null; }
  };
  const start = async () => {
    if (!day) return;
    if (workout.session && workout.session.id !== day.workoutId) { alert("You have a workout in progress", "Finish or discard your current workout before starting this session.", [{ text: "Keep planning", style: "cancel" }, { text: "Resume workout", onPress: () => router.push("/workout") }]); return; }
    await run(async () => {
      const result = await resource.mutate(`start:${day.id}`, async requestId => { await workout.ensureSynced(); return resource.api.start(day.id, requestId); });
      if (result) {
        await workout.refresh();
        if (result.status === "active") router.push("/workout");
        else { await resource.refresh(); setSelectedId(null); setNotice(result.status === "completed" ? "Your saved session is completed. Your plan has been refreshed." : "This session attempt was discarded. Start again to create a new attempt."); }
      }
    });
  };
  const preview = async (input: AdaptInput) => {
    if (!day) return null;
    return resource.mutate(`preview:${day.id}:${day.revision}:${JSON.stringify(input)}`, requestId => resource.api.adapt(day, requestId, { ...input, preview: true })).catch(() => null);
  };
  const apply = async (input: AdaptInput) => {
    if (!day) return;
    const result = await resource.mutate(`adapt:${day.id}:${day.revision}:${JSON.stringify(input)}`, requestId => resource.api.adapt(day, requestId, input), value => value).catch(() => null);
    if (result) { setAdapting(false); setNotice("Your session has been adjusted. Review the exercise targets below."); }
  };
  const move = (date: string) => {
    if (!day) return;
    void run(async () => {
      const result = await resource.mutate(`move:${day.id}:${day.revision}:${date}`, requestId => resource.api.reschedule(day, requestId, date), value => value);
      if (result) setNotice("Session moved. Your remaining unstarted sessions moved with it to preserve recovery spacing.");
    });
  };
  const previewProgression = async (incrementKg?: number) => {
    if (!day) return null;
    return resource.mutate(`progression-preview:${day.id}:${day.revision}:${incrementKg ?? "default"}`, async requestId => { await workout.ensureSynced(); return resource.api.progression(day, requestId, true, incrementKg); }).catch(() => null);
  };
  const applyProgression = async (incrementKg?: number) => {
    if (!day) return;
    const result = await resource.mutate(`progression:${day.id}:${day.revision}:${incrementKg ?? "default"}`, async requestId => { await workout.ensureSynced(); return resource.api.progression(day, requestId, false, incrementKg); }, value => value).catch(() => null);
    if (result) { setProgressing(false); setNotice("Targets reviewed against your completed logs. Each exercise explains its next step."); }
  };
  return <View className="flex-1 bg-bg"><CoachHeader title="Your personal plan" action={plan ? "Edit setup" : undefined} onAction={() => router.push("/coach/setup")} />
    <ScrollView ref={scroll} refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={() => { void resource.refresh(); void billing.refresh(); }} tintColor={C.brand} />} contentContainerStyle={{ padding: 24, paddingBottom: 140 }}>
      {resource.error && <View className="mb-5 rounded-2xl bg-panel p-4"><Txt accessibilityRole="alert" className="text-sm leading-6">{resource.error}</Txt><CoachLink label="Reconnect" onPress={() => void resource.refresh()} icon="refresh" /></View>}
      {resource.loading && !resource.data && <ActivityIndicator color={C.brand} style={{ marginVertical: 40 }} />}
      {!resource.loading && resource.data && !plan && <>
        <View className="mb-6 h-16 w-16 items-center justify-center rounded-[23px] bg-brand/10"><MaterialCommunityIcons name="calendar-heart" size={32} color={C.brand} /></View>
        <Txt weight="extra" className="text-[36px] leading-[41px] tracking-[-1px]">A little direction.
A lot more you.</Txt><Txt className="mb-7 mt-4 text-base leading-7 text-muted">Build a four-week starting plan around your goals, experience, time and equipment. Your workouts connect to the progress you already track.</Txt><PrimaryButton title="Build my starting plan" onPress={() => router.push("/coach/setup")} />
        <View className="mt-7"><Card><Txt weight="semibold" className="text-lg">Start free. Adapt with Pro.</Txt><Txt className="mt-2 text-sm leading-6 text-muted">Create a plan and log your sessions for free. Pro helps with busy days, equipment changes, missed sessions and a weekly review.</Txt><CoachLink label="Explore FitSync Pro" onPress={() => router.push("/pro")} /></Card></View>
      </>}
      {plan && <>
        <View className="mb-3 flex-row items-center gap-2"><Txt weight="semibold" className="flex-1 text-xs tracking-[1.3px] text-brand">{GOAL_LABELS[plan.goal].toUpperCase()}</Txt>{billing.isPro && <Txt weight="semibold" className="text-xs text-brand">PRO</Txt>}</View>
        <Txt weight="extra" className="text-[32px] leading-[37px] tracking-[-0.8px]">{plan.name}</Txt><Txt className="mb-5 mt-3 text-sm leading-6 text-muted">{plan.trainingDays} days / week · {plan.minutesPerWorkout} min · {EQUIPMENT_LABELS[plan.equipment]}</Txt>
        <Notes items={plan.explanation} />
        <View className="mb-6 mt-6 flex-row gap-2">{[1, 2, 3, 4].map(value => { const sessions = plan.sessions.filter(item => item.week === value); const complete = sessions.filter(item => item.status === "completed").length; return <MotionPressable key={value} accessibilityRole="tab" accessibilityState={{ selected: week === value }} onPress={() => setWeek(value)} className={`min-h-16 flex-1 items-center justify-center rounded-2xl border px-1 py-3 ${week === value ? "border-brand bg-brand/10" : "border-border bg-panel"}`}><Txt weight="semibold" className={`text-sm ${week === value ? "text-brand" : "text-ink"}`}>Week {value}</Txt><Txt className="mt-1 text-[10px] text-muted">{complete}/{sessions.length} done</Txt></MotionPressable>; })}</View>
        {notice && <Txt accessibilityLiveRegion="polite" className="mb-5 text-sm leading-6 text-brand">{notice}</Txt>}
        {day ? <View className="mb-6 overflow-hidden rounded-[27px] border border-brand/30 bg-panel p-5">
          <View className="flex-row items-center gap-2"><MaterialCommunityIcons name={day.status === "completed" ? "check-circle-outline" : "calendar-today"} size={18} color={C.brand} /><Txt weight="semibold" className="flex-1 text-xs uppercase text-brand">{day.status === "active" ? "In progress" : day.status === "overdue" ? "Ready when you are" : day.status === "completed" ? "Completed" : day.date === localDate() ? "Today’s session" : displayDate(day.date)}</Txt><Txt className="text-xs text-muted">Week {day.week} · Day {day.day}</Txt></View>
          <Txt weight="bold" className="mt-3 text-[25px] leading-8">{day.name}</Txt><Txt className="mt-2 text-sm text-muted">{day.prescription.minutes} min · {EQUIPMENT_LABELS[day.prescription.equipment]}{day.prescription.effort === "easy" ? " · Easier effort" : ""}</Txt>
          <Notes items={day.prescription.explanation} />
          <View className="mt-5">{day.prescription.exercises.map((exercise, index) => <View key={`${index}:${exercise.exerciseId}`} className="border-t border-border py-4"><View className="flex-row items-start gap-3"><View className="mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-elevated"><Txt className="text-xs text-muted">{index + 1}</Txt></View><View className="flex-1"><Txt weight="semibold" className="text-base">{exercise.name}</Txt><Txt className="mt-1 text-sm text-brand">{exerciseTarget(exercise, settings?.weightUnit)} · {exercise.restSeconds}s rest</Txt><Txt className="mt-2 text-xs leading-5 text-muted">{exercise.reason}</Txt></View></View></View>)}</View>
          {day.status !== "completed" && <PrimaryButton title={day.status === "active" ? "Resume session" : "Start this session"} onPress={() => void start()} loading={resource.busy || workout.busy} />}
          {changeable && <CoachLink label={billing.isPro ? "Adapt this session" : "Adapt this session · Pro"} onPress={() => pro(() => setAdapting(true))} disabled={resource.busy} icon="tune-variant" />}
          {day.status === "active" && <Txt className="mt-3 text-xs leading-5 text-muted">Your workout is in progress. Make changes in the workout logger so your saved sets stay together.</Txt>}
        </View> : <Card><Txt weight="bold" className="text-xl">Four weeks, real effort.</Txt><Txt className="mt-3 text-sm leading-6 text-muted">Your sessions are complete. Review what you did, then build your next starting plan.</Txt><CoachLink label="Build my next plan" onPress={() => router.push("/coach/setup")} /></Card>}
        {changeable && <View className="mb-6"><Card><Txt weight="bold" className="text-lg">Keep the plan moving</Txt><CoachLink label={billing.isPro ? "Review next targets from my logs" : "Progression review · Pro"} icon="trending-up" disabled={resource.busy} onPress={() => pro(() => setProgressing(true))} /><Txt className="text-xs leading-5 text-muted">Checks your completed sets before adjusting the next targets. You can review each exercise’s reason above.</Txt>{day.date !== localDate() && <CoachLink label="Move this session to today" icon="calendar-arrow-left" disabled={resource.busy} onPress={() => pro(() => move(localDate()))} />}<CoachLink label="Move this session to tomorrow" icon="calendar-arrow-right" disabled={resource.busy} onPress={() => pro(() => move(shiftDate(localDate(), 1)))} /></Card></View>}
        <View className="mb-6"><Card><View className="flex-row items-center gap-3"><MaterialCommunityIcons name="chart-timeline-variant" color={C.brand} size={26} /><Txt weight="bold" className="flex-1 text-lg">Your weekly review</Txt></View><Txt className="mt-3 text-sm leading-6 text-muted">A clear look at your real activity, with practical next steps and honest notes about missing data.</Txt><CoachLink label={billing.isPro ? "Open weekly review" : "Explore weekly review · Pro"} onPress={() => pro(() => router.push("/coach/review"))} /></Card></View>
        <View className="mb-6"><Card><Txt weight="bold" className="text-lg">The rest of your week</Txt><Txt className="mt-2 text-sm leading-6 text-muted">Find simple meal ideas and choose a commitment that helps you keep showing up.</Txt><CoachLink label="Meals & accountability" icon="heart-outline" onPress={() => router.push("/wellness")} /></Card></View>
        <Txt weight="bold" className="mb-3 text-xl">Week {week} schedule</Txt>
        {plan.sessions.filter(item => item.week === week).map(item => <MotionPressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: day?.id === item.id }} onPress={() => { setSelectedId(item.id); scroll.current?.scrollTo({ y: 0, animated: true }); }} className={`mb-3 flex-row items-center gap-3 rounded-[22px] border p-4 ${day?.id === item.id ? "border-brand/50 bg-brand/5" : "border-border bg-panel"}`}><MaterialCommunityIcons name={item.status === "completed" ? "check-circle" : item.status === "active" ? "play-circle" : "circle-outline"} size={24} color={item.status === "completed" || item.status === "active" ? C.brand : C.muted} /><View className="flex-1"><Txt weight="semibold" className="text-base">{item.name}</Txt><Txt className="mt-1 text-xs text-muted">{displayDate(item.date)} · {item.prescription.minutes} min</Txt></View><Txt className="text-[10px] capitalize text-muted">{item.status === "overdue" ? "Planned" : item.status}</Txt></MotionPressable>)}
      </>}
    </ScrollView>
    {progressing && day && <ProgressionSheet key={`${day.id}:${day.revision}`} day={day} busy={resource.busy} error={resource.error} onClose={() => setProgressing(false)} onPreview={previewProgression} onApply={applyProgression} />}
    {adapting && day && <AdaptSheet key={`${day.id}:${day.revision}`} day={day} busy={resource.busy} error={resource.error} onClose={() => setAdapting(false)} onPreview={preview} onApply={apply} />}
  </View>;
}
