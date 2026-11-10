"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

/** Content stays readable before hydration; reveal motion runs once on entry. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const delayClass =
    delay >= 160 ? "[animation-delay:160ms]" : delay > 0 ? "[animation-delay:80ms]" : "";
  return (
    <div
      ref={ref}
      className={`${entered ? "animate-home-reveal" : ""} ${delayClass} motion-reduce:animate-none ${className}`}
    >
      {children}
    </div>
  );
}

const lightPositions = [
  "left-0 top-0",
  "left-1/2 top-0",
  "left-full top-0",
  "left-0 top-1/2",
  "left-1/2 top-1/2",
  "left-full top-1/2",
  "left-0 top-full",
  "left-1/2 top-full",
  "left-full top-full",
];
const tiltPositions = [
  "rotate-x-3 -rotate-y-3",
  "rotate-x-3",
  "rotate-x-3 rotate-y-3",
  "-rotate-y-3",
  "rotate-x-0 rotate-y-0",
  "rotate-y-3",
  "-rotate-x-3 -rotate-y-3",
  "-rotate-x-3",
  "-rotate-x-3 rotate-y-3",
];

function pointerZone(event: PointerEvent<HTMLDivElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  const column = Math.max(
    0,
    Math.min(2, Math.floor(((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 3)),
  );
  const row = Math.max(
    0,
    Math.min(2, Math.floor(((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 3)),
  );
  return row * 3 + column;
}

/** A quiet light moves between nine positions, using only Tailwind classes. */
export function Spotlight({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const [zone, setZone] = useState(4);
  return (
    <div
      onPointerMove={(event) => {
        if (event.pointerType === "mouse") setZone(pointerZone(event));
      }}
      className={`group/spotlight relative isolate overflow-hidden rounded-3xl bg-panel ${className}`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -z-10 size-90 -translate-x-1/2 -translate-y-1/2 rounded-full bg-radial from-brand/10 via-brand/3 to-transparent opacity-0 transition-[left,top,opacity] duration-500 group-focus-within/spotlight:opacity-100 group-hover/spotlight:opacity-100 motion-reduce:hidden ${lightPositions[zone]}`}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

/** Scroll emphasis keeps every word readable, including with JS or motion off. */
export function ScrollText({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [litCount, setLitCount] = useState<number | null>(null);
  const words = text.split(" ");
  const wordCount = words.length;
  useEffect(() => {
    let frame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      frame = 0;
      if (reducedMotion.matches) {
        setLitCount(null);
        return;
      }
      if (!ref.current) return;
      const bounds = ref.current.getBoundingClientRect();
      const viewHeight = window.innerHeight;
      const progress = (viewHeight * 0.85 - bounds.top) / (viewHeight * 0.45 + bounds.height);
      setLitCount(Math.round(Math.min(1, Math.max(0, progress * 1.15)) * wordCount));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reducedMotion.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reducedMotion.removeEventListener("change", schedule);
    };
  }, [wordCount]);
  return (
    <p ref={ref} className={className}>
      {words.map((word, index) => (
        <span
          key={index}
          className={`transition-colors duration-300 motion-reduce:text-ink ${litCount === null || index < litCount ? "text-ink" : "text-muted"}`}
        >
          {word}{" "}
        </span>
      ))}
    </p>
  );
}

/** Pointer tilt has a small range; touch and reduced-motion stay still. */
export function Tilt({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [zone, setZone] = useState(4);
  return (
    <div
      onPointerMove={(event) => {
        if (event.pointerType === "mouse") setZone(pointerZone(event));
      }}
      onPointerLeave={() => setZone(4)}
      className={`perspective-[1200px] ${className}`}
    >
      <div
        className={`transform-3d transition-transform duration-500 ease-out motion-reduce:transform-none ${tiltPositions[zone]}`}
      >
        {children}
      </div>
    </div>
  );
}

/** Native progress avoids injecting dynamic CSS styles into the page. */
export function ScrollBar() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const root = document.documentElement;
      setProgress(
        Math.round((root.scrollTop / Math.max(1, root.scrollHeight - root.clientHeight)) * 100),
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  return (
    <progress
      value={progress}
      max={100}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-60 block h-0.5 w-full appearance-none border-0 bg-transparent text-brand [&::-moz-progress-bar]:bg-brand [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-brand"
    />
  );
}
