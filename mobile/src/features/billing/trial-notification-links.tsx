import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useSession } from "@/src/context/session";
import { ownsTrialReminder } from "./trial-reminders";

// Mount after the root navigator is ready, alongside the other notification links.
export function TrialNotificationLinks() {
  const { user, ready } = useSession();
  const ownerId = user?.id;
  useEffect(() => {
    if (!ownerId || !ready) return;
    let active = true;
    const handled = new Set<string>();
    const open = async (response: Notifications.NotificationResponse | null) => {
      if (
        !active ||
        !response ||
        response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER ||
        response.notification.request.content.data?.type !== "pro-trial-reminder"
      )
        return;
      const key = `${response.notification.request.identifier}:${response.notification.date}`;
      if (handled.has(key)) return;
      handled.add(key);
      const owned = await ownsTrialReminder(ownerId);
      if (!active) return;
      if (owned) router.push("/billing");
      await Notifications.clearLastNotificationResponseAsync();
    };
    void Notifications.getLastNotificationResponseAsync()
      .then(open)
      .catch(() => undefined);
    const listener = Notifications.addNotificationResponseReceivedListener((response) => {
      void open(response).catch(() => undefined);
    });
    return () => {
      active = false;
      listener.remove();
    };
  }, [ownerId, ready]);
  return null;
}
