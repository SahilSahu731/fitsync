import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { configureWorkoutNotifications } from "@/src/features/workouts/notifications";
import {
  inReminderQuietHours,
  planCompanionReminders,
  reminderDate,
  reminderSnoozeAt,
  validReminderPreferences,
  type ReminderPreferences,
  type ReminderSession,
} from "./reminder-model";
export type { ReminderPreferences, ReminderSession } from "./reminder-model";

const PREFIX = "fitsync-companion-reminder-";
const KEY = "fitsync.companion.reminders.v1";
const CHANNEL = "companion-reminders-v1";
const CATEGORY = "fitsync_companion_reminder";
export const COMPANION_SNOOZE_ACTION = "fitsync_companion_snooze";
type Stored = {
  ownerId: string;
  items: {
    id: string;
    date: string;
    sessionId: string | null;
    at: number;
    title: string;
    snoozed?: boolean;
  }[];
};
let operations: Promise<unknown> = Promise.resolve();
function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = operations.then(operation);
  operations = result.catch(() => {});
  return result;
}
async function configure() {
  await configureWorkoutNotifications();
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "Personal training reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  await Notifications.setNotificationCategoryAsync(CATEGORY, [
    {
      identifier: COMPANION_SNOOZE_ACTION,
      buttonTitle: "Snooze",
      options: { opensAppToForeground: true },
    },
  ]);
}
async function read(): Promise<Stored | null> {
  try {
    const value = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "null");
    return value && typeof value.ownerId === "string" && Array.isArray(value.items) ? value : null;
  } catch {
    return null;
  }
}
async function cancel(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
  await Notifications.dismissNotificationAsync(id);
}
async function clear() {
  if (Platform.OS !== "web") {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const presented = await Notifications.getPresentedNotificationsAsync();
    const ids = new Set([
      ...scheduled.map((item) => item.identifier),
      ...presented.map((item) => item.request.identifier),
      ...((await read())?.items.map((item) => item.id) ?? []),
    ]);
    for (const id of ids) if (id.startsWith(PREFIX)) await cancel(id);
  }
  await AsyncStorage.removeItem(KEY);
}
export function clearCompanionReminders() {
  return enqueue(clear);
}
export async function requestCompanionReminderPermission() {
  if (Platform.OS === "web") return false;
  await configure();
  const current = await Notifications.getPermissionsAsync();
  return current.granted || (await Notifications.requestPermissionsAsync()).granted;
}
export function reconcileCompanionReminders(input: {
  ownerId: string;
  prefs: ReminderPreferences;
  sessions: ReminderSession[];
  completedDates: string[];
  now?: number;
}) {
  return enqueue(async () => {
    if (Platform.OS === "web")
      return { permission: "unsupported" as const, scheduled: 0, suppressedByQuietHours: 0 };
    const previous = await read();
    const valid = validReminderPreferences(input.prefs);
    if (previous?.ownerId !== input.ownerId || !input.ownerId || !input.prefs.enabled || !valid)
      await clear();
    if (!input.ownerId || !input.prefs.enabled || !valid)
      return { permission: "undetermined" as const, scheduled: 0, suppressedByQuietHours: 0 };
    await configure();
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) {
      await clear();
      return {
        permission:
          permission.status === "denied" ? ("denied" as const) : ("undetermined" as const),
        scheduled: 0,
        suppressedByQuietHours: 0,
      };
    }
    const { planned, suppressedByQuietHours } = planCompanionReminders(input);
    const old = previous?.ownerId === input.ownerId ? previous.items : [];
    const items: Stored["items"] = [];
    const now = input.now ?? Date.now();
    for (const item of planned) {
      const id = `${PREFIX}${input.ownerId}-${item.date}`;
      const existing = old.find((saved) => saved.id === id);
      const next =
        existing?.snoozed &&
        existing.at > now &&
        existing.sessionId === item.sessionId &&
        !inReminderQuietHours(existing.at, input.prefs)
          ? existing
          : { ...item, id };
      items.push(next);
    }
    // Retain today's delivered reminder so its Snooze action remains valid
    // when opening the app triggers a reconciliation before the action handler.
    for (const item of old) {
      const keepDelivered = item.date === reminderDate(now, input.prefs.timezone) && item.at <= now;
      if (!(item.snoozed && item.at > now) && !keepDelivered) continue;
      if (item.at > now && inReminderQuietHours(item.at, input.prefs)) continue;
      if (items.some((next) => next.id === item.id) || input.completedDates.includes(item.date))
        continue;
      const session = input.sessions.find((next) => next.id === item.sessionId);
      if (input.sessions.length && (!session || session.completed)) continue;
      items.push(item);
    }
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const scheduledIds = new Set(scheduled.map((item) => item.identifier));
    for (const item of old) if (!items.some((next) => next.id === item.id)) await cancel(item.id);
    // Persist before scheduling so a crash can never orphan an owner's reminder.
    await AsyncStorage.setItem(KEY, JSON.stringify({ ownerId: input.ownerId, items }));
    for (const item of items) {
      if (item.at <= now) continue;
      const existing = old.find((saved) => saved.id === item.id);
      if (
        scheduledIds.has(item.id) &&
        existing?.at === item.at &&
        existing.title === item.title &&
        existing.sessionId === item.sessionId
      )
        continue;
      await Notifications.cancelScheduledNotificationAsync(item.id);
      await schedule(input.ownerId, item);
    }
    return {
      permission: "granted" as const,
      scheduled: items.filter((item) => item.at > now).length,
      suppressedByQuietHours,
    };
  });
}
async function schedule(ownerId: string, item: Stored["items"][number]) {
  await Notifications.scheduleNotificationAsync({
    identifier: item.id,
    content: {
      title: "Your FitSync training time",
      body: item.title,
      categoryIdentifier: CATEGORY,
      data: { type: "companion-reminder", ownerId, date: item.date, sessionId: item.sessionId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(item.at),
      channelId: CHANNEL,
    },
  });
}
export function handleCompanionReminderResponse(
  response: Notifications.NotificationResponse | null,
  ownerId: string,
  prefs: ReminderPreferences,
) {
  return enqueue(async (): Promise<"snoozed" | "open" | null> => {
    if (!response || !ownerId) return null;
    const request = response.notification.request;
    const data = request.content.data ?? {};
    if (
      data.type !== "companion-reminder" ||
      data.ownerId !== ownerId ||
      !request.identifier.startsWith(PREFIX)
    )
      return null;
    if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) return "open";
    if (response.actionIdentifier !== COMPANION_SNOOZE_ACTION || !prefs.enabled) return null;
    const stored = await read();
    const item =
      stored?.ownerId === ownerId
        ? stored.items.find((next) => next.id === request.identifier)
        : null;
    const at = reminderSnoozeAt(Date.now(), prefs);
    if (!stored || !item || at === null) return null;
    const next = { ...item, at, snoozed: true };
    stored.items = stored.items.map((saved) => (saved.id === item.id ? next : saved));
    await AsyncStorage.setItem(KEY, JSON.stringify(stored));
    await cancel(item.id);
    await schedule(ownerId, next);
    return "snoozed";
  });
}
