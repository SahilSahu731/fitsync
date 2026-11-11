"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowUpRight, Dumbbell, Pause, Play } from "lucide-react";
import { Tilt } from "@/components/motion";
import { homeImages } from "./content";

export function HeroVisual() {
  const [paused, setPaused] = useState(false);
  return (
    <div data-paused={paused} className="group/hero-art relative isolate mx-auto w-full max-w-155">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-20 bottom-10 rounded-[50%] bg-radial from-brand/9 via-brand/3 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-8 overflow-hidden [mask-image:linear-gradient(transparent,black_20%,black_85%,transparent)]"
      >
        <div className="absolute top-10 left-[15%] h-[80%] w-[65%] -rotate-35 rounded-[50%] border border-brand/25" />
        <div className="absolute top-2 left-[10%] h-[90%] w-[75%] -rotate-35 rounded-[50%] border border-ink/8" />
        <div className="absolute -top-5 left-[5%] h-full w-[85%] -rotate-35 rounded-[50%] border border-dashed border-ink/7" />
      </div>
      <div className="absolute top-4 right-2 left-2 z-10 flex items-center justify-between gap-5 text-[9px] tracking-[.16em] text-muted sm:top-6 sm:right-6 sm:left-6">
        <span className="flex items-center gap-2">
          <span className="size-1 rounded-full bg-brand" />A STUDY IN SHOWING UP
        </span>
        <span className="font-mono text-ink/35">FS / 001</span>
      </div>
      <Tilt className="relative pt-3">
        <div className="motion-safe:animate-hero-float group-data-[paused=true]/hero-art:[animation-play-state:paused]">
          <Image
            src={homeImages.athlete}
            alt="Chalk and lime illustration of an athlete driving forward into a sprint"
            width={1120}
            height={1400}
            preload
            sizes="(max-width: 1023px) 90vw, 52vw"
            className="mx-auto h-125 w-full object-contain mix-blend-lighten [mask-image:linear-gradient(transparent,black_9%,black_89%,transparent)] sm:h-150 lg:h-165 xl:h-175"
          />
        </div>
      </Tilt>
      <div className="absolute bottom-18 left-0 z-10 flex items-center gap-3 rounded-2xl border border-white/15 bg-background/75 p-3.5 shadow-xl backdrop-blur-xl sm:bottom-24 sm:left-2 xl:-left-4">
        <span className="flex size-10 items-center justify-center rounded-full bg-brand text-background">
          <Dumbbell size={19} strokeWidth={1.6} />
        </span>
        <div>
          <p className="text-[13px] font-medium tracking-tight">A plan that moves with you.</p>
          <p className="mt-1 text-[9px] tracking-[.07em] text-muted">GYM. HOME. YOUR OWN PACE.</p>
        </div>
        <ArrowUpRight size={17} className="ml-2 hidden text-brand sm:block" aria-hidden="true" />
      </div>
      <div className="relative z-10 -mt-5 flex items-center justify-between gap-4 border-t border-line/70 px-1 pt-4 sm:mx-6">
        <span className="text-[9px] tracking-[.15em] text-muted">
          BUILT FOR THE EVERYDAY ATHLETE.
        </span>
        <button
          type="button"
          aria-label={paused ? "Resume athlete motion" : "Pause athlete motion"}
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
          className="flex min-h-10 items-center gap-2 rounded-full border border-line px-3 text-[10px] text-muted transition-colors hover:border-brand/40 hover:text-brand motion-reduce:hidden"
        >
          {paused ? <Play size={11} /> : <Pause size={11} />}
          {paused ? "Play" : "Pause"}
        </button>
      </div>
    </div>
  );
}
