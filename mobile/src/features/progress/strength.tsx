import { MotionPressable as Pressable } from "@/src/components/motion";
import React, { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { TrendChart } from "./charts";
import { dateLabel, weightValue } from "./model";
import type { ProgressAnalytics } from "./analytics";

const purple = C.brand;
type Mode = "e1rm" | "load" | "volume" | "reps" | "duration" | "distance";
const names: Record<Mode, string> = { e1rm: "Est. 1RM", load: "Heaviest set", volume: "Volume load", reps: "Most reps", duration: "Longest set", distance: "Farthest set" };
export function StrengthSection({ data, unit }: { data: ProgressAnalytics; unit: "kg" | "lb" }) {
  const router = useRouter(); const [search, setSearch] = useState(""); const [exerciseId, setExerciseId] = useState(""); const [mode, setMode] = useState<Mode>("e1rm"); const [allRecords, setAllRecords] = useState(false);
  const exercises = data.exercises.filter(exercise => exercise.name.toLowerCase().includes(search.toLowerCase()));
  const exercise = exercises.find(value => value.id === exerciseId) ?? exercises[0];
  const modes: Mode[] = exercise?.type === "reps_weight" ? ["e1rm", "load", "volume", "reps"] : exercise?.type === "duration" ? ["duration"] : exercise?.type === "distance_duration" ? ["distance", "duration"] : ["reps"];
  const activeMode = modes.includes(mode) ? mode : modes[0];
  const modeUnit = ["e1rm", "load", "volume"].includes(activeMode) ? unit : activeMode === "reps" ? "reps" : activeMode === "duration" ? "sec" : "m";
  const convert = (value: number) => ["e1rm", "load", "volume"].includes(activeMode) ? weightValue(value, unit) : value;
  const sessions = exercise?.sessions.filter(session => session.date >= data.start && session.date <= data.today) ?? [];
  const points = sessions.filter(session => session[activeMode] !== null).map((session, index) => ({ date: session.date, value: convert(session[activeMode]!), label: `Session ${index + 1}` }));
  const first = points[0]?.value; const last = points.at(-1)?.value;
  return <View>
    <View className="mb-4 mt-8 flex-row items-center justify-between"><View><Txt weight="bold" className="mt-1 text-[25px]">Exercise performance</Txt></View><View style={{ width: 45, height: 45, borderRadius: 16, backgroundColor: "#B8A0FF18", alignItems: "center", justifyContent: "center" }}><MaterialCommunityIcons name="chart-timeline-variant-shimmer" size={25} color={purple} /></View></View>
    <View style={{ padding: 20, borderRadius: 28, backgroundColor: C.panel }}>
      <TextInput value={search} onChangeText={setSearch} accessibilityLabel="Find a logged exercise" placeholder="Find a logged exercise…" placeholderTextColor="#B8A0FF88" style={{ borderRadius: 14, backgroundColor: "#FFFFFF08", padding: 13, color: C.ink, fontFamily: "Inter_400Regular" }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="my-4"><View className="flex-row gap-2">{exercises.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: item.id === exercise?.id }} onPress={() => setExerciseId(item.id)} style={{ borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: item.id === exercise?.id ? purple : "#FFFFFF08" }}><Txt weight="semibold" className="text-xs" style={{ color: item.id === exercise?.id ? "#20172D" : C.muted }}>{item.name}</Txt></Pressable>)}</View></ScrollView>
      {!exercise ? <View className="py-7"><Txt weight="bold" className="text-lg">No exercise history yet</Txt><Txt className="mt-2 text-sm leading-6 text-muted">{search ? "No logged exercises match your search." : "Complete and save a workout to see real exercise trends here."}</Txt></View> : <>
        <Txt weight="bold" className="text-xl">{exercise.name}</Txt><Txt className="mt-1 text-[11px] text-muted">{exercise.sessions.length} sessions all time · {exercise.type.replace(/_/g, " + ")}</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="my-4"><View className="flex-row gap-2">{modes.map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === activeMode }} onPress={() => setMode(item)} style={{ borderBottomWidth: 2, borderBottomColor: item === activeMode ? purple : "transparent", paddingVertical: 8, paddingHorizontal: 8 }}><Txt className="text-xs" style={{ color: item === activeMode ? purple : C.muted }}>{names[item]}</Txt></Pressable>)}</View></ScrollView>
        <TrendChart points={points} color={purple} unit={modeUnit} format={value => value.toLocaleString(undefined, { maximumFractionDigits: 1 })} />
        {first !== undefined && last !== undefined && points.length > 1 && <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-black/20 p-3"><Txt className="text-xs text-muted">First → latest in this range</Txt><Txt weight="bold" style={{ color: purple }}>{last - first >= 0 ? "+" : ""}{(last - first).toFixed(1)} {modeUnit}</Txt></View>}
        <Txt className="mt-4 text-[10px] leading-4 text-muted">Working sets only. Estimated 1RM uses Epley for sets of 1–12 reps. Volume load counts external weight × reps; it is not a measure of workout quality. Different tracking types stay separate.</Txt>
        {sessions.length > 0 && <><Txt weight="semibold" className="mb-2 mt-5 text-xs">Recent sessions in this range</Txt>{[...sessions].reverse().slice(0, 4).map(session => <Pressable key={session.sessionId} accessibilityRole="button" onPress={() => router.push({ pathname: "/workout/history/[id]", params: { id: session.sessionId } })} className="flex-row items-center justify-between border-t border-white/5 py-3"><View><Txt className="text-xs">{dateLabel(session.date)}</Txt><Txt className="mt-1 text-[10px] text-muted">{session.sets} working sets</Txt></View><Txt weight="semibold" className="text-xs" style={{ color: purple }}>{session[activeMode] === null ? "No estimate" : `${convert(session[activeMode]!).toFixed(1)} ${modeUnit}`} ↗</Txt></Pressable>)}</>}
      </>}
    </View>
    <View className="mb-4 mt-7 flex-row items-center justify-between"><View><Txt weight="bold" className="text-xl">Your personal bests</Txt><Txt className="mt-1 text-xs text-muted">All time · {data.exercises.length} exercises with working sets</Txt></View><MaterialCommunityIcons name="trophy-outline" size={27} color="#FFCF76" /></View>
    {!data.exercises.length && <View style={{ borderRadius: 22, borderWidth: 1, borderStyle: "dashed", borderColor: "#FFCF7633", padding: 20 }}><Txt className="text-sm leading-6 text-muted">Your first completed working sets establish your personal records. No sample records are shown.</Txt></View>}
    {(allRecords ? data.exercises : data.exercises.slice(0, 5)).map((item, index) => {
      const record = item.type === "reps_weight" ? item.bestLoad : item.type === "duration" ? item.bestDuration : item.type === "distance_duration" ? item.bestDistance : item.bestReps;
      if (!record) return null;
      const value = item.type === "reps_weight" ? `${weightValue(record.bestSet.weight_kg ?? 0, unit).toFixed(1)} ${unit} × ${record.bestSet.reps ?? 0}` : item.type === "duration" ? `${record.duration} sec` : item.type === "distance_duration" ? `${record.distance.toLocaleString()} m` : `${record.reps} reps`;
      return <Pressable key={item.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/workout/history/[id]", params: { id: record.sessionId } })} style={{ flexDirection: "row", alignItems: "center", gap: 13, padding: 17, marginBottom: 9, borderRadius: 22, backgroundColor: index === 0 ? "#30291C" : C.panel, borderWidth: 1, borderColor: index === 0 ? "#FFCF7633" : "#FFFFFF05" }}><View style={{ width: 39, height: 43, borderRadius: 14, backgroundColor: "#FFCF7615", alignItems: "center", justifyContent: "center" }}><MaterialCommunityIcons name="medal-outline" size={24} color="#FFCF76" /></View><View className="flex-1"><Txt weight="semibold" className="text-sm">{item.name}</Txt><Txt className="mt-1 text-[10px] text-muted">{dateLabel(record.date)} · {item.type === "reps_weight" ? "Heaviest working set" : names[item.type === "duration" ? "duration" : item.type === "distance_duration" ? "distance" : "reps"]}</Txt>{item.type === "reps_weight" && item.bestEstimate?.e1rm != null && <Txt className="mt-1 text-[10px]" style={{ color: "#BFA9F8" }}>Best est. 1RM {weightValue(item.bestEstimate.e1rm, unit).toFixed(1)} {unit}</Txt>}</View><Txt weight="bold" className="text-sm" style={{ color: "#FFCF76", maxWidth: "38%", textAlign: "right" }}>{value} ↗</Txt></Pressable>;
    })}
    {data.exercises.length > 5 && <Pressable accessibilityRole="button" onPress={() => setAllRecords(!allRecords)} className="items-center py-3"><Txt weight="semibold" className="text-xs" style={{ color: "#FFCF76" }}>{allRecords ? "Show fewer records" : `See all ${data.exercises.length} exercise records`}</Txt></Pressable>}
  </View>;
}
