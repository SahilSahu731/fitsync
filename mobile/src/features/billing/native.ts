import { NativeModules, Platform } from "react-native";
import type Purchases from "react-native-purchases";
import { createStoreSession } from "./store-session";

export function revenueCatKey() {
  if (Platform.OS === "ios") return process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY?.trim() || null;
  if (Platform.OS === "android") return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?.trim() || null;
  return null;
}

export function loadPurchases(): typeof Purchases {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    throw new Error("Subscribe or restore in the FitSync iOS or Android app.");
  }
  if (!NativeModules.RNPurchases) {
    throw new Error("This build does not support store purchases yet. Install the latest FitSync build to subscribe or restore.");
  }
  // RevenueCat touches native modules at import time. An older installed binary
  // must still be able to open the app and read its server subscription status.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("react-native-purchases").default as typeof Purchases;
}

export const storeSession = createStoreSession(loadPurchases, revenueCatKey);
