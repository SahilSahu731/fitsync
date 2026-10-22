"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Account } from "@/lib/types";
import { Icon } from "./icon";

type Session = { account: Account | null; admin: boolean; loading: boolean; error: string; updateAccount: (account: Account) => void; reload: () => Promise<void>; logout: () => Promise<void> };
const Context = createContext<Session | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const me = await api<Account>("/me");
      const permissions = await api<{ canManageExercises: boolean }>("/exercises/permissions");
      setAccount(me); setAdmin(permissions.canManageExercises);
    } catch (e) {
      setAccount(null); setAdmin(false);
      if (!(e instanceof ApiError && e.status === 401)) setError(e instanceof Error ? e.message : "Could not load your account.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void reload();
    const expired = () => { setAccount(null); setAdmin(false); };
    window.addEventListener("fitsync-session-expired", expired);
    return () => window.removeEventListener("fitsync-session-expired", expired);
  }, [reload]);
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAccount(null); setAdmin(false); window.location.assign("/");
  }
  return <Context.Provider value={{ account, admin, loading, error, updateAccount: setAccount, reload, logout }}>{children}</Context.Provider>;
}
export function useSession() { const value = useContext(Context); if (!value) throw new Error("Missing session provider"); return value; }
export function AccessGate({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { account, admin, loading, error, reload } = useSession();
  if (loading) return <div className="empty-state" role="status"><span className="spinner" /><h2>Loading your workspace</h2></div>;
  if (error) return <div className="empty-state"><Icon name="shield" size={36} /><h2>We couldn’t connect</h2><p>{error}</p><button className="button" onClick={() => void reload()}>Try again</button></div>;
  if (!account) return <div className="empty-state"><span className="icon-tile"><Icon name={adminOnly ? "shield" : "dumbbell"} size={28} /></span><h2>{adminOnly ? "Your admin workspace awaits" : "Your next movement starts here"}</h2><p>Sign in with Google to {adminOnly ? "manage the FitSync exercise library." : "explore the exercise library and your fitness profile."}</p><Link className="button" href={`/login?next=${adminOnly ? "/admin/exercises" : "/exercises"}`}>Continue with Google <Icon name="arrow" size={16} /></Link></div>;
  if (adminOnly && !admin) return <div className="empty-state"><Icon name="shield" size={36} /><h2>Admin access required</h2><p>Your account can browse exercises. Only an administrator can manage the library.</p><Link className="button" href="/exercises">Explore exercises</Link></div>;
  return children;
}
