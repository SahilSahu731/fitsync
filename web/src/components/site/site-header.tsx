"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronRight, LogOut, Menu, X } from "lucide-react";
import { useSession } from "@/components/session";
import { AccountAvatar, Brand, focusRing } from "./brand";
import { mainLinks } from "./navigation";
import { FaUser } from "react-icons/fa";

export function SiteHeader() {
  const path = usePathname();
  const { account, admin, logout } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const workspaceHref = admin ? "/admin" : "/user/home";
  const close = () => setOpen(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled((current) => window.scrollY > (current ? 24 : 72));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    const onHistory = () => setOpen(false);
    window.addEventListener("popstate", onHistory);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("popstate", onHistory);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const onOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target))
        setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [open]);

  return (
    <header data-scrolled={scrolled} className="pointer-events-none sticky top-0 z-50 h-14 sm:h-16">
      <div
        className={`absolute inset-x-0 top-0 transition-[padding] duration-500 ease-out motion-reduce:transition-none ${scrolled ? "px-3 pt-3 sm:px-8 sm:pt-4" : "px-0 pt-0"}`}
      >
        <div
          ref={container}
          className={`pointer-events-auto relative mx-auto w-full transition-[max-width,border-radius,background-color,border-color,box-shadow] duration-500 ease-out motion-reduce:transition-none ${scrolled ? "max-w-6xl rounded-full bg-[#222544] shadow-[0_12px_45px_-14px_#000c] backdrop-blur-2xl supports-[backdrop-filter]:bg-[#232326]" : "max-w-full rounded-none border-transparent border-b-line/80"}`}
        >
          <div
            className={`mx-auto flex max-w-7xl items-center justify-between gap-2 transition-[height,padding] duration-500 ease-out motion-reduce:transition-none ${scrolled ? "h-16 px-3 sm:px-5 lg:px-7" : "h-16 px-4 sm:h-18 sm:px-8 lg:px-12"}`}
          >
            <div onClick={close}>
              <Brand />
            </div>
            <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
              {mainLinks.map(({ href, label }) => {
                const active = path === href || path.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`relative rounded-full px-4 py-2.5 text-sm font-medium transition-colors xl:px-5 ${focusRing} ${active ? "text-brand" : "text-ink/75 hover:text-brand"}`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              {account ? (
                <>
                  <Link
                    href={workspaceHref}
                    aria-label="Open your workspace"
                    className={`flex items-center gap-2 rounded-full p-1 text-sm font-medium transition-colors hover:bg-white/5 sm:pr-3 ${focusRing}`}
                  >
                    <AccountAvatar name={account.user.name} />
                    <span className="hidden sm:inline">My workspace</span>
                  </Link>
                  <button
                    type="button"
                    aria-label="Sign out"
                    onClick={() => void logout()}
                    className={`hidden size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-ink sm:flex ${focusRing}`}
                  >
                    <LogOut size={17} />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={`hidden min-h-10 items-center rounded-xl px-4 font-medium text-ink/75 transition-colors hover:bg-white/5 hover:text-brand sm:inline-flex`}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className={`group inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-3 font-semibold text-background transition-colors hover:bg-brand-hover py-1.5 ${focusRing}`}
                  >
                    <span className="sm:hidden">Start free</span>
                    <FaUser
                      size={16}
                      className="hidden sm:block"
                    />
                    <span className="hidden mt-0.5 sm:inline">Get started</span>
                  </Link>
                </>
              )}
              <button
                ref={toggle}
                type="button"
                aria-label={open ? "Close navigation" : "Open navigation"}
                aria-expanded={open}
                aria-controls="mobile-nav"
                onClick={() => setOpen((current) => !current)}
                className={`flex size-10 items-center justify-center rounded-full transition-colors hover:bg-white/5 lg:hidden ${focusRing}`}
              >
                {open ? <X size={21} /> : <Menu size={21} />}
              </button>
            </div>
          </div>
          <nav
            id="mobile-nav"
            aria-label="Mobile navigation"
            aria-hidden={!open}
            inert={!open}
            className={`absolute inset-x-0 top-full mx-2 mt-3 max-h-[calc(100dvh-120px)] overflow-y-auto rounded-3xl border border-white/10 bg-panel/95 p-4 shadow-[0_18px_50px_-15px_#000] backdrop-blur-xl transition-[opacity,transform,visibility] duration-200 motion-reduce:transition-none lg:hidden ${open ? "visible translate-y-0 opacity-100" : "invisible pointer-events-none -translate-y-2 opacity-0"}`}
          >
            <p className="px-3 pt-2 pb-4 text-[9px] font-medium tracking-[.16em] text-muted">
              YOUR NEXT GOOD MOVE.
            </p>
            {mainLinks.map(({ href, label, description }, index) => (
              <Link
                key={href}
                href={href}
                onClick={close}
                aria-current={path === href || path.startsWith(`${href}/`) ? "page" : undefined}
                className={`group flex items-center gap-4 rounded-2xl px-3 py-4 transition-colors hover:bg-white/5 ${focusRing}`}
              >
                <span className="self-start pt-1 font-mono text-[10px] text-brand/60">
                  0{index + 1}
                </span>
                <span className="flex-1">
                  <span className="block text-xl font-medium tracking-tight">{label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted">{description}</span>
                </span>
                <ChevronRight
                  size={18}
                  className="text-muted transition-transform group-hover:translate-x-1 group-hover:text-brand"
                />
              </Link>
            ))}
            <div className="mt-3 grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
              {account ? (
                <>
                  <Link
                    href={workspaceHref}
                    onClick={close}
                    className={`flex min-h-12 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-background ${focusRing}`}
                  >
                    Open your workspace
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      void logout();
                    }}
                    className={`min-h-12 rounded-full border border-line px-5 text-sm text-ink ${focusRing}`}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    onClick={close}
                    className={`flex min-h-12 items-center justify-center gap-3 rounded-full bg-brand px-5 text-sm font-semibold text-background ${focusRing}`}
                  >
                    Get started free
                    <ArrowUpRight size={17} />
                  </Link>
                  <Link
                    href="/login"
                    onClick={close}
                    className={`flex min-h-12 items-center justify-center rounded-full border border-line px-5 text-sm font-medium ${focusRing}`}
                  >
                    Log in to FitSync
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
