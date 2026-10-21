import React from "react";
import { Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { GOALS, EXPERIENCE, EQUIPMENT, type Draft } from "./config";

export function ReviewStep({ draft, onEdit, weightUnit = "kg" }: { draft: Draft; onEdit: (step: number) => void; weightUnit?: "kg" | "lb" }) {
  const rows = [
    { label: "Goal", value: GOALS.find(o => o.value === draft.goal)?.title, step: 0 },
    { label: "Experience", value: EXPERIENCE.find(o => o.value === draft.experience)?.title, step: 1 },
    { label: "Height", value: `${draft.heightCm} cm`, step: 2 },
    { label: "Weight", value: weightUnit === "lb" ? `${(draft.weightKg * 2.2046226218).toFixed(1)} lb` : `${draft.weightKg} kg`, step: 3 },
    { label: "Routine", value: `${draft.trainingDays} days / week · ${draft.minutesPerWorkout} min`, step: 4 },
    { label: "Equipment", value: EQUIPMENT.find(o => o.value === draft.equipment)?.title, step: 5 },
    { label: "About you", value: [draft.gender === "prefer_not_to_say" ? null : draft.gender, draft.bodyType].filter(Boolean).join(" · ") || "Not specified", step: 6 },
  ];
  return <View>
    <View className="bg-panel rounded-[20px] px-[18px]">
      {rows.map((row, i) => <Pressable key={row.label} accessibilityRole="button" accessibilityLabel={`Edit ${row.label}: ${row.value}`} onPress={() => onEdit(row.step)} className={`flex-row items-center gap-3 border-border py-[15px] active:opacity-50 ${i === rows.length - 1 ? "border-b-0" : "border-b"}`}>
        <View className="flex-1"><Txt className="text-muted text-[12px] mb-[4px]">{row.label}</Txt><Txt weight="medium" className="text-[16px]">{row.value}</Txt></View>
        <MaterialCommunityIcons name="pencil-outline" color={C.muted} size={18} />
      </Pressable>)}
    </View>
    <Txt className="text-center text-muted text-[13px] mt-[18px]">Your starting point, not a permanent plan.</Txt>
  </View>;
}
