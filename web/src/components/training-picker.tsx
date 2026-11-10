"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Clock3, Dumbbell, PersonStanding, StretchHorizontal } from "lucide-react";
import { TrainingSketch, type TrainingStyle } from "./training-sketch";

const training = {
  strength: { label: "Strength", icon: Dumbbell, title: "A little stronger.\nEvery single session.", description: "Build a solid foundation with focused movements and a plan you can come back to. Take the guesswork out of your next gym session.", time: "35–45 min", equipment: "Gym or dumbbells", movements: ["Squat", "Press", "Row"], link: "/programs", action: "Explore strength training" },
  mobility: { label: "Mobility", icon: StretchHorizontal, title: "Move freely.\nFeel the difference.", description: "Give your body some room to move. Explore controlled movements and technique guides to prepare for a session or slow things down.", time: "10–20 min", equipment: "A little floor space", movements: ["Hip circles", "Lunge stretch", "Shoulder rotations"], link: "/exercises", action: "Explore movement guides" },
  bodyweight: { label: "Bodyweight", icon: PersonStanding, title: "Your body.\nYour training space.", description: "Start where you are, with what you have. Find exercises that use your own bodyweight and make movement part of your day.", time: "20–30 min", equipment: "No equipment needed", movements: ["Push-up", "Squat", "Plank"], link: "/exercises", action: "Find bodyweight exercises" },
};

export function TrainingPicker() {
  const [selected, setSelected] = useState<TrainingStyle>("strength");
  const plan = training[selected];
  return <section className="mx-auto max-w-7xl px-5 py-18 sm:px-8 sm:py-24 lg:px-12 lg:py-28" aria-labelledby="training-heading">
    <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end"><div><p className="mb-4 text-xs font-semibold tracking-[0.16em] text-muted">FIND YOUR KIND OF MOVEMENT</p><h2 id="training-heading" className="text-[38px] leading-[1.08] tracking-[-1.6px] sm:text-5xl lg:text-[54px]">There’s a way in.<br />Find yours.</h2></div><p className="max-w-72 text-base leading-relaxed text-muted">Big goals or small beginnings.<br />Make your next session your own.</p></div>
    <div className="mt-10 flex gap-1 border-b border-line sm:mt-12 sm:gap-6" role="tablist" aria-label="Training style">{(Object.keys(training) as TrainingStyle[]).map(key => {
      const ItemIcon = training[key].icon;
      return <button key={key} id={`tab-${key}`} role="tab" aria-selected={selected === key} aria-controls={`panel-${key}`} tabIndex={selected === key ? 0 : -1} onClick={() => setSelected(key)} onKeyDown={event => {
        const keys = Object.keys(training) as TrainingStyle[];
        let next = keys.indexOf(key);
        if (event.key === "ArrowRight") next = (next + 1) % keys.length;
        else if (event.key === "ArrowLeft") next = (next + keys.length - 1) % keys.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = keys.length - 1;
        else return;
        event.preventDefault(); setSelected(keys[next]); document.getElementById(`tab-${keys[next]}`)?.focus();
      }} className={`-mb-px flex flex-1 items-center justify-center gap-2 border-b-2 px-1 py-5 text-sm font-medium transition-colors sm:flex-none sm:justify-start sm:px-5 sm:text-base ${selected === key ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}><ItemIcon size={20} strokeWidth={1.7} className="hidden sm:block" /><span>{training[key].label}</span></button>;
    })}</div>
    <div id={`panel-${selected}`} role="tabpanel" aria-labelledby={`tab-${selected}`} className="grid gap-8 pt-8 sm:gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-18 lg:pt-10">
      <div className="relative flex aspect-[1.35] items-center justify-center overflow-hidden bg-surface"><span className="absolute top-6 left-6 text-xs font-medium tracking-widest text-muted">THE MOVEMENT STUDY</span><span className="absolute top-6 right-6 text-xs text-muted">0{Object.keys(training).indexOf(selected) + 1} / 03</span><TrainingSketch kind={selected} className="mt-6 w-full text-ink" /><span className="absolute right-6 bottom-5 text-xs text-muted">Drawn to move.</span></div>
      <div className="py-2 lg:py-6"><h3 className="whitespace-pre-line text-[32px] leading-[1.15] tracking-[-1px] sm:text-[38px]">{plan.title}</h3><p className="mt-5 max-w-112 text-base leading-7 text-muted sm:text-lg">{plan.description}</p><div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm"><span className="inline-flex items-center gap-2"><Clock3 size={17} />{plan.time}</span><span className="inline-flex items-center gap-2"><Check size={17} />{plan.equipment}</span></div><div className="mt-7 border-t border-line pt-5"><p className="text-xs font-medium tracking-widest text-muted">A SESSION COULD START WITH</p><p className="mt-2 text-base">{plan.movements.join("  /  ")}</p><p className="mt-1 text-xs text-muted">Example movements and timing. Choose a plan that fits you.</p></div><Link href={plan.link} className="group mt-7 inline-flex min-h-12 items-center gap-5 border-b border-ink pb-1 text-base font-semibold">{plan.action}<ArrowRight size={20} className="transition-transform group-hover:translate-x-1" /></Link></div>
    </div>
  </section>;
}
