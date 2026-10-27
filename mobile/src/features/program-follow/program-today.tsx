import React from "react";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import type { FollowedProgram, ProgramSlot } from "./api";
import { focusAction, formatProgramDate, programFocus } from "./program-view";
import { ProgressRing } from "./program-visuals";
import { WorkoutAction } from "./workout-action";

export function ProgramToday({ detail, onPreview, onProgress, onRefresh }: { detail: FollowedProgram; onPreview: (slot: ProgramSlot) => void; onProgress: () => void; onRefresh: () => void }) {
  const focus = programFocus(detail);
  const week = detail.analytics.weeks.find(item => item.week === detail.week);
  const rest = focus.kind === "rest";
  const complete = focus.kind === "done" || focus.kind === "completed";
  const preview = rest || focus.kind === "upcoming";
  return <View>
    <View className="mb-3 flex-row items-center justify-between"><Txt weight="bold" className="text-xl">{detail.enrollment.status === "active" ? "Your next move" : "Your journey"}</Txt><Txt className="text-xs text-muted">{formatProgramDate(detail.today, { weekday: "short", day: "numeric", month: "short" })}</Txt></View>
    <View className="overflow-hidden rounded-[24px] border" style={{ borderColor: rest || complete ? "#86EFAC25" : "#FF783830" }}>
      <LinearGradient colors={rest || complete ? ["#1B2D26", "#161C19"] : ["#30221C", "#1D1918"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
        <View className="flex-row items-start gap-4"><View className="flex-1"><View className="mb-3 flex-row items-center gap-2"><View style={{ height: 5, width: 5, borderRadius: 3, backgroundColor: rest || complete ? "#86EFAC" : C.brand }} /><Txt weight="semibold" style={{ fontSize: 9, letterSpacing: 1.2, color: rest || complete ? "#86EFAC" : "#FFAA80", flex: 1 }}>{focus.eyebrow}</Txt></View><Txt weight="bold" className="text-[26px] leading-8">{focus.title}</Txt></View>
          {detail.enrollment.status === "active" && week && <View className="items-center"><ProgressRing size={66} percent={week.planned ? Math.round(week.completed / week.planned * 100) : 0} label="This week completed" /><Txt className="mt-1 text-[9px] text-muted">THIS WEEK</Txt></View>}
        </View>
        <Txt className="mb-5 mt-3 text-xs leading-5 text-muted">{focus.description}</Txt>
        {focus.slot ? preview ? <Pressable accessibilityRole="button" onPress={() => onPreview(focus.slot!)} className="flex-row items-center justify-between rounded-2xl bg-white/10 px-4 py-3.5"><Txt weight="semibold" className="text-sm">{focusAction(focus)}</Txt><MaterialCommunityIcons name="arrow-down" size={19} color={C.ink} /></Pressable> : <WorkoutAction slot={focus.slot} title={focusAction(focus) ?? undefined} quiet={complete} /> : focus.kind === "unavailable" ? <Pressable accessibilityRole="button" onPress={onRefresh} className="py-2"><Txt className="text-brand">Refresh plan</Txt></Pressable> : detail.enrollment.status !== "active" ? <Pressable accessibilityRole="button" onPress={onProgress} className="flex-row items-center justify-between rounded-2xl bg-white/10 px-4 py-3.5"><Txt weight="semibold" className="text-sm">View your progress</Txt><MaterialCommunityIcons name="arrow-right" size={19} color={C.ink} /></Pressable> : null}
      </LinearGradient>
    </View>
  </View>;
}
