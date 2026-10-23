import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { configureWorkoutNotifications } from "@/src/features/workouts/notifications";
import { programFollowApi } from "./api";

const DEVICE_KEY = "fitsync.program-push-token.v1";
let operations: Promise<void> = Promise.resolve();
function enqueue(operation: () => Promise<void>) {
  const result = operations.then(operation);
  operations = result.catch(() => {});
  return result;
}
export function registerProgramNotifications(requestPermission = false) {
  return enqueue(() => register(requestPermission));
}
async function register(requestPermission: boolean) {
  if (Platform.OS === "web") throw new Error("Daily reminders are available in the mobile app.");
  await configureWorkoutNotifications();
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("program-reminders-v1", {
    name: "Daily program reminders", importance: Notifications.AndroidImportance.DEFAULT, sound: "rest_complete.wav"
  });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    await unregister();
    if (requestPermission) throw new Error("Notifications are off. Enable them in your phone settings, or follow without reminders.");
    return;
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error("Reminders need a configured mobile build. You can follow without reminders for now.");
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const previous = await AsyncStorage.getItem(DEVICE_KEY);
  if (previous && previous !== token) await programFollowApi.unregisterDevice(previous);
  await AsyncStorage.setItem(DEVICE_KEY, token);
  await programFollowApi.registerDevice(token);
}
export function unregisterProgramNotifications() { return enqueue(unregister); }
async function unregister() {
  const token = await AsyncStorage.getItem(DEVICE_KEY);
  if (token) await programFollowApi.unregisterDevice(token);
  await AsyncStorage.removeItem(DEVICE_KEY);
}
export function notificationProgramId(data: Record<string, unknown>) {
  return data.type === "program-reminder" && typeof data.enrollmentId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.enrollmentId) ? data.enrollmentId : null;
}
