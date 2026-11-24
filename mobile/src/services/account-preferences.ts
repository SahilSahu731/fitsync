import AsyncStorage from "@react-native-async-storage/async-storage";

const writes = new Map<string, Promise<void>>();
const deletedOwners = new Set<string>();
const keysFor = (ownerId: string) => [
  `fitsync.workout.rest.v2.${ownerId}`,
  `fitsync.companion.paused-rest.v1.${ownerId}`,
  `fitsync.goals-welcome.v1.${ownerId}`,
  `fitsync.onboarding-welcome.v1.${ownerId}`,
  `fitsync.onboarding-welcome-pending.v1.${ownerId}`,
  `fitsync.upgrade-moments.v1.${ownerId}`,
  `fitsync.train-order.v1.${ownerId}`,
  `fitsync.pro.muscles.v1.${ownerId}`,
];
function enqueue(ownerId: string, action: () => Promise<void>): Promise<void> {
  const next = (writes.get(ownerId) ?? Promise.resolve()).catch(() => {}).then(action);
  writes.set(ownerId, next);
  const clean = () => {
    if (writes.get(ownerId) === next) writes.delete(ownerId);
  };
  void next.then(clean, clean);
  return next;
}

/** Only these exact owner-scoped keys may pass through this queue. */
export function writeAccountPreference(
  ownerId: string,
  key: string,
  value: string | null,
): Promise<void> {
  if (!ownerId.trim() || !keysFor(ownerId).includes(key))
    return Promise.reject(
      new Error("This device preference does not belong to the selected account."),
    );
  if (deletedOwners.has(ownerId)) return Promise.resolve();
  return enqueue(ownerId, async () => {
    if (deletedOwners.has(ownerId)) return;
    if (value === null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, value);
  });
}

/** Fence stale callbacks immediately and remove keys after any active native save. */
export function deleteAccountPreferences(ownerId: string): Promise<void> {
  if (!ownerId.trim())
    return Promise.reject(new Error("No account was selected for local deletion."));
  deletedOwners.add(ownerId);
  return enqueue(ownerId, () => AsyncStorage.multiRemove(keysFor(ownerId)));
}
