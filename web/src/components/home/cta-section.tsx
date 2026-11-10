import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion";
import { homeImages } from "./content";
import { TrackArtwork } from "./artwork";

export function CTASection() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 sm:pb-24 lg:px-12"
    >
      <Reveal>
        <div className="grid overflow-hidden rounded-3xl border border-brand/30 bg-brand text-background md:grid-cols-[1.1fr_1fr]">
          <div className="relative isolate overflow-hidden px-7 py-12 sm:px-10 sm:py-15 lg:px-12">
            <TrackArtwork className="pointer-events-none absolute inset-0 -z-10 h-full w-full text-background/12" />
            <p className="mb-6 text-[9px] font-semibold tracking-[.16em] sm:text-[10px]">
              EVERY DAY IS A STARTING POINT.
            </p>
            <h2
              id="cta-heading"
              className="text-[clamp(2.3rem,4.7vw,4rem)] leading-[1.02] font-semibold tracking-[-.055em]"
            >
              You bring you.
              <br />
              We’ll bring
              <br />
              FitSync.
            </h2>
            <p className="mt-5 max-w-75 text-base leading-7 text-background/65">
              A little more movement.
              <br />A lot more possibility.
            </p>
            <Link
              href="/register"
              className="group mt-8 inline-flex min-h-14 items-center justify-center gap-6 rounded-full bg-background px-6 text-sm font-semibold text-brand transition-colors hover:bg-background/85"
            >
              Let’s make a move
              <ArrowUpRight
                size={20}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>
          <div className="relative min-h-85 bg-background md:min-h-full">
            <Image
              src={homeImages.preparation}
              alt="An athlete taking a moment to prepare for her next session"
              fill
              sizes="(max-width: 767px) 100vw, 50vw"
              className="object-cover object-[50%_48%]"
            />
            <div className="absolute inset-0 bg-linear-to-t from-background/65 via-transparent to-transparent" />
            <span className="absolute right-6 bottom-6 left-6 flex items-center gap-2.5 text-[9px] font-medium tracking-[.16em] text-white/75">
              <span className="size-1 rounded-full bg-brand" />
              THE ART OF SHOWING UP.
            </span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
