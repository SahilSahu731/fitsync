import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useSession } from "@/src/context/session";
import { getHealthAdapter } from "./native";
import { disconnectHealthSync, importHealthForUser, readHealthSyncSettings, type HealthImportResult } from "./service";
import { disabledHealthSync, type HealthAvailability, type HealthSyncSettings } from "./types";

export function useHealthSync() {
  const { user } = useSession(); const ownerId = user?.id ?? "";
  const currentOwner = useRef(ownerId);
  useLayoutEffect(() => { currentOwner.current = ownerId; return () => { currentOwner.current = ""; }; }, [ownerId]);
  const [cache, setCache] = useState<{ ownerId: string; settings: HealthSyncSettings; result: HealthImportResult | null }>({ ownerId: "", settings: disabledHealthSync(), result: null });
  const [availability, setAvailability] = useState<HealthAvailability | null>(null);
  const [operation, setOperation] = useState({ ownerId: "", busy: false, error: "" });
  const busy = operation.ownerId === ownerId && operation.busy;
  const error = operation.ownerId === ownerId ? operation.error : "";
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (!ownerId) return;
    let cancelled = false;
    Promise.all([readHealthSyncSettings(ownerId), getHealthAdapter().available()]).then(([settings, available]) => {
      if (!cancelled) { setCache({ ownerId, settings, result: null }); setAvailability(available); }
    }).catch(cause => { if (!cancelled) setOperation({ ownerId, busy: false, error: cause instanceof Error ? cause.message : "Could not open health import." }); });
    return () => { cancelled = true; };
  }, [ownerId]);
  const importNow = async (requestAccess = false) => {
    if (!ownerId || busy) return;
    const current = () => active.current && currentOwner.current === ownerId;
    setOperation({ ownerId, busy: true, error: "" });
    try {
      const result = await importHealthForUser(ownerId, current, requestAccess);
      const settings = await readHealthSyncSettings(ownerId);
      if (current()) setCache({ ownerId, settings, result });
    } catch (cause) { if (current()) setOperation({ ownerId, busy: false, error: cause instanceof Error ? cause.message : "Health import failed. Please retry." }); }
    finally { if (current()) setOperation(previous => ({ ...previous, busy: false })); }
  };
  const disconnect = async () => {
    if (!ownerId) return;
    setOperation({ ownerId, busy: true, error: "" });
    try { await disconnectHealthSync(ownerId); const settings = await readHealthSyncSettings(ownerId); if (currentOwner.current === ownerId) setCache({ ownerId, settings, result: null }); }
    catch (cause) { if (currentOwner.current === ownerId) setOperation({ ownerId, busy: false, error: cause instanceof Error ? cause.message : "Could not stop health import." }); }
    finally { if (currentOwner.current === ownerId) setOperation(previous => ({ ...previous, busy: false })); }
  };
  return { ownerId, availability, busy, error, settings: cache.ownerId === ownerId ? cache.settings : disabledHealthSync(), result: cache.ownerId === ownerId ? cache.result : null, importNow, disconnect };
}

// Opted-in accounts import on launch/foreground. This is not a background job,
// and never triggers an OS permission prompt without a user pressing Connect.
export function HealthSyncBridge() {
  const { user } = useSession(); const ownerId = user?.id ?? "";
  const owner = useRef(ownerId);
  useLayoutEffect(() => { owner.current = ownerId; return () => { owner.current = ""; }; }, [ownerId]);
  useEffect(() => {
    if (!ownerId) return;
    let mounted = true;
    const current = () => mounted && owner.current === ownerId;
    const run = async () => {
      try {
        const settings = await readHealthSyncSettings(ownerId);
        if (!current() || !settings.enabled || (settings.lastImportedAt && Date.now() - Date.parse(settings.lastImportedAt) < 15 * 60_000)) return;
        await importHealthForUser(ownerId, current);
      } catch { /* A manual retry and explicit error are available on Health import. */ }
    };
    void run();
    const listener = AppState.addEventListener("change", state => { if (state === "active") void run(); });
    return () => { mounted = false; listener.remove(); };
  }, [ownerId]);
  return null;
}
