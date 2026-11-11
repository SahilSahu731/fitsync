import React, { useState } from "react";
import { Alert, Platform, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Card, PrimaryButton, Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { getHealthAdapter } from "@/src/features/health-sync/native";
import { useHealthSync } from "@/src/features/health-sync/use-health-sync";

export default function HealthSyncScreen() {
  const health = useHealthSync(); const provider = Platform.OS === "ios" ? "Apple Health" : "Health Connect";
  const [settingsError, setSettingsError] = useState("");
  const manage = async () => { setSettingsError(""); try { await getHealthAdapter().openSettings(); } catch { setSettingsError(`Open ${provider} in your device settings to review FitSync access.`); } };
  return <SafeAreaView className="flex-1 bg-bg" edges={["top", "bottom"]}>
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} className="mb-7 h-11 w-11 items-center justify-center rounded-full"><MaterialCommunityIcons name="arrow-left" size={22} color={C.ink} /></Pressable>
      <View className="mb-5 h-16 w-16 items-center justify-center rounded-[22px] bg-white/5"><MaterialCommunityIcons name="heart-pulse" size={32} color={C.ink} /></View>
      <Txt weight="semibold" className="text-[32px] leading-[38px]">Less logging.{"\n"}More of your picture.</Txt>
      <Txt className="mb-7 mt-4 text-base leading-6 text-muted">Bring steps, sleep and body weight from {provider} into your progress journal.</Txt>
      <Card className="mb-5">
        <Txt weight="semibold" className="text-lg">You choose what to share</Txt>
        <Txt className="mt-3 text-sm leading-6 text-muted">FitSync requests read access only. Imports cover the last seven days and join the progress saved to your FitSync account, including cloud sync. We do not write to {provider}.</Txt>
        <View className="mt-5 gap-4">{[{ icon: "shoe-print", title: "Steps", detail: "Daily totals from your connected devices" }, { icon: "moon-waning-crescent", title: "Sleep", detail: "Recorded asleep time, grouped by wake date" }, { icon: "scale-bathroom", title: "Body weight", detail: "Your latest recorded weight each day" }].map(item => <View key={item.title} className="flex-row items-center gap-3"><MaterialCommunityIcons name={item.icon as "shoe-print"} size={21} color={C.ink} /><View className="flex-1"><Txt weight="semibold" className="text-sm">{item.title}</Txt><Txt className="mt-1 text-xs text-muted">{item.detail}</Txt></View></View>)}</View>
      </Card>
      <Card className="mb-6">
        <Txt weight="semibold" className="text-base">{health.settings.enabled ? "Import is enabled" : "Import is off"}</Txt>
        <Txt className="mt-3 text-sm leading-6 text-muted">{health.settings.enabled ? "Updates run when you open FitSync or bring it to the foreground. You can also import now. This does not run while the app is closed." : "Tap below to choose permissions in your device’s health settings. Each FitSync account chooses separately."}</Txt>
        {health.settings.lastImportedAt && <Txt className="mt-3 text-xs text-muted">Last import attempt: {new Date(health.settings.lastImportedAt).toLocaleString()}</Txt>}
        <Txt className="mt-3 text-xs leading-5 text-muted">Manual entries and saved phone-step totals take priority. Repeated imports replace imported totals; they do not add them again. Missing data is never turned into zero. Existing imports stay saved until you edit them.</Txt>
        {Platform.OS === "ios" && <Txt className="mt-3 text-xs leading-5 text-muted">Apple Health keeps read-permission decisions private. No records can mean no data or access was not shared.</Txt>}
      </Card>
      {!health.ownerId && <Txt className="mb-5 text-sm text-muted">Sign in to connect health data to your journal.</Txt>}
      {health.availability && !health.availability.available && <Txt className="mb-5 text-sm leading-6 text-muted">{health.availability.reason}</Txt>}
      {(health.error || settingsError) && <Txt accessibilityRole="alert" className="mb-5 text-sm leading-6" style={{ color: "#FF929C" }}>{health.error || settingsError}</Txt>}
      {health.result && <Card className="mb-5"><Txt weight="semibold">{health.result.imported} daily entries updated</Txt><Txt className="mt-2 text-xs leading-5 text-muted">{health.result.unchanged} unchanged · {health.result.protectedEntries} manual entries preserved</Txt>{health.result.warnings.map((warning, index) => <Txt key={index} className="mt-2 text-xs leading-5 text-muted">{warning}</Txt>)}{!health.result.imported && !health.result.unchanged && !health.result.protectedEntries && <Txt className="mt-3 text-sm text-muted">No readable records were found. Check connected devices and permissions, then retry.</Txt>}</Card>}
      <PrimaryButton title={health.settings.enabled ? "Import last seven days" : `Connect ${provider}`} loading={health.busy} disabled={!health.ownerId || !health.availability?.available} onPress={() => void health.importNow(!health.settings.enabled)} />
      <Pressable accessibilityRole="button" onPress={() => void manage()} className="mt-4 min-h-12 items-center justify-center rounded-2xl px-4 py-4"><Txt weight="semibold" className="text-sm">Manage device permissions</Txt></Pressable>
      {health.settings.enabled && <Pressable accessibilityRole="button" disabled={health.busy} onPress={() => Alert.alert("Stop health imports?", "Existing journal entries stay saved. You can revoke system access separately in your device’s health settings.", [{ text: "Keep importing", style: "cancel" }, { text: "Stop imports", onPress: () => void health.disconnect() }])} className="mt-3 min-h-12 items-center justify-center px-4 py-4"><Txt className="text-sm text-muted">Stop importing for this account</Txt></Pressable>}
    </ScrollView>
  </SafeAreaView>;
}
