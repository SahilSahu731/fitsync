"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, AccessGate } from "./session";
import { Icon } from "./icon";
import { AccountAvatar as Avatar, Brand, focusRing } from "./site/brand";
import { SiteHeader } from "./site/site-header";
import { SiteFooter } from "./site/site-footer";

// Keep the existing imports used throughout the app working.
export { Brand, SiteHeader as Header, SiteFooter as Footer };

const isActive = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
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
    <div className="min-h-screen bg-background lg:flex">
      <aside className="z-40 flex flex-wrap items-center gap-x-5 gap-y-4  bg-background px-5 py-5 text-ink lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col lg:items-stretch lg:gap-0 lg:p-6">
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
                    ? "bg-white/10 text-white"
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
          <div className="mb-4 rounded-2xl bg-white/5 p-4">
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
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4  bg-background/90 px-5 backdrop-blur-xl text-sm text-muted sm:px-8">
          <Link href="/" className={`rounded-sm transition-colors hover:text-ink ${focusRing}`}>
            {admin ? "FitSync administration" : "My FitSync"}
          </Link>
          <span className="flex items-center gap-3">
            {name && <span className="hidden font-medium text-ink sm:inline">{name}</span>}
            <Avatar name={name} />
          </span>
        </header>
        <main className="mx-auto max-w-400 px-5 py-9 sm:px-8 lg:px-12 lg:py-12" id="main">
          <AccessGate adminOnly={admin}>{children}</AccessGate>
        </main>
      </div>
    </div>
  );
}
