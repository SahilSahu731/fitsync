import { addDays, estimatedMinutes, type Exercise, type Prescription } from "./coaching.engine.js";
export type FocusConfig = { muscle: string; startsOn: string; weeks: 4 | 8; additionalSetsPerWeek: number };
export type FocusDay = { id?: string; date: string; status?: string; revision?: number; prescription: Prescription & { focusId?: string } };
/** A bounded user-chosen volume addition. This is not a recovery or optimal-volume prediction. */
export function focusPreview<T extends FocusDay>(days: T[], catalog: Exercise[], config: FocusConfig, focusId: string) {
  const end = addDays(config.startsOn, config.weeks * 7 - 1);
  const muscleIds = new Set(catalog.filter(e => e.primary_muscles.includes(config.muscle)).map(e => e.id));
  const changes: { dayId: string; date: string; exercise: string; beforeSets: number; afterSets: number; beforeMinutes: number; afterMinutes: number }[] = [];
  const result = days.map(day => ({ ...day, prescription: { ...day.prescription, explanation: [...day.prescription.explanation], exercises: day.prescription.exercises.map(e => ({ ...e })) } }));
  for (let week = 0; week < config.weeks; week++) {
    const start = addDays(config.startsOn, week * 7), finish = addDays(start, 6);
    const candidates = result.filter(day => day.date >= start && day.date <= finish && !["active", "completed"].includes(day.status ?? "") && !day.prescription.focusId).sort((a, b) => a.date.localeCompare(b.date)).flatMap(day => day.prescription.exercises.filter(e => muscleIds.has(e.exerciseId) && ["reps", "reps_weight"].includes(e.trackingType) && e.sets < 5).map(exercise => ({ day, exercise })));
    let added = 0;
    // At most one additional set per movement per session and two in a weekly block.
    for (const { day, exercise } of candidates) {
      if (added >= Math.min(2, config.additionalSetsPerWeek)) break;
      const before = exercise.sets, oldMinutes = day.prescription.minutes;
      exercise.sets++;
      const minutes = estimatedMinutes(day.prescription.exercises);
      if (minutes > 90) { exercise.sets--; continue; }
      day.prescription.minutes = Math.max(oldMinutes, minutes);
      exercise.reason += ` Focus block: one extra working set for ${config.muscle}; chosen by you, not inferred recovery.`;
      changes.push({ dayId: day.id ?? "", date: day.date, exercise: exercise.name, beforeSets: before, afterSets: exercise.sets, beforeMinutes: oldMinutes, afterMinutes: day.prescription.minutes });
      added++;
    }
  }
  const changed = new Set(changes.map(c => c.dayId || c.date));
  for (const day of result) if (changed.has(day.id ?? day.date)) { day.prescription.focusId = focusId; day.prescription.explanation.push(`Muscle focus: ${config.muscle}. Other exercises and scheduled dates are preserved. Session time includes the accepted extra sets.`); }
  const explanation = [`Focus window: ${config.startsOn} through ${end}.`, `Up to ${Math.min(2, config.additionalSetsPerWeek)} additional working sets per seven-day block, only on existing primary-muscle movements; no movement exceeds five sets.`, "This is a user-selected planning adjustment, not an optimal-volume or recovery prediction.", "Active and completed workouts are never edited. Existing accepted focus sessions are not adjusted a second time.", ...(result.some(d => d.date > end) ? ["Sessions outside the focus window stay as planned."] : []), ...(!changes.length ? ["No eligible unstarted focus movements were found in this plan. No changes can be applied."] : []), "The saved focus window also applies when you create a new starting plan within its dates; preview that plan before saving."];
  return { days: result as T[], changes, explanation };
}
