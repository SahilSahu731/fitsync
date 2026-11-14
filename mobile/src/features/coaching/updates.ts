const listeners = new Set<() => void>();
export function publishCoachingChange() {
  for (const listener of listeners) {
    // Notification listeners cannot invalidate an already committed API change.
    try {
      listener();
    } catch {
      /* Other subscribers must still refresh. */
    }
  }
}
export function subscribeCoachingChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
