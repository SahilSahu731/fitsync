import React, { useEffect, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { Txt } from "@/src/components/ui";
import {
  telemetryPreferences,
  updateTelemetry,
  trackEvent,
  recordError,
  flushTelemetry,
} from "@/src/services/telemetry";
import type { TelemetryPreferences } from "@/src/services/telemetry-model";
import { C } from "@/src/constants/theme";

export function TelemetrySettings() {
  const [value, setValue] = useState<TelemetryPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void telemetryPreferences().then(setValue);
  }, []);
  async function change(key: keyof TelemetryPreferences, enabled: boolean) {
    setBusy(true);
    try {
      setValue(await updateTelemetry({ [key]: enabled }));
      setError("");
    } catch {
      setError("Could not save your privacy preference. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <View className="mt-8 rounded-2xl bg-panel p-5">
      <Txt weight="semibold" className="text-lg">
        Help improve FitSync
      </Txt>
      <Txt className="mt-2 text-xs leading-5 text-muted">
        Optional usage events and error reports help us improve training and fix failures. We
        exclude account details, health values, workout details and notes. No session recordings.
        Saved on this device.
      </Txt>
      {(
        [
          ["analytics", "Anonymous usage analytics"],
          ["diagnostics", "Crash and error reports"],
        ] as const
      ).map(([key, label]) => (
        <View key={key} className="mt-4 flex-row items-center justify-between gap-3">
          <Txt className="flex-1 text-sm">{label}</Txt>
          <Switch
            accessibilityLabel={label}
            disabled={!value || busy}
            value={value?.[key] ?? false}
            onValueChange={(enabled) => void change(key, enabled)}
            trackColor={{ false: C.border, true: C.brand }}
          />
        </View>
      ))}
      {!!error && (
        <Txt accessibilityLiveRegion="polite" className="mt-3 text-xs text-muted">
          {error}
        </Txt>
      )}
      {process.env.EXPO_PUBLIC_TELEMETRY_DEBUG === "true" && (
        <Pressable
          accessibilityRole="button"
          className="mt-4 min-h-12 justify-center"
          onPress={() => {
            trackEvent("telemetry_test", { source: "settings" });
            recordError(new Error("Telemetry test"), "telemetry_test");
            flushTelemetry();
            setError("Test reports queued. Check your configured PostHog and Sentry projects.");
          }}
        >
          <Txt className="text-sm text-brand">Send test analytics & error</Txt>
        </Pressable>
      )}
    </View>
  );
}
