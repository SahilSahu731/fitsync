import { Platform } from "react-native";

import * as Notifications from "expo-notifications";

export const REST_NOTIFICATION_CHANNEL = "fitsync-rest";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,

    shouldSetBadge: false,

    shouldShowBanner: true,

    shouldShowList: true,
  }),
});

export async function configureRestNotifications(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(
      REST_NOTIFICATION_CHANNEL,

      {
        name: "Rest timers",

        importance: Notifications.AndroidImportance.HIGH,

        vibrationPattern: [0, 250, 150, 250],

        sound: "default",
      },
    );
  }
}

export async function hasRestNotificationPermission(): Promise<boolean> {
  const permissions = await Notifications.getPermissionsAsync();

  return permissions.status === "granted";
}

export async function requestRestNotificationPermission(): Promise<boolean> {
  await configureRestNotifications();

  const existing = await Notifications.getPermissionsAsync();

  if (existing.status === "granted") {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();

  return requested.status === "granted";
}

export async function scheduleRestNotification(
  restEndsAt: string,

  exerciseName: string,
): Promise<string | null> {
  const allowed = await hasRestNotificationPermission();

  if (!allowed) {
    return null;
  }

  const date = new Date(restEndsAt);

  if (date.getTime() <= Date.now()) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Rest complete",

      body: `${exerciseName} · Ready for your next set`,

      sound: "default",

      data: {
        type: "REST_COMPLETE",

        exerciseName,
      },
    },

    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,

      date,

      channelId: REST_NOTIFICATION_CHANNEL,
    },
  });
}

export async function cancelRestNotification(
  notificationId: string | null | undefined,
): Promise<void> {
  if (!notificationId) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    /*
     * The OS may already have delivered it.
     * Treat cancellation as idempotent.
     */
  }
}
