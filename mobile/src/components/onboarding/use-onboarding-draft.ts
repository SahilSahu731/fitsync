import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_DRAFT, restoreDraft, type Draft } from "./config";

const writes = new Map<string, Promise<void>>();
const deletedOwners = new Set<string>();
const draftKey = (ownerId: string) => `@fitsync/onboarding/v3/${ownerId}`;
function queue(ownerId: string, action: () => Promise<void>) {
  const next = (writes.get(ownerId) ?? Promise.resolve()).catch(() => {}).then(action);
  writes.set(ownerId, next);
  const clean = () => {
    if (writes.get(ownerId) === next) writes.delete(ownerId);
  };
  void next.then(clean, clean);
  return next;
}
export function deleteOnboardingDraft(ownerId: string): Promise<void> {
  if (!ownerId.trim()) return Promise.reject(new Error("Sign in to delete onboarding data."));
  deletedOwners.add(ownerId);
  return queue(ownerId, () => AsyncStorage.removeItem(draftKey(ownerId)));
}

export function useOnboardingDraft(userId?: string) {
  const key = userId ? draftKey(userId) : null;
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const finished = useRef(false);
  const pendingWrite = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    finished.current = false;
    if (!key) return;
    void AsyncStorage.getItem(key)
      .then((raw) => {
        if (active && !deletedOwners.has(userId!))
          setDraft(raw ? restoreDraft(JSON.parse(raw)) : { ...DEFAULT_DRAFT });
      })
      .catch(() => {
        if (active) setDraft({ ...DEFAULT_DRAFT });
      })
      .finally(() => {
        if (active) setLoadedKey(key);
      });
    return () => {
      active = false;
    };
  }, [key, userId]);
  useEffect(() => {
    if (!userId || !key || key !== loadedKey || finished.current || deletedOwners.has(userId))
      return;
    // Serialize writes so a late autosave cannot recreate a completed draft.
    pendingWrite.current = queue(userId, async () => {
      if (!finished.current && !deletedOwners.has(userId))
        await AsyncStorage.setItem(key, JSON.stringify(draft));
    }).catch(() => {});
  }, [draft, key, loadedKey, userId]);
  async function clearDraft() {
    finished.current = true;
    await pendingWrite.current;
    if (userId && key) await queue(userId, () => AsyncStorage.removeItem(key)).catch(() => {});
  }
  return { draft, setDraft, loaded: !!key && key === loadedKey, clearDraft };
}
