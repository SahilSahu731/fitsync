import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { features } from "@/src/config/features";
import { ProgramCover } from "@/src/features/program-follow/program-visuals";
import { ProgramToday } from "@/src/features/program-follow/program-today";
import { ProgramProgress } from "@/src/features/program-follow/program-progress";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useAppAlert } from "@/src/components/app-dialog";
import { useSession } from "@/src/context/session";
import { WorkoutDrawer } from "@/src/features/workouts/components/workout-controls";
import { useProgram } from "@/src/features/program-follow/program-context";
import { programFollowApi, type ProgramSlot } from "@/src/features/program-follow/api";
import { useProgramResource } from "@/src/features/program-follow/use-program-resource";
import { ProgramSetup } from "@/src/features/program-follow/program-setup";
import { defaultScheduleDay, formatProgramDate, weekDays } from "@/src/features/program-follow/program-view";
import { WeekStrip } from "@/src/features/program-follow/week-strip";
import { WorkoutAction } from "@/src/features/program-follow/workout-action";
import { ExercisePreview } from "@/src/features/program-follow/exercise-preview";

type Icon = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
function IconButton({ icon, label, onPress, disabled = false }: { icon: Icon; label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} className="h-11 w-11 items-center justify-center rounded-full" style={{ opacity: disabled ? 0.3 : 1 }}><MaterialCommunityIcons name={icon} size={23} color={C.ink} /></Pressable>;
}
function MenuItem({ icon, title, subtitle, onPress }: { icon: Icon; title: string; subtitle?: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} className="mb-2 flex-row items-center gap-3 rounded-2xl bg-elevated p-4"><MaterialCommunityIcons name={icon} size={23} color={C.brand} /><View className="flex-1"><Txt weight="semibold">{title}</Txt>{subtitle && <Txt className="mt-1 text-xs text-muted">{subtitle}</Txt>}</View><MaterialCommunityIcons name="chevron-right" size={21} color={C.muted} /></Pressable>;
}

export default function FollowedProgramScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings } = useSession();
  const { refresh } = useProgram();
  const Alert = useAppAlert();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const scheduleY = useRef(0);
  const { data: detail, setData: setDetail, loading, error, refresh: reload } = useProgramResource(useCallback(() => programFollowApi.detail(id), [id]));
  const [selection, setSelection] = useState<{ week: number; day: number } | null>(null);
  const [tab, setTab] = useState<"plan" | "progress">("plan");
  const [drawer, setDrawer] = useState<"menu" | "weeks" | "reminders" | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const back = () => router.canGoBack() ? router.back() : router.replace("/(tabs)/train");
  const stop = () => {
    setDrawer(null);
    Alert.alert("Stop following this program?", "Your logged workouts and progress stay in history. The routines stay in your library.", [
      { text: "Keep following", style: "cancel" },
      { text: "Stop following", style: "destructive", onPress: async () => {
        setBusy(true);
        try { await programFollowApi.stop(id); await refresh(); await reload(); }
        catch (cause) { Alert.alert("Could not stop program", cause instanceof Error ? cause.message : "Please try again."); }
        finally { setBusy(false); }
      } }
    ]);
  };
  const selectSlot = (slot: ProgramSlot) => {
    setSelection({ week: slot.week, day: slot.day });
    setPreviewId(null);
    scroll.current?.scrollTo({ y: scheduleY.current, animated: true });
  };
  const header = <View className="flex-row items-center justify-between px-5 py-3"><IconButton icon="arrow-left" label="Go back" onPress={back} /><Txt weight="semibold">Your program</Txt><IconButton icon="dots-horizontal" label="Program options" disabled={!detail || busy} onPress={() => setDrawer("menu")} /></View>;
  if (!detail || detail.enrollment.id !== id) return <View className="flex-1 bg-bg">{header}<View className="flex-1 items-center justify-center px-8">{loading ? <><ActivityIndicator color={C.brand} /><Txt className="mt-4 text-muted">Getting your plan ready…</Txt></> : <><MaterialCommunityIcons name="cloud-refresh-outline" size={38} color={C.brand} /><Txt weight="bold" className="mt-4 text-xl">Let’s get your plan back</Txt><Txt className="mt-2 text-center text-sm leading-6 text-muted">{error || "This program isn’t available right now."}</Txt><Pressable accessibilityRole="button" onPress={() => void reload()} className="mt-5 rounded-full bg-brand px-7 py-3"><Txt weight="bold" className="text-bg">Try again</Txt></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/train")} className="mt-2 p-3"><Txt className="text-muted">Back to Train</Txt></Pressable></>}</View></View>;

  const { enrollment: e, analytics: a } = detail;
  const active = e.status === "active";
  const chosen = selection ?? defaultScheduleDay(detail);
  const week = Math.min(e.duration_weeks, Math.max(1, chosen.week));
  const days = weekDays(detail, week);
  const selected = days[Math.min(7, Math.max(1, chosen.day)) - 1];
  const slot = selected.slot;
  const weekStats = a.weeks.find(item => item.week === week);
  const openSlots = detail.slots.filter(item => item.date < detail.today && item.status !== "completed").sort((x, y) => x.date.localeCompare(y.date));
  const nextAfterSelection = detail.slots.find(item => item.date > selected.date && item.status !== "completed");
  const unit = settings?.weightUnit ?? "kg";
  const reminderOn = e.reminder_enabled && settings?.workoutReminders;
  const reminderTime = `${String(e.reminder_hour).padStart(2, "0")}:${String(e.reminder_minute).padStart(2, "0")}`;

  return (
    <View className="flex-1 bg-bg">
      {header}
      <ScrollView ref={scroll} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} tintColor={C.brand} />} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 145 + insets.bottom }}>
        {error && <Pressable accessibilityRole="button" onPress={() => void reload()} className="mb-3 rounded-xl bg-panel p-3"><Txt className="text-xs text-muted">Couldn’t refresh. Showing your last loaded plan. Tap to retry.</Txt></Pressable>}
        <ProgramCover key={e.id} detail={detail} pro={features.pro} />
        <View className="mb-6 flex-row gap-8 border-b border-border">
          {(["plan", "progress"] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)} className="min-h-11 border-b-2 pb-3 pt-1" style={{ borderColor: tab === value ? C.brand : "transparent" }}><Txt weight="semibold" className={tab === value ? "text-ink" : "text-muted"}>{value === "plan" ? "Schedule" : "Progress & insights"}</Txt></Pressable>)}
        </View>

        {tab === "plan" ? <>
          <ProgramToday detail={detail} onPreview={selectSlot} onProgress={() => setTab("progress")} onRefresh={() => void reload()} />

          <View onLayout={event => { scheduleY.current = event.nativeEvent.layout.y; }} className="mt-7">
            <View className="mb-3 flex-row items-center justify-between"><Txt weight="bold" className="text-xl">Your week</Txt><Pressable accessibilityRole="button" onPress={() => { setSelection(null); setPreviewId(null); }} className="rounded-full bg-panel px-4 py-2"><Txt weight="semibold" className="text-xs text-brand">{active ? "Back to today" : "Reset view"}</Txt></Pressable></View>
            <View className="flex-row items-center justify-between gap-2">
              <IconButton icon="chevron-left" label="Previous week" disabled={week === 1} onPress={() => { setSelection({ week: week - 1, day: 1 }); setPreviewId(null); }} />
              <Pressable accessibilityRole="button" accessibilityLabel={`Week ${week} of ${e.duration_weeks}. Choose a week`} onPress={() => setDrawer("weeks")} className="flex-1 items-center py-2"><View className="flex-row items-center gap-1"><Txt weight="bold">Week {week} <Txt className="text-muted">/ {e.duration_weeks}</Txt></Txt><MaterialCommunityIcons name="chevron-down" size={18} color={C.muted} /></View><Txt className="mt-1 text-xs text-muted">{formatProgramDate(days[0].date)} – {formatProgramDate(days[6].date)}</Txt></Pressable>
              <IconButton icon="chevron-right" label="Next week" disabled={week === e.duration_weeks} onPress={() => { setSelection({ week: week + 1, day: 1 }); setPreviewId(null); }} />
            </View>
            <WeekStrip days={days} selectedDay={selected.day} onSelect={day => { setSelection({ week, day }); setPreviewId(null); }} />
            <View className="mb-4 mt-2 flex-row items-center gap-2"><View className="flex-1 flex-row gap-1.5">{Array.from({ length: weekStats?.planned ?? e.days_per_week }, (_, index) => <View key={index} className="h-1 flex-1 rounded-full" style={{ backgroundColor: index < (weekStats?.completed ?? 0) ? "#86EFAC" : C.border }} />)}</View><Txt className="text-[11px] text-muted">{weekStats?.completed ?? 0}/{weekStats?.planned ?? e.days_per_week} logged</Txt></View>

            <View className="rounded-[22px] border border-border bg-panel p-5">
              <View className="mb-2 flex-row items-center justify-between"><Txt weight="semibold" className="text-xs text-brand">DAY {selected.day} · {formatProgramDate(selected.date, { weekday: "short", day: "numeric", month: "short" }).toUpperCase()}</Txt>{selected.today && <Txt weight="semibold" className="rounded-full bg-brand/10 px-2 py-1 text-[10px] text-brand">TODAY</Txt>}</View>
              <Txt weight="bold" className="text-xl">{selected.rest ? "Recovery day" : selected.label}</Txt>
              {selected.rest ? <>
                <Txt className="mt-2 text-sm leading-6 text-muted">No workout is scheduled for this day. Recovery days are part of your weekly plan.</Txt>
                {nextAfterSelection && <Pressable accessibilityRole="button" onPress={() => selectSlot(nextAfterSelection)} className="mt-4 border-t border-border pt-4"><Txt className="text-[10px] tracking-widest text-muted">NEXT ON YOUR PLAN · {formatProgramDate(nextAfterSelection.date).toUpperCase()}</Txt><View className="mt-2 flex-row items-center justify-between"><Txt weight="semibold" className="mr-2 flex-1">{nextAfterSelection.routineName}</Txt><MaterialCommunityIcons name="arrow-right" size={20} color={C.brand} /></View></Pressable>}
              </> : slot ? <>
                <Txt className="mb-4 mt-2 text-sm text-muted">{slot.status === "completed" ? `Logged ${slot.completedAt ? new Date(slot.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: e.timezone }) : ""} · ${slot.completedSets} sets · ${Math.round(slot.durationSeconds / 60)} min` : slot.status === "active" ? "Your workout is in progress." : !active ? "This session wasn’t logged before the program ended." : slot.date < detail.today ? "Still available. You can pick this session up anytime." : slot.date > detail.today ? "Planned for this date. You can also train early." : "Ready when you are."}</Txt>
                {(active || slot.status === "completed") && <WorkoutAction slot={slot} quiet={slot.status === "completed"} />}
                {active && slot.templateId && slot.status !== "completed" && <><Pressable accessibilityRole="button" accessibilityState={{ expanded: previewId === slot.id }} onPress={() => setPreviewId(previewId === slot.id ? null : slot.id)} className="mt-3 flex-row items-center justify-between py-2"><Txt className="text-sm text-muted">Exercises & targets</Txt><MaterialCommunityIcons name={previewId === slot.id ? "chevron-up" : "chevron-down"} size={22} color={C.muted} /></Pressable>{previewId === slot.id && <ExercisePreview key={slot.templateId} templateId={slot.templateId} />}</>}
              </> : <Txt className="mt-2 text-sm text-muted">This session is unavailable. Pull down to refresh your plan.</Txt>}
            </View>
          </View>
          {active && openSlots.length > 0 && <Pressable accessibilityRole="button" onPress={() => selectSlot(openSlots[0])} className="mt-4 flex-row items-center gap-3 rounded-2xl border border-border p-4"><MaterialCommunityIcons name="calendar-clock-outline" size={25} color={C.muted} /><View className="flex-1"><Txt weight="semibold" className="text-sm">{openSlots.length} earlier {openSlots.length === 1 ? "session is" : "sessions are"} still open</Txt><Txt className="mt-1 text-xs text-muted">Start with week {openSlots[0].week}, day {openSlots[0].day}. Your progress stays saved.</Txt></View><MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} /></Pressable>}
          <Txt className="mt-4 text-xs leading-5 text-muted">Day 1 starts {formatProgramDate(e.start_date)}. Dates follow {e.timezone.replaceAll("_", " ")}.</Txt>
        </> : <ProgramProgress key={e.id} detail={detail} pro={features.pro} unit={unit} onWeek={selectedWeek => { setSelection({ week: selectedWeek, day: 1 }); setPreviewId(null); setTab("plan"); }} />}


        {active && <Pressable accessibilityRole="button" onPress={() => setDrawer("reminders")} className="mt-6 flex-row items-center gap-3 rounded-2xl bg-panel p-4"><MaterialCommunityIcons name="bell-outline" size={23} color={C.brand} /><View className="flex-1"><Txt weight="semibold" className="text-sm">Your daily nudge</Txt><Txt className="mt-1 text-xs text-muted">{reminderOn ? `${reminderTime} · ${e.timezone.replaceAll("_", " ")}` : "Off · Pick a time that fits your day"}</Txt></View><MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} /></Pressable>}
        {!active && <Pressable accessibilityRole="button" onPress={() => router.push("/explore/programs")} className="mt-6 items-center rounded-full bg-brand py-4"><Txt weight="bold" className="text-bg">Find your next program</Txt></Pressable>}
      </ScrollView>

      {drawer === "weeks" && <WorkoutDrawer title="Your program, week by week" onClose={() => setDrawer(null)}>{a.weeks.map(item => {
        const calendar = weekDays(detail, item.week);
        return <Pressable key={item.week} accessibilityRole="button" accessibilityState={{ selected: week === item.week }} onPress={() => { setSelection({ week: item.week, day: 1 }); setPreviewId(null); setDrawer(null); }} className={`mb-2 flex-row items-center gap-3 rounded-2xl border p-4 ${item.week === week ? "border-brand bg-brand/10" : "border-transparent bg-elevated"}`}><View className="flex-1"><Txt weight="bold">Week {item.week}{item.week === detail.week && active ? " · Current" : ""}</Txt><Txt className="mt-1 text-xs text-muted">{formatProgramDate(calendar[0].date)} – {formatProgramDate(calendar[6].date)}</Txt></View><Txt className="text-sm text-muted">{item.completed}/{item.planned}</Txt><MaterialCommunityIcons name={item.completed === item.planned ? "check-circle" : "chevron-right"} size={22} color={item.completed === item.planned ? "#86EFAC" : C.muted} /></Pressable>;
      })}</WorkoutDrawer>}
      {drawer === "menu" && <WorkoutDrawer title="Program options" onClose={() => setDrawer(null)}>
        {active && <MenuItem icon="bell-outline" title="Daily reminders" subtitle={reminderOn ? `Every day at ${reminderTime}` : "Choose your reminder time"} onPress={() => setDrawer("reminders")} />}
        <MenuItem icon="history" title="Program history" subtitle="Your previous plans and progress" onPress={() => { setDrawer(null); router.push("/programs"); }} />
        <MenuItem icon="compass-outline" title={active ? "Change program" : "Explore programs"} subtitle="Your logged progress stays saved" onPress={() => { setDrawer(null); router.push("/explore/programs"); }} />
        {active && <MenuItem icon="pause-circle-outline" title="Stop following" onPress={stop} />}
      </WorkoutDrawer>}
      {drawer === "reminders" && <ProgramSetup enrollment={e} onClose={() => setDrawer(null)} onSaved={result => { setDetail(result); setDrawer(null); }} />}
    </View>
  );
}
