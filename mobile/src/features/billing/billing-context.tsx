import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AppState, Linking, Platform } from "react-native";
import { useSession } from "@/src/context/session";
import { apiRequest } from "@/src/services/api";
import { FREE_ENTITLEMENT, confirmStorePurchase, hasPro, isCancelledPurchase, subscriptionManagementUrl, type BillingStatus, type Entitlement } from "./model";
import { revenueCatKey, storeSession } from "./native";

import { makeOffers, type BillingOffer } from "./offers";
export type { BillingOffer } from "./offers";
type BillingContextValue = {
  isPro: boolean; entitlement: Entitlement; loading: boolean; busy: boolean;
  configured: boolean; storeReady: boolean; offers: BillingOffer[];
  error: string | null; storeError: string | null; pendingActivation: boolean;
  refresh: () => Promise<void>; purchase: (id: string) => Promise<"active" | "pending" | "cancelled">;
  restore: () => Promise<"active" | "none" | "pending">; manage: () => Promise<void>;
};
const BillingContext = createContext<BillingContextValue | null>(null);

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { user, ready } = useSession();
  return <BillingAccountProvider key={user?.id ?? "signed-out"} userId={user?.id ?? null} ready={ready}>{children}</BillingAccountProvider>;
}

function BillingAccountProvider({ children, userId, ready }: { children: React.ReactNode; userId: string | null; ready: boolean }) {
  const identity = useRef(userId);
  useLayoutEffect(() => { identity.current = userId; return () => { identity.current = null; }; }, [userId]);
  const [snapshot, setSnapshot] = useState<{ userId: string; status: BillingStatus } | null>(null);
  const [loading, setLoading] = useState(!!userId);
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(Date.now);
  const locked = useRef(false);
  const statusSequence = useRef(0);
  const [offersState, setOffers] = useState<{ userId: string; offers: BillingOffer[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const status = snapshot?.userId === userId ? snapshot.status : null;
  const offers = useMemo(() => offersState?.userId === userId ? offersState.offers : [], [offersState, userId]);
  const isPro = hasPro(status);
  const alive = (id: string) => identity.current === id;

  const getStatus = useCallback(async (id: string, sync = false) => {
    const request = ++statusSequence.current;
    const result = await apiRequest<BillingStatus>(sync ? "/billing/sync" : "/billing/status", sync ? { method: "POST", expectedOwnerId: id } : { expectedOwnerId: id });
    if (!alive(id)) throw new Error("Your account changed. Please try again.");
    if (request === statusSequence.current) {
      setSnapshot({ userId: id, status: result });
      if (hasPro(result)) setPendingUser(null);
      setError(null);
    }
    return result;
  }, []);

  const loadOffers = useCallback(async (id: string) => {
    if (!alive(id)) return;
    await storeSession.identify(id);
    const result = await storeSession.withUser(id, sdk => sdk.getOfferings());
    if (!alive(id)) return;
    setOffers({ userId: id, offers: makeOffers(result.current?.availablePackages ?? [], Platform.OS) });
    setStoreError(result.current?.availablePackages.length ? null : "Plans are not available from the store right now. You can still restore an existing purchase.");
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const results = await Promise.allSettled([getStatus(userId, true), loadOffers(userId)]);
    if (!alive(userId)) return;
    if (results[0].status === "rejected") setError(results[0].reason instanceof Error ? results[0].reason.message : "Could not refresh your subscription.");
    if (results[1].status === "rejected") setStoreError(results[1].reason instanceof Error ? results[1].reason.message : "Could not load store plans.");
    setLoading(false);
  }, [getStatus, loadOffers, userId]);

  useEffect(() => {
    if (!ready || !userId) {
      void storeSession.identify(null).catch(() => undefined);
      return;
    }
    void Promise.resolve().then(() => Promise.allSettled([getStatus(userId), loadOffers(userId)])).then(results => {
      if (!alive(userId)) return;
      if (results[0].status === "rejected") setError(results[0].reason instanceof Error ? results[0].reason.message : "Could not verify subscription status.");
      if (results[1].status === "rejected") setStoreError(results[1].reason instanceof Error ? results[1].reason.message : "Could not load store plans.");
      setLoading(false);
    });
  }, [getStatus, loadOffers, ready, userId]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active" && userId && !locked.current) void getStatus(userId, true).catch(() => undefined);
    });
    return () => subscription.remove();
  }, [getStatus, userId]);

  useEffect(() => {
    const expiry = status?.entitlement.expiresAt;
    if (!userId || !status?.entitlement.active || !expiry) return;
    const delay = Date.parse(expiry) - Date.now();
    if (!Number.isFinite(delay) || delay <= 0) return;
    const timer = setTimeout(() => {
      setClock(Date.now());
      void getStatus(userId, true).catch(() => undefined);
    }, Math.min(delay + 10, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [clock, status, userId, getStatus]);

  const verifyPurchase = useCallback(async (id: string) => {
    setPendingUser(id);
    return confirmStorePurchase(() => getStatus(id, true));
  }, [getStatus]);

  const purchase = useCallback(async (id: string) => {
    if (!userId || !alive(userId)) throw new Error("Sign in to subscribe.");
    if (locked.current) throw new Error("A store request is already in progress.");
    const offer = offers.find(item => item.id === id);
    if (!offer) throw new Error("Choose an available subscription plan.");
    locked.current = true; setBusy(true);
    try {
      await storeSession.withUser(userId, sdk => sdk.purchasePackage(offer.package));
      if (!alive(userId)) return "pending" as const;
      // Never report a completed store purchase as failed because our server
      // is briefly offline or the receipt has not propagated yet.
      return await verifyPurchase(userId);
    } catch (failure) {
      if (isCancelledPurchase(failure)) return "cancelled" as const;
      throw failure;
    } finally { locked.current = false; setBusy(false); }
  }, [offers, userId, verifyPurchase]);

  const restore = useCallback(async () => {
    if (!userId) throw new Error("Sign in to restore your purchase.");
    if (locked.current) throw new Error("A store request is already in progress.");
    locked.current = true; setBusy(true);
    try {
      const info = await storeSession.withUser(userId, sdk => sdk.restorePurchases());
      if (!alive(userId)) return "pending" as const;
      const result = await verifyPurchase(userId);
      if (result === "active") return result;
      // An empty restore is different from an unverified active receipt.
      if (!Object.keys(info.entitlements.active).length) { setPendingUser(null); return "none" as const; }
      return "pending" as const;
    } finally { locked.current = false; setBusy(false); }
  }, [userId, verifyPurchase]);

  const manage = useCallback(async () => {
    const url = subscriptionManagementUrl(status?.entitlement.managementUrl ?? null, Platform.OS);
    if (!url) throw new Error("Manage this subscription in the store where you purchased it.");
    await Linking.openURL(url);
  }, [status]);

  const value = useMemo<BillingContextValue>(() => ({
    isPro, entitlement: status?.entitlement ?? FREE_ENTITLEMENT, loading, busy,
    configured: status?.configured ?? false, storeReady: !!revenueCatKey() && !storeError && offers.length > 0,
    offers, error, storeError, pendingActivation: pendingUser === userId && !!userId,
    refresh, purchase, restore, manage,
  }), [isPro, status, loading, busy, offers, error, storeError, pendingUser, userId, refresh, purchase, restore, manage]);
  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (!context) throw new Error("useBilling must be used inside BillingProvider");
  return context;
}
