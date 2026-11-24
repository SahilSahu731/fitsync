import { trackEvent } from "@/src/services/telemetry";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";
import { reviewHistory, shouldRequestReview } from "./review-model";

const KEY = "fitsync.review-history.v1";
let work = Promise.resolve();
// Called when leaving a saved completion summary, never while logging a set.
function record(workoutId: string, request: boolean) {
  work = work
    .catch(() => {})
    .then(async () => {
      const now = Date.now();
      const history = reviewHistory(await AsyncStorage.getItem(KEY), now);
      if (!history.workouts.includes(workoutId)) history.workouts.push(workoutId);
      history.workouts = history.workouts.slice(-100);
      const eligible = shouldRequestReview(history, now);
      await AsyncStorage.setItem(KEY, JSON.stringify(history));
      if (
        !request ||
        !eligible ||
        Platform.OS !== "android" ||
        __DEV__ ||
        AppState.currentState !== "active" ||
        !requireOptionalNativeModule("ExpoStoreReview")
      )
        return;
      const store = await import("expo-store-review");
      if (!(await store.isAvailableAsync())) return;
      // Persist before calling: the API cannot tell us whether a prompt appeared or a rating was submitted.
      await AsyncStorage.setItem(KEY, JSON.stringify({ ...history, lastAttemptAt: now }));
      trackEvent("review_flow_requested");
      await store.requestReview();
    })
    .catch(() => {});
  return work;
}
export const recordCompletedWorkout = (workoutId: string) => record(workoutId, false);
export const recordCompletedWorkoutAndMaybeRequestReview = (workoutId: string) =>
  record(workoutId, true);
