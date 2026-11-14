import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { useSession } from "@/src/context/session";
import { HttpError } from "@/src/services/api";
import {
  companionForOwner,
  type CompanionState,
  type RecordData,
  type CompanionRecord,
  type ReplacementEvidence,
} from "./api";

const emptyState = (): CompanionState => ({ records: [], photos: [], shares: [] });
type CompanionContextValue = {
  state: CompanionState;
  replacements: ReplacementEvidence[] | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  api: ReturnType<typeof companionForOwner>;
  save: <K extends keyof RecordData>(
    id: string,
    kind: K,
    data: RecordData[K],
    date?: string,
    expectedRevision?: number,
  ) => Promise<CompanionRecord<K>>;
  run: <T>(action: () => Promise<T>) => Promise<T>;
};
const Context = createContext<CompanionContextValue | null>(null);
export function CompanionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  return (
    <AccountCompanion key={user?.id ?? "signed-out"} ownerId={user?.id ?? ""}>
      {children}
    </AccountCompanion>
  );
}
function AccountCompanion({ ownerId, children }: { ownerId: string; children: React.ReactNode }) {
  const api = useMemo(() => companionForOwner(ownerId), [ownerId]);
  const current = useRef(ownerId);
  const request = useRef(0),
    locked = useRef(false);
  const [state, setState] = useState<CompanionState>(emptyState);
  const [replacements, setReplacements] = useState<ReplacementEvidence[] | null>(null);
  const [loading, setLoading] = useState(!!ownerId),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  useLayoutEffect(() => {
    current.current = ownerId;
    return () => {
      current.current = "";
    };
  }, [ownerId]);
  const refresh = useCallback(async () => {
    if (!ownerId) return;
    const revision = ++request.current;
    try {
      const [result, usage] = await Promise.all([api.state(), api.exerciseUsage()]);
      if (current.current === ownerId && revision === request.current) {
        setState(result);
        setReplacements(usage.replacements);
        setError(null);
      }
    } catch (failure) {
      if (current.current === ownerId && revision === request.current)
        setError(failure instanceof Error ? failure.message : "Could not sync your Pro companion.");
    } finally {
      if (current.current === ownerId && revision === request.current) setLoading(false);
    }
  }, [api, ownerId]);
  useEffect(() => {
    void Promise.resolve().then(refresh);
    // Foreground reconciliation also picks up changes from the desktop workspace.
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") void refresh();
    });
    const interval = setInterval(() => {
      if (AppState.currentState === "active" && !locked.current) void refresh();
    }, 60_000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [refresh]);
  async function run<T>(action: () => Promise<T>): Promise<T> {
    if (!ownerId || current.current !== ownerId) throw new Error("Sign in to use your companion.");
    if (locked.current) throw new Error("Your previous change is still syncing.");
    locked.current = true;
    request.current++;
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if (current.current !== ownerId) throw new Error("Your account changed. Reopen this screen.");
      await refresh();
      return result;
    } catch (failure) {
      if (current.current === ownerId) {
        if (failure instanceof HttpError && failure.status === 409) await refresh();
        setError(failure instanceof Error ? failure.message : "Your change could not be synced.");
      }
      throw failure;
    } finally {
      locked.current = false;
      if (current.current === ownerId) setBusy(false);
    }
  }
  async function save<K extends keyof RecordData>(
    id: string,
    kind: K,
    data: RecordData[K],
    date?: string,
    expectedRevision?: number,
  ) {
    const record = state.records.find((item) => item.id === id);
    return run(async () => {
      const saved = await api.save(id, kind, data, expectedRevision ?? record?.revision ?? 0, date);
      if (current.current === ownerId)
        setState((previous) => ({
          ...previous,
          records: [...previous.records.filter((item) => item.id !== saved.id), saved],
        }));
      return saved;
    });
  }
  return (
    <Context.Provider
      value={{ state, replacements, loading, busy, error, refresh, api, run, save }}
    >
      {children}
    </Context.Provider>
  );
}
export function useCompanion() {
  const value = useContext(Context);
  if (!value) throw new Error("CompanionProvider is missing.");
  return value;
}
