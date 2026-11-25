import type { ProgressWorkout } from "../progress/model";

const DAY = 86_400_000;
type Completion = Pick<ProgressWorkout, "id" | "status" | "started_at" | "finished_at">;

export function reachedReviewMilestone(current: Completion, history: Completion[], now: number) {
  const completedAt = Date.parse(current.finished_at ?? current.started_at);
  if (current.status !== "completed" || !Number.isFinite(completedAt) || completedAt > now)
    return false;
  const ids = new Set([current.id]);
  const weekAgo = now - 7 * DAY;
  let hasWeekOfHistory = completedAt <= weekAgo;
  for (const workout of history) {
    const finished = Date.parse(workout.finished_at ?? workout.started_at);
    if (workout.status !== "completed" || !Number.isFinite(finished) || finished > now) continue;
    ids.add(workout.id);
    if (finished <= weekAgo) hasWeekOfHistory = true;
    if (ids.size >= 3 && hasWeekOfHistory) return true;
  }
  return false;
}

export type ReviewPreference = { lastAttemptAt: number | null; openedListing: boolean };

export function reviewPreference(raw: string | null): ReviewPreference {
  try {
    const value = JSON.parse(raw ?? "null");
    return {
      lastAttemptAt: Number.isFinite(value?.lastAttemptAt) ? value.lastAttemptAt : null,
      openedListing: value?.openedListing === true,
    };
  } catch {
    return { lastAttemptAt: null, openedListing: false };
  }
}

export function canInviteToReview(preference: ReviewPreference, now: number) {
  return (
    !preference.openedListing &&
    (preference.lastAttemptAt === null || now - preference.lastAttemptAt >= 120 * DAY)
  );
}
