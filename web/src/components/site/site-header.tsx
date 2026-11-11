"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, LogOut, Menu, X } from "lucide-react";
import { useSession } from "@/components/session";
import { AccountAvatar, Brand, focusRing } from "./brand";
import { mainLinks } from "./navigation";

export function SiteHeader() {
  const path = usePathname();
  const { account, admin, logout } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const open = menuPath === path;
  const wrapper = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const close = () => setMenuPath(null);
  const workspace = admin ? "/admin" : "/user/home";
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (!frame)
        frame = requestAnimationFrame(() => {
          setScrolled(window.scrollY > 40);
          frame = 0;
        });
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuPath(null);
        toggle.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapper.current?.contains(event.target))
        setMenuPath(null);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);
  return (
    <header className="pointer-events-none sticky top-0 z-50 h-20 bg-black text-white">
      <div
        className={`absolute inset-x-0 top-0 transition-[padding] duration-500 motion-reduce:transition-none ${scrolled ? "px-3 pt-3 sm:px-8" : ""}`}
      >
        <div
          ref={wrapper}
          className={`pointer-events-auto relative mx-auto transition-[background-color,border-radius,max-width] duration-500 motion-reduce:transition-none ${scrolled ? "max-w-6xl rounded-full bg-[#181818]/95 shadow-[0_8px_35px_#0006] backdrop-blur-2xl" : "max-w-7xl bg-black"}`}
        >
          <div
            className={`flex h-18 items-center justify-between gap-3 ${scrolled ? "px-5 sm:px-7" : "px-5 sm:px-10 lg:px-14"}`}
          >
            <div onClick={close}>
              <Brand />
            </div>
            <nav aria-label="Main navigation" className="hidden items-center gap-8 lg:flex">
              {mainLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={path === href || path.startsWith(`${href}/`) ? "page" : undefined}
                  className={`rounded-sm py-3 text-xs font-medium transition-colors ${focusRing} ${path.startsWith(href) ? "text-white" : "text-white/50 hover:text-white"}`}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2 sm:gap-5">
              {account ? (
                <>
                  <Link
                    href={workspace}
                    className="flex items-center gap-2 rounded-full text-xs font-medium"
                  >
                    <AccountAvatar name={account.user.name} />
                    <span className="hidden sm:block">My workspace</span>
                  </Link>
                  <button
                    onClick={() => void logout()}
                    aria-label="Sign out"
                    className="hidden size-10 items-center justify-center rounded-full text-white/50 hover:bg-white/5 hover:text-white sm:flex"
                  >
                    <LogOut size={16} />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden min-h-11 items-center text-xs text-white/60 transition-colors hover:text-white sm:flex"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="group inline-flex min-h-10 items-center gap-3 rounded-full bg-white px-4 text-xs font-semibold text-black transition-colors hover:bg-brand sm:px-5"
                  >
                    Start free
                    <ArrowUpRight size={15} className="hidden sm:block" />
                  </Link>
                </>
              )}
              <button
                ref={toggle}
                aria-label={open ? "Close navigation" : "Open navigation"}
                aria-expanded={open}
                aria-controls="mobile-nav"
                onClick={() => setMenuPath(open ? null : path)}
                className="flex size-11 items-center justify-center rounded-full hover:bg-white/8 lg:hidden"
              >
                {open ? <X size={21} /> : <Menu size={21} />}
              </button>
            </div>
          </div>
          <nav
            id="mobile-nav"
            aria-label="Mobile navigation"
            inert={!open}
            aria-hidden={!open}
            className={`absolute inset-x-0 top-full mx-1 mt-3 max-h-[calc(100dvh-130px)] overflow-y-auto rounded-3xl bg-[#181818] p-6 shadow-2xl transition-[opacity,transform,visibility] duration-300 lg:hidden ${open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"}`}
          >
            {mainLinks.map(({ href, label, description }) => (
              <Link
                key={href}
                href={href}
                onClick={close}
                aria-current={path.startsWith(href) ? "page" : undefined}
                className="group flex items-center justify-between gap-5 rounded-xl p-4 hover:bg-white/5"
              >
                <span>
                  <span className="block text-xl font-medium tracking-tight">{label}</span>
                  <span className="mt-2 block text-xs leading-6 text-white/55">{description}</span>
                </span>
                <ArrowUpRight size={18} className="text-white/50" />
              </Link>
            ))}
            <div className="mt-5 flex gap-3 px-4 pb-2">
              <Link
                href={account ? workspace : "/register"}
                onClick={close}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-white px-5 text-xs font-semibold text-black"
              >
                {account ? "Open workspace" : "Get started free"}
              </Link>
              {!account && (
                <Link
                  href="/login"
                  onClick={close}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-white/8 px-6 text-xs"
                >
                  Log in
                </Link>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
