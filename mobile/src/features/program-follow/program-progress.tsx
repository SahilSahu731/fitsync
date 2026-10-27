import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import type { FollowedProgram } from "./api";
import { basicProgress } from "./insights";
import { formatProgramDate } from "./program-view";
import { ProgressRing, PRO_COLOR, ProBadge } from "./program-visuals";
import { ProInsights } from "./pro-insights";

export function ProgramProgress({ detail, pro, unit, onWeek }: { detail: FollowedProgram; pro: boolean; unit: "kg" | "lb"; onWeek: (week: number) => void }) {
  const summary = useMemo(() => basicProgress(detail), [detail]);
  const [journal, setJournal] = useState(false);
  const { analytics: a, enrollment: e } = detail;
  const volume = Math.round(a.volumeKg * (unit === "lb" ? 2.2046226218 : 1)).toLocaleString();
  return <View>
    <View className="mb-5"><Txt className="text-[10px] tracking-widest text-brand">YOUR TRAINING STORY</Txt><Txt weight="bold" className="mt-2 text-[29px]">Small steps. Real progress.</Txt></View>
    <View className="flex-row items-center gap-5 rounded-[26px] bg-panel p-5">
      <ProgressRing percent={a.progressPercent} />
      <View className="flex-1"><Txt weight="bold" className="text-4xl">{a.completed}<Txt className="text-xl text-muted">/{a.planned}</Txt></Txt><Txt className="mt-1 text-sm text-muted">workouts logged</Txt><Txt className="mt-3 text-xs leading-5 text-muted">{a.completed === a.planned ? "Every planned session is in the books." : `${a.planned - a.completed} sessions ${e.status === "active" ? "left in your plan" : "not logged"}.`}</Txt></View>
    </View>
    <View className="my-6 flex-row">
      {[{ label: "SETS", value: String(a.completedSets) }, { label: "MINUTES", value: String(a.minutes) }, { label: `VOLUME · ${unit.toUpperCase()}`, value: volume }].map((item, index) => <View key={item.label} className={`min-w-0 flex-1 px-3 ${index > 0 ? "border-l border-border" : ""}`}><Txt weight="bold" numberOfLines={1} adjustsFontSizeToFit className="text-center text-2xl">{item.value}</Txt><Txt className="mt-1.5 text-center text-[9px] tracking-widest text-muted">{item.label}</Txt></View>)}
    </View>
    {e.status === "active" && summary.toMilestone > 0 && <View className="mb-6 flex-row items-center gap-3 rounded-2xl bg-brand/10 px-4 py-3"><MaterialCommunityIcons name="flag-checkered" size={24} color={C.brand} /><View className="flex-1"><Txt weight="semibold" className="text-sm">Next milestone · {summary.milestone} workouts</Txt><Txt className="mt-1 text-xs text-muted">{summary.toMilestone} more to get there. Every logged session counts.</Txt></View></View>}
    <View className="mb-3 flex-row items-center justify-between"><Txt weight="bold" className="text-lg">Your weekly rhythm</Txt><Txt className="text-[10px] text-muted">Tap a week</Txt></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 6 }}>
      {a.weeks.map(item => <Pressable key={item.week} accessibilityRole="button" accessibilityLabel={`Week ${item.week}, ${item.completed} of ${item.planned} workouts logged. Open week.`} onPress={() => onWeek(item.week)} style={{ width: 66, paddingVertical: 14, borderRadius: 18, backgroundColor: item.week === detail.week ? "#FF783812" : C.panel, borderWidth: 1, borderColor: item.week === detail.week ? "#FF783850" : "transparent", alignItems: "center" }}><Txt className="text-[10px] text-muted">WEEK {item.week}</Txt><Txt weight="bold" className="my-3 text-xl">{item.completed}<Txt className="text-xs text-muted">/{item.planned}</Txt></Txt><View className="flex-row gap-1">{Array.from({ length: item.planned }, (_, index) => <View key={index} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: index < item.completed ? C.brand : C.border }} />)}</View></Pressable>)}
    </ScrollView>
    <Txt className="mt-3 text-[11px] leading-5 text-muted">{a.adherencePercent === null ? "Your scheduled sessions will appear here as they become due." : `${a.adherencePercent}% of sessions due ${e.status === "active" ? "through today" : "when the program ended"} are logged.`} Recovery days are part of the plan.</Txt>

    <View className="mb-3 mt-7 flex-row items-center justify-between"><Txt weight="bold" className="text-lg">Recent workouts</Txt>{summary.averageMinutes !== null && <Txt className="text-[10px] text-muted">{summary.averageMinutes} min / workout avg</Txt>}</View>
    {summary.recent.length ? summary.recent.map((slot, index) => <Pressable key={slot.id} accessibilityRole="button" disabled={!slot.sessionId} onPress={() => router.push({ pathname: "/workout/history/[id]", params: { id: slot.sessionId! } })} className={`flex-row items-center gap-3 py-4 ${index > 0 ? "border-t border-border" : ""}`}><View className="h-10 w-10 items-center justify-center rounded-full bg-brand/10"><MaterialCommunityIcons name="check" size={21} color={C.brand} /></View><View className="flex-1"><Txt weight="semibold" className="text-sm">{slot.routineName}</Txt><Txt className="mt-1 text-xs text-muted">{slot.completedAt ? new Date(slot.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: e.timezone }) : formatProgramDate(slot.date)} · {slot.completedSets} sets · {Math.round(slot.durationSeconds / 60)} min</Txt></View><MaterialCommunityIcons name="arrow-top-right" size={20} color={C.muted} /></Pressable>) : <View className="rounded-2xl border border-dashed border-border p-5"><Txt className="text-sm leading-6 text-muted">Your first completed workout starts the story. Log a session and it will appear here.</Txt></View>}

    {pro ? <ProInsights detail={detail} unit={unit} /> : <View className="mt-6 rounded-[22px] border p-5" style={{ borderColor: "#B6AAFF30", backgroundColor: "#19171F" }}><View className="flex-row items-center justify-between"><Txt weight="semibold">Go deeper with Pro insights</Txt><ProBadge /></View><Txt className="mt-3 text-xs leading-5" style={{ color: PRO_COLOR }}>Volume trends · Training consistency · Routine comparisons</Txt><Txt className="mt-2 text-[11px] text-muted">Your essential progress and workout logs stay available here.</Txt></View>}
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: journal }} onPress={() => setJournal(!journal)} className="mt-7 flex-row items-center justify-between border-t border-border py-4"><Txt weight="semibold" className="text-sm">Program journal</Txt><MaterialCommunityIcons name={journal ? "minus" : "plus"} size={21} color={C.muted} /></Pressable>
    {journal && detail.events.map(event => <View key={event.id} className="mb-4 flex-row items-start gap-3"><View className="mt-2 h-1 w-1 rounded-full bg-brand" /><View className="flex-1"><Txt className="text-sm">{event.event_type === "started" ? "Started this program" : event.event_type === "switched" ? `Switched to ${event.details.next_program_name ?? "another program"}` : event.event_type === "completed" ? "Completed every session" : event.event_type === "stopped" ? "Stopped following" : `Reminders ${event.details.enabled ? "updated" : "turned off"}`}</Txt><Txt className="mt-1 text-xs text-muted">{new Date(event.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: e.timezone })}</Txt></View></View>)}
    <Txt className="mt-2 text-[10px] leading-4 text-muted">Only completed sets in finished program workouts count. Volume is weight × reps; bodyweight and timed sets may add no volume.</Txt>
  </View>;
}
