import React, { useState } from "react";
import { Switch, View } from "react-native";
import { AudioLines, Hand, Moon, Smartphone, Volume2 } from "lucide-react-native";
import { Txt } from "@/src/components/ui";
import { MotionPressable } from "@/src/components/motion";
import { C } from "@/src/constants/theme";
import { useExperience } from "./experience-context";
import type { ExperiencePreferences } from "./model";

export function ExperienceSettings() {
  const { preferences, ready, error, update, feedback } = useExperience();
  const [saving, setSaving] = useState(false);
  const change = async (key: keyof ExperiencePreferences, value: boolean) => {
    setSaving(true);
    try { await update({ [key]: value }); } catch { /* The persistent error below explains the failure. */ }
    finally { setSaving(false); }
  };
  const rows = [
    { key: "sounds" as const, title: "Workout sound effects", detail: "Quiet cues when a set saves or a workout finishes. Respects silent mode.", Icon: Volume2 },
    { key: "haptics" as const, title: "Workout & navigation haptics", detail: "Light feedback for saved sets, tab changes, and calendar selections.", Icon: Hand },
    { key: "reduceMotion" as const, title: "Reduce motion", detail: "Keep navigation and screen transitions calm. Your system setting is always respected.", Icon: Moon },
    { key: "keepAwake" as const, title: "Keep workout screen awake", detail: "Keep the display on while the live workout screen is open.", Icon: Smartphone },
  ];
  return <View>
    <Txt weight="semibold" className="mb-4 mt-8 text-xl">Make it feel like you</Txt>
    <View className="overflow-hidden rounded-2xl bg-panel">{rows.map(({ key, title, detail, Icon }, index) => <View key={key} className={`flex-row items-center gap-3 p-5 ${index < rows.length - 1 ? " " : ""}`}><Icon size={22} color={C.ink} /><View className="flex-1"><Txt weight="semibold" className="text-base">{title}</Txt><Txt className="mt-1 text-xs leading-5 text-muted">{detail}</Txt></View><Switch accessibilityLabel={title} value={preferences[key]} disabled={!ready || saving} onValueChange={value => void change(key, value)} trackColor={{ false: C.border, true: C.brand }} thumbColor={preferences[key] ? C.bg : C.muted} /></View>)}</View>
    {!!error && <Txt accessibilityLiveRegion="polite" className="mt-3 text-sm text-muted">{error}</Txt>}
    <MotionPressable accessibilityRole="button" disabled={!ready || !preferences.sounds} onPress={() => feedback("workout")} className="mt-3 min-h-12 flex-row items-center justify-center gap-2 rounded-xl"><AudioLines size={19} color={preferences.sounds ? C.brand : C.muted} /><Txt weight="semibold" className={preferences.sounds ? "text-ink" : "text-muted"}>Preview completion sound</Txt></MotionPressable>
    <Txt className="mt-3 text-xs leading-5 text-muted">Saved on this device. Rest-timer and program reminder sounds are managed separately in your phone’s notification settings.</Txt>
  </View>;
}
