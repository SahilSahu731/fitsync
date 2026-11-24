import AsyncStorage from "@react-native-async-storage/async-storage";
import { writeAccountPreference } from "@/src/services/account-preferences";

export const onboardingWelcomeKey = (ownerId: string) => `fitsync.onboarding-welcome.v1.${ownerId}`;
const pendingKey = (ownerId: string) => `fitsync.onboarding-welcome-pending.v1.${ownerId}`;
const shown = new Set<string>();
const pending = new Map<string, Promise<boolean>>();

/** Completion arms the introduction; ordinary Home visits never create it. */
export async function armOnboardingWelcome(ownerId: string): Promise<void> {
  if (!ownerId) return;
  try {
    await writeAccountPreference(ownerId, `fitsync.goals-welcome.v1.${ownerId}`, "seen");
    if (shown.has(ownerId) || (await AsyncStorage.getItem(onboardingWelcomeKey(ownerId)))) return;
    await writeAccountPreference(ownerId, pendingKey(ownerId), "ready");
  } catch {
    // Entering the app stays available when local preferences cannot be written.
  }
}

export function claimOnboardingWelcome(
  ownerId: string,
  current: () => boolean = () => true,
): Promise<boolean> {
  if (!ownerId || !current()) return Promise.resolve(false);
  const active = pending.get(ownerId);
  if (active) return active;
  if (shown.has(ownerId)) return Promise.resolve(false);
  const operation = (async () => {
    try {
      const seen = await AsyncStorage.getItem(onboardingWelcomeKey(ownerId));
      if (!current()) return false;
      if (seen) {
        shown.add(ownerId);
        return false;
      }
      const armed = await AsyncStorage.getItem(pendingKey(ownerId));
      if (!armed || !current()) return false;
      await writeAccountPreference(ownerId, onboardingWelcomeKey(ownerId), "seen");
      if (!current()) {
        await writeAccountPreference(ownerId, onboardingWelcomeKey(ownerId), null);
        return false;
      }
      shown.add(ownerId);
      return true;
    } catch {
      shown.add(ownerId);
      return false;
    }
  })().finally(() => pending.delete(ownerId));
  pending.set(ownerId, operation);
  return operation;
}
