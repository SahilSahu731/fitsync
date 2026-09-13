import { Platform } from "react-native";

import Constants, { AppOwnership } from "expo-constants";

export const REST_NOTIFICATION_CHANNEL = "fitsync-rest";

type NotificationsModule = typeof import("expo-notifications");

let notificationsPromise: Promise<NotificationsModule | null> | null = null;

function notificationsAvailable(): boolean {
  /*
   * Importing expo-notifications itself throws in Expo Go on Android SDK 53+.
   * Development builds and standalone apps still support local rest alerts.
   */
  return !(
    Platform.OS === "android" && Constants.appOwnership === AppOwnership.Expo
  );
}

async function getNotifications(): Promise<NotificationsModule | null> {
  if (!notificationsAvailable()) {
    return null;
  }

  notificationsPromise ??= import("expo-notifications").then(
    (Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      return Notifications;
    },
  );

  return notificationsPromise;
}

export async function configureRestNotifications(): Promise<void> {
  const Notifications = await getNotifications();

  if (!Notifications) {
    return;
  }

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
  const Notifications = await getNotifications();

  if (!Notifications) {
    return false;
  }

  const permissions = await Notifications.getPermissionsAsync();

  return permissions.status === "granted";
}

export async function requestRestNotificationPermission(): Promise<boolean> {
  await configureRestNotifications();

  const Notifications = await getNotifications();

  if (!Notifications) {
    return false;
  }

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
  const Notifications = await getNotifications();

  if (!Notifications) {
    return null;
  }

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
    const Notifications = await getNotifications();

    if (!Notifications) {
      return;
    }

    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    /*
     * The OS may already have delivered it.
     * Treat cancellation as idempotent.
     */
  }
}
