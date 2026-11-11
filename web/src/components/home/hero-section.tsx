"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Activity,
  Apple,
  ArrowDown,
  ArrowUpRight,
  BicepsFlexed,
  CalendarDays,
  Check,
  ChevronRight,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  HeartCrack,
  Moon,
  Smartphone,
  SquareActivity,
  Timer,
  TrendingUp,
  Trophy,
  Utensils,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import { heroContent } from "./content";

const joinHref = heroContent.primary.href;

// Replace with "/qr/fitsync-app.png" when ready.
const QR_IMAGE_SRC: string = "";

/*
  DESIGN RULES
  - Black and white only (greys are just white at low opacity).
  - The brand colour (bg-brand) appears ONLY on call-to-action buttons.
  - Motion is horizontal: things arrive from the right and travel left.
*/

/* =========================================================
   CSS
========================================================= */

const animationCSS = `
@keyframes fsFloat {
  0%, 100% { transform: translateY(0) rotate(var(--angle, 0deg)); }
  50%      { transform: translateY(-8px) rotate(var(--angle, 0deg)); }
}

/* arrives from the right (uses the individual "translate" property so it
   never fights with the float transform) */
@keyframes fsPop {
  from { opacity: 0; translate: 90px 0; filter: blur(6px); }
  to   { opacity: 1; translate: 0 0;    filter: blur(0); }
}

@keyframes fsLineIn {
  from { transform: translateX(75%); opacity: 0; }
  to   { transform: none;            opacity: 1; }
}

@keyframes fsRiseR {
  from { opacity: 0; transform: translateX(48px); }
  to   { opacity: 1; transform: none; }
}

@keyframes fsMarquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

@keyframes fsWiggle {
  0%, 100% { transform: rotate(0) scale(1); }
  25%      { transform: rotate(-14deg) scale(1.15); }
  60%      { transform: rotate(10deg) scale(1.15); }
}

@keyframes fsPing {
  0%   { transform: scale(1);    opacity: .55; }
  100% { transform: scale(1.6);  opacity: 0; }
}

@keyframes fsDraw {
  from { stroke-dashoffset: 100; }
  to   { stroke-dashoffset: 0; }
}

@keyframes fsHint {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(6px); }
}

@keyframes fsScreenIn {
  from { opacity: 0; transform: translateX(18px); }
  to   { opacity: 1; transform: none; }
}

/* ---------- headline: each line slides in from the right ---------- */

.fs-line {
  display: block;
  overflow: hidden;
  padding-bottom: .1em;
}

.fs-line > span {
  display: block;
  animation: fsLineIn 1100ms cubic-bezier(.2,.8,.2,1) var(--d, 0s) backwards;
}

.fs-rise-r {
  animation: fsRiseR 900ms cubic-bezier(.2,.8,.2,1) var(--d, 0s) backwards;
}

/* outlined type */
.fs-outline {
  color: transparent;
  -webkit-text-stroke: 1px rgb(255 255 255 / .16);
}

.fs-outline-strong {
  color: transparent;
  -webkit-text-stroke: 1.5px #fff;
  transition: color 450ms ease;
  cursor: default;
}
.fs-outline-strong:hover { color: #fff; }

/* ---------- marquees ---------- */

.fs-marquee-track {
  display: flex;
  width: max-content;
  animation: fsMarquee var(--dur, 40s) linear infinite;
}
.fs-marquee-track.fs-reverse { animation-direction: reverse; }
.fs-pause:hover .fs-marquee-track { animation-play-state: paused; }

/* ---------- primary button: light sweeps right to left ---------- */

.fs-cta { position: relative; overflow: hidden; }
.fs-cta::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 30%, rgb(255 255 255 / .6) 50%, transparent 70%);
  transform: translateX(120%);
  transition: transform 750ms cubic-bezier(.2,.8,.2,1);
  pointer-events: none;
}
.fs-cta:hover::before { transform: translateX(-120%); }

/* ---------- scattered hero items ---------- */

.fs-float {
  animation:
    fsPop 900ms cubic-bezier(.2,.8,.2,1) var(--pop-delay, 0s) backwards,
    fsFloat 9s ease-in-out var(--float-delay, 0s) infinite;
}

.fs-float:hover,
.fs-float:focus-within {
  animation-play-state: running, paused;
  z-index: 5;
}

.fs-parallax {
  transform: translate3d(
    calc(var(--mx, 0) * var(--depth, 12) * -1px),
    calc(var(--my, 0) * var(--depth, 12) * -1px),
    0
  );
  transition: transform 450ms cubic-bezier(.2,.8,.2,1);
}

.fs-chip {
  position: relative;
  outline: none;
  cursor: pointer;
  transition:
    transform 380ms cubic-bezier(.2,.9,.3,1.3),
    background-color 250ms ease,
    border-color 250ms ease,
    color 250ms ease;
}

.fs-chip::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid rgb(255 255 255 / .6);
  opacity: 0;
  pointer-events: none;
}

/* hover / focus: the item inverts to white */
.fs-chip:hover,
.fs-chip:focus,
.fs-chip:focus-visible {
  transform: scale(1.1) rotate(-2deg);
  background-color: #fff;
  border-color: #fff;
  color: #000;
}

.fs-chip:hover::after,
.fs-chip:focus::after { animation: fsPing 1.15s ease-out infinite; }

.fs-chip:hover .fs-t1, .fs-chip:focus .fs-t1 { color: #000; }
.fs-chip:hover .fs-t2, .fs-chip:focus .fs-t2 { color: rgb(0 0 0 / .6); }

.fs-chip:hover .fs-chip-icon,
.fs-chip:focus .fs-chip-icon {
  animation: fsWiggle .7s ease-in-out;
  background-color: #000;
  color: #fff;
}

.fs-chip:hover .fs-beat-line,
.fs-chip:focus .fs-beat-line {
  stroke-dasharray: 100;
  animation: fsDraw 1s linear infinite;
}

.fs-detail {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 320ms ease, opacity 320ms ease;
}
.fs-detail > span { overflow: hidden; }

.fs-chip:hover .fs-detail,
.fs-chip:focus .fs-detail {
  grid-template-rows: 1fr;
  opacity: 1;
}

.fs-tip {
  opacity: 0;
  transform: translate(-50%, -4px);
  transition: opacity 250ms ease, transform 250ms ease;
}
.fs-chip:hover .fs-tip,
.fs-chip:focus .fs-tip { opacity: 1; transform: translate(-50%, 0); }

/* ---------- phone demo ---------- */

.fs-screen-in { animation: fsScreenIn 400ms cubic-bezier(.2,.8,.2,1); }
.fs-hint { animation: fsHint 1.6s ease-in-out infinite; }

.fs-hide-scrollbar { scrollbar-width: none; }
.fs-hide-scrollbar::-webkit-scrollbar { display: none; }

@media (prefers-reduced-motion: reduce) {
  .fs-float,
  .fs-line > span,
  .fs-rise-r,
  .fs-marquee-track,
  .fs-screen-in,
  .fs-hint { animation: none; }
  .fs-parallax { transform: none; transition: none; }
  .fs-chip,
  .fs-detail,
  .fs-tip,
  .fs-cta::before { transition: none; }
  .fs-chip:hover::after,
  .fs-chip:focus::after,
  .fs-chip:hover .fs-chip-icon,
  .fs-chip:focus .fs-chip-icon,
  .fs-chip:hover .fs-beat-line,
  .fs-chip:focus .fs-beat-line { animation: none; }
}
`;

/* =========================================================
   MARQUEE
========================================================= */

function Marquee({
  children,
  reverse = false,
  duration = 40,
  className = "",
}: {
  children: ReactNode;
  /** false: right → left, true: left → right */
  reverse?: boolean;
  duration?: number;
  className?: string;
}) {
  return (
    <div className={`flex overflow-hidden ${className}`}>
      <div
        className={`fs-marquee-track ${reverse ? "fs-reverse" : ""}`}
        style={{ "--dur": `${duration}s` } as CSSProperties}
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SCATTERED HERO ITEMS
========================================================= */

type Scatter = {
  kind: "pill" | "dot";
  icon: LucideIcon;
  label: string;
  value?: string;
  detail?: string;
  pos: string;
  show: string;
  angle?: string;
  beat?: boolean;
  depth?: number;
};

const scatter: Scatter[] = [
  /* pills (wide screens) */
  {
    kind: "pill",
    icon: Heart,
    value: "72 bpm",
    label: "Heart rate",
    detail: "Resting · sample data",
    pos: "top-[20%] left-[3%]",
    show: "hidden xl:block",
    angle: "-4deg",
    beat: true,
    depth: 18,
  },
  {
    kind: "pill",
    icon: Dumbbell,
    value: "Workout done",
    label: "One session stronger",
    detail: "9 of 9 sets logged",
    pos: "top-[44%] left-[2%]",
    show: "hidden xl:block",
    angle: "3deg",
    depth: 26,
  },
  {
    kind: "pill",
    icon: Footprints,
    value: "8,420 steps",
    label: "Daily movement",
    detail: "84% of today's goal",
    pos: "top-[68%] left-[4%]",
    show: "hidden xl:block",
    angle: "-3deg",
    depth: 16,
  },
  {
    kind: "pill",
    icon: CalendarDays,
    value: "Weekly plan",
    label: "Training with direction",
    detail: "4 sessions this week",
    pos: "top-[19%] right-[3%]",
    show: "hidden xl:block",
    angle: "4deg",
    depth: 20,
  },
  {
    kind: "pill",
    icon: Apple,
    value: "1,860 kcal",
    label: "Nutrition",
    detail: "126 g protein logged",
    pos: "top-[43%] right-[2%]",
    show: "hidden xl:block",
    angle: "-3deg",
    depth: 24,
  },
  {
    kind: "pill",
    icon: Moon,
    value: "7h 20m sleep",
    label: "Recovery",
    detail: "Deep sleep 1h 45m",
    pos: "top-[67%] right-[4%]",
    show: "hidden xl:block",
    angle: "3deg",
    depth: 14,
  },
  {
    kind: "pill",
    icon: Flame,
    value: "12-day streak",
    label: "Consistency",
    detail: "Keep it going today",
    pos: "top-[84%] left-[24%]",
    show: "hidden xl:block",
    angle: "-3deg",
    depth: 22,
  },
  {
    kind: "pill",
    icon: Droplets,
    value: "1.8 L water",
    label: "Hydration",
    detail: "Goal: 2.5 L",
    pos: "top-[85%] right-[23%]",
    show: "hidden xl:block",
    angle: "3deg",
    depth: 20,
  },

  /* small round chips */
  {
    kind: "dot",
    icon: Trophy,
    label: "Win",
    pos: "left-[14%] top-[33%]",
    show: "hidden md:block",
    angle: "6deg",
    depth: 32,
  },
  {
    kind: "dot",
    icon: Activity,
    label: "Move",
    pos: "right-[14%] top-[34%]",
    show: "hidden md:block",
    angle: "-6deg",
    depth: 30,
  },
  {
    kind: "dot",
    icon: Dumbbell,
    label: "Train",
    pos: "left-[7%] top-[10%]",
    show: "block",
    angle: "-6deg",
    depth: 18,
  },
  {
    kind: "dot",
    icon: Apple,
    label: "Eat",
    pos: "right-[8%] top-[11%]",
    show: "block",
    angle: "6deg",
    depth: 18,
  },
  {
    kind: "dot",
    icon: Timer,
    label: "Rest",
    pos: "left-[8%] top-[91%]",
    show: "block",
    angle: "5deg",
    depth: 16,
  },
  {
    kind: "dot",
    icon: Heart,
    label: "Health",
    pos: "right-[9%] top-[90%]",
    show: "block",
    angle: "-5deg",
    depth: 16,
  },
];

function Heartbeat() {
  return (
    <svg viewBox="0 0 70 28" width="52" height="22" fill="none" className="ml-1" aria-hidden="true">
      <path
        className="fs-beat-line"
        pathLength="100"
        d="M0 15 H15 L21 10 L27 18 L33 2 L40 26 L46 13 L51 15 H70"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ScatterItem({ item, index }: { item: Scatter; index: number }) {
  const Icon = item.icon;

  const floatStyle = {
    "--angle": item.angle ?? "0deg",
    "--pop-delay": `${700 + index * 80}ms`,
    "--float-delay": `${-index * 1.7}s`,
  } as CSSProperties;

  const depthStyle = {
    "--depth": item.depth ?? 14,
  } as CSSProperties;

  return (
    <div
      style={floatStyle}
      className={`fs-float pointer-events-none absolute ${item.show} ${item.pos}`}
    >
      <div className="fs-parallax" style={depthStyle}>
        {item.kind === "pill" ? (
          <div
            // tabIndex -1: focusable by click/tap (so the effect plays on touch
            // screens) without adding stops to the keyboard Tab order
            tabIndex={-1}
            className="fs-chip pointer-events-auto flex items-center gap-3 rounded-2xl bg-black/40 px-3 py-2.5 text-left text-white backdrop-blur-md"
          >
            <span className="fs-chip-icon flex size-9 shrink-0 items-center justify-center rounded-xl  text-white">
              <Icon size={22} strokeWidth={2} />
            </span>

            <span className="block">
              <span className="fs-t1 block whitespace-nowrap font-semibold text-white">
                {item.value}
              </span>
              <span className="fs-t2 block whitespace-nowrap text-[11px] text-white">
                {item.label}
              </span>
              {item.detail && (
                <span className="fs-detail">
                  <span className="fs-t1 block whitespace-nowrap pt-1 text-[11px] font-medium text-white">
                    {item.detail}
                  </span>
                </span>
              )}
            </span>

            {item.beat && <Heartbeat />}
          </div>
        ) : (
          <div
            tabIndex={-1}
            className="fs-chip pointer-events-auto flex size-12 items-center justify-center rounded-full bg-black/10 text-white backdrop-blur-md"
          >
            <span className="fs-chip-icon inline-flex rounded-full p-1.5">
              <Icon size={22} strokeWidth={1.7} />
            </span>

            <span className="fs-tip pointer-events-none absolute top-full left-1/2 mt-2 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-black">
              {item.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   QR PLACEHOLDER
========================================================= */

function QRPlaceholder() {
  const cells = [];

  for (let y = 0; y < 25; y++) {
    for (let x = 0; x < 25; x++) {
      const inFinder = (x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16);

      if (!inFinder && (x * 17 + y * 23 + x * y * 3) % 11 < 5) {
        cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#000" />);
      }
    }
  }

  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" fill="#000" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="white" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="#000" />
    </g>
  );

  return (
    <svg
      viewBox="0 0 25 25"
      width="220"
      height="220"
      className="size-55"
      role="img"
      aria-label="Non-functional example QR code"
      shapeRendering="crispEdges"
    >
      <rect width="25" height="25" fill="white" />
      {cells}
      {finder(0, 0)}
      {finder(18, 0)}
      {finder(0, 18)}

      <rect x="8" y="10" width="9" height="5" rx=".7" fill="#000" />
      <text x="12.5" y="13.25" fontSize="2" fontWeight="800" textAnchor="middle" fill="#fff">
        DEMO
      </text>
    </svg>
  );
}

/* =========================================================
   APP DOWNLOAD DRAWER
========================================================= */

function DownloadDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!panelRef.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, onClose]);

  const hasRealQR = Boolean(QR_IMAGE_SRC);

  return (
    <div
      className={`fixed inset-0 z-100 ${
        open ? "visible" : "pointer-events-none invisible delay-300"
      }`}
      aria-hidden={!open}
      inert={!open}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close download drawer"
        onClick={onClose}
        className={`absolute inset-0 size-full bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-title"
        className={`absolute right-0 bottom-0 left-0 max-h-[92svh] overflow-y-auto rounded-t-4xl border border-white/10 bg-black p-6 text-white shadow-2xl transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] md:inset-y-0 md:left-auto md:w-110 md:max-h-none md:rounded-t-none md:rounded-l-4xl md:p-8 ${
          open
            ? "translate-y-0 md:translate-x-0"
            : "translate-y-full md:translate-y-0 md:translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-white/50">
              <Smartphone size={14} />
              FitSync Mobile
            </span>

            <h2 id="download-title" className="text-3xl font-semibold tracking-tighter text-white">
              Fitness goes
              <br />
              wherever you go.
            </h2>

            <p className="mt-3 max-w-xs text-sm leading-6 text-white/50">
              Take your workouts, daily activity and progress with you.
            </p>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/6 text-white transition-colors hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-white"
          >
            <X size={19} />
          </button>
        </div>

        <div className="mt-9 flex flex-col items-center">
          <div className="rounded-[28px] bg-white p-5">
            {hasRealQR ? (
              <Image
                src={QR_IMAGE_SRC}
                alt="QR code for the FitSync mobile app"
                width={220}
                height={220}
                className="size-55"
              />
            ) : (
              <QRPlaceholder />
            )}
          </div>

          <p className="mt-5 text-center text-sm font-medium text-white">
            {hasRealQR ? "Scan to get the app" : "Your app QR code goes here"}
          </p>

          <p className="mt-1 text-center text-xs text-white/45">
            {hasRealQR
              ? "Open your phone camera and scan."
              : "Placeholder only — not scannable yet."}
          </p>
        </div>

        <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
          {[
            "Your fitness tools, in your pocket",
            "A simple way to track your routines",
            "Made for your everyday progress",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center rounded-full bg-white/10 text-white">
                <Check size={14} />
              </span>
              <span className="text-sm text-white/65">{feature}</span>
            </div>
          ))}
        </div>

        <Link
          href={joinHref}
          onClick={onClose}
          className="fs-cta group mt-8 flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand font-semibold text-black transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Continue on the web
          <ArrowUpRight
            size={18}
            className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </Link>
      </div>
    </div>
  );
}

/* =========================================================
   PHONE DEMO DATA
========================================================= */

type Screen = "today" | "training" | "nutrition" | "progress";

const screenTabs: {
  id: Screen;
  label: string;
  icon: LucideIcon;
  description: string;
}[] = [
  {
    id: "today",
    label: "Today",
    icon: Activity,
    description: "Your daily activity, recovery and next steps together.",
  },
  {
    id: "training",
    label: "Training",
    icon: Dumbbell,
    description: "Log sets as you go. A rest timer starts automatically.",
  },
  {
    id: "nutrition",
    label: "Nutrition",
    icon: Apple,
    description: "Tap meals to log them and update your daily summary.",
  },
  {
    id: "progress",
    label: "Progress",
    icon: TrendingUp,
    description: "Explore your activity history and workout progress.",
  },
];

const exercises = [
  { name: "Push-ups", target: "3 × 12" },
  { name: "Squats", target: "3 × 15" },
  { name: "Reverse lunges", target: "3 × 10" },
];

const sampleMeals = [
  {
    name: "Oats & berries",
    time: "Breakfast",
    calories: 360,
    protein: 14,
    icon: "🥣",
  },
  {
    name: "Rice, dal & vegetables",
    time: "Lunch",
    calories: 540,
    protein: 24,
    icon: "🍲",
  },
  {
    name: "Paneer & quinoa bowl",
    time: "Dinner",
    calories: 620,
    protein: 41,
    icon: "🥗",
  },
];

const weeklyMinutes = [35, 42, 20, 49, 32, 56, 0];
const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const initialSets = () => exercises.map(() => [false, false, false]);

/* =========================================================
   TODAY SCREEN
========================================================= */

function TodayScreen({
  navigate,
  completedSets,
  loggedMeals,
}: {
  navigate: (screen: Screen) => void;
  completedSets: number;
  loggedMeals: number;
}) {
  return (
    <div className="space-y-4 px-4 pt-3 pb-4 text-left">
      <div className="px-1">
        <p className="text-[11px] text-white/45">Your daily overview</p>
        <h3 className="mt-1 text-[23px] font-semibold tracking-[-.045em] text-white">
          Make today count.
        </h3>
        <p className="mt-1 text-xs text-white/50">Small actions. Meaningful progress.</p>
      </div>

      <div className="rounded-[22px] border border-white/15 bg-white/6 p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-white/50">Daily momentum</span>
            <p className="mt-1 text-[28px] font-semibold tracking-[-.055em] text-white">
              Keep moving.
            </p>
            <p className="mt-1 text-xs text-white/55">Your journey is built one day at a time.</p>
          </div>

          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-black">
            <Flame size={25} />
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between text-[11px] text-white/55">
          <span>Daily activity example</span>
          <span className="font-semibold text-white">72%</span>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div className="h-full w-[72%] rounded-full bg-white" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Footprints, value: "8,420", label: "Steps" },
          { icon: Moon, value: "7h 20m", label: "Sleep" },
          { icon: Droplets, value: "1.8 L", label: "Water" },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/4 px-2 py-3">
            <Icon size={16} className="text-white/70" />
            <p className="mt-3 text-sm font-semibold text-white">{value}</p>
            <p className="mt-0.5 text-[10px] text-white/45">{label}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h4 className="text-sm font-semibold text-white">Today&apos;s workout</h4>
          <span className="text-[11px] text-white/45">{completedSets}/9 sets</span>
        </div>

        <button
          type="button"
          onClick={() => navigate("training")}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
        >
          <span className="flex size-12 items-center justify-center rounded-xl bg-white/10 text-white">
            <Dumbbell size={23} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-white">Full body strength</span>
            <span className="mt-1 block text-[11px] text-white/45">3 exercises · No equipment</span>
          </span>

          <ChevronRight size={17} className="text-white/60" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => navigate("nutrition")}
        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-left transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
      >
        <span className="flex items-center gap-2.5">
          <Utensils size={17} className="text-white/70" />
          <span className="text-xs text-white/75">Today&apos;s nutrition</span>
        </span>

        <span className="flex items-center gap-1 text-xs text-white/50">
          {loggedMeals}/3 meals
          <ChevronRight size={15} />
        </span>
      </button>
    </div>
  );
}

/* =========================================================
   TRAINING SCREEN
========================================================= */

function TrainingScreen({
  done,
  toggleSet,
  rest,
  skipRest,
  week,
  changeWeek,
}: {
  done: boolean[][];
  toggleSet: (i: number, j: number) => void;
  rest: number;
  skipRest: () => void;
  week: number;
  changeWeek: (week: number) => void;
}) {
  const completed = done.flat().filter(Boolean).length;
  const total = exercises.length * 3;

  return (
    <div className="space-y-4 px-4 pt-3 pb-4 text-left text-white">
      <div className="px-1">
        <p className="text-[11px] text-white/45">Your training</p>
        <h3 className="mt-1 text-[23px] font-semibold tracking-[-.045em]">Get stronger.</h3>
        <p className="mt-1 text-xs text-white/45">Four-week beginner program</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => changeWeek(number)}
            aria-pressed={week === number}
            className={`rounded-xl py-2 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-white ${
              week === number
                ? "bg-white text-black"
                : "bg-white/[0.07] text-white/60 hover:bg-white/10"
            }`}
          >
            Week {number}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/6 p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/60">Week {week} · Session 1</span>
          <span className="text-[11px] text-white/55">
            {completed}/{total} sets
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Dumbbell size={20} className="text-white" />
          <p className="text-sm font-semibold">Full body workout</p>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-300"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-2.5">
        {exercises.map((exercise, i) => (
          <div
            key={exercise.name}
            className="rounded-2xl border border-white/10 bg-white/4 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{exercise.name}</span>
              <span className="text-[11px] text-white/45">{exercise.target}</span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {done[i].map((checked, j) => (
                <button
                  key={j}
                  type="button"
                  onClick={() => toggleSet(i, j)}
                  aria-label={`${exercise.name}, set ${j + 1}`}
                  aria-pressed={checked}
                  className={`flex h-9 items-center justify-center rounded-xl border text-[11px] font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-white ${
                    checked
                      ? "scale-[1.03] border-white bg-white text-black"
                      : "border-white/10 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {checked ? <Check size={16} /> : `Set ${j + 1}`}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex min-h-12 items-center justify-between rounded-2xl bg-white/[0.07] px-4">
        {rest > 0 ? (
          <>
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              <Timer size={17} />
              Rest {formatTime(rest)}
            </span>

            <button
              type="button"
              onClick={skipRest}
              className="text-xs text-white/60 hover:text-white"
            >
              Skip
            </button>
          </>
        ) : (
          <span className="text-xs text-white/55">
            {completed === total ? "Workout completed. Great job!" : "Tap a set to start logging."}
          </span>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   NUTRITION SCREEN
========================================================= */

function NutritionScreen({
  logged,
  toggleMeal,
}: {
  logged: boolean[];
  toggleMeal: (i: number) => void;
}) {
  const calories = sampleMeals.reduce((sum, meal, i) => sum + (logged[i] ? meal.calories : 0), 0);

  const protein = sampleMeals.reduce((sum, meal, i) => sum + (logged[i] ? meal.protein : 0), 0);

  const count = logged.filter(Boolean).length;

  return (
    <div className="space-y-4 px-4 pt-3 pb-4 text-left text-white">
      <div className="px-1">
        <p className="text-[11px] text-white/45">Your nutrition</p>
        <h3 className="mt-1 text-[23px] font-semibold tracking-[-.045em]">Fuel your progress.</h3>
        <p className="mt-1 text-xs text-white/45">Know what goes into your day.</p>
      </div>

      <div className="rounded-[22px] border border-white/15 bg-white/6 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/55">Today&apos;s food log</span>
          <Apple size={19} className="text-white/80" />
        </div>

        <p className="mt-3 text-3xl font-semibold tracking-tighter">
          {calories.toLocaleString()}
          <span className="ml-1.5 text-xs font-normal text-white/50">kcal logged</span>
        </p>

        <div className="mt-5 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-500"
              style={{ width: `${(count / 3) * 100}%` }}
            />
          </div>
          <span className="text-[11px] text-white/60">{count}/3 meals</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/10 bg-white/4 p-3">
          <div className="flex items-center gap-2 text-white/70">
            <Activity size={16} />
            <span className="text-[11px]">Protein</span>
          </div>
          <p className="mt-3 text-xl font-semibold">
            {protein}
            <span className="ml-1 text-xs font-normal text-white/45">g</span>
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/4 p-3">
          <div className="flex items-center gap-2 text-white/70">
            <Droplets size={16} />
            <span className="text-[11px]">Water example</span>
          </div>
          <p className="mt-3 text-xl font-semibold">
            1.8
            <span className="ml-1 text-xs font-normal text-white/45">L</span>
          </p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h4 className="text-sm font-semibold">Your meals</h4>
          <span className="text-[11px] text-white/45">Tap to log</span>
        </div>

        <div className="space-y-2">
          {sampleMeals.map((meal, i) => (
            <button
              key={meal.name}
              type="button"
              onClick={() => toggleMeal(i)}
              aria-pressed={logged[i]}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-white ${
                logged[i]
                  ? "border-white/40 bg-white/9"
                  : "border-white/10 bg-white/4 hover:bg-white/10"
              }`}
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-white/[0.07] text-2xl grayscale">
                {meal.icon}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[11px] text-white/45">{meal.time}</span>
                <span className="mt-0.5 block truncate text-xs font-semibold">{meal.name}</span>
                <span className="mt-0.5 block text-[11px] text-white/45">{meal.calories} kcal</span>
              </span>

              <span
                className={`flex size-6 items-center justify-center rounded-full border transition-colors ${
                  logged[i]
                    ? "border-white bg-white text-black"
                    : "border-white/20 text-transparent"
                }`}
              >
                <Check size={14} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PROGRESS SCREEN
========================================================= */

function ProgressScreen({
  completedSets,
  selectedDay,
  onSelectDay,
}: {
  completedSets: number;
  selectedDay: number;
  onSelectDay: (day: number) => void;
}) {
  return (
    <div className="space-y-4 px-4 pt-3 pb-4 text-left text-white">
      <div className="px-1">
        <p className="text-[11px] text-white/45">Your progress</p>
        <h3 className="mt-1 text-[23px] font-semibold tracking-[-.045em]">Every effort counts.</h3>
        <p className="mt-1 text-xs text-white/45">See the bigger picture of your fitness.</p>
      </div>

      <div className="rounded-[22px] border border-white/15 bg-white/6 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/55">This week · Example</span>
          <TrendingUp size={19} className="text-white/80" />
        </div>

        <p className="mt-3 text-[32px] font-semibold tracking-[-.055em]">
          234
          <span className="ml-2 text-sm font-normal text-white/55">active minutes</span>
        </p>

        <p className="mt-1 text-[11px] text-white/55">Your movement, day by day.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Activity</h4>
          <span className="text-[11px] text-white/50">
            {dayNames[selectedDay]} · {weeklyMinutes[selectedDay]} min
          </span>
        </div>

        <div className="mt-6 flex h-36 items-end gap-2">
          {weeklyMinutes.map((minutes, i) => (
            <button
              key={dayNames[i]}
              type="button"
              aria-label={`${dayNames[i]}, ${minutes} active minutes`}
              aria-pressed={selectedDay === i}
              onClick={() => onSelectDay(i)}
              className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2 focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-white"
            >
              <span
                className={`w-full rounded-t-md transition-[background-color,height] duration-500 ${
                  selectedDay === i ? "bg-white" : "bg-white/20 group-hover:bg-white/50"
                }`}
                style={{
                  height: `${Math.max(5, (minutes / 60) * 100)}%`,
                }}
              />
              <span className={`text-[10px] ${selectedDay === i ? "text-white" : "text-white/45"}`}>
                {dayNames[i].slice(0, 1)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: Moon, value: "7h 20m", label: "Sample average sleep" },
          { icon: Heart, value: "72 bpm", label: "Sample heart rate" },
          {
            icon: Dumbbell,
            value: String(completedSets),
            label: "Sets logged in demo",
          },
          { icon: Trophy, value: "4 weeks", label: "Starter program" },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/4 p-3">
            <Icon size={17} className="text-white/70" />
            <p className="mt-3 text-lg font-semibold tracking-[-.03em]">{value}</p>
            <p className="mt-1 text-[10px] text-white/45">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   INTERACTIVE PHONE (with auto-play loop)
========================================================= */

function PhoneDemo({
  screen,
  changeScreen,
  autoPlay,
}: {
  screen: Screen;
  changeScreen: (screen: Screen) => void;
  autoPlay: boolean;
}) {
  const [done, setDone] = useState<boolean[][]>(initialSets);
  const [logged, setLogged] = useState([true, false, false]);
  const [week, setWeek] = useState(1);
  const [rest, setRest] = useState(0);
  const [selectedDay, setSelectedDay] = useState(5);

  const restDeadline = useRef<number | null>(null);

  /* rest timer */
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (restDeadline.current === null) return;

      const remaining = Math.max(0, Math.ceil((restDeadline.current - Date.now()) / 1000));

      setRest(remaining);

      if (remaining === 0) {
        restDeadline.current = null;
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, []);

  /* scripted demo: plays on a loop while autoPlay is true */
  useEffect(() => {
    if (!autoPlay) return;

    const skip = () => {
      restDeadline.current = null;
      setRest(0);
    };

    const mark = (i: number, j: number, last = false) => {
      setDone((previous) =>
        previous.map((row, r) => (r === i ? row.map((v, c) => (c === j ? true : v)) : row)),
      );

      if (last) {
        skip();
      } else {
        restDeadline.current = Date.now() + 60_000;
        setRest(60);
      }
    };

    const reset = () => {
      setDone(initialSets());
      setLogged([true, false, false]);
      setWeek(1);
      setSelectedDay(5);
      skip();
      changeScreen("today");
    };

    const steps: [number, () => void][] = [
      [0, reset],
      [2800, () => changeScreen("training")],
      [1000, () => mark(0, 0)],
      [750, () => mark(0, 1)],
      [750, () => mark(0, 2)],
      [750, () => mark(1, 0)],
      [650, () => mark(1, 1)],
      [650, () => mark(1, 2)],
      [650, () => mark(2, 0)],
      [650, () => mark(2, 1)],
      [650, () => mark(2, 2, true)],
      [1800, () => changeScreen("nutrition")],
      [1000, () => setLogged([true, true, false])],
      [1000, () => setLogged([true, true, true])],
      [1900, () => changeScreen("progress")],
      [900, () => setSelectedDay(0)],
      [600, () => setSelectedDay(1)],
      [600, () => setSelectedDay(2)],
      [600, () => setSelectedDay(3)],
      [600, () => setSelectedDay(4)],
      [600, () => setSelectedDay(5)],
      [1500, () => changeScreen("today")],
      [3200, () => {}],
    ];

    let index = 0;
    let cancelled = false;
    let timer = 0;

    const next = () => {
      if (cancelled) return;
      const [delay, run] = steps[index];

      timer = window.setTimeout(() => {
        if (cancelled) return;
        run();
        index = (index + 1) % steps.length;
        next();
      }, delay);
    };

    next();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [autoPlay, changeScreen]);

  const completedSets = done.flat().filter(Boolean).length;

  const toggleSet = (i: number, j: number) => {
    const wasDone = done[i][j];

    setDone((previous) =>
      previous.map((row, rowIndex) =>
        rowIndex === i ? row.map((value, colIndex) => (colIndex === j ? !value : value)) : row,
      ),
    );

    if (!wasDone && completedSets < exercises.length * 3 - 1) {
      restDeadline.current = Date.now() + 60_000;
      setRest(60);
    }
  };

  const skipRest = () => {
    restDeadline.current = null;
    setRest(0);
  };

  const changeWeek = (newWeek: number) => {
    setWeek(newWeek);
    setDone(initialSets());
    skipRest();
  };

  const toggleMeal = (index: number) => {
    setLogged((previous) => previous.map((value, i) => (i === index ? !value : value)));
  };

  const loggedMeals = logged.filter(Boolean).length;

  return (
    <div className="relative mx-auto w-79 max-w-full rounded-[48px] border border-white/25 bg-black p-2.25 shadow-[0_40px_110px_-30px_rgba(255,255,255,.18)]">
      <div className="relative flex h-156.25 flex-col overflow-hidden rounded-[39px] bg-[#0a0a0a] text-white">
        {/* Status bar */}
        <div className="relative flex h-11 shrink-0 items-center justify-between px-7 text-[11px] font-semibold">
          <span>9:41</span>

          <span
            aria-hidden="true"
            className="absolute top-2 left-1/2 h-6 w-22.75 -translate-x-1/2 rounded-full bg-black"
          />

          <span aria-hidden="true" className="flex items-center gap-1.5">
            <span className="flex h-3 items-end gap-0.5">
              {[5, 7, 9, 11].map((height) => (
                <span key={height} className="w-0.5 rounded-sm bg-white" style={{ height }} />
              ))}
            </span>
            <span className="h-2.5 w-4.75 rounded-[3px] border border-white/60 p-0.5">
              <span className="block h-full w-3/4 rounded-sm bg-white" />
            </span>
          </span>
        </div>

        {/* App header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/8 px-5">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-white">
              <Activity size={17} className="text-black" />
            </span>
            <span className="text-sm font-bold tracking-[-.04em]">FitSync</span>
          </div>

          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-white/50">
            <span className="relative flex size-1.5">
              <span
                className={`absolute inline-flex size-full rounded-full bg-white opacity-70 ${
                  autoPlay ? "animate-ping" : ""
                }`}
              />
              <span className="relative inline-flex size-1.5 rounded-full bg-white" />
            </span>
            {autoPlay ? "Auto demo" : "Live demo"}
          </span>
        </div>

        {/* Scrollable screen */}
        <div className="fs-hide-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div key={screen} className="fs-screen-in">
            {screen === "today" && (
              <TodayScreen
                navigate={changeScreen}
                completedSets={completedSets}
                loggedMeals={loggedMeals}
              />
            )}

            {screen === "training" && (
              <TrainingScreen
                done={done}
                toggleSet={toggleSet}
                rest={rest}
                skipRest={skipRest}
                week={week}
                changeWeek={changeWeek}
              />
            )}

            {screen === "nutrition" && <NutritionScreen logged={logged} toggleMeal={toggleMeal} />}

            {screen === "progress" && (
              <ProgressScreen
                completedSets={completedSets}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />
            )}
          </div>
        </div>

        {/* App bottom navigation */}
        <nav
          aria-label="FitSync demo navigation"
          className="grid shrink-0 grid-cols-4 border-t border-white/10 bg-black px-1 pt-2 pb-5"
        >
          {screenTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => changeScreen(id)}
              aria-current={screen === id ? "page" : undefined}
              className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white ${
                screen === id ? "text-white" : "text-white/40 hover:text-white"
              }`}
            >
              <Icon size={19} strokeWidth={screen === id ? 2.2 : 1.7} />
              {label}
            </button>
          ))}
        </nav>

        {/* Home indicator */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1.5 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-white/35"
        />
      </div>
    </div>
  );
}

/* =========================================================
   PHONE BACK (visible while the phone spins)
========================================================= */

function PhoneBack() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden rounded-[48px] border border-white/25 bg-black"
      style={{
        transform: "rotateY(180deg)",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      {/* camera module */}
      <div className="absolute top-6 left-6 grid size-24 grid-cols-2 gap-2.5 rounded-[26px] border border-white/15 bg-white/4 p-3.5">
        {[0, 1, 2].map((n) => (
          <span key={n} className="rounded-full border border-white/20 bg-black" />
        ))}
        <span className="m-auto size-2 rounded-full bg-white/60" />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <span className="flex size-20 items-center justify-center rounded-[26px] bg-white text-black">
          <Activity size={42} />
        </span>
        <span className="text-2xl font-bold tracking-tighter text-white">FitSync</span>
      </div>
    </div>
  );
}

/* =========================================================
   SCROLL-DRIVEN DEMO SECTION
   tiny phone → one full rotation → grows → auto-plays on loop
   (big outlined words behind it travel right → left as you scroll)
========================================================= */

const PHONE_W = 316;
const PHONE_H = 643; // 625 screen + 2 × 9 bezel
const START_SCALE = 0.16;
const MOTION_END = 0.6; // share of the scroll runway used by the spin + grow

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** biggest phone scale that still fits under the heading */
const calcScale = (viewportHeight: number) => clamp((viewportHeight - 310) / PHONE_H, 0.5, 1);

function DemoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const resumeTimer = useRef<number | undefined>(undefined);

  const [screen, setScreen] = useState<Screen>("today");
  const [finalScale, setFinalScale] = useState(1);
  const [reduced, setReduced] = useState(false);
  const [live, setLive] = useState(false);
  const [userControl, setUserControl] = useState(false);

  /* scroll progress → CSS variables on the stage (no re-renders) */
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let wasLive = false;

    const apply = () => {
      raf = 0;

      const vh = window.innerHeight;
      const rect = section.getBoundingClientRect();
      const isReduced = mq.matches;

      const p = isReduced ? 1 : clamp(-rect.top / Math.max(1, rect.height - vh));

      const m = easeInOut(clamp(p / MOTION_END));
      const fs = calcScale(vh);

      stage.style.setProperty("--p", p.toFixed(4));
      stage.style.setProperty("--m", m.toFixed(4));
      stage.style.setProperty("--s", (START_SCALE + (fs - START_SCALE) * m).toFixed(4));
      stage.style.setProperty("--rot", (m * 360).toFixed(2));
      stage.style.setProperty("--tilt", (Math.sin(m * Math.PI) * 10).toFixed(2));
      stage.style.setProperty("--ui", clamp((m - 0.85) / 0.15).toFixed(3));

      const nowLive = !isReduced && p >= MOTION_END - 0.03 && rect.bottom > vh * 0.35;

      if (nowLive !== wasLive) {
        wasLive = nowLive;
        setLive(nowLive);
      }
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const onResize = () => {
      setFinalScale(calcScale(window.innerHeight));
      schedule();
    };

    const onMotionChange = () => {
      setReduced(mq.matches);
      schedule();
    };

    setReduced(mq.matches);
    setFinalScale(calcScale(window.innerHeight));
    apply();

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);
    mq.addEventListener("change", onMotionChange);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      mq.removeEventListener("change", onMotionChange);
    };
  }, []);

  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);

  /* when the visitor touches the demo, pause auto-play for a while */
  const takeControl = useCallback(() => {
    setUserControl(true);
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setUserControl(false), 10_000);
  }, []);

  const pickScreen = useCallback(
    (id: Screen) => {
      takeControl();
      setScreen(id);
    },
    [takeControl],
  );

  const autoPlay = live && !userControl && !reduced;
  const interactive = live || reduced;

  const sideCard = (id: Screen) => {
    const tab = screenTabs.find((item) => item.id === id)!;
    const Icon = tab.icon;
    const active = screen === id;

    return (
      <button
        key={id}
        type="button"
        onClick={() => pickScreen(id)}
        aria-pressed={active}
        className={`flex w-60 items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-500 focus-visible:outline-2 focus-visible:outline-white xl:w-64 ${
          active
            ? "border-white bg-white text-black"
            : "border-white/15 bg-black/60 text-white backdrop-blur-sm hover:border-white/40"
        }`}
      >
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-500 ${
            active ? "bg-black text-white" : "bg-white/10 text-white"
          }`}
        >
          <Icon size={19} />
        </span>

        <span>
          <span className="block text-sm font-semibold">{tab.label}</span>
          <span
            className={`mt-1 block text-xs leading-5 transition-colors duration-500 ${
              active ? "text-black/60" : "text-white/50"
            }`}
          >
            {tab.description}
          </span>
        </span>
      </button>
    );
  };

  const activeDescription = screenTabs.find((item) => item.id === screen)?.description ?? "";

  return (
    <>
      <section
        id="demo"
        ref={sectionRef}
        aria-labelledby="demo-heading"
        className={`relative bg-black text-white ${reduced ? "" : "h-[300svh]"}`}
      >
        <div
          ref={stageRef}
          className={`flex flex-col items-center overflow-hidden px-5 pt-24 pb-6 text-center sm:px-8 ${
            reduced ? "relative min-h-svh" : "sticky top-0 h-svh"
          }`}
        >
          {/* big outlined words, driven by scroll: row 1 right → left,
              row 2 left → right */}
          <div
            className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-6"
            aria-hidden="true"
          >
            <p
              className="fs-outline w-max text-[clamp(5rem,15vw,13rem)] leading-none font-semibold tracking-[-.04em] whitespace-nowrap"
              style={{
                transform: "translateX(calc(30vw - var(--p, 0) * 90vw))",
              }}
            >
              Train · Eat · Recover · Repeat · Train · Eat
            </p>
            <p
              className="fs-outline w-max text-[clamp(5rem,15vw,13rem)] leading-none font-semibold tracking-[-.04em] whitespace-nowrap"
              style={{
                transform: "translateX(calc(-90vw + var(--p, 0) * 90vw))",
              }}
            >
              Plan · Track · Progress · Plan · Track · Progress
            </p>
          </div>

          {/* heading + tabs */}
          <div className="relative z-10 mx-auto max-w-4xl">
            <h2
              id="demo-heading"
              className="text-[clamp(1.9rem,4vw,3.2rem)] leading-[1.06] font-semibold tracking-[-.055em] text-balance text-white"
            >
              A clearer picture of <span className="text-white/40">your everyday fitness.</span>
            </h2>
          </div>

          <div
            role="group"
            aria-label="Select app preview screen"
            className="fs-hide-scrollbar relative z-10 mt-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-white/15 bg-black/70 p-1 backdrop-blur-md"
            style={{
              opacity: "var(--ui, 0)",
              transform: "translateX(calc((1 - var(--ui, 0)) * 60px))",
              pointerEvents: interactive ? "auto" : "none",
            }}
          >
            {screenTabs.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => pickScreen(id)}
                aria-pressed={screen === id}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors duration-300 sm:px-5 sm:text-sm ${
                  screen === id ? "bg-white text-black" : "text-white/60 hover:text-white"
                } focus-visible:outline-2 focus-visible:outline-white`}
              >
                {label}
              </button>
            ))}
          </div>

          <p aria-live="polite" className="sr-only">
            {activeDescription}
          </p>

          {/* phone stage */}
          <div
            className="relative z-10 mt-4 flex min-h-0 flex-1 items-center justify-center"
            style={{ perspective: 1500 }}
          >
            <div
              className="relative"
              style={{
                width: PHONE_W * finalScale,
                height: PHONE_H * finalScale,
              }}
            >
              {/* feature cards (large screens): slide in from the right */}
              <div
                className="absolute top-1/2 right-full mr-10 hidden flex-col gap-4 lg:flex xl:mr-20"
                style={{
                  opacity: "var(--ui, 0)",
                  transform: "translateY(-50%) translateX(calc((1 - var(--ui, 0)) * 80px))",
                  pointerEvents: interactive ? "auto" : "none",
                }}
              >
                {sideCard("today")}
                {sideCard("training")}
              </div>

              <div
                className="absolute top-1/2 left-full ml-10 hidden flex-col gap-4 lg:flex xl:ml-20"
                style={{
                  opacity: "var(--ui, 0)",
                  transform: "translateY(-50%) translateX(calc((1 - var(--ui, 0)) * 80px))",
                  pointerEvents: interactive ? "auto" : "none",
                }}
              >
                {sideCard("nutrition")}
                {sideCard("progress")}
              </div>

              {/* expanding ring */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-1/2 size-130 rounded-full border border-white/10"
                style={{
                  opacity: "var(--m, 0)",
                  transform: "translate(-50%, -50%) scale(calc(.3 + var(--m, 0) * .7))",
                }}
              />

              {/* the phone itself */}
              <div
                className="absolute top-1/2 left-1/2"
                onPointerDownCapture={takeControl}
                style={{
                  width: PHONE_W,
                  height: PHONE_H,
                  transformStyle: "preserve-3d",
                  transform:
                    "translate(-50%, -50%) rotateX(calc(var(--tilt, 0) * 1deg)) rotateY(calc(var(--rot, 0) * 1deg)) scale(var(--s, .16))",
                  pointerEvents: interactive ? "auto" : "none",
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                  }}
                >
                  <PhoneDemo screen={screen} changeScreen={setScreen} autoPlay={autoPlay} />
                </div>

                <PhoneBack />
              </div>

              {/* scroll hint (fades out as the phone grows) */}
              <p
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 translate-y-21 flex-col items-center gap-1.5 text-xs font-medium whitespace-nowrap text-white/60"
                style={{ opacity: "calc(1 - var(--m, 0) * 4)" }}
              >
                Keep scrolling
                <ArrowDown size={15} className="fs-hint" />
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* closing note + CTA (after the pinned section releases) */}
      <div className="bg-black px-5 pt-10 pb-28 text-center text-white sm:px-8">
        <p className="text-xs text-white/35">
          Interactive product concept · Sample data · Nothing is saved
        </p>

        <Link
          href={joinHref}
          className="fs-cta group mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand px-7 text-sm font-semibold text-black transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Start your journey
          <ArrowUpRight
            size={17}
            className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </Link>
      </div>
    </>
  );
}

/* =========================================================
   TICKER STRIP (between hero and demo, right → left)
========================================================= */

const tickerItems: { icon: LucideIcon; label: string }[] = [
  { icon: HeartCrack, label: "Workout logging" },
  { icon: UtensilsCrossed, label: "Nutrition" },
  { icon: Footprints, label: "Daily steps" },
  { icon: Droplets, label: "Hydration" },
  { icon: Moon, label: "Sleep" },
  { icon: Flame, label: "Streaks" },
  { icon: TrendingUp, label: "Progress" },
];

function TickerStrip() {
  return (
    <div
      className="fs-pause border-y border-brand/10 bg-black py-5 text-white"
      aria-label="What FitSync tracks"
    >
      <Marquee duration={36}>
        {tickerItems.map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center">
            <span className="flex items-center gap-3 text-xl font-medium tracking-[-.02em] text-white/75 transition-colors hover:text-white">
              <Icon size={30} strokeWidth={1.6} />
              {label}
            </span>
            <span aria-hidden="true" className="mx-10 size-1.5 rounded-full bg-white/60" />
          </span>
        ))}
      </Marquee>
    </div>
  );
}

/* =========================================================
   HERO SECTION
========================================================= */

export function HeroSection() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  /* pointer spotlight + parallax for the scattered items
     (mouse only, skipped for touch and reduced motion) */
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    if (
      !window.matchMedia("(pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let raf = 0;

    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(raf);

      raf = requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        hero.style.setProperty("--px", `${x}px`);
        hero.style.setProperty("--py", `${y}px`);
        hero.style.setProperty("--mx", String((x / rect.width - 0.5) * 2));
        hero.style.setProperty("--my", String((y / rect.height - 0.5) * 2));
      });
    };

    const onLeave = () => {
      hero.style.setProperty("--mx", "0");
      hero.style.setProperty("--my", "0");
    };

    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const delay = (seconds: number) => ({ "--d": `${seconds}s` }) as CSSProperties;

  return (
    <>
      <style>{animationCSS}</style>

      <section
        ref={heroRef}
        aria-labelledby="hero-heading"
        className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-black px-5 pb-24 text-center text-white sm:px-8"
      >
        {/* background */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          {/* faint dot grid */}
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,.12) 1px,transparent 1px)",
              backgroundSize: "32px 32px",
              maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%,black,transparent)",
            }}
          />

          {/* soft white spotlight that follows the mouse */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(380px circle at var(--px, 50%) var(--py, 40%), rgba(255,255,255,.07), transparent 70%)",
            }}
          />

          {/* giant outlined words: top row right → left, bottom row left → right */}
          <Marquee duration={70} className="absolute inset-x-0 top-[5%]">
            {[0, 1].map((n) => (
              <span
                key={n}
                className="fs-outline pr-16 text-[clamp(5rem,13vw,11rem)] leading-none font-semibold tracking-[-.04em] whitespace-nowrap"
              >
                Train · Eat · Recover · Repeat ·
              </span>
            ))}
          </Marquee>

          <Marquee duration={90} reverse className="absolute inset-x-0 bottom-[6%]">
            {[0, 1].map((n) => (
              <span
                key={n}
                className="fs-outline pr-16 text-[clamp(5rem,13vw,11rem)] leading-none font-semibold tracking-[-.04em] whitespace-nowrap"
              >
                Plan · Track · Progress ·
              </span>
            ))}
          </Marquee>

          {/* <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-black to-transparent" /> */}
        </div>

        {/* Center content (clicks pass through to the scattered items
            underneath; only the real controls take pointer events) */}
        <div className="pointer-events-none relative z-10 mx-auto flex w-full max-w-300 flex-col items-center">
          <div className="fs-rise-r" style={delay(0.1)}>
            <Link
              href="/features"
              className="group pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full  bg-black/60 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur-md transition-colors hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-white sm:text-sm"
            >
              <SquareActivity
                size={15}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
              Fitness, all in one place
            </Link>
          </div>

          <h1
            id="hero-heading"
            className="mt-5 text-[clamp(5rem,3vw,6rem)] leading-[.98] font-semibold tracking-[-.06em] text-balance"
          >
            <span className="fs-line">
              <span style={delay(0.2)} className="text-white">
                Fitness is more
              </span>
            </span>
            <span className="fs-line">
              <span style={delay(0.35)} className="text-white">
                than just
              </span>
            </span>
            <span className="fs-line">
              <span style={delay(0.5)}>
                <span className="fs-outline-strong pointer-events-auto tracking-[-.04em]">
                  a workout.
                </span>
              </span>
            </span>
          </h1>

          <p
            className="fs-rise-r mx-auto mt-7 max-w-135 text-base leading-7 text-white/55 sm:text- sm:leading-8"
            style={delay(0.7)}
          >
            Plan your training. Understand your nutrition. Build healthier habits. See how far
            you&apos;ve come. One place for everything that moves you forward.
          </p>

          <div
            className="fs-rise-r mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row"
            style={delay(0.85)}
          >
            {/* the only splash of colour on the page */}
            <Link
              href={joinHref}
              className="fs-cta group pointer-events-auto inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-8 text-base font-semibold text-black transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:w-auto"
            >
              <BicepsFlexed
                size={22}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
              Join FitSync free
            </Link>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-haspopup="dialog"
              className="group pointer-events-auto inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-black/60 px-8 text-base font-semibold text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:w-auto"
            >
              <Smartphone size={22} />
              Get the mobile app
            </button>
          </div>
        </div>

        {/* Scattered, hoverable / tappable items all over the hero.
            Placed after the content in the DOM and kept behind it (z-10). */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {scatter.map((item, index) => (
            <ScatterItem key={`${item.label}-${index}`} item={item} index={index} />
          ))}
        </div>

        <a
          href="#demo"
          className="absolute bottom-6 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-white/50 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-white"
        >
          Explore FitSync
          <ArrowDown size={15} className="fs-hint" />
        </a>
      </section>

      <TickerStrip />

      {/* <DemoSection /> */}

      <DownloadDrawer open={drawerOpen} onClose={closeDrawer} />
    </>
  );
}
