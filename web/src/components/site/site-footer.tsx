"use client";

import Link from "next/link";
import { ArrowRight, ArrowUp, ArrowUpRight, Globe2, Smartphone } from "lucide-react";
import { SiInstagram as Instagram, SiYoutube as Youtube } from "react-icons/si";
import { useSession } from "@/components/session";
import { Brand, focusRing } from "./brand";
import { footerGroups, publishedLinks } from "./navigation";

export function SiteFooter() {
  const { account, admin } = useSession();
  const accountLinks = account
    ? [
        { href: admin ? "/admin" : "/user/home", label: "Your workspace" },
        { href: "/user/profile", label: "Fitness profile" },
        { href: "/user/settings", label: "Account settings" },
      ]
    : [
        { href: "/register", label: "Create a free account" },
        { href: "/login", label: "Log in" },
        { href: "/user/profile", label: "Your fitness profile" },
      ];
  const groups = [...footerGroups, { title: "Your account", links: accountLinks }];
  const socialLinks = [
    { href: publishedLinks.instagram, label: "FitSync on Instagram", icon: Instagram },
    { href: publishedLinks.youtube, label: "FitSync on YouTube", icon: Youtube },
  ].filter((link) => link.href);

  return (
    <footer className="border-t border-line bg-[#080b08] text-ink">
      <div className="mx-auto max-w-7xl px-5 pt-14 sm:px-8 sm:pt-18 lg:px-12 lg:pt-20">
        <div className="grid gap-12 pb-13 lg:grid-cols-[1.45fr_2fr] lg:gap-20 lg:pb-16">
          <div>
            <Brand />
            <h2 className="mt-7 text-[28px] leading-[1.15] font-medium tracking-[-.04em] sm:text-[32px]">
              A little more movement.
              <br />
              <span className="text-muted">A lot more you.</span>
            </h2>
            <p className="mt-4 max-w-80 text-sm leading-7 text-muted">
              Learn the movements. Find your program. Keep the work you put in. Your training, in
              sync.
            </p>
            <Link
              href={account ? (admin ? "/admin" : "/user/home") : "/register"}
              className={`group mt-6 inline-flex min-h-12 items-center justify-center gap-6 rounded-full bg-brand px-5 text-sm font-semibold text-background transition-colors hover:bg-brand-hover ${focusRing}`}
            >
              {account ? "Back to your workspace" : "Find your starting point"}
              <ArrowUpRight
                size={18}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
            {socialLinks.length > 0 && (
              <div className="mt-6 flex items-center gap-2">
                {socialLinks.map(({ href, label, icon: SocialIcon }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex size-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-brand/40 hover:text-brand ${focusRing}`}
                  >
                    <SocialIcon size={17} strokeWidth={1.5} />
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 lg:pt-2">
            {groups.map(({ title, links }) => (
              <nav key={title} aria-label={title}>
                <h3 className="mb-5 text-[10px] font-semibold tracking-[.13em] text-ink/90">
                  {title.toUpperCase()}
                </h3>
                <ul className="space-y-2.5">
                  {links.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className={`inline-block min-h-8 rounded-sm py-1 text-sm leading-6 text-muted transition-colors hover:text-brand ${focusRing}`}
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="grid gap-5 border-y border-line py-6 sm:grid-cols-2 sm:gap-10 sm:py-7">
          <div className="flex items-start gap-3.5">
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-line">
              <Globe2 size={18} strokeWidth={1.4} className="text-brand" />
            </span>
            <div>
              <h3 className="text-sm font-medium tracking-normal">
                A bigger view of your training.
              </h3>
              <p className="mt-1 text-xs leading-6 text-muted">
                Explore exercises, programs, and your profile on the web.
              </p>
              <Link
                href="/features"
                className={`group mt-2 inline-flex min-h-8 items-center gap-2 rounded-sm text-xs font-medium text-ink/90 transition-colors hover:text-brand ${focusRing}`}
              >
                Discover FitSync
                <ArrowRight
                  size={13}
                  className="text-brand transition-transform group-hover:translate-x-1"
                />
              </Link>
            </div>
          </div>
          <div className="flex items-start gap-3.5">
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-line">
              <Smartphone size={18} strokeWidth={1.4} className="text-brand" />
            </span>
            <div>
              <h3 className="text-sm font-medium tracking-normal">
                Take your good thing with you.
              </h3>
              <p className="mt-1 text-xs leading-6 text-muted">
                Log your sessions and daily check-ins in the companion app.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
                {publishedLinks.googlePlay || publishedLinks.appStore ? (
                  <>
                    {publishedLinks.googlePlay && (
                      <a
                        href={publishedLinks.googlePlay}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex min-h-8 items-center gap-1.5 rounded-sm text-xs font-medium hover:text-brand ${focusRing}`}
                      >
                        Google Play
                        <ArrowUpRight size={13} className="text-brand" />
                      </a>
                    )}
                    {publishedLinks.appStore && (
                      <a
                        href={publishedLinks.appStore}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex min-h-8 items-center gap-1.5 rounded-sm text-xs font-medium hover:text-brand ${focusRing}`}
                      >
                        App Store
                        <ArrowUpRight size={13} className="text-brand" />
                      </a>
                    )}
                  </>
                ) : (
                  <Link
                    href="/#app-preview"
                    className={`group inline-flex min-h-8 items-center gap-2 rounded-sm text-xs font-medium text-ink/90 hover:text-brand ${focusRing}`}
                  >
                    Explore the app preview
                    <ArrowRight
                      size={13}
                      className="text-brand transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 py-6 text-xs text-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <p>© {new Date().getFullYear()} FitSync. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {publishedLinks.privacy && (
              <a
                href={publishedLinks.privacy}
                className={`rounded-sm transition-colors hover:text-ink ${focusRing}`}
              >
                Privacy policy
              </a>
            )}
            {publishedLinks.terms && (
              <a
                href={publishedLinks.terms}
                className={`rounded-sm transition-colors hover:text-ink ${focusRing}`}
              >
                Terms of use
              </a>
            )}
            <span className="flex items-center gap-2">
              <span className="size-1 rounded-full bg-brand" />
              Built for your next.
            </span>
            <a
              href="#main"
              className={`group inline-flex min-h-9 items-center gap-2 rounded-sm text-ink/80 transition-colors hover:text-brand ${focusRing}`}
            >
              Back to top
              <ArrowUp size={14} className="transition-transform group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
