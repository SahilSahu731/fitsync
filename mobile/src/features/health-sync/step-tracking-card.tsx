import React, { type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import type { MetricEvent } from "../progress/model";
import { useHealthSync } from "./use-health-sync";

const formatSteps = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 0 });
const sourceName = (source: string | null | undefined) =>
  source === "healthkit" ? "Apple Health" : source === "pedometer" ? "Phone" : "Health Connect";

function stepParts(entry?: MetricEvent) {
  if (entry?.stepBreakdown) return entry.stepBreakdown;
  const imported = entry?.source === "healthconnect" || entry?.source === "healthkit";
  return {
    automatic: imported ? (entry?.value ?? null) : null,
    manual: imported ? 0 : (entry?.value ?? 0),
    source: imported ? entry.source : null,
  };
}

export function stepEntryLabel(entry: MetricEvent) {
  const parts = stepParts(entry);
  if (parts.automatic != null) {
    const automatic = `${sourceName(parts.source)} · ${formatSteps(parts.automatic)} automatic`;
    return parts.manual > 0 ? `${automatic} + ${formatSteps(parts.manual)} extra` : automatic;
  }
  return entry.source === "pedometer"
    ? "Includes saved phone steps"
    : entry.stepBreakdown
      ? "Manually added steps"
      : "Saved manually";
}

export function StepTrackingCard({
  entry,
  children,
}: {
  entry?: MetricEvent;
  children?: ReactNode;
}) {
  const { settings, availability, busy, error, result, importNow } = useHealthSync();
  const enabled =
    settings.enabled && (settings.metrics == null || settings.metrics.includes("steps"));
  const unavailable = availability?.available === false;
  const warnings = result?.warnings ?? [];
  const needsAccess = warnings.some((warning) =>
    /steps (access is off|could not be read)/i.test(warning),
  );
  const legacyTotal = Boolean(
    entry &&
    !entry.stepBreakdown &&
    entry.source !== "healthconnect" &&
    entry.source !== "healthkit",
  );
  const parts = stepParts(entry);
  const source = sourceName(parts.source);
  const importedAt = settings.lastImportedAt ? new Date(settings.lastImportedAt) : null;
  const lastSync = importedAt && Number.isFinite(importedAt.getTime()) ? importedAt : null;
  return (
    <View className="mb-5 gap-3 rounded-[24px] border border-white/[0.08] bg-white/[0.035] p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-[#FFB184]/10">
          <MaterialCommunityIcons name="walk" size={22} color="#FFB184" />
        </View>
        <View className="flex-1">
          <Txt weight="semibold" className="text-sm">
            Automatic steps
          </Txt>
          <Txt accessibilityLiveRegion="polite" className="mt-1 text-[11px] text-muted">
            {busy
              ? "Syncing steps…"
              : unavailable
                ? "Unavailable on this device"
                : needsAccess
                  ? "Step access needs attention"
                  : enabled
                    ? `Connected to ${source}`
                    : "Automatic tracking is off"}
          </Txt>
        </View>
        {busy && <ActivityIndicator color="#FFB184" size="small" />}
      </View>
      <Txt className="text-[11px] leading-5 text-muted">
        Compatible Android phones count walking through Health Connect, including while FitSync is
        closed. Older devices need a connected step source, such as a fitness app or watch. FitSync
        updates when you open the app.
      </Txt>
      <View className="flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-white/[0.035] p-3">
          <Txt className="text-[10px] text-muted">Automatic</Txt>
          <Txt weight="semibold" className="mt-1 text-lg">
            {parts.automatic == null ? "—" : formatSteps(parts.automatic)}
          </Txt>
          <Txt className="mt-1 text-[10px] text-muted">
            {parts.automatic == null ? "No automatic data for this day" : source}
          </Txt>
        </View>
        <View className="flex-1 rounded-2xl bg-white/[0.035] p-3">
          <Txt className="text-[10px] text-muted">
            {legacyTotal ? "Saved manually" : "Added manually"}
          </Txt>
          <Txt weight="semibold" className="mt-1 text-lg">
            {entry ? formatSteps(parts.manual) : "—"}
          </Txt>
          <Txt className="mt-1 text-[10px] text-muted">
            {legacyTotal ? "Previously saved daily total" : "Extra steps added to your total"}
          </Txt>
        </View>
      </View>
      <Txt className="text-[10px] leading-5 text-muted">
        {legacyTotal
          ? "Automatic sync will not replace this older daily total, to avoid counting the same steps twice. New manual additions are tracked separately."
          : "Add only steps your phone or watch missed. Automatic sync keeps your manual additions."}
      </Txt>
      {lastSync && (
        <Txt className="text-[10px] text-muted">
          Last synced{" "}
          {lastSync.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </Txt>
      )}
      {!!error && (
        <Txt accessibilityLiveRegion="polite" className="text-xs leading-5 text-[#FFB3AC]">
          {error}
        </Txt>
      )}
      {warnings.map((warning) => (
        <Txt
          key={warning}
          accessibilityLiveRegion="polite"
          className="text-[11px] leading-5 text-muted"
        >
          {warning}
        </Txt>
      ))}
      {needsAccess && (
        <Txt className="text-[11px] leading-5 text-muted">
          Previously synced steps are shown. You can still add missed steps manually.
        </Txt>
      )}
      {unavailable && (
        <Txt className="text-[11px] leading-5 text-muted">
          {availability.reason ??
            "Health Connect is not available. You can still add steps manually."}
        </Txt>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          needsAccess
            ? "Review step permissions"
            : enabled
              ? "Sync automatic steps now"
              : "Connect automatic step tracking"
        }
        disabled={busy || unavailable}
        accessibilityState={{ disabled: busy || unavailable, busy }}
        onPress={() => {
          if (!busy && !unavailable)
            void (enabled && !needsAccess ? importNow() : importNow(true, ["steps"]));
        }}
        className="min-h-11 items-center justify-center rounded-full bg-[#FFB184]/15 px-4"
        style={{ opacity: busy || unavailable ? 0.45 : 1 }}
      >
        <Txt weight="semibold" className="text-xs text-[#FFB184]">
          {busy
            ? "Syncing…"
            : needsAccess
              ? "Review step permissions"
              : enabled
                ? "Sync now"
                : "Connect automatic steps"}
        </Txt>
      </Pressable>
      {!enabled && children}
    </View>
  );
}
