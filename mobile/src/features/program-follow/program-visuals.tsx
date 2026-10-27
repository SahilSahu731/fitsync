import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import type { FollowedProgram } from "./api";

export const PRO_COLOR = "#B6AAFF";
export function ProBadge() {
  return <View style={{ backgroundColor: "#B6AAFF1C", borderColor: "#B6AAFF40", borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 }}><Txt weight="bold" style={{ color: PRO_COLOR, fontSize: 9, letterSpacing: 1.5 }}>PRO</Txt></View>;
}
export function ProgressRing({ percent, size = 112, label = "complete" }: { percent: number; size?: number; label?: string }) {
  const radius = size / 2 - 7;
  const circumference = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(100, percent));
  return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: value }} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#FFFFFF12" strokeWidth={6} fill="none" />
      {value > 0 && <Circle cx={size / 2} cy={size / 2} r={radius} stroke={C.brand} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - value / 100)} rotation={-90} origin={`${size / 2}, ${size / 2}`} />}
    </Svg>
    <Txt weight="bold" style={{ fontSize: size < 100 ? 20 : 29 }}>{value}<Txt style={{ fontSize: 13, color: C.muted }}>%</Txt></Txt>
    {size >= 100 && <Txt style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{label}</Txt>}
  </View>;
}
export function ProgramCover({ detail, pro }: { detail: FollowedProgram; pro: boolean }) {
  const [failed, setFailed] = useState(false);
  const { enrollment: e, analytics: a } = detail;
  return <View style={{ marginBottom: 22, borderRadius: 26, overflow: "hidden", backgroundColor: "#292522" }}>
    {e.cover_url && !failed && <Image source={{ uri: e.cover_url }} onError={() => setFailed(true)} contentFit="cover" style={StyleSheet.absoluteFill} />}
    <LinearGradient colors={["#12121220", "#101011B0", "#101011F5"]} locations={[0, 0.4, 1]} style={{ padding: 20, paddingTop: 18, minHeight: 230, justifyContent: "space-between" }}>
      <View className="flex-row items-center justify-between"><View className="rounded-full border border-white/20 bg-black/40 px-3 py-1.5"><Txt weight="semibold" className="text-[10px] tracking-widest text-white">{e.status === "active" ? "YOUR PROGRAM" : e.status.toUpperCase()}</Txt></View>{pro && <ProBadge />}</View>
      <View style={{ marginTop: 38 }}><Txt weight="bold" style={{ fontSize: 30, lineHeight: 34, color: "#FFFFFF" }}>{e.program_name}</Txt><Txt style={{ color: "#CAC6C3", fontSize: 12, marginTop: 8 }}>{e.days_per_week} days / week · {e.duration_weeks} week program</Txt>
        <View className="mt-5 flex-row items-center justify-between"><Txt weight="semibold" className="text-xs text-white">Week {detail.week} <Txt className="text-muted">of {e.duration_weeks}</Txt></Txt><Txt className="text-xs text-muted">{a.completed}/{a.planned} workouts logged</Txt></View>
        <View style={{ height: 3, backgroundColor: "#FFFFFF20", borderRadius: 4, overflow: "hidden", marginTop: 10 }}><View style={{ height: 3, width: `${a.progressPercent}%`, backgroundColor: C.brand }} /></View>
      </View>
    </LinearGradient>
  </View>;
}
