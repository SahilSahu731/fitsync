"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { movementLabels } from "./content";

export function MovementTicker() {
  const [paused, setPaused] = useState(false);
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl items-center gap-5 px-5 py-6 sm:gap-8 sm:px-8 lg:px-12">
        <span className="hidden max-w-28 text-[9px] leading-5 font-medium tracking-[.15em] text-muted sm:block">
          THERE’S MORE THAN ONE WAY.
        </span>
        <div
          className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_5%,black_95%,transparent)]"
          aria-hidden="true"
        >
          <div
            className={`flex w-max animate-home-marquee items-center gap-9 pr-9 text-2xl font-medium tracking-[-.04em] text-ink/55 motion-reduce:animate-none sm:gap-12 sm:pr-12 sm:text-3xl ${paused ? "[animation-play-state:paused]" : ""}`}
          >
            {[...movementLabels, ...movementLabels].map((label, index) => (
              <span key={`${label}-${index}`} className="flex items-center gap-9 sm:gap-12">
                {label}
                <span className="size-1.5 rounded-full bg-brand/65" />
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          aria-label={paused ? "Resume moving labels" : "Pause moving labels"}
          aria-pressed={paused}
          onClick={() => setPaused((current) => !current)}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-brand/50 hover:text-brand motion-reduce:hidden"
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
        </button>
      </div>
    </div>
  );
}
