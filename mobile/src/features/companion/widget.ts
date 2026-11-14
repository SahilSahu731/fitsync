import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

export type CompanionWidgetSnapshot = {
  ownerId: string;
  nextSessionTitle: string | null;
  nextSessionDate: string | null;
  weeklyCompleted: number;
  weeklyTarget: number;
  activeSessionId?: string | null;
  updatedAt: string;
  timezone?: string;
};
type WidgetModule = {
  publish(snapshot: string): Promise<void>;
  clear(): Promise<void>;
  requestPin(): Promise<boolean>;
};
function module(): WidgetModule | null {
  return Platform.OS === "android"
    ? requireOptionalNativeModule<WidgetModule>("FitSyncCompanion")
    : null;
}
let operations: Promise<unknown> = Promise.resolve();
function enqueue<T>(operation: () => Promise<T>) {
  const result = operations.then(operation);
  operations = result.catch(() => {});
  return result;
}
export function getCompanionNativeAvailability() {
  return {
    widgets:
      Platform.OS !== "android"
        ? ("unsupported" as const)
        : module()
          ? ("available" as const)
          : ("requires-build" as const),
    wearableControls:
      Platform.OS === "android" ? ("notification-mirroring" as const) : ("unsupported" as const),
  };
}
export function publishCompanionWidget(snapshot: CompanionWidgetSnapshot) {
  return enqueue(async () => {
    const native = module();
    if (!native) return false;
    if (!snapshot.ownerId) {
      await native.clear();
      return false;
    }
    await native.publish(
      JSON.stringify({
        ...snapshot,
        nextSessionTitle: snapshot.nextSessionTitle?.slice(0, 120) ?? null,
        weeklyCompleted: Math.max(0, Math.floor(snapshot.weeklyCompleted || 0)),
        weeklyTarget: Math.max(0, Math.floor(snapshot.weeklyTarget || 0)),
      }),
    );
    return true;
  });
}
export function clearCompanionWidget() {
  return enqueue(async () => {
    await module()?.clear();
  });
}
export function requestCompanionWidgetPin() {
  return enqueue(async () => (await module()?.requestPin()) ?? false);
}
