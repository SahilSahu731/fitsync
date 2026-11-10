"use client";
import Script from "next/script";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CircleAlert,
  Dumbbell,
  KeyRound,
  LoaderCircle,
  Waypoints,
} from "lucide-react";
import { useSession } from "./session";
import { Brand } from "./shell";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: { theme: string; size: string; width: number; text: string; shape: string },
          ) => void;
        };
      };
    };
  }
}
export function Login({ register = false }: { register?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const { reload, account, admin } = useSession();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const initialize = useCallback(() => {
    if (!clientId || !container.current || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      auto_select: false,
      callback: async ({ credential }) => {
        setBusy(true);
        setError("");
        try {
          const response = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: credential }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || "Google sign-in failed.");
          await reload();
          const destination = new URLSearchParams(window.location.search).get("next");
          window.location.assign(
            destination && /^\/(admin|exercises|user)(\/|\?|$)/.test(destination)
              ? destination
              : "/user/home",
          );
        } catch (e) {
          setError(e instanceof Error ? e.message : "Please try signing in again.");
          setBusy(false);
        }
      },
    });
    window.google.accounts.id.renderButton(container.current, {
      theme: "outline",
      size: "large",
      width: Math.min(400, container.current.clientWidth || 280),
      text: register ? "signup_with" : "continue_with",
      shape: "pill",
    });
    setReady(true);
  }, [clientId, register, reload]);
  useEffect(() => {
    initialize();
  }, [initialize]);
  return (
    <div className="bg-background text-ink">
      <main id="main" className="mx-auto grid min-h-svh max-w-450 lg:grid-cols-[1fr_1.08fr]">
        <section className="flex min-w-0 flex-col px-6 sm:px-12 lg:min-h-svh lg:px-10 xl:px-18">
          <header className="mx-auto flex h-24 w-full max-w-110 shrink-0 items-center justify-between gap-5 sm:h-28">
            <Brand />
            <Link
              href="/"
              className="group inline-flex min-h-11 items-center gap-2 rounded-sm text-sm text-muted transition-colors hover:text-ink"
              aria-label="Back to the FitSync website"
            >
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
              <span className="hidden sm:inline">Back to website</span>
              <span className="sm:hidden">Home</span>
            </Link>
          </header>

          <div className="flex flex-1 items-center py-10 sm:py-14 lg:py-10">
            <div className="mx-auto w-full max-w-100">
              <p className="mb-6 flex items-center gap-2.5 text-[11px] font-semibold tracking-[0.17em] text-muted">
                <span className="size-1.5 rounded-full bg-brand" />
                {register ? "YOUR FIRST STEP STARTS HERE" : "PICK UP WHERE YOU LEFT OFF"}
              </p>
              <h1 className="text-[clamp(3.25rem,12vw,4rem)] leading-[1.02] font-semibold tracking-[-0.06em]">
                {register ? "Make your" : "Welcome"}
                <br />
                <span className="text-brand">{register ? "first move." : "back."}</span>
              </h1>
              <p className="mt-5 max-w-85 text-base leading-7 text-muted sm:text-lg sm:leading-8">
                {register
                  ? "A little more movement. A lot more you. Create your free FitSync account."
                  : "Your training. Your progress. Your own pace. Let’s get back to your good thing."}
              </p>

              <div className="mt-9">
                <h2 className="mb-4 text-sm font-medium">
                  {account
                    ? "You’re already in."
                    : register
                      ? "Create your account"
                      : "Log in to FitSync"}
                </h2>
                {account ? (
                  <div className="rounded-2xl border border-line bg-panel p-5">
                    <p className="mb-4 break-words text-sm text-muted">
                      Signed in as <span className="font-medium text-ink">{account.user.name}</span>
                    </p>
                    <Link
                      href={admin ? "/admin/exercises" : "/user/home"}
                      className="group flex min-h-13 items-center justify-between gap-4 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-background transition-colors hover:bg-brand-hover"
                    >
                      Go to your workspace
                      <ArrowUpRight
                        size={20}
                        className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </Link>
                  </div>
                ) : (
                  <>
                    {clientId ? (
                      <div className="relative min-h-12">
                        <div
                          ref={container}
                          aria-busy={busy}
                          inert={busy}
                          className={`flex min-h-12 w-full items-center justify-center overflow-hidden [&>div]:max-w-full ${busy ? "pointer-events-none opacity-50" : ""}`}
                        />
                        {!ready && !error && (
                          <div
                            role="status"
                            className="pointer-events-none absolute inset-0 flex items-center justify-center gap-3 rounded-full border border-line bg-panel px-4 text-sm text-muted"
                          >
                            <LoaderCircle
                              size={17}
                              className="animate-spin motion-reduce:animate-none"
                            />
                            Loading Google sign-in…
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        role="status"
                        className="flex items-start gap-3 rounded-xl border border-line bg-panel p-4"
                      >
                        <CircleAlert size={18} className="mt-0.5 text-brand" />
                        <div>
                          <p className="text-sm font-medium">Sign-in is currently unavailable.</p>
                          <p className="mt-1 text-sm leading-6 text-muted">
                            Please try again later.
                          </p>
                        </div>
                      </div>
                    )}
                    {busy && (
                      <p role="status" className="mt-3 flex items-center gap-2 text-sm text-muted">
                        <LoaderCircle
                          size={15}
                          className="animate-spin motion-reduce:animate-none"
                        />
                        {register ? "Getting your account ready…" : "Signing you in…"}
                      </p>
                    )}
                    {error && (
                      <div
                        role="alert"
                        className="mt-4 flex items-start gap-3 rounded-xl border border-line bg-panel p-4"
                      >
                        <CircleAlert size={18} className="mt-0.5 text-brand" />
                        <div className="min-w-0">
                          <p className="text-sm leading-6">{error}</p>
                          <button
                            type="button"
                            className="mt-2 min-h-8 text-sm font-semibold text-brand underline-offset-4 hover:underline"
                            onClick={() => window.location.reload()}
                          >
                            Try again
                          </button>
                        </div>
                      </div>
                    )}
                    {clientId && (
                      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted">
                        <KeyRound size={13} strokeWidth={1.6} />
                        No extra password to remember.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="mt-9 space-y-5 border-t border-line pt-7">
                {[
                  {
                    icon: Dumbbell,
                    title: "Find your kind of strong.",
                    description: "Explore movements for your starting point.",
                  },
                  {
                    icon: Waypoints,
                    title: "One account. Every device.",
                    description: "Your web and mobile profile, together.",
                  },
                ].map(({ icon: FeatureIcon, title, description }) => (
                  <div key={title} className="flex items-start gap-3.5">
                    <span className="flex size-9 items-center justify-center rounded-full border border-line">
                      <FeatureIcon size={17} strokeWidth={1.5} className="text-brand" />
                    </span>
                    <div>
                      <h3 className="text-sm font-medium tracking-normal">{title}</h3>
                      <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-8 flex flex-wrap items-center gap-x-2 text-sm text-muted">
                {register ? "Already have an account?" : "New to FitSync?"}
                <Link
                  href={register ? "/login" : "/register"}
                  className="group inline-flex min-h-11 items-center gap-1.5 rounded-sm font-semibold text-ink underline decoration-line underline-offset-4 transition-colors hover:text-brand hover:decoration-brand"
                >
                  {register ? "Log in" : "Create a free account"}
                  <ArrowUpRight
                    size={15}
                    className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </Link>
              </p>
            </div>
          </div>

          <footer className="mx-auto flex w-full max-w-110 flex-wrap items-center justify-between gap-3 border-t border-line py-6 text-[11px] text-muted">
            <span>Built around you. Built for your next.</span>
            <span>FitSync © {new Date().getFullYear()}</span>
          </footer>
        </section>

        <aside
          className="relative mx-5 mb-5 min-h-85 overflow-hidden rounded-3xl border border-line bg-panel sm:mx-12 lg:my-5 lg:mr-5 lg:ml-0 lg:min-h-[calc(100svh-2.5rem)]"
          aria-label="A moment for your next session"
        >
          <Image
            src="/art/auth-ready.webp"
            alt="An athlete tying her running shoes before training in a quiet, softly lit studio"
            fill
            preload
            sizes="(max-width: 1023px) 100vw, 52vw"
            className="object-cover object-[50%_45%]"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/5 to-black/35" />
          <div className="absolute inset-x-6 top-6 flex items-center justify-between gap-4 text-[9px] font-medium tracking-[0.17em] text-white/75 sm:inset-x-8 sm:top-8 xl:inset-x-11 xl:top-10">
            <span className="flex items-center gap-2.5">
              <span className="size-1.5 rounded-full bg-brand" />
              THE MOMENT BEFORE YOUR NEXT.
            </span>
            <span className="hidden font-mono text-white/45 sm:block">FS / 01</span>
          </div>
          <div className="absolute inset-x-6 bottom-7 sm:inset-x-8 sm:bottom-9 xl:inset-x-11 xl:bottom-11">
            <p className="mb-4 text-[10px] font-medium tracking-[0.18em] text-brand">
              A LITTLE SPACE FOR YOURSELF.
            </p>
            <h2 className="text-[42px] leading-[1.02] font-medium tracking-[-0.055em] sm:text-5xl lg:text-[clamp(2.7rem,4.6vw,4.8rem)]">
              {register ? "Every story starts" : "A little time."}
              <br />
              <span className="text-brand">{register ? "with showing up." : "All yours."}</span>
            </h2>
            <div className="mt-5 flex items-end justify-between gap-5 border-t border-white/20 pt-5">
              <p className="max-w-70 text-xs leading-6 text-white/65 sm:text-sm">
                No perfect starting point.
                <br />
                Just a little willingness to begin.
              </p>
              <svg
                viewBox="0 0 92 64"
                fill="none"
                className="w-19 text-brand/80 sm:w-22"
                aria-hidden="true"
              >
                <path
                  d="M5 45C9 15 39 7 53 26c12 18-8 34-20 21-13-14 5-35 22-30 15 4 25 18 28 32m-15-7 16 10 2-18"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </aside>
      </main>
      {clientId && (
        <Script
          src="https://accounts.google.com/gsi/client"
          onReady={initialize}
          onError={() =>
            setError("Google sign-in could not load. Check your connection and try again.")
          }
        />
      )}
    </div>
  );
}
