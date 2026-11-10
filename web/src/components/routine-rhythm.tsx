"use client";

import { useState } from "react";
import { ArrowUpRight, CalendarDays, Check, Dumbbell, Moon } from "lucide-react";
import Link from "next/link";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const rhythms: Record<number, number[]> = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4] };

export function RoutineRhythm() {
  const [frequency, setFrequency] = useState(3);
  const [selectedDay, setSelectedDay] = useState(0);
  const trainingDays = rhythms[frequency];
  const isTraining = trainingDays.includes(selectedDay);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-panel p-5 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[11px] font-semibold tracking-[0.18em] text-muted">
          BUILD A LITTLE RHYTHM
        </span>
        <CalendarDays size={20} strokeWidth={1.5} className="text-brand" />
      </div>
      <div className="mt-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm text-muted">Make room for</p>
          <p className="mt-1 text-[36px] leading-none font-semibold tracking-[-1.5px]">
            {frequency} good sessions<span className="text-brand">.</span>
          </p>
        </div>
        <div
          className="flex gap-1 rounded-full border border-line p-1"
          aria-label="Example training days per week"
        >
          {[2, 3, 4].map((number) => (
            <button
              key={number}
              aria-pressed={frequency === number}
              onClick={() => {
                setFrequency(number);
                setSelectedDay(0);
              }}
              className={`flex size-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ${frequency === number ? "bg-brand text-background" : "text-muted hover:bg-panel-raised hover:text-ink"}`}
            >
              {number}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-9 grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="Explore the example week">
        {days.map((day, index) => {
          const planned = trainingDays.includes(index);
          return (
            <button
              key={day}
              aria-label={`${day}: ${planned ? "training" : "recovery"}`}
              aria-pressed={selectedDay === index}
              onClick={() => setSelectedDay(index)}
              className={`flex min-h-22 flex-col items-center justify-center gap-3 rounded-xl border text-xs transition-colors ${selectedDay === index ? "border-brand bg-brand/10 text-brand" : planned ? "border-line bg-panel-raised text-ink hover:border-brand/50" : "border-transparent bg-background/40 text-muted hover:border-line"}`}
            >
              <span className="text-[10px] sm:text-xs">{day.slice(0, 1)}</span>
              {planned ? (
                <Dumbbell size={18} strokeWidth={1.7} />
              ) : (
                <span className="h-0.5 w-3 rounded-full bg-current opacity-40" />
              )}
            </button>
          );
        })}
      </div>
      <div
        className="mt-6 flex min-h-26 items-center gap-4 rounded-xl border border-line bg-background/40 p-4"
        aria-live="polite"
      >
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-full ${isTraining ? "bg-brand text-background" : "bg-panel-raised text-muted"}`}
        >
          {isTraining ? <Dumbbell size={23} /> : <Moon size={23} strokeWidth={1.5} />}
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
            {days[selectedDay]}
          </p>
          <p className="mt-1 text-lg font-medium">
            {isTraining ? "Show up for your session." : "Room to rest. Room to grow."}
          </p>
          <p className="mt-1 text-xs text-muted">
            {isTraining
              ? "An example strength session · 35–45 min"
              : "A little recovery is part of the rhythm."}
          </p>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-2 text-xs text-muted">
        <Check size={14} className="text-brand" />
        Example schedule. Your real plan stays yours.
      </div>
      <Link
        href="/programs"
        className="group mt-7 flex items-center justify-between border-t border-line pt-5 text-sm font-semibold"
      >
        Find a program that fits
        <ArrowUpRight
          size={20}
          className="text-brand transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </Link>
    </div>
  );
}
