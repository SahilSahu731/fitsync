"use client";

import Link from "next/link";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { useSession } from "@/components/session";
import { Brand } from "./brand";
import { footerGroups, publishedLinks } from "./navigation";
import { container } from "@/components/marketing/shared";

export function SiteFooter() {
  const { account, admin } = useSession();
  const groups = [
    ...footerGroups,
    {
      title: "Your FitSync",
      links: account
        ? [
            { href: admin ? "/admin" : "/user/home", label: "Your workspace" },
            { href: "/user/profile", label: "Fitness profile" },
            { href: "/user/settings", label: "Account settings" },
          ]
        : [
            { href: "/register", label: "Create an account" },
            { href: "/login", label: "Log in" },
            { href: "/features#plans", label: "Free & Pro" },
          ],
    },
  ];
  const external = [
    { href: publishedLinks.privacy, label: "Privacy" },
    { href: publishedLinks.terms, label: "Terms" },
    { href: publishedLinks.instagram, label: "Instagram" },
    { href: publishedLinks.youtube, label: "YouTube" },
  ].filter((link) => link.href);
  return (
    <footer className="overflow-hidden bg-black text-white">
      <div className={`${container} pt-20 pb-8 sm:pt-24`}>
        <div className="grid gap-14 lg:grid-cols-[1.3fr_2fr] lg:gap-24">
          <div>
            <Brand />
            <p className="mt-6 max-w-64 text-sm leading-7 text-white/55">
              Your training. Your habits.
              <br />
              Your everyday progress. In sync.
            </p>
            <Link
              href="/register"
              className="group mt-5 inline-flex min-h-11 items-center gap-3 text-sm text-white/75 transition-colors hover:text-white"
            >
              Make your first move
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3">
            {groups.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h3 className="text-xs font-medium tracking-normal text-white/80">{group.title}</h3>
                <ul className="mt-5 space-y-2">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-block min-h-9 py-1.5 text-xs leading-6 text-white/50 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="mt-18 flex flex-wrap items-center justify-between gap-x-8 gap-y-5 text-[11px] text-white/50">
          <p>© {new Date().getFullYear()} FitSync</p>
          <div className="flex flex-wrap items-center gap-6">
            {external.map((link) => (
              <a key={link.label} href={link.href} className="py-2 hover:text-white">
                {link.label}
              </a>
            ))}
            <a
              href="#main"
              className="inline-flex min-h-10 items-center gap-2 transition-colors hover:text-white"
            >
              Back to top
              <ArrowUp size={13} />
            </a>
          </div>
        </div>
        <p
          aria-hidden="true"
          className="mt-10 -mb-[.18em] text-[clamp(5rem,20.5vw,19rem)] leading-[1.15] font-semibold tracking-[-.08em] text-white/6 select-none"
        >
          FitSync.
        </p>
      </div>
    </footer>
  );
}
