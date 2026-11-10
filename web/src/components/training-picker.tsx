"use client";

import Link from "next/link";
import { useId, useState, type KeyboardEvent } from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  Clock3,
  Dumbbell,
  MoveUpRight,
  PersonStanding,
  StretchHorizontal,
} from "lucide-react";
import { TrainingSketch, type TrainingStyle } from "./training-sketch";

const training = {
  strength: {
    label: "Strength",
    icon: Dumbbell,
    title: "Build strength.\nKeep the feeling.",
    description:
      "The satisfying kind of hard. Find your programme, learn the movements, and give every rep a little more purpose.",
    time: "35–45",
    equipment: "Gym or dumbbells",
    focus: "Build & progress",
    movements: ["Squat", "Press", "Row"],
    study: "The back squat",
    annotation: "Grounded from the first rep.",
    link: "/programs",
    action: "Find your strength programme",
  },
  mobility: {
    label: "Mobility",
    icon: StretchHorizontal,
    title: "More freedom.\nIn every direction.",
    description:
      "Make space for better movement. Explore controlled stretches and technique guides for your warm-up, your recovery, or a moment to yourself.",
    time: "10–20",
    equipment: "A little floor space",
    focus: "Move & restore",
    movements: ["Hip circles", "Lunge stretch", "Shoulder rotations"],
    study: "The long lunge",
    annotation: "Find a little more room to move.",
    link: "/exercises",
    action: "Explore movement guides",
  },
  bodyweight: {
    label: "Bodyweight",
    icon: PersonStanding,
    title: "Less equipment.\nAll you.",
    description:
      "Your body has plenty to work with. Build a session around simple, effective movements you can take almost anywhere.",
    time: "20–30",
    equipment: "No equipment needed",
    focus: "Control & endurance",
    movements: ["Push-up", "Squat", "Plank"],
    study: "The push-up",
    annotation: "Own the movement. Every inch.",
    link: "/exercises",
    action: "Find bodyweight exercises",
  },
};

const trainingKeys = Object.keys(training) as TrainingStyle[];

export function TrainingPicker() {
  const [selected, setSelected] = useState<TrainingStyle>("strength");
  const id = useId();

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, key: TrainingStyle) {
    let next = trainingKeys.indexOf(key);
    if (event.key === "ArrowRight") next = (next + 1) % trainingKeys.length;
    else if (event.key === "ArrowLeft")
      next = (next + trainingKeys.length - 1) % trainingKeys.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = trainingKeys.length - 1;
    else return;
    event.preventDefault();
    setSelected(trainingKeys[next]);
    document.getElementById(`${id}-tab-${trainingKeys[next]}`)?.focus();
  }

  return (
    <section
      id="movement"
      className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32"
      aria-labelledby={`${id}-heading`}
    >
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="mb-5 flex items-center gap-3 text-[11px] font-semibold tracking-[0.18em] text-brand">
            <span className="h-px w-7 bg-brand" />
            MADE FOR YOUR KIND OF MOVEMENT
          </p>
          <h2
            id={`${id}-heading`}
            className="text-[42px] leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-[72px]"
          >
            Find your kind
            <br />
            of <span className="text-brand">strong.</span>
          </h2>
        </div>
        <p className="max-w-78 text-base leading-7 text-muted lg:pb-1">
          Heavy lifts. A deeper stretch. Your own bodyweight. There’s more than one way to feel good
          in your body.
        </p>
      </div>

      <div
        className="mt-10 grid grid-cols-3 border-y border-line sm:mt-12"
        role="tablist"
        aria-label="Training style"
      >
        {trainingKeys.map((key, tabIndex) => {
          const ItemIcon = training[key].icon;
          const active = selected === key;
          return (
            <button
              key={key}
              id={`${id}-tab-${key}`}
              role="tab"
              aria-selected={active}
              aria-controls={`${id}-panel-${key}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setSelected(key)}
              onKeyDown={(event) => handleTabKeyDown(event, key)}
              className={`group relative flex min-h-22 items-center justify-center gap-2 px-2 py-5 transition-colors sm:min-h-26 sm:justify-start sm:gap-4 sm:px-6 ${tabIndex !== 0 ? "border-l border-line" : ""} ${active ? "bg-brand text-background" : "text-muted hover:bg-panel hover:text-ink"}`}
            >
              <span
                className={`hidden font-mono text-[10px] sm:block ${active ? "text-background/55" : "text-muted/60"}`}
              >
                0{tabIndex + 1}
              </span>
              <ItemIcon size={21} strokeWidth={1.7} className="hidden md:block" />
              <span className="text-sm font-semibold tracking-tight sm:text-lg lg:text-xl">
                {training[key].label}
              </span>
              <ArrowDown
                size={18}
                strokeWidth={1.5}
                className={`ml-auto hidden transition-transform sm:block ${active ? "opacity-100" : "-rotate-45 opacity-35 group-hover:rotate-0 group-hover:opacity-100"}`}
              />
            </button>
          );
        })}
      </div>

      {trainingKeys.map((key, index) => {
        const plan = training[key];
        return (
          <div
            key={key}
            id={`${id}-panel-${key}`}
            role="tabpanel"
            aria-labelledby={`${id}-tab-${key}`}
            tabIndex={0}
            hidden={selected !== key}
            className={
              selected === key
                ? "grid border-x border-b border-line lg:grid-cols-[1.14fr_1fr]"
                : "hidden"
            }
          >
            <div className="group relative flex min-w-0 flex-col overflow-hidden bg-panel lg:border-r lg:border-line">
              <div className="absolute inset-0 bg-radial-[at_50%_45%] from-brand/6 via-transparent to-transparent" />
              <div className="relative flex items-center justify-between px-5 pt-6 sm:px-7">
                <span className="flex items-center gap-2 font-mono text-[9px] tracking-[0.15em] text-muted">
                  <span className="size-1.5 rounded-full bg-brand" />A STUDY IN MOVEMENT
                </span>
                <span className="font-mono text-[9px] tracking-[0.15em] text-muted">
                  FIG. 0{index + 1}
                </span>
              </div>
              <div className="relative my-auto py-2 sm:px-2 sm:py-4">
                <TrainingSketch
                  kind={key}
                  className="w-full transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.035]"
                />
              </div>
              <div className="relative flex items-end justify-between gap-3 border-t border-line px-5 py-5 sm:px-7">
                <div>
                  <p className="text-[15px] font-medium tracking-tight">{plan.study}</p>
                  <p className="mt-1 text-xs text-muted">{plan.annotation}</p>
                </div>
                <MoveUpRight size={25} strokeWidth={1} className="text-brand" />
              </div>
            </div>

            <div className="flex min-w-0 flex-col px-6 py-8 sm:px-9 sm:py-10 lg:p-10 xl:p-12">
              <p className="mb-5 font-mono text-[10px] tracking-[0.18em] text-brand">
                0{index + 1} / {plan.focus.toUpperCase()}
              </p>
              <h3 className="whitespace-pre-line text-[34px] leading-[1.1] tracking-[-0.045em] sm:text-[42px] lg:text-[40px] xl:text-[44px]">
                {plan.title}
              </h3>
              <p className="mt-5 max-w-110 text-[15px] leading-7 text-muted sm:text-base">
                {plan.description}
              </p>
              <div className="mt-8 grid grid-cols-[0.8fr_1fr] border-y border-line py-5">
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] tracking-[0.12em] text-muted">
                    <Clock3 size={12} />
                    EXAMPLE SESSION
                  </p>
                  <p className="mt-2 text-[30px] leading-none tracking-[-0.05em]">
                    {plan.time}
                    <span className="ml-1.5 text-xs tracking-normal text-muted">min</span>
                  </p>
                </div>
                <div className="border-l border-line pl-5">
                  <p className="flex items-center gap-1.5 text-[10px] tracking-[0.12em] text-muted">
                    <Check size={12} />
                    WHAT YOU NEED
                  </p>
                  <p className="mt-3 text-sm font-medium">{plan.equipment}</p>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-[10px] tracking-[0.12em] text-muted">YOUR STARTING LINE-UP</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {plan.movements.map((movement) => (
                    <span
                      key={movement}
                      className="rounded-full border border-line px-3 py-1.5 text-xs text-ink/85"
                    >
                      {movement}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-[10px] leading-5 text-muted/75">
                  Illustrative session. Choose a programme that fits your level.
                </p>
              </div>
              <Link
                href={plan.link}
                className="group/link mt-8 flex min-h-13 items-center justify-between gap-4 bg-ink px-5 py-4 text-[13px] font-semibold text-background transition-colors hover:bg-brand lg:mt-auto lg:translate-y-2"
              >
                {plan.action}
                <ArrowRight
                  size={18}
                  className="shrink-0 transition-transform group-hover/link:translate-x-1"
                />
              </Link>
            </div>
          </div>
        );
      })}
    </section>
  );
}
