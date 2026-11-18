import type { Enrollment } from "../program-follow/api";
import { validReminderPreferences, type ReminderPreferences } from "../companion/reminder-model";

export type HomeReminderDraft = {
  workout: { enabled: boolean; time: string };
  water: { enabled: boolean; time: string };
  diet: { enabled: boolean; time: string };
  days: number[];
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The caller supplies only the active enrollment, if there is one. */
export function homeReminderDraft(
  prefs: ReminderPreferences,
  enrollment: Enrollment | null,
  workoutConsent: boolean,
): HomeReminderDraft {
  return {
    workout: enrollment
      ? {
          enabled: enrollment.reminder_enabled && workoutConsent,
          time: `${String(enrollment.reminder_hour).padStart(2, "0")}:${String(enrollment.reminder_minute).padStart(2, "0")}`,
        }
      : { enabled: prefs.enabled, time: prefs.time },
    water: {
      enabled: prefs.habits?.hydration?.enabled ?? false,
      time: prefs.habits?.hydration?.time ?? "15:00",
    },
    diet: {
      enabled: prefs.habits?.meals?.enabled ?? false,
      time: prefs.habits?.meals?.time ?? "12:00",
    },
    days: [...prefs.days],
  };
}

/** Change only the simple dialog's fields; retain the advanced preferences. */
export function homeReminderPreferences(
  base: ReminderPreferences,
  draft: HomeReminderDraft,
  hasProgram: boolean,
): ReminderPreferences {
  return {
    ...base,
    // A followed program owns its workout reminder. Keep the personal one off.
    enabled: hasProgram ? false : draft.workout.enabled,
    time: hasProgram ? base.time : draft.workout.time,
    days: [...(hasProgram ? base.days : draft.days)],
    habits: {
      ...base.habits,
      hydration: { enabled: draft.water.enabled, time: draft.water.time },
      meals: { enabled: draft.diet.enabled, time: draft.diet.time },
    },
  };
}

export function validHomeReminderDraft(
  base: ReminderPreferences,
  draft: HomeReminderDraft,
  hasProgram: boolean,
): boolean {
  return (
    typeof draft.workout.enabled === "boolean" &&
    TIME.test(draft.workout.time) &&
    validReminderPreferences(homeReminderPreferences(base, draft, hasProgram))
  );
}
