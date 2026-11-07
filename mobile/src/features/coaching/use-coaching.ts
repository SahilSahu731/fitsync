import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSession } from "@/src/context/session";
import { HttpError } from "@/src/services/api";
import { coachingForOwner, type CoachingPlan, type CoachingState } from "./api";
import { mutationId } from "./model";

export function useCoaching() {
  const { user } = useSession();
  const api = useMemo(() => coachingForOwner(user?.id), [user?.id]);
  const identity = useRef(user?.id);
  useLayoutEffect(() => { identity.current = user?.id; return () => { identity.current = undefined; }; }, [user?.id]);
  const sequence = useRef(0);
  const [snapshot, setSnapshot] = useState<{ userId: string; data: CoachingState } | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const requests = useRef(new Map<string, string>());
  const [error, setError] = useState<string | null>(null);
  const data = snapshot && snapshot.userId === user?.id ? snapshot.data : null;
  const refresh = useCallback(async () => {
    if (!user) return;
    const id = ++sequence.current;
    setLoading(true);
    try {
      const value = await api.get();
      if (identity.current === user.id && sequence.current === id) { setSnapshot({ userId: user.id, data: value }); setError(null); }
    } catch (failure) {
      if (identity.current === user.id && sequence.current === id) setError(failure instanceof Error ? failure.message : "Could not load your plan.");
    } finally { if (identity.current === user.id && sequence.current === id) setLoading(false); }
  }, [api, user]);
  useFocusEffect(useCallback(() => { void refresh(); return () => { sequence.current++; }; }, [refresh]));
  const mutate = async <T,>(key: string, action: (requestId: string) => Promise<T>, apply?: (result: T) => CoachingPlan | null) => {
    if (!user || locked.current) return null;
    const account = user.id;
    const requestKey = `${account}:${key}`;
    const requestId = requests.current.get(requestKey) ?? mutationId();
    requests.current.set(requestKey, requestId);
    locked.current = true; setBusy(true); setError(null);
    try {
      const result = await action(requestId);
      if (identity.current !== account) throw new Error("Your account changed. Please try again.");
      const plan = apply?.(result);
      if (plan) { sequence.current++; setLoading(false); setSnapshot(current => current?.userId === account ? { userId: account, data: { ...current.data, plan } } : null); }
      requests.current.delete(requestKey);
      return result;
    } catch (failure) {
      if (identity.current === account) {
        if (failure instanceof HttpError && failure.status === 409) { requests.current.delete(requestKey); await refresh(); }
        setError(failure instanceof Error ? failure.message : "Could not update your plan. Please retry.");
      }
      throw failure;
    } finally { locked.current = false; setBusy(false); }
  };
  return { data, loading, busy, error, refresh, mutate, api };
}
