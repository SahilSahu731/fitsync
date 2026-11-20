import Image from "next/image";
import Link from "next/link";

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand";

export function Brand() {
  return (
    <Link
      href="/"
      aria-label="FitSync home"
      className={`inline-flex items-center gap-1.5 rounded-sm whitespace-nowrap sm:gap-2.5 ${focusRing}`}
    >
      <Image src="/brand/mark.png" alt="" width={32} height={32} className="size-7 sm:size-8" />
      <span className="text-[26px] leading-none font-semibold tracking-[-1.4px] sm:text-[30px]">
        FitSync<span className="text-brand">.</span>
      </span>
    </Link>
  );
}

export function AccountAvatar({ name, avatarUrl, className = "" }: { name?: string; avatarUrl?: string | null; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white ${className}`}
    >
      { avatarUrl ? 
        <Image src={avatarUrl} alt="" width={32} height={32} className="size-9 rounded-full" />
      :
      (name?.trim().charAt(0) || "F").toUpperCase()}
    </span>
  );
}
