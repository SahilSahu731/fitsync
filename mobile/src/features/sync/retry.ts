const RETRY_DELAYS_MS = [
  2_000, 5_000, 15_000, 30_000, 60_000, 120_000, 300_000,
] as const;

export function getRetryDelayMs(retryCount: number): number {
  const index = Math.max(0, Math.min(retryCount, RETRY_DELAYS_MS.length - 1));

  return RETRY_DELAYS_MS[index];
}

export function getNextRetryAt(
  retryCount: number,

  now = Date.now(),
): string {
  return new Date(now + getRetryDelayMs(retryCount)).toISOString();
}
