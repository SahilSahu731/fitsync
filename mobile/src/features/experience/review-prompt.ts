import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Linking, Platform } from "react-native";
import { trackEvent } from "@/src/services/telemetry";
import { expo } from "../../../app.json";
import { canInviteToReview, reviewPreference, type ReviewPreference } from "./review-model";

const KEY = "fitsync.review-history.v1";
let preference: ReviewPreference | undefined;
let reading: Promise<void> | undefined;
let writes = Promise.resolve();
let opening: Promise<void> | undefined;

function save(value: ReviewPreference) {
  preference = value;
  writes = writes.then(() => AsyncStorage.setItem(KEY, JSON.stringify(value))).catch(() => {});
  return writes;
}

export function prepareReviewPreference() {
  if (preference || Platform.OS !== "android") return Promise.resolve();
  return (reading ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      preference = reviewPreference(raw);
      // Drop the old device-wide workout IDs, retaining the last invitation date.
      if (raw !== null && raw !== JSON.stringify(preference)) return save(preference);
    })
    .catch(() => {})
    .finally(() => {
      reading = undefined;
    }));
}

// Check synchronously when leaving the summary. Slow storage never delays Done
// or opens an invitation later while the user is doing something else.
export function claimReviewInvitation() {
  const now = Date.now();
  if (
    Platform.OS !== "android" ||
    AppState.currentState !== "active" ||
    opening ||
    !preference ||
    !canInviteToReview(preference, now)
  )
    return false;
  void save({ ...preference, lastAttemptAt: now });
  return true;
}

export function openPlayReviews(source: "workout_summary" | "settings") {
  if (opening) return opening;
  const android = expo.android;
  opening = Linking.openURL(`market://details?id=${android.package}&showAllReviews=true`)
    .catch(() => Linking.openURL(`${android.playStoreUrl}&showAllReviews=true`))
    .catch(() => {
      throw new Error("Couldn’t open Google Play. Please try again from Settings.");
    })
    .then(async () => {
      trackEvent("review_listing_opened", { source });
      await prepareReviewPreference();
      await save({ lastAttemptAt: preference?.lastAttemptAt ?? null, openedListing: true });
    })
    .finally(() => {
      opening = undefined;
    });
  return opening;
}
