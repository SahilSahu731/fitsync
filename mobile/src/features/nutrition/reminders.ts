import { requestPermissionWithExplanation } from "@/src/services/permission-prompts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { configureWorkoutNotifications } from "@/src/features/workouts/notifications";
import { SLOT_LABELS, type FoodEntry } from "./model";

const PREFIX = "fitsync-food-reminder-";
const KEY = "fitsync.nutrition.reminders.v1";
const CHANNEL = "food-reminders-v1";
type SavedReminder = {
  id: string;
  entryId: string;
  date: string;
  at: number;
  body: string;
  title: string;
};
type Stored = { ownerId: string; items: SavedReminder[] };
export type FoodReminderStatus = {
  permission: "granted" | "denied" | "undetermined" | "unsupported";
  scheduled: number;
  error: string | null;
};

const statuses = new Map<string, FoodReminderStatus>();
const listeners = new Set<() => void>();
let operations: Promise<unknown> = Promise.resolve();
function enqueue<T>(operation: () => Promise<T>) {
  const result = operations.then(operation);
  operations = result.catch(() => {});
  return result;
}
function supported() {
  return Platform.OS === "android" || Platform.OS === "ios";
}
export function foodReminderStatus(ownerId: string): FoodReminderStatus {
  let value = statuses.get(ownerId);
  if (!value) {
    value = { permission: supported() ? "undetermined" : "unsupported", scheduled: 0, error: null };
    statuses.set(ownerId, value);
  }
  return value;
}
function publish(ownerId: string, value: FoodReminderStatus) {
  statuses.set(ownerId, value);
  listeners.forEach((listener) => listener());
  return value;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useFoodReminderStatus(ownerId: string) {
  return useSyncExternalStore(
    subscribe,
    () => foodReminderStatus(ownerId),
    () => foodReminderStatus(ownerId),
  );
}
export function reportFoodReminderError(ownerId: string, error: unknown) {
  return publish(ownerId, {
    ...foodReminderStatus(ownerId),
    error:
      error instanceof Error
        ? error.message
        : "Meal reminders could not update. Try again when the app is active.",
  });
}
function allowed(permission: Notifications.NotificationPermissionsStatus) {
  return (
    permission.granted ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}
async function configure() {
  // The app shares one foreground handler; reuse it rather than replacing it.
  await configureWorkoutNotifications();
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "Planned food reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}
/** Call only from an explicit reminder switch or button. Reconciliation never prompts. */
export function requestFoodReminderPermission(): Promise<boolean> {
  return enqueue(async () => {
    if (!supported()) return false;
    await configure();
    const current = await Notifications.getPermissionsAsync();
    return requestPermissionWithExplanation(
      "meals",
      current,
      () => Notifications.requestPermissionsAsync(),
      allowed,
    );
  });
}
async function read(): Promise<Stored | null> {
  try {
    const value = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "null");
    if (!value || typeof value.ownerId !== "string" || !Array.isArray(value.items)) return null;
    return {
      ownerId: value.ownerId,
      items: value.items.filter(
        (item: SavedReminder) => item && typeof item.id === "string" && item.id.startsWith(PREFIX),
      ),
    };
  } catch {
    return null;
  }
}
async function cancel(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
  await Notifications.dismissNotificationAsync(id);
}
async function clearNative(previous: Stored | null) {
  if (supported()) {
    const [scheduled, presented] = await Promise.all([
      Notifications.getAllScheduledNotificationsAsync(),
      Notifications.getPresentedNotificationsAsync(),
    ]);
    const ids = new Set([
      ...scheduled.map((item) => item.identifier),
      ...presented.map((item) => item.request.identifier),
      ...(previous?.items.map((item) => item.id) ?? []),
    ]);
    for (const id of ids) if (id.startsWith(PREFIX)) await cancel(id);
  }
  await AsyncStorage.removeItem(KEY);
}
export function clearFoodReminders(ownerId = "") {
  return enqueue(async () => {
    try {
      const previous = await read();
      await clearNative(previous);
      if (previous?.ownerId)
        publish(previous.ownerId, {
          ...foodReminderStatus(previous.ownerId),
          scheduled: 0,
          error: null,
        });
      return publish(ownerId, { ...foodReminderStatus(ownerId), scheduled: 0, error: null });
    } catch (error) {
      return reportFoodReminderError(ownerId, error);
    }
  });
}

/** Device-local wall time, with a round-trip check to reject invalid dates and DST gaps. */
export function foodReminderAt(date: string, time: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const value = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    value.getFullYear() !== year ||
    value.getMonth() !== month - 1 ||
    value.getDate() !== day ||
    value.getHours() !== hour ||
    value.getMinutes() !== minute
  )
    return null;
  return value.getTime();
}
function plan(ownerId: string, entries: FoodEntry[], now: number) {
  return entries
    .flatMap((entry): SavedReminder[] => {
      if (entry.status !== "planned" || !entry.remind) return [];
      const at = foodReminderAt(entry.date, entry.time);
      if (at === null || at <= now) return [];
      return [
        {
          id: `${PREFIX}${encodeURIComponent(ownerId)}-${encodeURIComponent(entry.id)}`,
          entryId: entry.id,
          date: entry.date,
          at,
          title: `FitSync · ${SLOT_LABELS[entry.meal] ?? "Meal"} time`,
          body: `${entry.name} · ${entry.quantity} ${entry.unit}. Open your food plan to review or mark it eaten.`,
        },
      ];
    })
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}
export function reconcileFoodReminders(input: {
  ownerId: string;
  entries: FoodEntry[];
  enabled: boolean;
  now?: number;
  isCurrent?: () => boolean;
}): Promise<FoodReminderStatus> {
  return enqueue(async () => {
    const valid = () => input.isCurrent?.() !== false;
    if (!valid()) return foodReminderStatus(input.ownerId);
    let permission: FoodReminderStatus["permission"] = supported() ? "undetermined" : "unsupported";
    let scheduledCount = 0;
    try {
      const previous = await read();
      if (!valid()) return foodReminderStatus(input.ownerId);
      if (!supported() || !input.ownerId || !input.enabled) {
        await clearNative(previous);
        if (previous?.ownerId && previous.ownerId !== input.ownerId)
          publish(previous.ownerId, {
            ...foodReminderStatus(previous.ownerId),
            scheduled: 0,
            error: null,
          });
        return publish(input.ownerId, { permission, scheduled: 0, error: null });
      }
      await configure();
      const nativePermission = await Notifications.getPermissionsAsync();
      permission = allowed(nativePermission)
        ? "granted"
        : nativePermission.status === "denied"
          ? "denied"
          : "undetermined";
      if (!valid()) return foodReminderStatus(input.ownerId);
      if (permission !== "granted") {
        await clearNative(previous);
        return publish(input.ownerId, { permission, scheduled: 0, error: null });
      }
      const [scheduled, presented] = await Promise.all([
        Notifications.getAllScheduledNotificationsAsync(),
        Notifications.getPresentedNotificationsAsync(),
      ]);
      if (!valid()) return foodReminderStatus(input.ownerId);
      const planned = plan(input.ownerId, input.entries, input.now ?? Date.now());
      // Leave room for the app's training reminders and the platform's other notifications.
      const others = scheduled.filter((item) => !item.identifier.startsWith(PREFIX)).length;
      const capacity = Platform.OS === "ios" ? Math.max(0, 60 - others) : 48;
      const items = planned.slice(0, capacity);
      const ids = new Set(items.map((item) => item.id));
      const existingIds = new Set(scheduled.map((item) => item.identifier));
      const ownedIds = new Set([
        ...scheduled.map((item) => item.identifier),
        ...presented.map((item) => item.request.identifier),
        ...(previous?.items.map((item) => item.id) ?? []),
      ]);
      // Enumerate the native store as well as our record to recover orphaned schedules after a crash.
      for (const id of ownedIds) if (id.startsWith(PREFIX) && !ids.has(id)) await cancel(id);
      if (previous?.ownerId && previous.ownerId !== input.ownerId)
        publish(previous.ownerId, {
          ...foodReminderStatus(previous.ownerId),
          scheduled: 0,
          error: null,
        });
      if (!valid()) return foodReminderStatus(input.ownerId);
      // Persist before native calls so a crash cannot leave an untracked account reminder.
      await AsyncStorage.setItem(KEY, JSON.stringify({ ownerId: input.ownerId, items }));
      for (const item of items) {
        if (!valid()) return foodReminderStatus(input.ownerId);
        const old =
          previous?.ownerId === input.ownerId
            ? previous.items.find((saved) => saved.id === item.id)
            : null;
        if (
          existingIds.has(item.id) &&
          old?.at === item.at &&
          old.body === item.body &&
          old.title === item.title
        ) {
          scheduledCount++;
          continue;
        }
        await cancel(item.id);
        if (!valid()) return foodReminderStatus(input.ownerId);
        await Notifications.scheduleNotificationAsync({
          identifier: item.id,
          content: {
            title: item.title,
            body: item.body,
            data: {
              type: "food-reminder",
              ownerId: input.ownerId,
              entryId: item.entryId,
              date: item.date,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(item.at),
            channelId: CHANNEL,
          },
        });
        scheduledCount++;
      }
      if (!valid()) return foodReminderStatus(input.ownerId);
      return publish(input.ownerId, {
        permission,
        scheduled: scheduledCount,
        error:
          planned.length > items.length
            ? "Only your nearest meals are scheduled. Open the app after a meal to schedule the next reminders."
            : null,
      });
    } catch (error) {
      if (!valid()) return foodReminderStatus(input.ownerId);
      return publish(input.ownerId, {
        permission,
        scheduled: scheduledCount,
        error: `Meal reminders could not update: ${error instanceof Error ? error.message : "try again when the app is active."}`,
      });
    }
  });
}

/** Never trust a notification's route or another account's entry. */
export function foodReminderDestination(
  response: Notifications.NotificationResponse | null,
  ownerId: string,
  entries: FoodEntry[],
): string | null {
  if (
    !response ||
    !ownerId ||
    response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
  )
    return null;
  const request = response.notification.request;
  const data = request.content.data ?? {};
  if (
    data.type !== "food-reminder" ||
    data.ownerId !== ownerId ||
    !request.identifier.startsWith(PREFIX)
  )
    return null;
  const entry = entries.find(
    (item) =>
      item.id === data.entryId &&
      item.date === data.date &&
      item.status === "planned" &&
      item.remind,
  );
  return entry && foodReminderAt(entry.date, entry.time) !== null ? entry.date : null;
}
