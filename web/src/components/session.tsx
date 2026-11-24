"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, apiForAccount, ApiError } from "@/lib/api";
import type { Account } from "@/lib/types";
import { Icon } from "./icon";

type Session = {
  account: Account | null;
  admin: boolean;
  loading: boolean;
  error: string;
  updateAccount: (account: Account) => void;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<Session | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const mounted = useRef(true);
  const reload = useCallback(async () => {
    const requestGeneration = ++generation.current;
    const current = () => mounted.current && requestGeneration === generation.current;
    setLoading(true);
    setError("");
    try {
      const [me, permissions] = await Promise.all([
        api<Account>("/me"),
        api<{ canManageExercises: boolean }>("/exercises/permissions"),
      ]);
      if (!current()) return;
      setAccount(me);
      setAdmin(permissions.canManageExercises);
    } catch (e) {
      if (!current()) return;
      setAccount(null);
      setAdmin(false);
      if (!(e instanceof ApiError && e.status === 401))
        setError(e instanceof Error ? e.message : "Could not load your account.");
    } finally {
      if (current()) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    generation.current++;
    const initial = setTimeout(() => void reload(), 0);
    const expired = () => {
      generation.current++;
      setAccount(null);
      setAdmin(false);
      setLoading(false);
      setError("");
    };
    window.addEventListener("fitsync-session-expired", expired);
    return () => {
      mounted.current = false;
      clearTimeout(initial);
      window.removeEventListener("fitsync-session-expired", expired);
    };
  }, [reload]);
  const logout = useCallback(async () => {
    const requestGeneration = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok)
        throw new Error("Could not sign out. Please check your connection and try again.");
      if (!mounted.current || requestGeneration !== generation.current) return;
      setAccount(null);
      setAdmin(false);
      router.replace("/");
      router.refresh();
    } catch {
      if (mounted.current && requestGeneration === generation.current)
        setError("Could not sign out. Please check your connection and try again.");
    } finally {
      if (mounted.current && requestGeneration === generation.current) setLoading(false);
    }
  }, [router]);
  const updateAccount = useCallback((next: Account) => {
    // A profile save from an old tab/session must not restore a signed-out user.
    setAccount((current) => (current?.user.id === next.user.id ? next : current));
  }, []);
  const value = useMemo(
    () => ({ account, admin, loading, error, updateAccount, reload, logout }),
    [account, admin, loading, error, updateAccount, reload, logout],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing session provider");
  return value;
}
export function useAccountApi() {
  const owner = useSession().account?.user.id;
  return useMemo(() => apiForAccount(owner), [owner]);
}
export function AccessGate({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { account, admin, loading, error, reload } = useSession();
  const pathname = usePathname();
  if (loading)
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-5 py-20 text-center [&>p]:max-w-lg [&>p]:leading-7 [&>p]:text-muted [&>h2]:text-3xl"
        role="status"
      >
        <span className="block size-7 animate-spin rounded-full border-3 border-line border-t-ink motion-reduce:animate-none" />
        <h2>Loading your workspace</h2>
      </div>
    );
  if (error)
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-5 py-20 text-center [&>p]:max-w-lg [&>p]:leading-7 [&>p]:text-muted [&>h2]:text-3xl">
        <Icon name="shield" size={36} />
        <h2>We couldn’t connect</h2>
        <p>{error}</p>
        <button
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void reload()}
        >
          Try again
        </button>
      </div>
    );
  if (!account)
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-5 py-20 text-center [&>p]:max-w-lg [&>p]:leading-7 [&>p]:text-muted [&>h2]:text-3xl">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/8 text-white">
          <Icon name={adminOnly ? "shield" : "dumbbell"} size={28} />
        </span>
        <h2>{adminOnly ? "Your admin workspace awaits" : "Your next movement starts here"}</h2>
        <p>
          Sign in with Google to{" "}
          {adminOnly
            ? "manage the FitSync exercise library."
            : "explore the exercise library and your fitness profile."}
        </p>
        <Link
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          href={`/login?next=${encodeURIComponent(adminOnly ? "/admin/exercises" : pathname || "/user/home")}`}
        >
          Continue with Google <Icon name="arrow" size={16} />
        </Link>
      </div>
    );
  if (adminOnly && !admin)
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-5 py-20 text-center [&>p]:max-w-lg [&>p]:leading-7 [&>p]:text-muted [&>h2]:text-3xl">
        <Icon name="shield" size={36} />
        <h2>Admin access required</h2>
        <p>Your account can browse exercises. Only an administrator can manage the library.</p>
        <Link
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          href="/exercises"
        >
          Explore exercises
        </Link>
      </div>
    );
  return children;
}
