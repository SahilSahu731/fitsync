import { useSyncExternalStore } from "react";
type NativeStatus = {
  ownerId: string;
  error: string | null;
  permission: string;
  scheduled: number;
  suppressedByQuietHours: number;
};
let snapshot: NativeStatus = {
  ownerId: "",
  error: null,
  permission: "undetermined",
  scheduled: 0,
  suppressedByQuietHours: 0,
};
const listeners = new Set<() => void>();
export function setCompanionNativeStatus(next: NativeStatus) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}
export function useCompanionNativeStatus(ownerId: string) {
  const state = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => snapshot,
    () => snapshot,
  );
  return state.ownerId === ownerId
    ? state
    : {
        ...state,
        ownerId,
        error: null,
        permission: "undetermined",
        scheduled: 0,
        suppressedByQuietHours: 0,
      };
}
