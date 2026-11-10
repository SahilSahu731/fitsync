import { MotionPressable as Pressable } from "@/src/components/motion";
import React, { useId, useState } from "react";
import { ScrollView, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { dateLabel } from "./model";

export function Ring({ value, target, color, size = 150, children }: { value: number; target: number | null; color: string; size?: number; children: React.ReactNode }) {
  const ratio = target && target > 0 ? Math.min(1, Math.max(0, value / target)) : 0;
  const radius = 60; const circumference = 2 * Math.PI * radius;
  return <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} accessibilityLabel={target ? `${Math.round(ratio * 100)} percent of goal` : "No goal set"}>
    <Svg width={size} height={size} viewBox="0 0 150 150" style={{ position: "absolute" }}><Circle cx={75} cy={75} r={radius} stroke={`${color}22`} strokeWidth={11} fill="none" /><Circle cx={75} cy={75} r={radius} stroke={color} strokeWidth={11} fill="none" strokeDasharray={`${circumference}`} strokeDashoffset={circumference * (1 - ratio)} strokeLinecap="round" rotation={-90} origin="75, 75" /></Svg>{children}
  </View>;
}
export type ChartPoint = { date: string; value: number; label?: string };
export function TrendChart({ points, color, unit, format = value => value.toFixed(1), onSelect, compact = false }: { points: ChartPoint[]; color: string; unit: string; format?: (value: number) => string; onSelect?: (point: ChartPoint) => void; compact?: boolean }) {
  const id = useId().replace(/:/g, "");
  const [selected, setSelected] = useState<string | null>(null);
  if (!points.length) return <View style={{ minHeight: 145, justifyContent: "center", borderBottomWidth: 1, borderStyle: "dashed", borderBottomColor: `${color}44` }}><Txt className="text-sm text-muted">Your first log starts the chart.</Txt></View>;
  const values = points.map(point => point.value); const low = Math.min(...values); const high = Math.max(...values);
  const pad = high === low ? Math.max(1, high * 0.03) : (high - low) * 0.2;
  const min = Math.max(0, low - pad); const max = high + pad;
  const times = points.map(point => Date.parse(`${point.date}T12:00:00Z`));
  const first = Math.min(...times); const last = Math.max(...times);
  const x = (index: number) => last === first ? 300 : 18 + (times[index] - first) / (last - first) * 564;
  const y = (value: number) => 145 - (value - min) / (max - min) * 125;
  const path = points.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.value)}`).join(" ");
  const active = points.find(point => `${point.date}-${point.label ?? ""}` === selected) ?? points.at(-1)!;
  return <View>
    {!compact && <View className="mb-2 flex-row items-center justify-between"><Txt className="text-[10px] text-muted">{dateLabel(active.date)}{active.label ? ` · ${active.label}` : ""}</Txt><Txt weight="bold" className="text-sm" style={{ color }}>{format(active.value)} {unit}</Txt></View>}
    <View style={{ height: compact ? 110 : 160 }}><Svg width="100%" height="100%" viewBox="0 0 600 160" preserveAspectRatio="none"><Defs><LinearGradient id={id} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={color} stopOpacity={0.35} /><Stop offset="1" stopColor={color} stopOpacity={0} /></LinearGradient></Defs>{[20, 82, 145].map(line => <Line key={line} x1={0} y1={line} x2={600} y2={line} stroke={`${color}18`} strokeDasharray="4 8" />)}{points.length > 1 && <><Path d={`${path} L${x(points.length - 1)},155 L${x(0)},155 Z`} fill={`url(#${id})`} /><Path d={path} fill="none" stroke={color} strokeWidth={3} /></>}{points.map((point, index) => <Circle key={`${point.date}-${index}`} cx={x(index)} cy={y(point.value)} r={point === active ? 6 : 3} fill={color} />)}</Svg></View>
    <View className="flex-row justify-between"><Txt className="text-[10px] text-muted">{dateLabel(points[0].date)}{!compact && ` · ${format(low)} ${unit} min`}</Txt><Txt className="text-[10px] text-muted">{!compact && `${format(high)} ${unit} max · `}{dateLabel(points.at(-1)!.date)}</Txt></View>
    {!compact && <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3"><View className="flex-row gap-2">{points.map((point, index) => <Pressable key={`${point.date}-${index}`} accessibilityRole="button" accessibilityLabel={`${dateLabel(point.date)}: ${format(point.value)} ${unit}`} onPress={() => { setSelected(`${point.date}-${point.label ?? ""}`); onSelect?.(point); }} style={{ paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, backgroundColor: point === active ? `${color}22` : "#FFFFFF06" }}><Txt className="text-[10px]" style={{ color: point === active ? color : C.muted }}>{dateLabel(point.date)} · {format(point.value)}</Txt></Pressable>)}</View></ScrollView>}
  </View>;
}
export function MiniBars({ points, color, selectedDate, onSelect }: { points: { date: string; value: number | null }[]; color: string; selectedDate?: string; onSelect?: (date: string) => void }) {
  const max = Math.max(1, ...points.map(point => point.value ?? 0));
  return <View className="mt-3 flex-row items-end gap-2" style={{ height: 95 }}>{points.map(point => <Pressable key={point.date} accessibilityRole="button" accessibilityLabel={`${dateLabel(point.date)}: ${point.value === null ? "not logged" : point.value}`} onPress={() => onSelect?.(point.date)} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" }}><View style={{ width: "100%", maxWidth: 30, height: point.value === null ? 4 : Math.max(5, point.value / max * 63), borderRadius: 7, backgroundColor: point.value === null ? "#FFFFFF15" : color, opacity: !selectedDate || point.date === selectedDate ? 1 : 0.4 }} /><Txt className="mt-2 text-[10px] text-muted">{dateLabel(point.date, { weekday: "narrow" })}</Txt></Pressable>)}</View>;
}
