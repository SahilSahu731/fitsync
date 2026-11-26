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

const accountLinks: NavItem[] = [
  { href: "/user/home", label: "Account home", icon: "grid", exact: true },
  { href: "/user/profile", label: "Fitness profile", icon: "user" },
  { href: "/user/settings", label: "Account settings", icon: "settings" },
];

const trainingLinks: NavItem[] = [
  { href: "/user/planner", label: "Training planner", icon: "dumbbell" },
  { href: "/programs", label: "Training library", icon: "dumbbell" },
  { href: "/exercises", label: "Exercise library", icon: "dumbbell" },
];

function MemberWorkspaceNotice() {
  return (
    <section className="max-w-3xl rounded-3xl bg-panel p-7 sm:p-10">
      <p className="text-xs tracking-[.12em] text-white/55 uppercase">Your FitSync account</p>
      <h1 className="mt-5 text-[clamp(2.4rem,5vw,4rem)] leading-tight font-medium tracking-[-.06em]">
        The web workspace is in development.
      </h1>
      <p className="mt-5 max-w-xl leading-7 text-white/65">
        We’ll post an update here when the workspace is ready. In the meantime, you can manage your
        fitness profile and account settings.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/user/settings"
          className={`inline-flex min-h-12 items-center rounded-full bg-white px-6 text-sm font-medium text-black hover:bg-white/85 ${focusRing}`}
        >
          Account settings
        </Link>
        <Link
          href="/user/profile"
          className={`inline-flex min-h-12 items-center rounded-full bg-white/8 px-6 text-sm font-medium hover:bg-white/15 ${focusRing}`}
        >
          Fitness profile
        </Link>
      </div>
    </section>
  );
}

export function Workspace({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const path = usePathname();
  const { account, admin: isAdmin, loading, error, logout } = useSession();
  if (loading || error || !account || (admin && !isAdmin)) {
    return (
      <PublicShell>
        <main id="main">
          <AccessGate adminOnly={admin}>{null}</AccessGate>
        </main>
      </PublicShell>
    );
  }
  const links = admin ? adminLinks : isAdmin ? [...accountLinks, ...trainingLinks] : accountLinks;
  const showDevelopmentNotice =
    !admin && !isAdmin && path !== "/user/profile" && path !== "/user/settings";

  // The most specific matching link wins, so "/admin/exercises/new" doesn't
  // also light up "/admin/exercises", and edit pages keep "Exercises" active.
  const activeHref = links
    .filter((l) => (l.exact ? path === l.href : isActive(path, l.href)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const workspaceLabel = admin ? "Admin workspace" : "Your account";
  const name = account?.user.name;

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="z-40 flex flex-wrap items-center gap-x-5 gap-y-4 bg-background px-5 py-5 text-ink lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-0 lg:overflow-y-auto lg:p-6">
        <Brand />
        <p className="ml-auto text-xs font-medium text-white/50 lg:mt-12 lg:mb-3 lg:ml-3">
          {workspaceLabel}
        </p>
        <nav
          aria-label={admin ? "Admin navigation" : "Account navigation"}
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
            {account && (
              <button
                type="button"
                onClick={() => void logout()}
                className={`min-h-11 rounded-lg px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white lg:hidden ${focusRing}`}
              >
                Sign out
              </button>
            )}
            {name && <span className="hidden font-medium text-ink sm:inline">{name}</span>}
            <Avatar name={name} />
          </span>
        </header>
        <main className="mx-auto max-w-400 px-5 py-9 sm:px-8 lg:px-12 lg:py-12" id="main">
          {showDevelopmentNotice ? <MemberWorkspaceNotice /> : children}
        </main>
      </div>
    </div>
  );
}
