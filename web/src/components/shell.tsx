"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Globe2, Menu, X } from "lucide-react";
import { useSession, AccessGate } from "./session";
import { Icon } from "./icon";

export function Brand() {
  return <Link href="/" className="inline-flex items-center gap-1.5 whitespace-nowrap sm:gap-2.5" aria-label="FitSync home">
    <Image src="/brand/mark.svg" alt="" width={32} height={32} className="size-7 sm:size-8" />
    <span className="text-[26px] leading-none font-semibold tracking-[-1.4px] sm:text-[29px]">FitSync<span className="text-brand">.</span></span>
  </Link>;
}

export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { account, admin, logout } = useSession();
  const links = [["/programs", "Training"], ["/exercises", "Exercises"], ["/features", "Why FitSync"]];
  return <header className="sticky top-0 z-50 bg-ink text-white">
    <div className="mx-auto flex h-20 max-w-7xl items-center gap-2 px-5 sm:gap-4 sm:px-8 lg:gap-12 lg:px-12">
      <Brand />
      <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
        {links.map(([href, label]) => <Link key={href} href={href} aria-current={path.startsWith(href) ? "page" : undefined} className={`text-[15px] font-medium transition-colors hover:text-brand ${path.startsWith(href) ? "text-brand" : "text-white/80"}`}>{label}</Link>)}
      </nav>
      <div className="ml-auto flex items-center gap-3 sm:gap-7">
        {account ? <><Link href={admin ? "/admin" : "/user/home"} className="flex items-center gap-2 text-sm font-medium"><span className="flex size-8 items-center justify-center rounded-full bg-brand font-semibold text-ink">{account.user.name.slice(0, 1)}</span><span className="hidden sm:inline">My workspace</span></Link><button onClick={() => void logout()} aria-label="Sign out" className="hidden rounded-full p-2 hover:bg-white/10 sm:block"><Icon name="logout" /></button></> : <><Link href="/login" className="hidden text-sm font-medium transition-colors hover:text-brand sm:block sm:text-base">Log in</Link><Link href="/register" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-brand sm:min-h-11 sm:px-5">Get started <ArrowUpRight size={17} className="hidden sm:block" /></Link></>}
        <button onClick={() => setOpen(!open)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-nav" className="flex size-10 items-center justify-center rounded-md hover:bg-white/10 md:hidden">{open ? <X size={23} /> : <Menu size={23} />}</button>
      </div>
    </div>
    {open && <nav id="mobile-nav" aria-label="Mobile navigation" className="flex flex-col gap-1 border-t border-white/15 px-5 py-4 md:hidden">{[...links, ...(!account ? [["/login", "Log in"]] : [])].map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-lg hover:bg-white/10 hover:text-brand">{label}</Link>)}</nav>}
  </header>;
}

export function Footer() {
  return <footer className="bg-ink text-white">
    <div className="mx-auto max-w-7xl px-5 pt-16 sm:px-8 lg:px-12 lg:pt-20">
      <div className="grid gap-12 pb-16 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <div><Brand /><p className="mt-6 max-w-64 text-base leading-relaxed text-white/55">A little more movement.<br />A lot more you.</p><span className="mt-7 inline-flex items-center gap-2 text-sm text-white/55"><Globe2 size={16} /> Built for wherever you train.</span></div>
        <div><h2 className="mb-5 text-base font-medium text-white/45">Explore</h2><div className="flex flex-col items-start gap-3.5">{[["/programs", "Training programs"], ["/exercises", "Exercise library"], ["/features", "Why FitSync"]].map(([href, label]) => <Link key={href} href={href} className="text-base transition-colors hover:text-brand">{label}</Link>)}</div></div>
        <div><h2 className="mb-5 text-base font-medium text-white/45">Make it yours</h2><div className="flex flex-col items-start gap-3.5">{[["/register", "Get started"], ["/user/home", "Your workspace"], ["/user/profile", "Fitness profile"]].map(([href, label]) => <Link key={href} href={href} className="text-base transition-colors hover:text-brand">{label}</Link>)}</div></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/15 py-7 text-sm text-white/45"><span>© {new Date().getFullYear()} FitSync</span><span>Made for the way you move.</span><a href="#main" className="inline-flex items-center gap-2 text-white/75 hover:text-brand">Back to top <ArrowUpRight size={16} /></a></div>
    </div>
  </footer>;
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return <><Header />{children}<Footer /></>;
}

export function Workspace({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const path = usePathname();
  const { account, logout } = useSession();
  const links = admin ? [["/admin", "Overview", "grid"], ["/admin/exercises", "Exercises", "dumbbell"], ["/admin/exercises/new", "Add exercise", "plus"], ["/admin/routines", "Routines", "dumbbell"], ["/admin/programs", "Programs", "grid"], ["/admin/categories", "Categories", "settings"], ["/admin/mobility", "Mobility & recovery", "dumbbell"], ["/admin/learn", "Learn", "book"], ["/admin/tools", "Fitness tools", "settings"]] : [["/user/home", "Overview", "grid"], ["/programs", "Training library", "dumbbell"], ["/exercises", "Exercise library", "dumbbell"], ["/user/profile", "Fitness profile", "user"], ["/user/settings", "Settings", "settings"]];
  return <div className="min-h-screen bg-surface lg:flex">
    <aside className="z-40 flex flex-wrap items-center gap-5 bg-ink px-5 py-6 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col lg:items-stretch lg:gap-0 lg:p-6">
      <Brand /><p className="ml-auto text-[10px] font-semibold tracking-[0.14em] text-white/40 lg:mt-12 lg:mb-4 lg:ml-3">{admin ? "ADMIN WORKSPACE" : "YOUR WORKSPACE"}</p>
      <nav aria-label="Workspace navigation" className="flex w-full gap-1 overflow-x-auto lg:flex-col">{links.map(([href, label, icon]) => <Link href={href} key={href} aria-current={path === href ? "page" : undefined} className={`flex shrink-0 items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors ${path === href || (href === "/admin/exercises" && path.includes("/edit")) ? "bg-brand text-ink" : "text-white/65 hover:bg-white/10 hover:text-white"}`}><Icon name={icon} />{label}</Link>)}</nav>
      <div className="mt-auto hidden flex-col gap-2 pt-10 lg:flex"><div className="mb-4 border border-white/20 p-4"><Icon name={admin ? "shield" : "chart"} className="mb-3 text-brand" /><strong className="text-sm">{admin ? "One library. Every platform." : "Keep showing up."}</strong><p className="mt-2 text-sm leading-relaxed text-white/45">{admin ? "Published exercises appear on web and mobile." : "Your profile stays in sync with the mobile app."}</p></div><Link href="/" className="flex items-center gap-3 p-3 text-sm text-white/65 hover:text-brand"><Icon name="back" />Back to website</Link>{account && <button onClick={() => void logout()} className="flex items-center gap-3 p-3 text-sm text-white/65 hover:text-brand"><Icon name="logout" />Sign out</button>}</div>
    </aside>
    <div className="min-w-0 flex-1 lg:ml-64"><header className="flex h-16 items-center justify-between gap-4 border-b border-line bg-white px-5 text-sm text-muted sm:px-8"><Link href="/" className="hover:text-ink">{admin ? "FitSync administration" : "My FitSync"}</Link><span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-ink" />{admin ? "Admin workspace" : "Personal workspace"}<span className="ml-2 flex size-8 items-center justify-center rounded-full bg-brand font-semibold text-ink">{account?.user.name.slice(0, 1) || "F"}</span></span></header><main className="mx-auto max-w-400 px-5 py-9 sm:px-8 lg:p-10" id="main"><AccessGate adminOnly={admin}>{children}</AccessGate></main></div>
  </div>;
}
