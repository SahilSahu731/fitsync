"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { FaUser } from "react-icons/fa";
import { useSession, AccessGate } from "./session";
import { Icon } from "./icon";

/* ---------- Shared bits ---------- */

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const mainLinks = [
  { href: "/features", label: "About" },
  { href: "/programs", label: "Training" },
  { href: "/exercises", label: "Exercises" },
];

const isActive = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

const initialOf = (name?: string) => (name?.trim().charAt(0) || "F").toUpperCase();

function Avatar({ name, className = "" }: { name?: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-background ${className}`}
    >
      {initialOf(name)}
    </span>
  );
}

export function Brand() {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-1.5 rounded-md whitespace-nowrap sm:gap-2.5 ${focusRing}`}
      aria-label="FitSync home"
    >
      <Image src="/brand/mark.svg" alt="" width={32} height={32} className="size-7 sm:size-8" />
      <span className="text-[26px] leading-none font-semibold tracking-[-1.4px] sm:text-[30px]">
        FitSync<span className="text-brand">.</span>
      </span>
    </Link>
  );
}

/* ---------- Public header: floating, sticky, borderless glass ---------- */

// Solid fallback first; frosted glass only where backdrop-filter is supported.
const glass =
  "bg-background/90 backdrop-blur-2xl backdrop-saturate-200 supports-[backdrop-filter]:bg-gradient-to-b";

export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { account, admin, logout } = useSession();
  const close = () => setOpen(false);
  const workspaceHref = admin ? "/admin" : "/user/home";

  // Condense the bar slightly and thicken the glass once the page scrolls.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    const frame = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="pointer-events-none sticky top-0 z-50 px-4 pt-2 sm:px-8 sm:pt-4">
      <div
        className={`pointer-events-auto relative mx-auto transition-[max-width] duration-500 ease-out motion-reduce:transition-none ${
          scrolled ? "max-w-5xl" : "max-w-7xl"
        }`}
      >
        <div
          className={`grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-full pr-3 pl-6 transition-[height,box-shadow,background-color] duration-500 ease-out motion-reduce:transition-none md:grid-cols-[1fr_auto_1fr] md:pr-3.5 md:pl-8 ${glass} ${
            scrolled
              ? "h-16 from-white/[0.14] to-white/[0.06] shadow-[0_18px_50px_-14px_rgba(0,0,0,0.7)]"
              : "h-[64px] from-white/[0.09] to-white/[0.03] shadow-[0_12px_40px_-18px_rgba(0,0,0,0.55)]"
          }`}
        >
          <div className="justify-self-start">
            <Brand />
          </div>

          <nav className="hidden items-center gap-1.5 md:flex" aria-label="Main navigation">
            {mainLinks.map(({ href, label }) => {
              const active = isActive(path, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-5 py-2.5 text-[16px] font-medium transition-colors ${focusRing} ${
                    active
                      ? "text-brand"
                      : "text-white hover:text-brand"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="col-start-3 flex items-center gap-2 justify-self-end">
            {account ? (
              <>
                <Link
                  href={workspaceHref}
                  className={`flex items-center gap-2.5 rounded-full p-1 text-sm font-medium transition-colors hover:bg-white/10 sm:pr-5 ${focusRing}`}
                >
                  <Avatar name={account.user.name} />
                  <span className="hidden sm:inline">My workspace</span>
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  aria-label="Sign out"
                  className={`hidden rounded-full p-3 transition-colors hover:bg-white/10 sm:block ${focusRing}`}
                >
                  <Icon name="logout" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`hidden rounded-xl px-5 py-2.5 text-lg font-medium transition-colors hover:bg-white/10 sm:block ${focusRing}`}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-brand px-5 font-semibold text-background transition-colors hover:bg-brand-hover sm:px-6 ${focusRing}`}
                >
                   <FaUser size={16} className="hidden sm:block" /> Get started
                </Link> 
              </>
            )}

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              aria-controls="mobile-nav"
              className={`flex size-11 items-center justify-center rounded-full transition-colors hover:bg-white/10 md:hidden ${focusRing}`}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu: a second floating glass panel under the bar */}
        <nav
          id="mobile-nav"
          aria-label="Mobile navigation"
          className={`absolute inset-x-0 top-full mt-3 flex flex-col gap-1 rounded-[28px] from-white/[0.14] to-white/[0.06] p-3 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.75)] transition-[opacity,transform,visibility] duration-300 motion-reduce:transition-none md:hidden ${glass} ${
            open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          }`}
        >
          {mainLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={close}
              aria-current={isActive(path, href) ? "page" : undefined}
              className={`rounded-2xl px-5 py-3.5 text-lg transition-colors hover:bg-white/10 ${focusRing} ${
                isActive(path, href) ? "bg-white/15 text-ink" : "text-muted"
              }`}
            >
              {label}
            </Link>
          ))}
          {account ? (
            <>
              <Link
                href={workspaceHref}
                onClick={close}
                className={`rounded-2xl px-5 py-3.5 text-lg text-muted transition-colors hover:bg-white/10 hover:text-ink ${focusRing}`}
              >
                My workspace
              </Link>
              <button
                type="button"
                onClick={() => {
                  close();
                  void logout();
                }}
                className={`rounded-2xl px-5 py-3.5 text-left text-lg text-muted transition-colors hover:bg-white/10 hover:text-ink ${focusRing}`}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={close}
              className={`rounded-2xl px-5 py-3.5 text-lg text-muted transition-colors hover:bg-white/10 hover:text-ink ${focusRing}`}
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

/* ---------- Footer: SpaceX-style (pure black, one quiet uppercase row) ---------- */

export function Footer() {
  const { account } = useSession();
  const links = [
    { href: "/features", label: "About" },
    { href: "/programs", label: "Training" },
    { href: "/exercises", label: "Exercises" },
    ...(account
      ? [
          { href: "/user/home", label: "Workspace" },
          { href: "/user/profile", label: "Profile" },
        ]
      : [
          { href: "/login", label: "Log in" },
          { href: "/register", label: "Get started" },
        ]),
  ];

  return (
    <footer className="bg-black text-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-10 md:flex-row md:items-center md:justify-between md:py-12 lg:px-10">
        <ul className="flex flex-wrap gap-x-8 gap-y-4">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`text-[11px] font-bold tracking-[0.14em] text-white/70 uppercase transition-colors hover:text-white ${focusRing}`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-[11px] font-bold tracking-[0.14em] text-white/70 uppercase">
          FitSync © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}

/* ---------- Signed-in workspace ---------- */

type NavItem = { href: string; label: string; icon: string; exact?: boolean };

const adminLinks: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "grid", exact: true },
  { href: "/admin/exercises", label: "Exercises", icon: "dumbbell" },
  { href: "/admin/exercises/new", label: "Add exercise", icon: "plus" },
  { href: "/admin/routines", label: "Routines", icon: "dumbbell" },
  { href: "/admin/programs", label: "Programs", icon: "grid" },
  { href: "/admin/categories", label: "Categories", icon: "settings" },
  { href: "/admin/mobility", label: "Mobility & recovery", icon: "dumbbell" },
  { href: "/admin/learn", label: "Learn", icon: "book" },
  { href: "/admin/tools", label: "Fitness tools", icon: "settings" },
];

const userLinks: NavItem[] = [
  { href: "/user/home", label: "Overview", icon: "grid", exact: true },
  { href: "/programs", label: "Training library", icon: "dumbbell" },
  { href: "/exercises", label: "Exercise library", icon: "dumbbell" },
  { href: "/user/profile", label: "Fitness profile", icon: "user" },
  { href: "/user/settings", label: "Settings", icon: "settings" },
];

export function Workspace({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const path = usePathname();
  const { account, logout } = useSession();
  const links = admin ? adminLinks : userLinks;

  // The most specific matching link wins, so "/admin/exercises/new" doesn't
  // also light up "/admin/exercises", and edit pages keep "Exercises" active.
  const activeHref = links
    .filter((l) => (l.exact ? path === l.href : isActive(path, l.href)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const workspaceLabel = admin ? "Admin workspace" : "Your workspace";
  const name = account?.user.name;

  return (
    <div className="min-h-screen bg-surface lg:flex">
      <aside className="z-40 flex flex-wrap items-center gap-x-5 gap-y-4 border-r border-line bg-background px-5 py-5 text-ink lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col lg:items-stretch lg:gap-0 lg:p-6">
        <Brand />
        <p className="ml-auto text-xs font-medium text-white/50 lg:mt-12 lg:mb-3 lg:ml-3">
          {workspaceLabel}
        </p>
        <nav
          aria-label="Workspace navigation"
          className="flex w-full gap-1 overflow-x-auto [scrollbar-width:none] lg:flex-col lg:overflow-visible"
        >
          {links.map(({ href, label, icon }) => {
            const active = href === activeHref;
            return (
              <Link
                href={href}
                key={href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${focusRing} ${
                  active
                    ? "bg-brand text-background"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon name={icon} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden flex-col gap-1 pt-10 lg:flex">
          <div className="mb-4 rounded-lg border border-white/15 bg-white/5 p-4">
            <Icon name={admin ? "shield" : "chart"} className="mb-3 text-brand" />
            <strong className="text-sm">
              {admin ? "One library. Every platform." : "Keep showing up."}
            </strong>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              {admin
                ? "Published exercises appear on web and mobile."
                : "Your profile stays in sync with the mobile app."}
            </p>
          </div>
          <Link
            href="/"
            className={`flex items-center gap-3 rounded-lg p-3 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white ${focusRing}`}
          >
            <Icon name="back" />
            Back to website
          </Link>
          {account && (
            <button
              type="button"
              onClick={() => void logout()}
              className={`flex items-center gap-3 rounded-lg p-3 text-left text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white ${focusRing}`}
            >
              <Icon name="logout" />
              Sign out
            </button>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line bg-background/90 px-5 backdrop-blur-xl text-sm text-muted sm:px-8">
          <Link href="/" className={`rounded-sm transition-colors hover:text-ink ${focusRing}`}>
            {admin ? "FitSync administration" : "My FitSync"}
          </Link>
          <span className="flex items-center gap-3">
            {name && <span className="hidden font-medium text-ink sm:inline">{name}</span>}
            <Avatar name={name} />
          </span>
        </header>
        <main className="mx-auto max-w-400 px-5 py-9 sm:px-8 lg:p-10" id="main">
          <AccessGate adminOnly={admin}>{children}</AccessGate>
        </main>
      </div>
    </div>
  );
}