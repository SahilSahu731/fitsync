import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Move } from "lucide-react";
import { DumbbellScene } from "@/components/dumbbell-scene";
import { Reveal } from "@/components/motion";
import { homeImages } from "./content";

export function EquipmentSection() {
  return (
    <section aria-labelledby="equipment-heading" className="border-y border-line bg-surface">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-2 lg:gap-16 lg:px-12">
        <Reveal className="relative isolate overflow-hidden rounded-3xl">
          <Image
            src={homeImages.athlete}
            width={1120}
            height={1400}
            alt=""
            className="pointer-events-none absolute -right-25 -bottom-35 -z-10 h-150 w-120 object-contain opacity-12 mix-blend-lighten"
            aria-hidden="true"
          />
          <div className="py-4 lg:py-12">
            <p className="mb-5 text-[10px] font-semibold tracking-[.16em] text-brand">
              04 / THE EQUIPMENT STUDIO
            </p>
            <h2
              id="equipment-heading"
              className="max-w-110 text-[clamp(2.35rem,4.7vw,4rem)] leading-[1.05] tracking-[-.05em]"
            >
              A little curiosity.
              <br />
              <span className="text-muted">A new perspective.</span>
            </h2>
            <p className="mt-6 max-w-95 text-base leading-8 text-muted">
              A small interactive study of the tools you train with. Rotate the dumbbell, switch the
              weight, and take a closer look.
            </p>
            <p className="mt-6 flex items-center gap-2.5 text-xs text-ink/70">
              <Move size={16} className="text-brand" />
              Drag to explore. Or use the arrow keys.
            </p>
            <Link
              href="/exercises"
              className="group mt-8 inline-flex min-h-12 items-center gap-4 border-b border-ink/30 text-sm font-medium transition-colors hover:border-brand hover:text-brand"
            >
              Find your next movement
              <ArrowUpRight
                size={18}
                className="text-brand transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>
        </Reveal>
        <Reveal delay={80} className="overflow-hidden rounded-3xl">
          <DumbbellScene />
        </Reveal>
      </div>
    </section>
  );
}
