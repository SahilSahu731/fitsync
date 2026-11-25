import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { apiSessionKey } from "@/src/services/api";
import { requestPermissionWithExplanation } from "@/src/services/permission-prompts";
import { configureWorkoutNotifications } from "@/src/features/workouts/notifications";
import { programFollowApi } from "./api";

const DEVICE_KEY = "fitsync.program-push-token.v1";
let operations: Promise<void> = Promise.resolve();
let generation = 0;
let closingSession: number | null = null;
let registration: { session: number; permission: boolean; operation: Promise<void> } | null = null;
function enqueue(operation: () => Promise<void>) {
  const result = operations.then(operation);
  operations = result.catch(() => {});
  return result;
}
function sessionGuard(session: number) {
  const revision = generation;
  return () => {
    if (session === closingSession || session !== apiSessionKey() || revision !== generation)
      throw new Error("Reminder registration stopped because your account changed.");
  };
}
export function registerProgramNotifications(requestPermission = false) {
  const session = apiSessionKey();
  const ensureCurrent = sessionGuard(session);
  if (session === closingSession)
    return Promise.reject(new Error("Reminder registration stopped because your account changed."));
  // Fetching the native token can itself emit a token-change event. Reuse the
  // current registration instead of enqueueing another registration forever.
  if (registration?.session === session && (registration.permission || !requestPermission))
    return registration.operation;
  // Human consent must not occupy the queue needed to unregister during sign-out.
  const operation = permissionForRegistration(requestPermission, ensureCurrent)
    .then((granted) => {
      ensureCurrent();
      return enqueue(() => register(granted, requestPermission, ensureCurrent));
    })
    .finally(() => {
      if (registration?.operation === operation) registration = null;
    });
  registration = { session, permission: requestPermission, operation };
  return operation;
}
async function permissionForRegistration(
  requestPermission: boolean,
  ensureCurrent: () => void,
  kind: "notifications" | "testPush" = "notifications",
) {
  if (Platform.OS === "web") throw new Error("Daily reminders are available in the mobile app.");
  await configureWorkoutNotifications();
  if (Platform.OS === "android") {
    // Omit sound to use Android's default; strings are treated as bundled filenames.
    // General push notifications: achievements, motivation, etc.
    await Notifications.setNotificationChannelAsync("general-v1", {
      name: "General notifications",
      importance: Notifications.AndroidImportance.DEFAULT,
    });

    // Existing scheduled workout reminders.
    await Notifications.setNotificationChannelAsync("program-reminders-v2", {
      name: "Workout reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  ensureCurrent();
  const permission = await Notifications.getPermissionsAsync();
  ensureCurrent();
  const granted =
    permission.granted ||
    (requestPermission &&
      (await requestPermissionWithExplanation(kind, permission, () => {
        ensureCurrent();
        return Notifications.requestPermissionsAsync();
      })));
  ensureCurrent();
  return granted;
}
function getInstallationToken() {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId)
    throw new Error("Push notifications need a FitSync build configured with an Expo project ID.");
  return Notifications.getExpoPushTokenAsync({ projectId });
}

export async function getDevelopmentPushToken() {
  if (!__DEV__ || Platform.OS !== "android")
    throw new Error("Open the FitSync Android development build to get a test push token.");
  const ensureCurrent = sessionGuard(apiSessionKey());
  ensureCurrent();
  if (!(await permissionForRegistration(true, ensureCurrent, "testPush")))
    throw new Error("Allow FitSync notifications in Android settings, then try again.");
  const { data: token } = await getInstallationToken();
  ensureCurrent();
  return token;
}

async function register(granted: boolean, requestPermission: boolean, ensureCurrent: () => void) {
  ensureCurrent();
  if (!granted) {
    await unregister();
    if (requestPermission)
      throw new Error(
        "Notifications are off. Enable them in your phone settings, or follow without reminders.",
      );
    return;
  }
  const { data: token } = await getInstallationToken();
  ensureCurrent();
  const previous = await AsyncStorage.getItem(DEVICE_KEY);
  ensureCurrent();
  if (previous && previous !== token) await programFollowApi.unregisterDevice(previous);
  ensureCurrent();
  await AsyncStorage.setItem(DEVICE_KEY, token);
  ensureCurrent();
  await programFollowApi.registerDevice(token);
  ensureCurrent();
}
export function unregisterProgramNotifications() {
  // Fence pending explanations and token callbacks before waiting for network
  // cleanup. A later login receives a new API session and can register normally.
  closingSession = apiSessionKey();
  generation++;
  return enqueue(unregister);
}
async function unregister() {
  const token = await AsyncStorage.getItem(DEVICE_KEY);
  if (token) await programFollowApi.unregisterDevice(token);
  await AsyncStorage.removeItem(DEVICE_KEY);
}
export function notificationProgramId(data: Record<string, unknown>) {
  return data.type === "program-reminder" &&
    typeof data.enrollmentId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.enrollmentId)
    ? data.enrollmentId
    : null;
}
