import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_DRAFT, restoreDraft, type Draft } from "./config";

export function useOnboardingDraft(userId?: string) {
  const key = userId ? `@fitsync/onboarding/v3/${userId}` : null;
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const finished = useRef(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    finished.current = false;
    if (!key) return;
    void AsyncStorage.getItem(key).then(raw => {
      if (active) setDraft(raw ? restoreDraft(JSON.parse(raw)) : { ...DEFAULT_DRAFT });
    }).catch(() => { if (active) setDraft({ ...DEFAULT_DRAFT }); }).finally(() => { if (active) setLoadedKey(key); });
    return () => { active = false; };
  }, [key]);
  useEffect(() => {
    if (!key || key !== loadedKey || finished.current) return;
    // Serialize writes so a late autosave cannot recreate a completed draft.
    writes.current = writes.current.then(() => AsyncStorage.setItem(key, JSON.stringify(draft))).catch(() => {});
  }, [draft, key, loadedKey]);
  async function clearDraft() {
    finished.current = true;
    await writes.current;
    if (key) await AsyncStorage.removeItem(key).catch(() => {});
  }
  return { draft, setDraft, loaded: !!key && key === loadedKey, clearDraft };
}
