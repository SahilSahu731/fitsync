import React, { useEffect, useLayoutEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useSession } from "@/src/context/session";
import { useBilling } from "../billing/billing-context";
import { readFoodDiary, subscribeFoodDiary } from "./storage";
import {
  clearFoodReminders,
  foodReminderDestination,
  reconcileFoodReminders,
  reportFoodReminderError,
} from "./reminders";

const processed = new Set<string>();
export function FoodReminderBridge() {
  const { user } = useSession();
  return <AccountFoodReminderBridge key={user?.id ?? "signed-out"} ownerId={user?.id ?? ""} />;
}
function AccountFoodReminderBridge({ ownerId }: { ownerId: string }) {
  const { isPro, loading } = useBilling();
  const current = useRef({ ownerId, enabled: isPro && !loading });
  useLayoutEffect(() => {
    current.current = { ownerId, enabled: isPro && !loading };
    return () => {
      current.current = { ownerId: "", enabled: false };
    };
  }, [ownerId, isPro, loading]);
  useEffect(() => {
    let active = true;
    let sequence = 0;
    void clearFoodReminders(ownerId);
    const valid = () => active && current.current.ownerId === ownerId && current.current.enabled;
    const refresh = async () => {
      const request = ++sequence;
      if (!ownerId || !isPro || loading) {
        if (active) await clearFoodReminders(ownerId);
        return;
      }
      try {
        const diary = await readFoodDiary(ownerId);
        if (!valid() || sequence !== request) return;
        await reconcileFoodReminders({
          ownerId,
          entries: diary.entries,
          enabled: true,
          isCurrent: () => valid() && sequence === request,
        });
      } catch (error) {
        if (valid() && sequence === request) reportFoodReminderError(ownerId, error);
      }
    };
    void refresh();
    const unsubscribe = subscribeFoodDiary((account, diary) => {
      if (account !== ownerId || !valid()) return;
      const request = ++sequence;
      void reconcileFoodReminders({
        ownerId,
        entries: diary.entries,
        enabled: true,
        isCurrent: () => valid() && sequence === request,
      });
    });
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      active = false;
      sequence++;
      unsubscribe();
      foreground.remove();
      void clearFoodReminders(ownerId);
    };
  }, [ownerId, isPro, loading]);

  useEffect(() => {
    if (!ownerId || !isPro || loading || (Platform.OS !== "android" && Platform.OS !== "ios"))
      return;
    let active = true;
    let busy = false;
    const handle = async (response: Notifications.NotificationResponse | null) => {
      if (
        !active ||
        !response ||
        busy ||
        !current.current.enabled ||
        current.current.ownerId !== ownerId
      )
        return;
      const request = response.notification.request;
      if (
        request.content.data?.type !== "food-reminder" ||
        request.content.data?.ownerId !== ownerId
      )
        return;
      const key = `${ownerId}:${request.identifier}:${response.notification.date}:${response.actionIdentifier}`;
      if (processed.has(key)) return;
      busy = true;
      try {
        const diary = await readFoodDiary(ownerId);
        if (!active || !current.current.enabled || current.current.ownerId !== ownerId) return;
        const date = foodReminderDestination(response, ownerId, diary.entries);
        processed.add(key);
        if (processed.size > 100) processed.delete(processed.values().next().value!);
        if (date) router.push({ pathname: "/nutrition", params: { date } });
        await Notifications.clearLastNotificationResponseAsync();
      } catch (error) {
        if (active && current.current.ownerId === ownerId) reportFoodReminderError(ownerId, error);
      } finally {
        busy = false;
      }
    };
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void handle(response);
    });
    void Notifications.getLastNotificationResponseAsync()
      .then(handle)
      .catch((error) => {
        if (active) reportFoodReminderError(ownerId, error);
      });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [ownerId, isPro, loading]);
  return null;
}
