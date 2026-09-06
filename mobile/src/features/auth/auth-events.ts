type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeToAuthInvalidation(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function emitAuthInvalidated(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.error("Auth invalidation listener failed", error);
    }
  }
}
