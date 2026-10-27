import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import type { FollowedProgram } from "./api";
import { buildProgramInsights } from "./insights";
import { formatProgramDate } from "./program-view";
import { PRO_COLOR, ProBadge } from "./program-visuals";

type Metric = "volumeKg" | "sets" | "minutes";
const METRICS: { key: Metric; label: string }[] = [{ key: "volumeKg", label: "Volume" }, { key: "sets", label: "Sets" }, { key: "minutes", label: "Time" }];
function InsightStat({ value, label, note }: { value: string; label: string; note?: string }) {
  return <View className="min-w-0 flex-1"><Txt weight="bold" className="text-2xl">{value}</Txt><Txt className="mt-1 text-xs text-muted">{label}</Txt>{note && <Txt className="mt-2 text-[10px] leading-4 text-muted">{note}</Txt>}</View>;
}
export function ProInsights({ detail, unit }: { detail: FollowedProgram; unit: "kg" | "lb" }) {
  const insights = useMemo(() => buildProgramInsights(detail), [detail]);
  const [metric, setMetric] = useState<Metric>("volumeKg");
  const [selectedWeek, setSelectedWeek] = useState(detail.week);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null);
  const chosen = insights.weeks.find(week => week.week === selectedWeek) ?? insights.weeks[0];
  const displayValue = (value: number) => Math.round(metric === "volumeKg" && unit === "lb" ? value * 2.2046226218 : value).toLocaleString();
  const volume = (value: number) => Math.round(unit === "lb" ? value * 2.2046226218 : value).toLocaleString();
  const suffix = metric === "volumeKg" ? unit : metric === "sets" ? "sets" : "min";
  const maximum = Math.max(1, ...insights.weeks.map(week => week[metric]));
  const comparison = insights.comparison;
  const delta = comparison ? metric === "volumeKg" ? comparison.volumeChange : metric === "sets" ? comparison.setsChange : comparison.minutesChange : null;
  const selectedActivity = insights.activity.find(day => day.date === selectedDate);

  return <View>
    <View className="mb-4 mt-8 flex-row items-center justify-between"><View><Txt weight="bold" className="text-xl">A closer look</Txt><Txt className="mt-1 text-xs text-muted">Your training, in more detail.</Txt></View><ProBadge /></View>
    <View style={{ backgroundColor: "#19191F", borderColor: "#B6AAFF25", borderWidth: 1, borderRadius: 24, padding: 18 }}>
      <View className="flex-row items-center justify-between"><Txt weight="semibold">Training trends</Txt><MaterialCommunityIcons name="chart-timeline-variant" size={23} color={PRO_COLOR} /></View>
      <View className="mb-5 mt-4 flex-row gap-2">{METRICS.map(item => <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: metric === item.key }} onPress={() => setMetric(item.key)} className="flex-1 items-center rounded-full py-2.5" style={{ backgroundColor: metric === item.key ? PRO_COLOR : "#FFFFFF08" }}><Txt weight="semibold" className="text-xs" style={{ color: metric === item.key ? "#16131F" : C.muted }}>{item.label}</Txt></Pressable>)}</View>
      <Txt className="text-[10px] tracking-widest text-muted">WEEK {chosen.week} · {chosen.completePeriod ? "FINISHED PERIOD" : chosen.startDate > insights.asOf ? "UPCOMING" : "IN PROGRESS"}</Txt>
      <View className="mb-1 mt-2 flex-row items-baseline gap-2"><Txt weight="bold" className="text-4xl">{displayValue(chosen[metric])}</Txt><Txt className="text-sm text-muted">{suffix}</Txt></View>
      <Txt className="text-xs text-muted">{chosen.workouts} workouts logged · {formatProgramDate(chosen.startDate)}–{formatProgramDate(chosen.endDate)}</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, gap: 10, paddingVertical: 18 }}>
        {insights.weeks.map(week => <Pressable key={week.week} onPress={() => setSelectedWeek(week.week)} accessibilityRole="button" accessibilityState={{ selected: chosen.week === week.week }} accessibilityLabel={`Week ${week.week}, ${displayValue(week[metric])} ${suffix}, ${week.workouts} workouts logged`} className="min-w-9 flex-1 items-center">
          <View style={{ height: 100, width: 22, justifyContent: "flex-end", backgroundColor: "#FFFFFF06", borderRadius: 7, overflow: "hidden" }}><View style={{ height: week[metric] > 0 ? Math.max(4, week[metric] / maximum * 100) : 0, backgroundColor: chosen.week === week.week ? PRO_COLOR : "#685E91", borderRadius: 7 }} /></View>
          <Txt weight={chosen.week === week.week ? "bold" : "regular"} className="mt-2 text-[10px]" style={{ color: chosen.week === week.week ? PRO_COLOR : C.muted }}>W{week.week}</Txt>
        </Pressable>)}
      </ScrollView>
      <View className="flex-row items-start gap-2 border-t border-white/10 pt-3"><MaterialCommunityIcons name="swap-horizontal" size={18} color={PRO_COLOR} /><Txt className="flex-1 text-xs leading-5 text-muted">{comparison ? delta === null ? `Weeks ${comparison.previous.week} → ${comparison.latest.week}: no nonzero baseline for a percentage comparison.` : `${delta > 0 ? "+" : ""}${delta}% ${metric === "volumeKg" ? "volume" : metric === "sets" ? "sets" : "training time"} in week ${comparison.latest.week} vs week ${comparison.previous.week}. Both scheduled weeks have ended.` : "Week-over-week comparisons appear after two scheduled weeks have ended."}</Txt></View>
      <Txt className="mt-3 text-[10px] leading-4 text-muted">Grouped by scheduled program week. Current weeks may be partial. More volume or time does not by itself mean greater strength.</Txt>
    </View>

    <View className="mt-4 rounded-[24px] bg-panel p-5">
      <Txt weight="semibold" className="mb-5">Consistency, without the guesswork</Txt>
      <View className="flex-row gap-4"><InsightStat value={insights.adherence === null ? "—" : `${insights.adherence}%`} label="Due sessions logged" note={`${insights.loggedDue} of ${insights.due} sessions due`} /><InsightStat value={insights.onTimePercent === null ? "—" : `${insights.onTimePercent}%`} label="Logged by planned day" note={`${insights.onTime} of ${insights.loggedDue} logged due sessions`} /></View>
      <View className="mt-5 flex-row items-center gap-3 rounded-2xl bg-bg p-3"><MaterialCommunityIcons name="link-variant" size={25} color={PRO_COLOR} /><View className="flex-1"><Txt weight="semibold" className="text-sm">{insights.bestRun} sessions · Best completed run</Txt><Txt className="mt-1 text-[11px] leading-4 text-muted">Consecutive scheduled sessions logged. Recovery days do not break the run.</Txt></View></View>
    </View>

    <View className="mt-4 rounded-[24px] bg-panel p-5">
      <View className="flex-row items-center justify-between"><Txt weight="semibold">Training activity</Txt><Txt className="text-xs" style={{ color: PRO_COLOR }}>{insights.activeDays} active days</Txt></View>
      <Txt className="mb-4 mt-1 text-xs text-muted">{formatProgramDate(insights.activity[0].date)} – {formatProgramDate(insights.asOf)} · Actual log dates</Txt>
      <View className="flex-row">{insights.activity.slice(0, 7).map(day => <View key={day.date} style={{ width: `${100 / 7}%`, alignItems: "center" }}><Txt className="text-[10px] text-muted">{formatProgramDate(day.date, { weekday: "narrow" })}</Txt></View>)}</View>
      <View className="mt-2 flex-row flex-wrap">{insights.activity.map(day => <View key={day.date} style={{ width: `${100 / 7}%`, padding: 3 }}><Pressable accessibilityRole="button" accessibilityState={{ selected: selectedDate === day.date }} accessibilityLabel={`${formatProgramDate(day.date)}: ${day.workouts} workouts logged${day.beforeStart ? ", before program start" : ""}`} onPress={() => setSelectedDate(day.date)} style={{ minHeight: 35, aspectRatio: 1, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: selectedDate === day.date ? "#FFFFFF" : "transparent", backgroundColor: day.workouts > 1 ? PRO_COLOR : day.workouts === 1 ? "#7362B3" : "#FFFFFF06", opacity: day.beforeStart && !day.workouts ? 0.35 : 1 }}><Txt className="text-[10px]" style={{ color: day.workouts > 1 ? "#17131F" : day.workouts ? "#FFFFFF" : C.muted }}>{Number(day.date.slice(-2))}</Txt></Pressable></View>)}</View>
      <Txt className="mt-3 text-xs leading-5 text-muted">{selectedActivity ? `${formatProgramDate(selectedActivity.date)} · ${selectedActivity.workouts} ${selectedActivity.workouts === 1 ? "workout" : "workouts"} logged${selectedActivity.beforeStart ? " · Before this program started" : ""}` : "Tap a day to inspect it. Unfilled days include recovery days."}</Txt>
    </View>

    <View className="mb-4 mt-8"><Txt weight="bold" className="text-xl">Routine breakdown</Txt><Txt className="mt-1 text-xs text-muted">First vs latest logged session of each saved routine.</Txt></View>
    {!insights.routineTrends.length && <View className="rounded-2xl border border-dashed border-border p-5"><Txt className="text-sm leading-6 text-muted">Finish a program workout to start your routine breakdown. Comparisons need two logs of the same routine.</Txt></View>}
    {insights.routineTrends.map(routine => <View key={routine.id} className="mb-3 overflow-hidden rounded-[22px] bg-panel">
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: expandedRoutine === routine.id }} onPress={() => setExpandedRoutine(expandedRoutine === routine.id ? null : routine.id)} className="p-4">
        <View className="flex-row items-center justify-between gap-2"><Txt weight="semibold" className="flex-1">{routine.name}</Txt><MaterialCommunityIcons name={expandedRoutine === routine.id ? "chevron-up" : "chevron-down"} size={21} color={C.muted} /></View>
        <View className="mt-3 flex-row items-center justify-between gap-2"><Txt className="text-xs text-muted">{routine.sessions} logs · {routine.totalSets} sets · {routine.averageMinutes} min avg</Txt><Txt weight="semibold" className="text-xs" style={{ color: PRO_COLOR }}>{routine.volumeChange === null ? routine.sessions < 2 ? "Building baseline" : "No volume baseline" : `${routine.volumeChange > 0 ? "+" : ""}${routine.volumeChange}% volume`}</Txt></View>
      </Pressable>
      {expandedRoutine === routine.id && <View className="border-t border-border px-4 pb-4 pt-3">
        <View className="flex-row gap-3">{[{ label: "FIRST LOG", slot: routine.first }, ...(routine.sessions > 1 ? [{ label: "LATEST LOG", slot: routine.last }] : [])].map(item => <Pressable key={item.label} accessibilityRole="button" disabled={!item.slot.sessionId} onPress={() => router.push({ pathname: "/workout/history/[id]", params: { id: item.slot.sessionId! } })} className="flex-1 rounded-xl bg-bg p-3"><Txt className="text-[9px] tracking-widest text-muted">{item.label}</Txt><Txt weight="bold" className="mt-2 text-base">{volume(item.slot.volumeKg)} <Txt className="text-xs text-muted">{unit}</Txt></Txt><Txt className="mt-1 text-[10px] text-muted">{item.slot.completedSets} sets · {Math.round(item.slot.durationSeconds / 60)} min</Txt><Txt className="mt-2 text-[10px]" style={{ color: PRO_COLOR }}>Open workout ↗</Txt></Pressable>)}</View>
        <Txt className="mt-3 text-[10px] leading-4 text-muted">Volume is weight × reps in completed sets. Exercise changes, extra sets, and warm-ups can change this number.</Txt>
      </View>}
    </View>)}
  </View>;
}
