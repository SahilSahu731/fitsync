import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { trialReminderDate, type TrialInfo } from "./trial-model";

const KEY = "fitsync.trial-reminder.v1";
const ID = "fitsync-pro-trial-reminder";
const CHANNEL = "membership-reminders-v1";
let owner: string | null = null;
let generation = 0;
let operations = Promise.resolve();
type SavedReminder = {
  ownerId?: string;
  productId?: string;
  enabled?: boolean;
  remindAt?: number | null;
  receiptAt?: number;
};
function parseSaved(raw: string | null): SavedReminder {
  try {
    const value = JSON.parse(raw ?? "{}");
    if (!value || typeof value !== "object" || typeof value.ownerId !== "string") return {};
    return {
      ownerId: value.ownerId,
      productId: typeof value.productId === "string" ? value.productId : undefined,
      enabled: value.enabled === true,
      remindAt:
        typeof value.remindAt === "number" && Number.isFinite(value.remindAt)
          ? value.remindAt
          : null,
      receiptAt:
        typeof value.receiptAt === "number" && Number.isFinite(value.receiptAt)
          ? value.receiptAt
          : undefined,
    };
  } catch {
    return {};
  }
}
const enqueue = (action: () => Promise<void>) => {
  const result = operations.then(action);
  operations = result.catch(() => {});
  return result;
};
async function channel() {
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "Membership reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
}
export async function requestTrialReminderPermission() {
  await channel();
  const permission = await Notifications.getPermissionsAsync();
  return permission.granted || (await Notifications.requestPermissionsAsync()).granted;
}
export function setTrialReminderOwner(id: string | null) {
  owner = id;
  const epoch = ++generation;
  return enqueue(async () => {
    if (generation !== epoch) return;
    const saved = parseSaved(await AsyncStorage.getItem(KEY).catch(() => null));
    if (generation !== epoch) return;
    if (!id || saved.ownerId !== id) {
      await Notifications.cancelScheduledNotificationAsync(ID);
      await AsyncStorage.removeItem(KEY);
    }
  });
}
export function syncTrialReminder(
  id: string,
  info: TrialInfo,
  purchase?: { productId: string; enabled: boolean },
) {
  const epoch = generation;
  return enqueue(async () => {
    const current = () => owner === id && generation === epoch;
    if (!current()) return;
    const saved = parseSaved(await AsyncStorage.getItem(KEY).catch(() => null));
    const preference = purchase ? { ownerId: id, ...purchase } : saved;
    if (preference.ownerId !== id) {
      if (current()) await Notifications.cancelScheduledNotificationAsync(ID);
      return;
    }
    const receiptAt = Date.parse(info.requestDate ?? "");
    if (Number.isFinite(receiptAt) && saved.receiptAt && receiptAt < saved.receiptAt) return;
    const date =
      preference.enabled && preference.productId
        ? trialReminderDate(info, preference.productId)
        : null;
    const permission = await Notifications.getPermissionsAsync();
    if (!current()) return;
    if (date && permission.granted && saved.remindAt === date && !purchase) {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      if (scheduled.some((request) => request.identifier === ID) && current()) {
        await AsyncStorage.setItem(
          KEY,
          JSON.stringify({
            ...saved,
            receiptAt: Number.isFinite(receiptAt) ? receiptAt : saved.receiptAt,
          }),
        );
        return;
      }
    }
    if (!current()) return;
    await Notifications.cancelScheduledNotificationAsync(ID);
    await AsyncStorage.removeItem(KEY);
    if (!date || !permission.granted || !current()) {
      if (current())
        await AsyncStorage.setItem(
          KEY,
          JSON.stringify({
            ...preference,
            remindAt: null,
            receiptAt: Number.isFinite(receiptAt) ? receiptAt : saved.receiptAt,
          }),
        );
      return;
    }
    await channel();
    await Notifications.scheduleNotificationAsync({
      identifier: ID,
      content: {
        title: "Your Pro trial ends in two days",
        body: "Review your membership in Google Play before it renews. Workout logging stays free.",
        data: { type: "pro-trial-reminder" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(date),
        channelId: CHANNEL,
      },
    });
    if (!current()) {
      await Notifications.cancelScheduledNotificationAsync(ID);
      return;
    }
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        ...preference,
        remindAt: date,
        receiptAt: Number.isFinite(receiptAt) ? receiptAt : saved.receiptAt,
      }),
    );
  });
}

export async function ownsTrialReminder(id: string) {
  const epoch = generation;
  const saved = parseSaved(await AsyncStorage.getItem(KEY).catch(() => null));
  return owner === id && generation === epoch && saved.ownerId === id && saved.enabled === true;
}
