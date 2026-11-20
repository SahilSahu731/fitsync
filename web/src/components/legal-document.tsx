import Link from "next/link";
import type { ReactNode } from "react";
import { PublicShell } from "@/components/shell";
import { legalOperator, legalUpdated, supportEmail } from "@/lib/legal";

export function LegalDocument({
  title,
  introduction,
  children,
}: {
  title: string;
  introduction: string;
  children: ReactNode;
}) {
  return (
    <PublicShell>
      <main id="main" className="mx-auto max-w-4xl px-6 pt-24 pb-24 sm:px-10 sm:pt-36">
        <p className="text-sm text-white/60">
          {legalOperator} · Last updated {legalUpdated}
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">{title}</h1>
        <p className="mt-7 text-lg leading-8 text-white/75">{introduction}</p>
        <nav
          aria-label="Legal pages"
          className="my-9 flex flex-wrap gap-x-6 gap-y-3 text-base underline underline-offset-4"
        >
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/delete-account">Delete your account</Link>
        </nav>
        <article className="space-y-10 text-base leading-8 text-white/75 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-medium [&_h2]:text-white [&_p+p]:mt-4 [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
          {children}
          <section>
            <h2>Contact</h2>
            <p>
              For questions, privacy requests or help with your account, contact {legalOperator} at{" "}
              <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
            </p>
          </section>
        </article>
      </main>
    </PublicShell>
  );
}
