import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, Switch, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { WorkoutDrawer } from "@/src/features/workouts/components/workout-controls";
import { useSession } from "@/src/context/session";
import { programFollowApi, localDate, localTimezone, type Enrollment, type FollowedProgram } from "./api";
import { registerProgramNotifications } from "./notifications";
import { useProgram } from "./program-context";

export function ProgramSetup({ program, enrollment, onClose, onSaved }: {
  program?: { id: string; name: string }; enrollment?: Enrollment; onClose: () => void; onSaved: (result: FollowedProgram) => void;
}) {
  const { active, refresh } = useProgram();
  const { reloadMe, settings } = useSession();
  const [startDate, setStartDate] = useState(new Date());
  const [enabled, setEnabled] = useState(!!enrollment?.reminder_enabled && !!settings?.workoutReminders);
  const [time, setTime] = useState(() => { const value = new Date(); value.setHours(enrollment?.reminder_hour ?? 18, enrollment?.reminder_minute ?? 0, 0, 0); return value; });
  const [timezone, setTimezone] = useState(enrollment?.timezone ?? localTimezone());
  const [picker, setPicker] = useState<"date" | "time" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const switching = !!program && !!active && active.enrollment.program_id !== program.id;
  const submit = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (enabled) await registerProgramNotifications(true);
      const preferences = { reminderEnabled: enabled, hour: time.getHours(), minute: time.getMinutes(), timezone };
      const result = enrollment
        ? await programFollowApi.reminders(enrollment.id, preferences)
        : await programFollowApi.follow(program!.id, { ...preferences, startDate: localDate(startDate), expectedActiveId: active?.enrollment.id ?? null });
      await Promise.allSettled([refresh(), reloadMe()]);
      onSaved(result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save. Try again."); }
    finally { setBusy(false); }
  };
  const maximum = new Date(); maximum.setDate(maximum.getDate() + 30);
  return <WorkoutDrawer title={enrollment ? "Daily reminders" : switching ? "Switch your program" : "Make this your program"} onClose={() => { if (!busy) onClose(); }}>
    {program && <><Txt weight="bold" className="text-2xl">{program.name}</Txt><Txt className="mt-2 text-sm leading-6 text-muted">{switching ? `This replaces ${active!.enrollment.program_name}. Your logged workouts and progress stay in program history.` : "One program, a clear weekly plan. Each workout you finish updates your progress automatically."}</Txt>
      <Txt weight="semibold" className="mb-2 mt-6">Start date</Txt>
      <Pressable disabled={busy} accessibilityRole="button" onPress={() => setPicker(picker === "date" ? null : "date")} className="flex-row items-center justify-between rounded-2xl bg-elevated p-4"><Txt>{startDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</Txt><MaterialCommunityIcons name="calendar-outline" size={23} color={C.brand} /></Pressable>
      <Txt className="mt-2 text-xs text-muted">Your chosen date is Day 1. The weekly schedule repeats from there.</Txt></>}
    <View className="mt-6 flex-row items-center justify-between"><View className="mr-4 flex-1"><Txt weight="semibold">A friendly daily nudge</Txt><Txt className="mt-1 text-sm text-muted">Workout days, recovery days, and a reminder to save your log. Quiet after you finish a program workout.</Txt></View><Switch accessibilityLabel="Daily program reminders" disabled={busy} value={enabled} onValueChange={setEnabled} trackColor={{ false: C.border, true: C.brand }} thumbColor={C.ink} /></View>
    {enabled && <View className="mt-4"><Pressable disabled={busy} accessibilityRole="button" onPress={() => setPicker(picker === "time" ? null : "time")} className="flex-row items-center justify-between rounded-2xl bg-elevated p-4"><View><Txt className="text-xs text-muted">REMIND ME AT</Txt><Txt weight="bold" className="mt-1 text-xl">{time.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</Txt></View><MaterialCommunityIcons name="bell-outline" size={25} color={C.brand} /></Pressable><Txt className="mt-2 text-xs text-muted">{timezone.replaceAll("_", " ")} · You can turn this off anytime.</Txt>{timezone !== localTimezone() && <Pressable onPress={() => setTimezone(localTimezone())} className="py-3"><Txt className="text-sm text-brand">Use my current timezone: {localTimezone()}</Txt></Pressable>}</View>}
    {picker && <View className="mt-4"><DateTimePicker value={picker === "date" ? startDate : time} mode={picker} display={Platform.OS === "ios" ? "spinner" : "default"} themeVariant="dark" minimumDate={picker === "date" ? new Date() : undefined} maximumDate={picker === "date" ? maximum : undefined} onChange={(event, value) => { if (Platform.OS !== "ios") setPicker(null); if (event.type === "set" && value) { if (picker === "date") setStartDate(value); else setTime(value); } }} />{Platform.OS === "ios" && <Pressable onPress={() => setPicker(null)} className="p-3"><Txt className="text-center text-brand">Done</Txt></Pressable>}</View>}
    {error ? <Txt accessibilityRole="alert" className="mt-4 text-sm" style={{ color: "#FCA5A5" }}>{error}</Txt> : null}
    <Pressable disabled={busy} accessibilityRole="button" onPress={() => void submit()} className={`mt-6 h-14 items-center justify-center rounded-full bg-brand ${busy ? "opacity-60" : ""}`}>{busy ? <ActivityIndicator color={C.bg} /> : <Txt weight="bold" className="text-base text-bg">{enrollment ? "Save reminders" : switching ? "Switch program" : "Follow program"}</Txt>}</Pressable>
    {!enrollment && <Txt className="mt-3 text-center text-xs text-muted">Routines are saved to your library when you follow.</Txt>}
  </WorkoutDrawer>;
}
