export function createRestEndsAt(
  seconds: number,

  now = Date.now(),
): string {
  return new Date(now + seconds * 1000).toISOString();
}

export function remainingRestSeconds(
  restEndsAt: string,

  now = Date.now(),
): number {
  const target = new Date(restEndsAt).getTime();

  return Math.max(0, Math.ceil((target - now) / 1000));
}

export function adjustRestEndsAt(
  restEndsAt: string,

  seconds: number,
): string {
  const current = new Date(restEndsAt).getTime();

  const minimum = Date.now();

  return new Date(Math.max(minimum, current + seconds * 1000)).toISOString();
}
