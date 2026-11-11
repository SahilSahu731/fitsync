import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ArrowUpRight, CalendarPlus, Check, ChevronLeft, ChevronRight, Dumbbell } from "lucide-react-native";
import { useSession } from "@/src/context/session";
import { useProgress } from "@/src/features/progress/use-progress";
import { localDate, dateLabel } from "@/src/features/progress/model";
import { useProgram } from "@/src/features/program-follow/program-context";
import { useCoaching } from "@/src/features/coaching/use-coaching";
import { useExperience } from "@/src/features/experience/experience-context";
import { buildAgenda, monthGrid, shiftMonth, type AgendaItem } from "@/src/features/calendar/model";
import { openTrainingCalendar } from "@/src/features/calendar/native";
import { useAppAlert } from "@/src/components/app-dialog";
import { MotionPressable, ScreenEntrance } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

export default function CalendarScreen() {
  const { user } = useSession();
  const progress = useProgress();
  const program = useProgram();
  const coach = useCoaching();
  const { feedback } = useExperience();
  const { alert } = useAppAlert();
  const insets = useSafeAreaInsets();
  const today = localDate();
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const exportLock = useRef(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState("");
  const agenda = useMemo(() => buildAgenda(progress.journal.workouts, program.active?.slots ?? [], coach.data?.plan?.sessions ?? []), [progress.journal.workouts, program.active, coach.data]);
  const itemsByDate = useMemo(() => {
    const days = new Map<string, AgendaItem[]>();
    for (const item of agenda) days.set(item.date, [...(days.get(item.date) ?? []), item]);
    return days;
  }, [agenda]);
  const selectedItems = itemsByDate.get(selected) ?? [];
  const monthItems = agenda.filter(item => item.date.startsWith(month));
  const error = progress.workoutError || progress.storageError || program.error || coach.error;
  const refresh = () => { void Promise.allSettled([progress.refresh(), program.refresh(), coach.refresh()]); };
  const select = (date: string) => { feedback("selection"); setSelected(date); setMonth(date.slice(0, 7)); setNotice(""); };
  const changeMonth = (direction: number) => { select(`${shiftMonth(month, direction)}-01`); };
  const exportEvent = async (item?: AgendaItem) => {
    if (exportLock.current) return;
    exportLock.current = true; setExporting(true); setNotice("");
    try {
      const result = await openTrainingCalendar(selected, item?.name ?? "FitSync training", item?.minutes ?? 45);
      if (result === "saved") setNotice("Added to your device calendar.");
      else if (result === "closed") setNotice("Calendar editor closed. Check your calendar to confirm whether you saved it.");
    } catch (failure) { alert("Could not open calendar", failure instanceof Error ? failure.message : "Please try again."); }
    finally { exportLock.current = false; setExporting(false); }
  };
  if (!user) return <Redirect href="/(auth)/sign-in" />;
  return <ScreenEntrance style={{ flex: 1 }}><ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }} refreshControl={<RefreshControl refreshing={progress.refreshing && !progress.loading} onRefresh={refresh} tintColor={C.brand} />}>
    <View className="mb-8 flex-row items-center justify-between"><MotionPressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")} className="h-11 w-11 items-center justify-center rounded-full bg-panel"><ArrowLeft size={22} color={C.ink} /></MotionPressable><Txt weight="semibold" className="text-sm">YOUR TRAINING CALENDAR</Txt><MotionPressable accessibilityRole="button" onPress={() => select(today)} className="min-h-11 justify-center px-2"><Txt weight="semibold" className="text-sm text-ink">Today</Txt></MotionPressable></View>
    <Txt weight="semibold" className="text-[36px] leading-[42px] tracking-tight">Make time{`\n`}for your next move.</Txt><Txt className="mb-7 mt-3 text-base leading-6 text-muted">Your plans and completed workouts, together.</Txt>
    <View className="rounded-[28px] bg-panel p-3">
      <View className="mb-3 flex-row items-center justify-between"><MotionPressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => changeMonth(-1)} className="h-11 w-11 items-center justify-center"><ChevronLeft color={C.ink} size={22} /></MotionPressable><Txt weight="semibold" className="text-lg">{dateLabel(`${month}-01`, { month: "long", year: "numeric" })}</Txt><MotionPressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => changeMonth(1)} className="h-11 w-11 items-center justify-center"><ChevronRight color={C.ink} size={22} /></MotionPressable></View>
      <View className="mb-2 flex-row">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <View key={index} className="flex-1 items-center"><Txt className="text-xs text-muted">{day}</Txt></View>)}</View>
      <View className="flex-row flex-wrap">{monthGrid(month).map(day => {
        const entries = itemsByDate.get(day.date) ?? [];
        const completed = entries.some(item => item.status === "completed");
        const planned = entries.some(item => item.status !== "completed");
        const active = selected === day.date;
        return <View key={day.date} style={{ width: `${100 / 7}%`, padding: 2 }}><MotionPressable accessibilityRole="button" accessibilityLabel={`${dateLabel(day.date, { weekday: "long", month: "long", day: "numeric" })}, ${entries.length} sessions${day.date === today ? ", today" : ""}`} accessibilityState={{ selected: active }} onPress={() => select(day.date)} className={`h-[48px] items-center justify-center rounded-2xl  ${active ? " bg-ink" : day.date === today ? "" : ""}`}><Txt weight={active ? "bold" : "medium"} className={`text-sm ${active ? "text-bg" : day.inMonth ? "text-ink" : "text-muted/40"}`}>{day.day}</Txt><View className="mt-1 h-1 flex-row gap-1">{completed && <View className={`h-1 w-1 rounded-full ${active ? "bg-bg" : "bg-ink"}`} />}{planned && <View className={`h-1 w-1 rounded-full ${active ? "bg-bg/50" : "bg-ink/60"}`} />}</View></MotionPressable></View>;
      })}</View>
      <View className="mt-3 flex-row items-center justify-center gap-5 py-3"><View className="flex-row items-center gap-2"><View className="h-1.5 w-1.5 rounded-full bg-ink" /><Txt className="text-xs text-muted">Completed</Txt></View><View className="flex-row items-center gap-2"><View className="h-1.5 w-1.5 rounded-full bg-ink/60" /><Txt className="text-xs text-muted">Planned</Txt></View></View>
    </View>
    <View className="my-6 flex-row gap-3"><View className="flex-1 rounded-2xl bg-panel p-4"><Txt weight="semibold" className="text-2xl">{monthItems.filter(item => item.status === "completed").length}</Txt><Txt className="mt-1 text-xs text-muted">Completed this month</Txt></View><View className="flex-1 rounded-2xl bg-panel p-4"><Txt weight="semibold" className="text-2xl text-ink">{monthItems.filter(item => item.status !== "completed").length}</Txt><Txt className="mt-1 text-xs text-muted">On your schedule</Txt></View></View>
    {(progress.loading || coach.loading || program.loading) && <View className="mb-5 flex-row items-center gap-2"><ActivityIndicator size="small" color={C.ink} /><Txt className="text-sm text-muted">Refreshing your calendar…</Txt></View>}
    {!!error && <MotionPressable accessibilityRole="button" onPress={refresh} className="mb-5 rounded-2xl p-4"><Txt className="text-sm leading-5 text-muted">Some calendar data could not refresh. Showing what is available. Tap to retry.</Txt></MotionPressable>}
    <Txt weight="semibold" className="mb-4 text-xl">{dateLabel(selected, { weekday: "long", month: "long", day: "numeric" })}</Txt>
    {selectedItems.map(item => <View key={item.id} className="mb-3 rounded-[24px] bg-panel p-5"><View className="flex-row items-start gap-3"><View className={`h-11 w-11 items-center justify-center rounded-2xl ${item.status === "completed" ? "bg-white/10" : "bg-elevated"}`}>{item.status === "completed" ? <Check size={23} color={C.ink} /> : <Dumbbell size={23} color={C.ink} />}</View><View className="flex-1"><Txt weight="semibold" className="text-lg">{item.name}</Txt><Txt className="mt-1 text-xs text-muted">{item.source === "coach" ? "Personal plan" : item.source === "program" ? "Training program" : "Workout history"} · {item.status}{item.minutes ? ` · ${item.minutes} min` : ""}</Txt></View></View><View className="mt-4 flex-row flex-wrap gap-3"><MotionPressable accessibilityRole="button" onPress={() => item.status === "completed" && item.workoutId ? router.push({ pathname: "/workout/history/[id]", params: { id: item.workoutId } }) : router.push(item.source === "coach" ? "/coach" : "/(tabs)/train")} className="min-h-11 flex-row items-center gap-2 rounded-full bg-elevated px-4"><Txt weight="semibold" className="text-sm">{item.status === "completed" ? "View workout" : "Open plan"}</Txt><ArrowUpRight size={16} color={C.ink} /></MotionPressable>{item.status !== "completed" && <MotionPressable accessibilityRole="button" disabled={exporting} onPress={() => void exportEvent(item)} className="min-h-11 flex-row items-center gap-2 rounded-full bg-white/5 px-4"><CalendarPlus size={17} color={C.ink} /><Txt weight="semibold" className="text-sm text-ink">Add to calendar</Txt></MotionPressable>}</View></View>)}
    {!selectedItems.length && <View className="mb-4 rounded-[24px] p-6"><Txt weight="semibold" className="text-lg">A little room to move.</Txt><Txt className="mt-2 text-sm leading-6 text-muted">No FitSync sessions on this date. Leave space for recovery or find a program that fits your week.</Txt><MotionPressable onPress={() => router.push("/programs")} className="mt-4 min-h-11 flex-row items-center gap-2"><Txt weight="semibold" className="text-ink">Explore programs</Txt><ArrowUpRight color={C.ink} size={18} /></MotionPressable></View>}
    <MotionPressable accessibilityRole="button" disabled={exporting} onPress={() => void exportEvent()} className="mt-3 min-h-14 flex-row items-center justify-center gap-3 rounded-2xl bg-ink px-5 py-4">{exporting ? <ActivityIndicator color={C.bg} /> : <CalendarPlus color={C.bg} size={21} />}<Txt weight="semibold" className="text-base text-bg">Block out training time</Txt></MotionPressable>
    {!!notice && <Txt accessibilityLiveRegion="polite" className="mt-4 text-sm leading-6 text-ink">{notice}</Txt>}<Txt className="mt-4 text-xs leading-5 text-muted">Calendar export opens your phone’s editor so you can review the time and save. Changes in your device calendar do not change your FitSync plan.</Txt>
  </ScrollView></ScreenEntrance>;
}
