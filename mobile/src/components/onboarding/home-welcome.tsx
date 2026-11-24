import React, { useCallback, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { claimOnboardingWelcome } from "./welcome-state";
import { WelcomePopup } from "./welcome-popup";

export const HOME_WELCOME_DELAY_MS = 7_000;

export function HomeOnboardingWelcome({ ownerId, blocked }: { ownerId: string; blocked: boolean }) {
  const [openOwner, setOpenOwner] = useState("");
  useFocusEffect(
    useCallback(() => {
      if (!ownerId || blocked) return;
      let focused = true;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let foreground = AppState.currentState === "active";
      const current = () => focused && foreground;
      function schedule() {
        if (timer !== undefined) clearTimeout(timer);
        if (!current()) return;
        timer = setTimeout(() => {
          void claimOnboardingWelcome(ownerId, current).then((show) => {
            if (show && current()) setOpenOwner(ownerId);
          });
        }, HOME_WELCOME_DELAY_MS);
      }
      schedule();
      const subscription = AppState.addEventListener("change", (state) => {
        foreground = state === "active";
        schedule();
      });
      return () => {
        focused = false;
        setOpenOwner("");
        if (timer !== undefined) clearTimeout(timer);
        subscription.remove();
      };
    }, [ownerId, blocked]),
  );
  return !blocked && openOwner === ownerId && Boolean(ownerId) ? (
    <WelcomePopup onClose={() => setOpenOwner("")} />
  ) : null;
}
