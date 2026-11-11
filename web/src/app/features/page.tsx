import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { PublicShell } from "@/components/shell";
import { Reveal } from "@/components/motion";
import { ProductDemo } from "@/components/marketing/product-demo";
import {
  ClosingSection,
  FeatureDirectory,
  HealthSection,
  PlansSection,
} from "@/components/marketing/sections";
import { container, primaryButton } from "@/components/marketing/shared";
import { FAQSection } from "@/components/home/faq-section";

export const metadata: Metadata = {
  title: "Everything FitSync",
  description:
    "Discover workout logging, personal starter plans, program schedules, daily health tracking, recovery and optional Pro adaptations in FitSync.",
};

export default function FeaturesPage() {
  return (
    <PublicShell>
      <main id="main" className="overflow-x-clip">
        <section className={`${container} pt-24 pb-6 sm:pt-36`}>
          <Reveal>
            <p className="text-xs tracking-[.12em] text-white/55 uppercase">
              A closer look at FitSync
            </p>
            <h1 className="mt-7 max-w-5xl text-[clamp(2.75rem,8vw,7rem)] leading-[1.03] font-medium tracking-[-.065em]">
              For everything
              <br />
              that moves <span className="text-white/50">you.</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-white/55 sm:text-lg">
              The work you do in the gym. The choices you make outside it. One place to give it all
              a little more direction.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-6">
              <Link href="/register" className={primaryButton}>
                Get started free
                <ArrowUpRight size={17} />
              </Link>
              <a
                href="#library"
                className="inline-flex min-h-12 items-center gap-3 text-sm text-white/65"
              >
                Explore the features
                <ArrowDown size={16} />
              </a>
            </div>
          </Reveal>
        </section>
        <ProductDemo compact />
        <FeatureDirectory />
        <HealthSection detailed />
        <PlansSection />
        <FAQSection />
        <ClosingSection />
      </main>
    </PublicShell>
  );
}
