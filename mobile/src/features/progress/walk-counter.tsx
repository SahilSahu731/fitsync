import { MotionPressable as Pressable } from "@/src/components/motion";
import React, { useCallback, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Txt } from "@/src/components/ui";
import { localDate, dateLabel } from "./model";

export type WalkDraft = { count: number; date: string };
export function WalkCounter({ onSave, draft, onDraftChange }: { onSave: (steps: number, date: string) => Promise<void>; draft: WalkDraft; onDraftChange: (draft: WalkDraft) => void }) {
  const subscription = useRef<{ remove: () => void } | null>(null);
  const [running, setRunning] = useState(false); const { count, date } = draft;
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const active = useRef(false);
  const stop = useCallback(() => { subscription.current?.remove(); subscription.current = null; setRunning(false); }, []);
  useFocusEffect(useCallback(() => {
    active.current = true;
    const listener = AppState.addEventListener("change", state => { if (state !== "active") stop(); });
    return () => { active.current = false; stop(); listener.remove(); };
  }, [stop]));
  async function start() {
    setBusy(true); setError("");
    try {
      // Lazy loading lets old binaries use manual logging without a native crash.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Pedometer } = require("expo-sensors") as typeof import("expo-sensors");
      if (!await Pedometer.isAvailableAsync()) throw new Error("This device has no step sensor. You can still log your daily total.");
      const permission = await Pedometer.requestPermissionsAsync();
      if (!permission.granted) throw new Error("Motion access was not granted. You can log steps manually or enable motion access in device settings.");
      if (!active.current || AppState.currentState !== "active") return;
      const day = localDate(); onDraftChange({ date: day, count: 0 }); setRunning(true);
      subscription.current = Pedometer.watchStepCount(result => {
        if (localDate() !== day) { stop(); return; }
        onDraftChange({ date: day, count: result.steps });
      });
    } catch (e) { setError(e instanceof Error ? e.message : "Step counter unavailable in this build. Use manual logging."); } finally { setBusy(false); }
  }
  return <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: "#5FE2B625", paddingTop: 16 }}>
    <View className="flex-row items-center justify-between gap-3"><View className="flex-1"><Txt weight="bold" className="text-sm">{running ? "Counting this walk" : "Phone step counter"}</Txt><Txt className="mt-1 text-xs text-muted">{count ? `${count.toLocaleString()} steps · ${dateLabel(date)}` : "Optional · permission required"}</Txt></View><Pressable accessibilityRole="button" disabled={busy || !running && count > 0} onPress={() => running ? stop() : void start()} style={{ paddingHorizontal: 15, paddingVertical: 10, borderRadius: 18, backgroundColor: "#5FE2B620", opacity: !running && count > 0 ? 0.4 : 1 }}><Txt weight="bold" className="text-xs" style={{ color: "#5FE2B6" }}>{busy ? "Working…" : running ? "Stop" : "Start walk"}</Txt></Pressable></View>
    {!running && count > 0 && <View className="mt-3 flex-row items-center gap-4"><Pressable accessibilityRole="button" disabled={busy} onPress={async () => { setBusy(true); try { await onSave(count, date); onDraftChange({ date, count: 0 }); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save walk."); } finally { setBusy(false); } }} style={{ padding: 12, borderRadius: 14, backgroundColor: "#5FE2B6" }}><Txt weight="bold" className="text-xs" style={{ color: "#11291F" }}>Add walk to daily total</Txt></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={() => onDraftChange({ date, count: 0 })}><Txt className="text-xs text-muted">Discard walk</Txt></Pressable></View>}
    <Txt className="mt-3 text-[10px] leading-4 text-muted">Counts while this screen is open and the app is active. Stops in the background. Save each walk once; don’t add it to a daily total that already includes those steps.</Txt>
    {error && <Txt accessibilityRole="alert" className="mt-3 text-xs" style={{ color: "#FFD09B" }}>{error}</Txt>}
  </View>;
}
