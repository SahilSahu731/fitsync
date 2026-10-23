import { useProgramResource } from "@/src/features/program-follow/use-program-resource";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useAppAlert } from "@/src/components/app-dialog";
import { useSession } from "@/src/context/session";
import { useWorkout } from "@/src/features/workouts/workout-context";
import { useProgram } from "@/src/features/program-follow/program-context";
import { programFollowApi, shortDate, type ProgramSlot } from "@/src/features/program-follow/api";
import { ProgramSetup } from "@/src/features/program-follow/program-setup";

function Metric({ value, label }: { value: string; label: string }) {
  return <View className="min-w-0 flex-1 rounded-2xl bg-panel p-3"><Txt weight="bold" className="text-xl">{value}</Txt><Txt className="mt-1 text-xs text-muted">{label}</Txt></View>;
}
export default function FollowedProgramScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings } = useSession();
  const workout = useWorkout();
  const { refresh } = useProgram();
  const Alert = useAppAlert();
  const insets = useSafeAreaInsets();
  const { data: detail, setData: setDetail, loading, error, refresh: reload } = useProgramResource(useCallback(() => programFollowApi.detail(id), [id]));
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [reminders, setReminders] = useState(false);
  const [busy, setBusy] = useState(false);
  const back = () => router.canGoBack() ? router.back() : router.replace("/(tabs)/train");
  const start = async (slot: ProgramSlot) => {
    if (busy || workout.busy) return;
    if (slot.status === "completed" && slot.sessionId) { router.push({ pathname: "/workout/history/[id]", params: { id: slot.sessionId } }); return; }
    if (workout.session) {
      if (workout.session.id === slot.sessionId) router.push("/workout");
      else Alert.alert("A workout is already running", "Finish or discard it before starting another session.", [{ text: "Stay here" }, { text: "Resume workout", onPress: () => router.push("/workout") }]);
      return;
    }
    setBusy(true);
    try { await workout.start(undefined, slot.id); await refresh(); router.push("/workout"); }
    catch (cause) { Alert.alert("Could not start workout", cause instanceof Error ? cause.message : "Please try again."); }
    finally { setBusy(false); }
  };
  const stop = () => Alert.alert("Stop following this program?", "Your workouts and progress will stay in program history. Its routines will stay in your library.", [{ text: "Keep following", style: "cancel" }, { text: "Stop following", style: "destructive", onPress: async () => {
    setBusy(true);
    try { await programFollowApi.stop(id); await refresh(); void reload(); }
    catch (cause) { Alert.alert("Could not stop program", cause instanceof Error ? cause.message : "Please try again."); }
    finally { setBusy(false); }
  } }]);
  const header = <View className="flex-row items-center justify-between px-5 py-3"><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={back} className="h-11 w-11 items-center justify-center rounded-full bg-panel"><MaterialCommunityIcons name="arrow-left" size={23} color={C.ink} /></Pressable><Txt weight="semibold">My program</Txt><Pressable accessibilityRole="button" accessibilityLabel="Program history" onPress={() => router.push("/programs")} className="h-11 w-11 items-center justify-center rounded-full bg-panel"><MaterialCommunityIcons name="history" size={23} color={C.ink} /></Pressable></View>;
  if (!detail || detail.enrollment.id !== id) return <View className="flex-1 bg-bg">{header}<View className="flex-1 items-center justify-center px-6">{loading ? <ActivityIndicator color={C.brand} /> : <><Txt className="text-center text-muted">{error || "Program unavailable."}</Txt><Pressable accessibilityRole="button" onPress={() => void reload()} className="mt-4 rounded-full bg-panel px-6 py-3"><Txt>Try again</Txt></Pressable></>}</View></View>;
  const { enrollment: e, analytics: a } = detail;
  const isActive = e.status === "active";
  const week = Math.min(e.duration_weeks, selectedWeek ?? detail.week);
  const next = detail.nextSlot;
  const weightUnit = settings?.weightUnit ?? "kg";
  const volume = Math.round(a.volumeKg * (weightUnit === "lb" ? 2.2046226218 : 1)).toLocaleString();
  const reminderTime = `${String(e.reminder_hour).padStart(2,"0")}:${String(e.reminder_minute).padStart(2,"0")}`;
  return <View className="flex-1 bg-bg">{header}<ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} tintColor={C.brand} />} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 + insets.bottom }}>
    {error ? <Txt accessibilityRole="alert" className="mb-3 text-sm" style={{ color: "#FCA5A5" }}>{error} Pull down to retry.</Txt> : null}
    <View className="mt-2 overflow-hidden rounded-[28px] bg-panel">
      {e.cover_url && <Image source={{ uri: e.cover_url }} style={{ width: "100%", height: 150 }} contentFit="cover" />}
      <View className="p-5"><Txt weight="bold" className="text-xs uppercase tracking-widest text-brand">{e.status === "completed" ? "Program complete ✨" : isActive ? "Your current program" : `Program ${e.status}`}</Txt><Txt weight="bold" className="mt-2 text-3xl">{e.program_name}</Txt><Txt className="mt-2 text-sm text-muted">{e.duration_weeks} weeks · {e.days_per_week} workouts / week · {detail.startsInDays > 0 ? "Starts" : "Started"} {shortDate(e.start_date)}</Txt>
        <View className="mb-2 mt-6 flex-row items-end justify-between"><Txt weight="bold" className="text-3xl">{a.progressPercent}<Txt className="text-lg text-muted">%</Txt></Txt><Txt className="text-sm text-muted">{a.completed} of {a.planned} sessions</Txt></View><View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: a.planned, now: a.completed }} className="h-2 overflow-hidden rounded-full bg-elevated"><View style={{ backgroundColor: C.brand, height: "100%", width: `${a.progressPercent}%` }} /></View>
        {isActive && next && <View className="mt-5"><Txt className="mb-2 text-sm text-muted">{detail.startsInDays > 0 ? `Your plan starts ${shortDate(e.start_date)}. You can train early.` : detail.todayPlan?.rest ? "Recovery is on today's plan. Train when it suits you." : `Up next · Week ${next.week}, Day ${next.day}`}</Txt><Pressable disabled={busy || workout.busy || !next.templateId} accessibilityRole="button" onPress={() => void start(next)} className="flex-row items-center justify-center rounded-full bg-brand px-4 py-4">{busy ? <ActivityIndicator color={C.bg} /> : <><MaterialCommunityIcons name="play" size={22} color={C.bg} /><Txt weight="bold" numberOfLines={1} className="ml-2 flex-shrink text-base text-bg">{next.status === "active" ? "Resume" : "Start"} {next.routineName}</Txt></>}</Pressable></View>}
        {!isActive && <Txt className="mt-4 text-sm text-muted">{e.status === "completed" ? "Every session, logged. Take a moment to enjoy what you built." : "This chapter is saved. Your completed workouts still count in your history."}</Txt>}
      </View>
    </View>
    <Txt weight="bold" className="mb-3 mt-7 text-xl">Your work, counted</Txt>
    <View className="flex-row gap-2"><Metric value={String(a.completedSets)} label="Sets logged" /><Metric value={String(a.minutes)} label="Minutes trained" /><Metric value={volume} label={`${weightUnit} lifted`} /></View>
    <Txt className="mt-3 text-xs leading-5 text-muted">{a.adherencePercent === null ? "No sessions due yet." : `${a.adherencePercent}% of sessions due through today are logged.`} Totals use completed sets in finished program workouts. Volume is weight × reps.</Txt>
    <View className="mb-3 mt-7 flex-row items-center justify-between"><Txt weight="bold" className="text-xl">Your schedule</Txt><Txt className="text-xs text-muted">{e.timezone.replaceAll("_", " ")}</Txt></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>{a.weeks.map(item => <Pressable key={item.week} accessibilityRole="button" accessibilityState={{ selected: item.week === week }} onPress={() => setSelectedWeek(item.week)} className={`rounded-2xl border px-4 py-3 ${item.week === week ? "border-brand bg-brand/10" : "border-border bg-panel"}`}><Txt weight="bold" className={item.week === week ? "text-brand" : "text-ink"}>Week {item.week}</Txt><Txt className="mt-1 text-xs text-muted">{item.completed}/{item.planned} logged</Txt></Pressable>)}</ScrollView>
    {e.weekly_plan.map(day => {
      const slot = detail.slots.find(item => item.week === week && item.day === day.day_number);
      const date = new Date(`${e.start_date}T12:00:00`); date.setDate(date.getDate()+(week-1)*7+day.day_number-1);
      const dateLabel = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      if (!slot) return <View key={day.day_number} className="mb-2 flex-row items-center px-3 py-3"><MaterialCommunityIcons name="weather-night" size={20} color={C.muted} /><View className="ml-4 flex-1"><Txt className="text-sm text-muted">Recovery day</Txt><Txt className="mt-1 text-xs text-muted">{dateLabel}</Txt></View></View>;
      const complete = slot.status === "completed";
      const tint = complete ? "#4ADE80" : slot.status === "active" ? "#60A5FA" : C.brand;
      const actionable = complete || (isActive && !!slot.templateId);
      return <Pressable key={day.day_number} disabled={!actionable || busy || workout.busy} accessibilityRole="button" accessibilityLabel={`${slot.routineName}, ${dateLabel}. ${complete ? "View workout log" : slot.status === "active" ? "Resume workout" : "Start workout"}`} onPress={() => void start(slot)} className="mb-2 flex-row items-center rounded-2xl bg-panel p-4"><View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${tint}18` }}><MaterialCommunityIcons name={complete ? "check" : slot.status === "active" ? "play" : "dumbbell"} size={22} color={tint} /></View><View className="ml-3 flex-1"><Txt weight="semibold">{slot.routineName}</Txt><Txt className="mt-1 text-xs text-muted">{dateLabel}{slot.date === detail.today ? " · Today" : ""}</Txt><Txt className="mt-1 text-xs" style={{ color: tint }}>{complete ? `${slot.completedSets} sets logged · View workout` : slot.status === "active" ? "In progress" : !isActive ? "Not logged" : slot.status === "overdue" ? "Still available · Pick up anytime" : "Planned"}</Txt></View>{actionable && <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />}</Pressable>;
    })}
    {isActive && <View className="mt-6 rounded-2xl bg-panel p-4"><Pressable accessibilityRole="button" onPress={() => setReminders(true)} className="flex-row items-center gap-3"><MaterialCommunityIcons name="bell-outline" size={23} color={C.brand} /><View className="flex-1"><Txt weight="semibold">Daily reminders</Txt><Txt className="mt-1 text-xs text-muted">{e.reminder_enabled && settings?.workoutReminders ? `${reminderTime} · ${e.timezone.replaceAll("_", " ")}` : "Off · A little encouragement, on your terms"}</Txt></View><MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} /></Pressable></View>}
    <Txt weight="bold" className="mb-3 mt-7 text-xl">Program journal</Txt>
    {detail.events.map(event => <View key={event.id} className="mb-3 flex-row items-start"><View className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-brand" /><View className="flex-1"><Txt className="text-sm">{event.event_type === "started" ? "Started following this program" : event.event_type === "switched" ? `Switched to ${event.details.next_program_name ?? "another program"}` : event.event_type === "completed" ? "Completed every program session" : event.event_type === "stopped" ? "Stopped following this program" : `Daily reminders ${event.details.enabled ? "updated" : "turned off"}`}</Txt><Txt className="mt-1 text-xs text-muted">{new Date(event.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</Txt></View></View>)}
    <Pressable accessibilityRole="button" onPress={() => router.push("/explore/programs")} className="mt-5 items-center rounded-full border border-border py-4"><Txt weight="semibold">{isActive ? "Find a different program" : "Choose your next program"}</Txt></Pressable>
    {isActive && <Pressable disabled={busy} accessibilityRole="button" onPress={stop} className="mt-2 items-center py-4"><Txt className="text-sm text-muted">Stop following</Txt></Pressable>}
  </ScrollView>{reminders && <ProgramSetup enrollment={e} onClose={() => setReminders(false)} onSaved={result => { setDetail(result); setReminders(false); }} />}</View>;
}
