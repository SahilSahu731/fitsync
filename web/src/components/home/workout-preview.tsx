"use client";

import { useState } from "react";
import { Activity, Check, ChevronRight, Dumbbell, Plus } from "lucide-react";
import { workoutExamples } from "./content";

const initialDone = ["0-0", "0-1", "0-2", "1-0"];

/** Interactive example only. It does not read or write account/workout data. */
export function WorkoutPreview() {
  const [selected, setSelected] = useState(0);
  const [done, setDone] = useState(initialDone);
  const session = workoutExamples[selected];

  function toggleSet(key: string) {
    setDone((current) =>
      current.includes(key) ? current.filter((value) => value !== key) : [...current, key],
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-80 text-ink">
      <div className="rounded-[46px] border border-white/25 bg-linear-to-br from-[#40453c] via-[#181c16] to-[#353c2d] p-1 shadow-[0_35px_100px_-25px_#000]">
        <div className="overflow-hidden rounded-[41px] border border-black bg-[#0d110d] px-5 pt-3 pb-6">
          <div className="flex items-center justify-between px-2 text-[9px] font-semibold">
            <span>9:41</span>
            <span className="h-5 w-23 rounded-full bg-black" />
            <span className="flex items-center gap-1">
              <Activity size={11} />
              <span className="h-2 w-4 rounded-[2px] border border-ink/60 bg-ink/70" />
            </span>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div>
              <span className="flex items-center gap-1.5 text-[8px] tracking-[.12em] text-muted">
                <span className="size-1 rounded-full bg-brand" />
                EXAMPLE SESSION
              </span>
              <h3 className="mt-2 text-[25px] font-medium tracking-[-.04em]">
                {session.title}
                <span className="text-brand">.</span>
              </h3>
            </div>
            <svg viewBox="0 0 60 60" className="size-14 -rotate-90" aria-hidden="true">
              <circle
                cx="30"
                cy="30"
                r="24"
                fill="none"
                stroke="currentColor"
                className="text-line"
                strokeWidth="3"
              />
              <circle
                cx="30"
                cy="30"
                r="24"
                fill="none"
                className="stroke-brand"
                strokeWidth="3"
                strokeLinecap="round"
                pathLength="1"
                strokeDasharray={`${done.length / 6} 1`}
              />
            </svg>
          </div>
          <div
            className="mt-5 grid grid-cols-3 gap-1 rounded-full border border-line p-1"
            role="group"
            aria-label="Choose an example workout"
          >
            {workoutExamples.map((workout, index) => (
              <button
                key={workout.label}
                type="button"
                aria-pressed={selected === index}
                onClick={() => {
                  setSelected(index);
                  setDone(initialDone);
                }}
                className={`min-h-9 rounded-full text-[11px] font-medium transition-colors ${selected === index ? "bg-brand text-background" : "text-muted hover:bg-panel-raised hover:text-ink"}`}
              >
                {workout.label}
              </button>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {session.exercises.map((exercise, exerciseIndex) => (
              <div
                key={exercise.name}
                className="rounded-2xl border border-line bg-panel px-3.5 py-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium">{exercise.name}</span>
                  <Dumbbell size={14} className="text-muted" strokeWidth={1.5} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {exercise.sets.map((set, setIndex) => {
                    const key = `${exerciseIndex}-${setIndex}`;
                    const complete = done.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-label={`${exercise.name}, example set ${setIndex + 1}: ${set}. ${complete ? "Completed" : "Mark complete"}`}
                        aria-pressed={complete}
                        onClick={() => toggleSet(key)}
                        className={`flex min-h-11 items-center justify-center gap-1 rounded-lg border text-[10px] font-semibold transition-colors ${complete ? "border-brand bg-brand text-background" : "border-dashed border-line text-muted hover:border-brand hover:text-brand"}`}
                      >
                        {complete ? <Check size={10} /> : <Plus size={10} />}
                        {set}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-[10px]">
            <span className="text-muted" aria-live="polite">
              {done.length} of 6 example sets complete
            </span>
            <span className="flex items-center gap-1 text-brand">
              Keep going
              <ChevronRight size={12} />
            </span>
          </div>
          <div className="mx-auto mt-6 h-1 w-24 rounded-full bg-ink/40" />
        </div>
      </div>
      <div
        className="pointer-events-none absolute -right-8 bottom-24 hidden rotate-6 items-center gap-2.5 rounded-xl border border-white/15 bg-background/85 px-3 py-3 shadow-xl backdrop-blur-xl sm:flex lg:-right-7 xl:-right-13"
        aria-hidden="true"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-brand/15 text-brand">
          <Check size={16} />
        </span>
        <span>
          <span className="block text-[10px] font-medium">One rep at a time.</span>
          <span className="mt-0.5 block text-[9px] text-muted">A little progress adds up.</span>
        </span>
      </div>
    </div>
  );
}
