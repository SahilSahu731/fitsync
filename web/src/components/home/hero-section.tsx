import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Check } from "lucide-react";
import { Reveal, Tilt } from "@/components/motion";
import { homeImages, heroContent } from "./content";
import { GestureArrow, OrbitArtwork } from "./artwork";
import { WorkoutPreview } from "./workout-preview";

export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden border-b border-line"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <Image
          src={homeImages.studio}
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover object-right opacity-55"
        />
        <div className="absolute inset-0 bg-linear-to-r from-background via-background/75 to-background/20" />
        <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-background/75" />
      </div>
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.08fr_1fr] lg:gap-5 lg:px-12 lg:pt-14">
        <div className="relative z-10 lg:pb-12">
          <Reveal>
            <p className="mb-6 flex items-center gap-2.5 text-[10px] font-medium tracking-[.18em] text-ink/65 sm:text-xs">
              <span className="size-1.5 rounded-full bg-brand" />
              {heroContent.eyebrow}
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              id="hero-heading"
              className="text-[clamp(2.9rem,8vw,5rem)] leading-[.99] font-semibold tracking-[-.06em] lg:text-[clamp(4rem,6.8vw,6.25rem)]"
            >
              {heroContent.title}
              <br />
              {heroContent.secondLine}
              <br />
              <span className="text-brand">{heroContent.accent}</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-105 text-base leading-7 text-ink/65 sm:text-lg sm:leading-8">
              {heroContent.description}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={heroContent.primary.href}
                className="group inline-flex min-h-14 items-center justify-center gap-6 rounded-full bg-brand px-7 text-base font-semibold text-background transition-colors hover:bg-brand-hover"
              >
                {heroContent.primary.label}
                <ArrowUpRight
                  size={20}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
              <Link
                href={heroContent.secondary.href}
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 text-sm font-medium backdrop-blur-md transition-colors hover:border-white/40 hover:bg-white/10"
              >
                {heroContent.secondary.label}
              </Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-muted">
              <Check size={14} className="text-brand" />
              Free to start. Your own pace, always.
            </p>
          </Reveal>
        </div>
        <div className="relative mx-auto flex min-h-145 w-full max-w-135 flex-col justify-center pt-6 pb-10 sm:min-h-160 lg:min-h-175 lg:pt-0 lg:pb-8">
          <OrbitArtwork className="pointer-events-none absolute inset-0 h-full w-full text-brand/60" />
          <span className="absolute top-5 right-4 hidden items-center gap-2 text-[9px] tracking-[.16em] text-muted sm:flex lg:top-12">
            <span className="h-px w-6 bg-brand/50" />A LITTLE STRUCTURE. ALL YOU.
          </span>
          <Reveal delay={160} className="relative z-10 mx-auto w-full max-w-80">
            <Tilt>
              <WorkoutPreview />
            </Tilt>
          </Reveal>
          <div className="relative z-10 mt-7 text-center">
            <p className="text-[10px] font-medium tracking-[.1em] text-ink/65">
              TRY THE PREVIEW. TAP A SESSION OR SET.
            </p>
            <p className="mt-2 text-[10px] text-muted">
              Illustrative app preview. Changes are not saved.
            </p>
          </div>
          <GestureArrow className="pointer-events-none absolute bottom-24 left-0 hidden w-28 -rotate-20 text-brand/60 xl:block" />
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 border-t border-line/75 px-5 py-5 text-xs text-muted sm:px-8 lg:px-12">
        <span>WEB + MOBILE. ONE GOOD THING.</span>
        <a
          href="#how-it-works"
          className="group inline-flex min-h-8 items-center gap-3 rounded-sm text-ink/80 hover:text-brand"
        >
          A little look around
          <ArrowDown size={15} className="transition-transform group-hover:translate-y-1" />
        </a>
      </div>
    </section>
  );
}
