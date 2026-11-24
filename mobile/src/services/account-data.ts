import { deleteOnboardingDraft } from "@/src/components/onboarding/use-onboarding-draft";
import { deleteHealthSyncSettings } from "@/src/features/health-sync/service";
import { deleteFoodDiary } from "@/src/features/nutrition/storage";
import { deleteProgressJournal } from "@/src/features/progress/journal";
import { deleteWorkoutDraft } from "@/src/features/workouts/offline";
import { deleteAccountPreferences } from "./account-preferences";

/** Called only after the server confirms permanent deletion of this exact owner. */
export async function deleteAccountData(ownerId: string): Promise<void> {
  if (!ownerId.trim()) throw new Error("No account was selected for local deletion.");
  const results = await Promise.allSettled([
    deleteProgressJournal(ownerId),
    deleteFoodDiary(ownerId),
    deleteWorkoutDraft(ownerId),
    deleteHealthSyncSettings(ownerId),
    deleteOnboardingDraft(ownerId),
    deleteAccountPreferences(ownerId),
  ]);
  if (results.some((result) => result.status === "rejected"))
    throw new Error("Your account was deleted, but some saved device data could not be removed.");
}
