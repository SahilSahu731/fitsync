import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useSession } from "@/src/context/session";
import { explainPermission } from "@/src/services/permission-prompts";
import { getHealthAdapter } from "./native";
import {
  disconnectHealthSync,
  importHealthForUser,
  latestHealthImportResult,
  readHealthSyncSettings,
  subscribeHealthSync,
  type HealthImportResult,
} from "./service";
import {
  disabledHealthSync,
  type HealthAvailability,
  type HealthSyncSettings,
  type HealthMetric,
} from "./types";

export function useHealthSync() {
  const { user } = useSession();
  const ownerId = user?.id ?? "";
  const currentOwner = useRef(ownerId);
  useLayoutEffect(() => {
    currentOwner.current = ownerId;
    return () => {
      currentOwner.current = "";
    };
  }, [ownerId]);
  const [cache, setCache] = useState<{
    ownerId: string;
    settings: HealthSyncSettings;
    result: HealthImportResult | null;
  }>({ ownerId: "", settings: disabledHealthSync(), result: null });
  const [availability, setAvailability] = useState<HealthAvailability | null>(null);
  const [operation, setOperation] = useState({ ownerId: "", busy: false, error: "" });
  const busy = operation.ownerId === ownerId && operation.busy;
  const error = operation.ownerId === ownerId ? operation.error : "";
  const active = useRef(true);
  const requestLock = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    if (!ownerId) return;
    let cancelled = false;
    Promise.all([readHealthSyncSettings(ownerId), getHealthAdapter().available()])
      .then(([settings, available]) => {
        if (!cancelled) {
          setCache({ ownerId, settings, result: latestHealthImportResult(ownerId) });
          setAvailability(available);
        }
      })
      .catch((cause) => {
        if (!cancelled)
          setOperation({
            ownerId,
            busy: false,
            error: cause instanceof Error ? cause.message : "Could not open health import.",
          });
      });
    const unsubscribe = subscribeHealthSync((id) => {
      if (id !== ownerId) return;
      void readHealthSyncSettings(ownerId)
        .then((settings) => {
          if (!cancelled)
            setCache({
              ownerId,
              settings,
              result: latestHealthImportResult(ownerId),
            });
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [ownerId]);
  const importNow = async (requestAccess = false, metrics?: HealthMetric[]) => {
    if (!ownerId || busy || requestLock.current) return;
    requestLock.current = true;
    const current = () => active.current && currentOwner.current === ownerId;
    setOperation({ ownerId, busy: true, error: "" });
    try {
      if (
        requestAccess &&
        !(await explainPermission(
          metrics?.length === 1 && metrics[0] === "steps" ? "steps" : "health",
        ))
      )
        return;
      if (!current()) return;
      const result = await importHealthForUser(ownerId, current, requestAccess, metrics);
      const settings = await readHealthSyncSettings(ownerId);
      if (current())
        setCache({ ownerId, settings, result: latestHealthImportResult(ownerId) ?? result });
    } catch (cause) {
      if (current())
        setOperation({
          ownerId,
          busy: false,
          error: cause instanceof Error ? cause.message : "Health import failed. Please retry.",
        });
    } finally {
      requestLock.current = false;
      if (current()) setOperation((previous) => ({ ...previous, busy: false }));
    }
  };
  const disconnect = async () => {
    if (!ownerId || requestLock.current) return;
    requestLock.current = true;
    setOperation({ ownerId, busy: true, error: "" });
    try {
      await disconnectHealthSync(ownerId);
      const settings = await readHealthSyncSettings(ownerId);
      if (currentOwner.current === ownerId) setCache({ ownerId, settings, result: null });
    } catch (cause) {
      if (currentOwner.current === ownerId)
        setOperation({
          ownerId,
          busy: false,
          error: cause instanceof Error ? cause.message : "Could not stop health import.",
        });
    } finally {
      requestLock.current = false;
      if (currentOwner.current === ownerId)
        setOperation((previous) => ({ ...previous, busy: false }));
    }
  };
  return {
    ownerId,
    availability,
    busy,
    error,
    settings: cache.ownerId === ownerId ? cache.settings : disabledHealthSync(),
    result: cache.ownerId === ownerId ? cache.result : null,
    importNow,
    disconnect,
  };
}

// Opted-in accounts import on launch/foreground. This is not a background job,
// and never triggers an OS permission prompt without a user pressing Connect.
export function HealthSyncBridge() {
  const { user } = useSession();
  const ownerId = user?.id ?? "";
  const owner = useRef(ownerId);
  useLayoutEffect(() => {
    owner.current = ownerId;
    return () => {
      owner.current = "";
    };
  }, [ownerId]);
  useEffect(() => {
    if (!ownerId) return;
    let mounted = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stopTimer = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const current = () =>
      mounted && owner.current === ownerId && AppState.currentState === "active";
    const run = async () => {
      if (!current()) return;
      try {
        const settings = await readHealthSyncSettings(ownerId);
        if (!current()) return;
        if (!settings.enabled) {
          stopTimer();
          return;
        }
        timer ??= setInterval(() => void run(), 60_000);
        if (settings.lastImportedAt && Date.now() - Date.parse(settings.lastImportedAt) < 60_000)
          return;
        await importHealthForUser(ownerId, current);
      } catch {
        /* A manual retry and explicit error are available on Health import. */
      }
    };
    void run();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void run();
      else stopTimer();
    });
    const unsubscribe = subscribeHealthSync((id) => {
      if (id === ownerId) void run();
    });
    return () => {
      mounted = false;
      listener.remove();
      stopTimer();
      unsubscribe();
    };
  }, [ownerId]);
  return null;
}
