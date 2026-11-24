export type ReviewHistory = { firstAt: number; workouts: string[]; lastAttemptAt: number | null };
export function reviewHistory(value: string | null, now: number): ReviewHistory {
  try {
    const data = JSON.parse(value ?? "null");
    if (data && Number.isFinite(data.firstAt) && Array.isArray(data.workouts))
      return {
        firstAt: Math.min(now, data.firstAt),
        workouts: [
          ...new Set<string>(data.workouts.filter((id: unknown) => typeof id === "string")),
        ].slice(-100),
        lastAttemptAt: Number.isFinite(data.lastAttemptAt) ? data.lastAttemptAt : null,
      };
  } catch {}
  return { firstAt: now, workouts: [], lastAttemptAt: null };
}
export function shouldRequestReview(value: ReviewHistory, now: number) {
  return (
    value.workouts.length >= 3 &&
    now - value.firstAt >= 7 * 86400_000 &&
    (value.lastAttemptAt === null || now - value.lastAttemptAt >= 120 * 86400_000)
  );
}
