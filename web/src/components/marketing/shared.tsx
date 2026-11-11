import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export const container = "mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-14";
export const eyebrow = "text-xs font-medium tracking-[.12em] uppercase";
export const headline =
  "text-[clamp(2.5rem,5.4vw,5rem)] leading-[1.06] font-medium tracking-[-.06em] text-balance";
export const primaryButton =
  "group inline-flex min-h-12 items-center justify-center gap-5 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition duration-300 hover:bg-brand hover:-translate-y-0.5 motion-reduce:transform-none";

export function TextLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex min-h-11 items-center gap-3 text-sm font-medium ${className}`}
    >
      {children}
      <ArrowUpRight
        size={17}
        className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
      />
    </Link>
  );
}

export function SectionIntro({
  label,
  title,
  description,
  light = false,
}: {
  label: string;
  title: ReactNode;
  description?: string;
  light?: boolean;
}) {
  return (
    <div className="max-w-3xl">
      <p className={`${eyebrow} ${light ? "text-black/60" : "text-white/50"}`}>{label}</p>
      <h2 className={`mt-6 ${headline}`}>{title}</h2>
      {description && (
        <p
          className={`mt-6 max-w-xl text-base leading-8 sm:text-lg ${light ? "text-black/60" : "text-white/55"}`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
