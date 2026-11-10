"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { TrainingSketch } from "@/components/training-sketch";
import { movementStudies } from "./content";

export function MovementStudy() {
  const [selected, setSelected] = useState(0);
  const id = useId();
  const study = movementStudies[selected];
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-6 sm:px-8 sm:pt-8">
        <p className="flex items-center gap-2 text-[9px] font-medium tracking-[.14em] text-muted">
          <span className="size-1 rounded-full bg-brand" />
          THE MOVEMENT LIBRARY
        </p>
        <span className="font-mono text-[9px] text-muted">STUDY 0{selected + 1}</span>
      </div>
      <div
        className="mx-6 mt-6 flex flex-wrap gap-1.5 sm:mx-8"
        role="group"
        aria-label="Choose a movement illustration"
      >
        {movementStudies.map((item, index) => (
          <button
            key={item.kind}
            type="button"
            aria-pressed={index === selected}
            aria-controls={`${id}-study`}
            onClick={() => setSelected(index)}
            className={`min-h-10 rounded-full border px-4 py-2 text-xs font-medium transition-colors ${selected === index ? "border-brand bg-brand text-background" : "border-line text-muted hover:border-ink/30 hover:text-ink"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div id={`${id}-study`} className="flex flex-1 flex-col" aria-live="polite">
        <div className="relative flex flex-1 items-center px-3 pt-3 sm:px-5">
          <TrainingSketch kind={study.kind} className="mx-auto w-full max-w-140" />
        </div>
        <div className="border-t border-line px-6 py-6 sm:px-8 sm:py-7">
          <p className="mb-3 flex items-center gap-2 text-[10px] text-muted">
            <Check size={12} className="text-brand" />
            {study.equipment}
          </p>
          <h3 className="text-2xl leading-[1.15] font-medium tracking-[-.04em] sm:text-3xl">
            {study.title}
          </h3>
          <p className="mt-3 max-w-115 text-sm leading-7 text-muted">{study.detail}</p>
          <Link
            href={study.href}
            className="group mt-5 inline-flex min-h-10 items-center gap-3 rounded-sm text-sm font-medium hover:text-brand"
          >
            {study.action}
            <ArrowUpRight
              size={17}
              className="text-brand transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
