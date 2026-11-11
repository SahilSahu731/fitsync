"use client";

import { useId, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  Moon,
  Plus,
  Timer,
  UtensilsCrossed,
} from "lucide-react";
import { Reveal } from "@/components/motion";
import { container, headline, TextLink } from "./shared";

const views = [
  {
    id: "train",
    label: "Train",
    title: "A place for every rep.",
    description:
      "Keep your attention on the next set. Log weight, reps and effort, take a timed rest, and keep the whole session in your history.",
    icon: Dumbbell,
    points: [
      "Custom routines and published programs",
      "Weight, reps, duration and distance",
      "Rest timers, notes and workout history",
    ],
  },
  {
    id: "plan",
    label: "Plan",
    title: "Your week. With direction.",
    description:
      "Start with a four-week plan built around your goal, experience, equipment and time. Or follow a published program on a schedule you choose.",
    icon: Activity,
    points: [
      "A free starter plan built around you",
      "Program calendar and reminders",
      "Recovery days and missed sessions",
    ],
  },
  {
    id: "track",
    label: "Track",
    title: "The bigger picture of you.",
    description:
      "Your training is part of the story. Bring activity, nutrition, body measurements and recovery together with personal targets and daily check-ins.",
    icon: Heart,
    points: [
      "Health metrics across four areas",
      "Personal targets and check-in notes",
      "Optional Apple Health and Health Connect import",
    ],
  },
  {
    id: "progress",
    label: "Progress",
    title: "See the work add up.",
    description:
      "Look back at sessions, training volume and estimated strength. Follow your consistency over time, and take your raw data with you whenever you need it.",
    icon: Flame,
    points: [
      "Workout trends and estimated one-rep max",
      "Weekly consistency and personal records",
      "Raw data export",
    ],
  },
] as const;
const bars = ["h-12", "h-19", "h-15", "h-26", "h-22", "h-32", "h-39"];
const days = ["M", "T", "W", "T", "F", "S", "S"];

export function ProductDemo({ compact = false }: { compact?: boolean }) {
  const [view, setView] = useState(0);
  const [complete, setComplete] = useState([true, true, false]);
  const id = useId();
  const current = views[view];
  const completed = complete.filter(Boolean).length;
  return (
    <section
      id="app-preview"
      aria-labelledby={`${id}-heading`}
      className={`${container} scroll-mt-28 py-24 sm:py-32 lg:py-40`}
    >
      {!compact && (
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium tracking-[.12em] text-white/55 uppercase">
            Meet your everyday companion
          </p>
          <h2 id={`${id}-heading`} className={`mt-6 ${headline}`}>
            Everything you put in.
            <br />
            <span className="text-white/50">All in one place.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-8 text-white/55">
            From the first rep to the days between. Make a little more sense of your fitness.
          </p>
        </Reveal>
      )}
      {compact && (
        <h2 id={`${id}-heading`} className="sr-only">
          Explore the FitSync app
        </h2>
      )}
      <div
        className={`${compact ? "" : "mt-14 sm:mt-20"} grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20`}
      >
        <div>
          <div
            role="tablist"
            aria-label="Explore app features"
            className="mb-10 grid w-full max-w-md grid-cols-4 gap-1 rounded-full bg-white/5 p-1.5"
          >
            {views.map((tab, index) => (
              <button
                key={tab.id}
                id={`${id}-tab-${tab.id}`}
                role="tab"
                aria-selected={view === index}
                aria-controls={`${id}-panel`}
                tabIndex={view === index ? 0 : -1}
                onKeyDown={(event) => {
                  let next = view;
                  if (event.key === "ArrowRight") next = (view + 1) % views.length;
                  else if (event.key === "ArrowLeft")
                    next = (view + views.length - 1) % views.length;
                  else if (event.key === "Home") next = 0;
                  else if (event.key === "End") next = views.length - 1;
                  else return;
                  event.preventDefault();
                  setView(next);
                  document.getElementById(`${id}-tab-${views[next].id}`)?.focus();
                }}
                onClick={() => setView(index)}
                className={`min-h-11 rounded-full px-2 text-xs font-medium transition-colors sm:px-5 sm:text-sm ${view === index ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div
            id={`${id}-panel`}
            role="tabpanel"
            aria-labelledby={`${id}-tab-${current.id}`}
            tabIndex={0}
          >
            <div key={current.id} className="animate-home-reveal motion-reduce:animate-none">
              <h3 className="max-w-md text-3xl leading-tight font-medium tracking-[-.04em] sm:text-4xl">
                {current.title}
              </h3>
              <p className="mt-5 max-w-md text-base leading-8 text-white/55">
                {current.description}
              </p>
              <ul className="mt-8 space-y-4">
                {current.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 text-sm leading-6 text-white/75"
                  >
                    <Check size={16} className="mt-1 text-white/50" />
                    {point}
                  </li>
                ))}
              </ul>
              <TextLink href="/features" className="mt-7 text-white/85">
                Explore every feature
              </TextLink>
            </div>
          </div>
        </div>
        <div className="relative isolate rounded-[2rem] bg-[#0d0d0d] px-4 pt-10 pb-7 sm:px-10 sm:pt-14">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 rounded-[2rem] bg-radial from-white/5 via-transparent to-transparent"
          />
          <div className="mx-auto w-full max-w-78 rounded-[2.5rem] bg-[#222] p-2 shadow-[0_24px_80px_#0009]">
            <div className="relative min-h-125 overflow-hidden rounded-[2rem] bg-black px-5 pt-4 pb-5">
              <div className="mx-auto mb-7 h-5 w-22 rounded-full bg-[#171717]" aria-hidden="true" />
              <div key={current.id} className="animate-home-reveal motion-reduce:animate-none">
                <div className="mb-5 flex items-center justify-between text-[10px] text-white/50">
                  <span>FITSYNC</span>
                  <current.icon size={15} />
                </div>
                {view === 0 && (
                  <>
                    <p className="text-[10px] text-white/55">TODAY’S SESSION</p>
                    <h4 className="mt-2 text-2xl font-semibold tracking-tight">Upper body</h4>
                    <div className="mt-3 flex gap-4 text-[10px] text-white/50">
                      <span className="flex gap-1.5">
                        <Timer size={12} />
                        24:18
                      </span>
                      <span>3 exercises</span>
                    </div>
                    <div className="mt-7 rounded-2xl bg-white/6 p-4">
                      <p className="text-sm font-medium">Bench press</p>
                      <p className="mt-1 text-[10px] text-white/50">Working sets · tap to log</p>
                      <div className="mt-5 flex justify-between text-[9px] text-white/50">
                        <span>WEIGHT</span>
                        <span>REPS</span>
                        <span>DONE</span>
                      </div>
                      {complete.map((done, index) => (
                        <button
                          key={index}
                          aria-pressed={done}
                          aria-label={`Mark bench press set ${index + 1} ${done ? "incomplete" : "complete"} in preview`}
                          onClick={() =>
                            setComplete((value) =>
                              value.map((item, i) => (i === index ? !item : item)),
                            )
                          }
                          className="mt-3 flex min-h-10 w-full items-center justify-between rounded-lg bg-black/40 px-3 text-xs transition-colors hover:bg-white/10"
                        >
                          <span>60 kg</span>
                          <span>8</span>
                          <span
                            className={`flex size-6 items-center justify-center rounded-md ${done ? "bg-brand text-black" : "bg-white/10 text-white/60"}`}
                          >
                            {done ? <Check size={13} /> : <Plus size={13} />}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/5 p-4">
                      <span>
                        <span className="block text-xs">Seated row</span>
                        <span className="mt-1 block text-[10px] text-white/50">
                          Up next · 3 sets
                        </span>
                      </span>
                      <ChevronRight size={16} className="text-white/50" />
                    </div>
                    <p aria-live="polite" className="mt-5 text-center text-[10px] text-white/50">
                      {completed} of 3 sets logged in this preview
                    </p>
                  </>
                )}
                {view === 1 && (
                  <>
                    <p className="text-[10px] text-white/55">YOUR STARTER PLAN</p>
                    <h4 className="mt-2 text-2xl font-semibold tracking-tight">Build your base.</h4>
                    <p className="mt-2 text-xs text-white/55">4 weeks · gym · your pace</p>
                    <div className="mt-7 flex justify-between">
                      {days.map((day, index) => (
                        <span
                          key={index}
                          className={`flex size-7 items-center justify-center rounded-full text-[10px] ${[0, 2, 4].includes(index) ? "bg-white text-black" : "bg-white/5 text-white/50"}`}
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                    <div className="mt-7 space-y-3">
                      {[
                        ["Full body A", "Monday · 45 min", true],
                        ["Full body B", "Wednesday · 45 min", false],
                        ["Full body A", "Friday · 45 min", false],
                      ].map(([title, detail, done]) => (
                        <div
                          key={String(detail)}
                          className="flex items-center justify-between rounded-2xl bg-white/6 p-4"
                        >
                          <div>
                            <p className="text-xs font-medium">{title}</p>
                            <p className="mt-1 text-[10px] text-white/50">{detail}</p>
                          </div>
                          {done ? (
                            <Check size={16} className="text-brand" />
                          ) : (
                            <Dumbbell size={16} className="text-white/50" />
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="mt-6 text-center text-[10px] text-white/55">
                      Space to recover between sessions.
                    </p>
                  </>
                )}
                {view === 2 && (
                  <>
                    <p className="text-[10px] text-white/55">DAILY CHECK-IN</p>
                    <h4 className="mt-2 text-2xl font-semibold tracking-tight">
                      A little more you.
                    </h4>
                    <p className="mt-2 text-xs text-white/55">Your day, at a glance.</p>
                    <div className="mt-7 grid grid-cols-2 gap-3">
                      {[
                        { icon: Footprints, label: "Steps", value: "8,420", detail: "of 10,000" },
                        {
                          icon: UtensilsCrossed,
                          label: "Protein",
                          value: "126 g",
                          detail: "of 140 g",
                        },
                        { icon: Moon, label: "Sleep", value: "7h 20m", detail: "last night" },
                        { icon: Heart, label: "Energy", value: "Good", detail: "today’s check-in" },
                      ].map(({ icon: Icon, label, value, detail }) => (
                        <div key={label} className="rounded-2xl bg-white/6 p-4">
                          <Icon size={18} className="text-white/55" />
                          <p className="mt-4 text-[10px] text-white/50">{label}</p>
                          <p className="mt-1 text-lg font-medium tracking-tight">{value}</p>
                          <p className="mt-1 text-[9px] text-white/50">{detail}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/5 p-4 text-[10px] text-white/60">
                      <Activity size={17} />
                      Small check-ins. A clearer picture.
                    </div>
                  </>
                )}
                {view === 3 && (
                  <>
                    <p className="text-[10px] text-white/55">YOUR TRAINING</p>
                    <h4 className="mt-2 text-2xl font-semibold tracking-tight">It all adds up.</h4>
                    <p className="mt-2 text-xs text-white/55">Volume across recent sessions</p>
                    <div
                      className="mt-8 flex h-44 items-end justify-between gap-3 rounded-2xl bg-white/5 px-4 pt-5 pb-3"
                      role="img"
                      aria-label="Example training volume trend, generally increasing across seven sessions"
                    >
                      {bars.map((height, index) => (
                        <div
                          key={index}
                          className={`w-5 rounded-t-sm ${height} ${index === bars.length - 1 ? "bg-brand" : "bg-white/40"}`}
                        />
                      ))}
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-white/6 p-4">
                        <p className="text-[9px] text-white/50">THIS WEEK</p>
                        <p className="mt-2 text-2xl font-medium">
                          3<span className="ml-1 text-xs text-white/55">sessions</span>
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/6 p-4">
                        <p className="text-[9px] text-white/50">CONSISTENCY</p>
                        <p className="mt-2 text-2xl font-medium">
                          4<span className="ml-1 text-xs text-white/55">weeks</span>
                        </p>
                      </div>
                    </div>
                    <p className="mt-6 flex items-center justify-center gap-2 text-[10px] text-white/50">
                      <ArrowDownToLine size={12} />
                      Your data stays yours to export.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
          <p className="mt-6 text-center text-[10px] tracking-wide text-white/50">
            Interactive preview · illustrative data · nothing is saved
          </p>
        </div>
      </div>
    </section>
  );
}
