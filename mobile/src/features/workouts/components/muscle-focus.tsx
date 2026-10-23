import React, { useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Txt } from "@/src/components/ui";
import { WorkoutDrawer } from "./workout-controls";
import type { SessionExercise } from "../api";

const regions: { name: string; back?: boolean; d: string }[] = [
  { name: "chest", d: "M72 67 Q85 61 98 68 L98 93 Q81 96 72 84Z M102 68 Q115 61 128 67 L128 84 Q119 96 102 93Z" },
  { name: "front-delts", d: "M69 65 Q56 66 53 84 L67 89 73 73Z M131 65 Q144 66 147 84 L133 89 127 73Z" },
  { name: "side-delts", d: "M52 85 L48 96 57 100 65 90Z M148 85 L152 96 143 100 135 90Z" },
  { name: "biceps", d: "M51 97 L45 122 57 128 65 99Z M149 97 L155 122 143 128 135 99Z" },
  { name: "forearms", d: "M44 126 L35 159 44 165 56 131Z M156 126 L165 159 156 165 144 131Z" },
  { name: "abs", d: "M85 98 L98 98 98 140 87 140Z M102 98 L115 98 113 140 102 140Z" },
  { name: "obliques", d: "M73 94 L82 99 85 143 75 136Z M127 94 L118 99 115 143 125 136Z" },
  { name: "hip-flexors", d: "M76 141 L96 145 94 158 79 153Z M124 141 L104 145 106 158 121 153Z" },
  { name: "quads", d: "M75 160 L87 163 94 197 89 218 75 215 69 180Z M125 160 L113 163 106 197 111 218 125 215 131 180Z" },
  { name: "adductors", d: "M90 162 L98 167 97 213 93 211Z M110 162 L102 167 103 213 107 211Z" },
  { name: "abductors", d: "M72 146 L78 156 68 182 65 169Z M128 146 L122 156 132 182 135 169Z" },
  { name: "calves", d: "M75 226 L89 226 87 258 78 277 71 258Z M111 226 L125 226 129 258 122 277 113 258Z" },
  { name: "traps", back: true, d: "M90 51 L110 51 122 66 100 86 78 66Z" },
  { name: "upper-back", back: true, d: "M74 70 L97 89 97 105 75 97Z M126 70 L103 89 103 105 125 97Z" },
  { name: "lats", back: true, d: "M73 101 L95 111 93 131 78 138Z M127 101 L105 111 107 131 122 138Z" },
  { name: "lower-back", back: true, d: "M95 111 L105 111 111 142 89 142Z" },
  { name: "rear-delts", back: true, d: "M69 65 Q56 66 53 84 L67 89 73 73Z M131 65 Q144 66 147 84 L133 89 127 73Z" },
  { name: "triceps", back: true, d: "M51 93 L44 123 58 127 65 97Z M149 93 L156 123 142 127 135 97Z" },
  { name: "forearms", back: true, d: "M44 130 L35 159 44 165 56 132Z M156 130 L165 159 156 165 144 132Z" },
  { name: "glutes", back: true, d: "M74 147 Q88 141 98 147 L98 172 Q76 177 71 165Z M126 147 Q112 141 102 147 L102 172 Q124 177 129 165Z" },
  { name: "hamstrings", back: true, d: "M73 178 L97 178 91 217 76 218Z M127 178 L103 178 109 217 124 218Z" },
  { name: "calves", back: true, d: "M75 226 L91 226 89 254 78 277 71 258Z M109 226 L125 226 129 258 122 277 111 254Z" },
];
function Body({ muscles, back = false, small = false }: { muscles: string[]; back?: boolean; small?: boolean }) {
  return <Svg width={small ? 48 : 150} height={small ? 76 : 245} viewBox="25 8 150 298" accessibilityLabel={`${back ? "Back" : "Front"} muscle map`}><Circle cx="100" cy="29" r="18" fill="#42424A" /><Path d="M90 47 L88 57 Q62 57 51 77 L42 119 30 165 42 175 62 132 69 104 74 139 66 166 69 218 68 258 74 281 69 296 90 296 91 272 98 219 100 188 102 219 109 272 110 296 131 296 126 281 132 258 131 218 134 166 126 139 131 104 138 132 158 175 170 165 158 119 149 77 Q138 57 112 57 L110 47Z" fill="#29292F" stroke="#55555F" strokeWidth="1" />{regions.filter(r => Boolean(r.back) === back).map(region => <Path key={region.name} d={region.d} fill={muscles.includes(region.name) ? "#EF4444" : "#3D3D46"} stroke="#25252B" strokeWidth="1" />)}</Svg>;
}
export function MuscleFocus({ exercises, currentId }: { exercises: SessionExercise[]; currentId?: string }) {
  const [open, setOpen] = useState(false);
  const current = exercises.find(e => e.id === currentId) ?? exercises.find(e => e.workout_logged_sets.some(s => !s.completed_at)) ?? exercises[0];
  const focused = [...(current?.exercises?.primary_muscles ?? []), ...(current?.exercises?.secondary_muscles ?? [])];
  const all = [...new Set(exercises.flatMap(e => [...(e.exercises?.primary_muscles ?? []), ...(e.exercises?.secondary_muscles ?? [])]))];
  return <><Pressable onPress={() => setOpen(true)} accessibilityLabel="View workout muscle focus" className="ml-3 flex-row items-center rounded-xl bg-elevated px-2"><Body muscles={focused} small /><Body muscles={focused} small back /></Pressable>{open && <WorkoutDrawer title="Muscle focus" onClose={() => setOpen(false)}><Txt className="text-sm text-muted">Current exercise</Txt><Txt weight="bold" className="mt-1 text-lg">{current?.exercise_name ?? "Add an exercise to begin"}</Txt><Txt className="mt-2 text-sm text-red-300">{focused.length ? focused.map(m => m.replace(/-/g, " ")).join(" · ") : "Muscle tags not available for this exercise."}</Txt><View className="mt-6 flex-row justify-center"><View className="items-center"><Body muscles={all} /><Txt className="text-muted">Front</Txt></View><View className="items-center"><Body muscles={all} back /><Txt className="text-muted">Back</Txt></View></View><Txt className="mt-5 text-sm text-muted">Red shows primary and secondary muscles tagged across all exercises in this workout. This is a schematic training-focus map, not a measurement of activation or fatigue.</Txt><View className="mt-4 flex-row flex-wrap gap-2">{all.map(name => <View key={name} className="rounded-full bg-red-500/10 px-3 py-2"><Txt className="text-xs capitalize text-red-300">{name.replace(/-/g, " ")}</Txt></View>)}</View></WorkoutDrawer>}</>;
}
