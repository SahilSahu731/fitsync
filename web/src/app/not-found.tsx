import Link from "next/link";
import { PublicShell } from "@/components/shell";
export default function NotFound() {
  return (
    <PublicShell>
      <main
        id="main"
        className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-5 py-20 text-center [&>p]:max-w-lg [&>p]:leading-7 [&>p]:text-muted [&>h2]:text-3xl"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">404</p>
        <h1>A little off track.</h1>
        <p>This page doesn’t exist. Let’s get you back to your next movement.</p>
        <Link
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-brand px-5 py-3 text-base font-semibold text-background transition-colors hover:bg-brand-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          href="/"
        >
          Back to FitSync
        </Link>
      </main>
    </PublicShell>
  );
}
