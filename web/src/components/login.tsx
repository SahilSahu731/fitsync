"use client";
import Script from "next/script";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "./session";
import { Brand } from "./shell";
import { Icon } from "./icon";

declare global { interface Window { google?: { accounts: { id: { initialize: (config: { client_id: string; callback: (response: { credential: string }) => void; auto_select: boolean }) => void; renderButton: (element: HTMLElement, config: { theme: string; size: string; width: number; text: string; shape: string }) => void } } } } }
export function Login({ register = false }: { register?: boolean }) {
  const container = useRef<HTMLDivElement>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [ready, setReady] = useState(false); const { reload, account, admin } = useSession();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const initialize = useCallback(() => {
    if (!clientId || !container.current || !window.google) return;
    window.google.accounts.id.initialize({ client_id: clientId, auto_select: false, callback: async ({ credential }) => {
      setBusy(true); setError("");
      try {
        const response = await fetch("/api/auth/google", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: credential }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Google sign-in failed.");
        await reload();
        const destination = new URLSearchParams(window.location.search).get("next");
        window.location.assign(destination && /^\/(admin|exercises|user)(\/|\?|$)/.test(destination) ? destination : "/user/home");
      } catch (e) { setError(e instanceof Error ? e.message : "Please try signing in again."); setBusy(false); }
    } });
    window.google.accounts.id.renderButton(container.current, { theme: "outline", size: "large", width: Math.min(380, container.current.clientWidth || 320), text: register ? "signup_with" : "continue_with", shape: "rectangular" });
    setReady(true);
  }, [clientId, register, reload]);
  useEffect(() => { initialize(); }, [initialize]);
  return <div className="auth-page"><header className="auth-header"><Brand /><Link href="/">Back to website <Icon name="arrow" size={16} /></Link></header><main id="main" className="auth-grid"><section className="auth-form"><div className="auth-content"><span className="icon-tile"><Icon name="dumbbell" size={26} /></span><p className="eyebrow">Your fitness, in sync</p><h1>{register ? "Start your journey." : "Welcome back."}</h1><p className="auth-description">{register ? "A stronger you starts here. Create your free FitSync account and take the first step." : "Your goals haven’t changed. Let’s get back to them."}</p>{account ? <Link href={admin ? "/admin/exercises" : "/user/home"} className="button">Continue as {account.user.name}<Icon name="arrow" size={16} /></Link> : <><div className={`google-button ${busy ? "busy" : ""}`} ref={container} aria-busy={busy} />{busy && <p role="status">Signing you in…</p>}{!clientId && <div className="notice">Google sign-in is not configured yet. Please contact the site administrator.</div>}{clientId && !ready && !error && <p role="status" className="muted">Loading Google sign-in…</p>}{error && <div role="alert" className="notice error">{error}<button type="button" className="text-link" onClick={() => window.location.reload()}>Try again</button></div>}</>}<div className="auth-divider"><span>One account, every device</span></div><div className="auth-benefits"><p><Icon name="check" size={17} /> Your web and mobile profile, together</p><p><Icon name="check" size={17} /> Access the full exercise library</p><p><Icon name="check" size={17} /> No extra password to remember</p></div><p className="auth-switch">{register ? "Already part of FitSync?" : "New to FitSync?"} <Link href={register ? "/login" : "/register"}>{register ? "Log in" : "Create an account"}</Link></p></div><p className="auth-bottom">Built for your next rep. And the one after that.</p></section><section className="auth-showcase"><Image src="/auth-image.png" alt="Athlete training in a gym" fill priority sizes="50vw" className="auth-image" /><div className="auth-overlay"><span className="eyebrow">Show up for yourself</span><h2>Small steps.<br />Stronger every day.</h2><p>One place for the work you put in.</p></div></section></main>{clientId && <Script src="https://accounts.google.com/gsi/client" onReady={initialize} onError={() => setError("Google sign-in could not load. Check your connection and try again.")} />}</div>;
}
