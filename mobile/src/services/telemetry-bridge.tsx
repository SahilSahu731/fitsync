import { useEffect } from "react";
import { AppState } from "react-native";
import { useSegments } from "expo-router";
import { flushTelemetry, initializeTelemetry, trackEvent } from "./telemetry";
import { safeScreen } from "./telemetry-model";

export function TelemetryBridge() {
  const screen = safeScreen(useSegments());
  useEffect(() => {
    let active = true;
    void initializeTelemetry().then(() => {
      if (active) trackEvent("screen_viewed", { screen });
    });
    return () => {
      active = false;
    };
  }, [screen]);
  useEffect(() => {
    void initializeTelemetry().then(() => trackEvent("app_opened"));
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") trackEvent("app_foregrounded");
      else flushTelemetry();
    });
    return () => listener.remove();
  }, []);
  return null;
}
