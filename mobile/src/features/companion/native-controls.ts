import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { configureWorkoutNotifications } from "@/src/features/workouts/notifications";

const ID = "fitsync-companion-workout-controls";
const CHANNEL = "companion-workout-controls-v1";
const ACTIVE_CATEGORY = "fitsync_companion_workout";
const REST_CATEGORY = "fitsync_companion_rest";
const PAUSED_CATEGORY = "fitsync_companion_rest_paused";
export const COMPANION_CONTROL_ACTIONS = {
  complete: "fitsync_companion_complete_set",
  pause: "fitsync_companion_pause_rest",
  resume: "fitsync_companion_resume_rest",
} as const;
export type WorkoutControlsSnapshot = {
  ownerId: string;
  sessionId: string;
  title: string;
  nextSetId: string | null;
  nextSetLabel: string | null;
  canCompleteNextSet: boolean;
  rest: { paused: boolean; remainingSeconds: number } | null;
};
let operations: Promise<unknown> = Promise.resolve();
function enqueue<T>(operation: () => Promise<T>) {
  const result = operations.then(operation);
  operations = result.catch(() => {});
  return result;
}
async function clear() {
  if (Platform.OS === "web") return;
  await Notifications.cancelScheduledNotificationAsync(ID);
  await Notifications.dismissNotificationAsync(ID);
}
export function clearCompanionWorkoutControls() {
  return enqueue(clear);
}
/** Android phone notification actions can be mirrored to a paired watch by its
 * companion app. This does not install a standalone Wear OS application. */
export function publishCompanionWorkoutControls(snapshot: WorkoutControlsSnapshot | null) {
  return enqueue(async () => {
    if (Platform.OS !== "android") return false;
    if (!snapshot?.ownerId || !snapshot.sessionId) {
      await clear();
      return false;
    }
    await configureWorkoutNotifications();
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "Workout controls",
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      enableVibrate: false,
    });
    if (!(await Notifications.getPermissionsAsync()).granted) {
      await clear();
      return false;
    }
    const action = (identifier: string, buttonTitle: string) => ({
      identifier,
      buttonTitle,
      options: { opensAppToForeground: true },
    });
    await Notifications.setNotificationCategoryAsync(ACTIVE_CATEGORY, [
      action(COMPANION_CONTROL_ACTIONS.complete, "Log next set"),
    ]);
    await Notifications.setNotificationCategoryAsync(REST_CATEGORY, [
      action(COMPANION_CONTROL_ACTIONS.pause, "Pause rest"),
    ]);
    await Notifications.setNotificationCategoryAsync(PAUSED_CATEGORY, [
      action(COMPANION_CONTROL_ACTIONS.resume, "Resume rest"),
    ]);
    const rest = snapshot.rest;
    const categoryIdentifier = rest
      ? rest.paused
        ? PAUSED_CATEGORY
        : REST_CATEGORY
      : snapshot.canCompleteNextSet && snapshot.nextSetId
        ? ACTIVE_CATEGORY
        : undefined;
    const body = rest
      ? rest.paused
        ? `Rest paused · ${Math.max(0, Math.ceil(rest.remainingSeconds))} seconds remaining`
        : "Rest timer running · tap Pause rest to pause"
      : (snapshot.nextSetLabel ?? "Open your workout to enter your next set.");
    await Notifications.scheduleNotificationAsync({
      identifier: ID,
      content: {
        title: snapshot.title || "FitSync workout",
        body,
        sound: false,
        sticky: true,
        autoDismiss: false,
        categoryIdentifier,
        data: {
          type: "companion-workout-controls",
          ownerId: snapshot.ownerId,
          sessionId: snapshot.sessionId,
          nextSetId: snapshot.nextSetId,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: CHANNEL,
      },
    });
    return true;
  });
}
export function parseCompanionWorkoutControl(
  response: Notifications.NotificationResponse | null,
  current: WorkoutControlsSnapshot | null,
) {
  if (!response || !current) return null;
  const request = response.notification.request,
    data = request.content.data ?? {};
  if (
    request.identifier !== ID ||
    data.type !== "companion-workout-controls" ||
    data.ownerId !== current.ownerId ||
    data.sessionId !== current.sessionId
  )
    return null;
  const action = response.actionIdentifier;
  if (action === Notifications.DEFAULT_ACTION_IDENTIFIER)
    return { action: "open" as const, sessionId: current.sessionId };
  if (action === COMPANION_CONTROL_ACTIONS.pause && current.rest && !current.rest.paused)
    return { action: "pause-rest" as const, sessionId: current.sessionId };
  if (action === COMPANION_CONTROL_ACTIONS.resume && current.rest?.paused)
    return { action: "resume-rest" as const, sessionId: current.sessionId };
  if (
    action === COMPANION_CONTROL_ACTIONS.complete &&
    !current.rest &&
    current.canCompleteNextSet &&
    current.nextSetId &&
    data.nextSetId === current.nextSetId
  )
    return {
      action: "complete-set" as const,
      sessionId: current.sessionId,
      setId: current.nextSetId,
    };
  return null;
}
