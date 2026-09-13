const enabled = __DEV__;

export function syncLog(...values: unknown[]): void {
  if (!enabled) {
    return;
  }

  console.log("[FitSync Sync]", ...values);
}

export function syncError(...values: unknown[]): void {
  if (!enabled) {
    return;
  }

  console.error("[FitSync Sync]", ...values);
}
