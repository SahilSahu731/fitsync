import type { CSSProperties } from "react";
const paths: Record<string, string> = {
  dumbbell: "m6.5 6.5 11 11M4 9l5-5M15 20l5-5M2 7l5-5M17 22l5-5M7 12l5-5M12 17l5-5",
  arrow: "M4 12h16m-6-6 6 6-6 6", search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  plus: "M12 5v14M5 12h14", close: "m6 6 12 12M6 18 18 6", menu: "M4 6h16M4 12h16M4 18h16",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z", user: "M20 21v-2a7 7 0 0 0-14 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  settings: "M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  logout: "M9 4H4v16h5M9 12h12m-5-5 5 5-5 5", shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6",
  chart: "M3 3v18h18M7 14l5-5 4 3 5-7", people: "M15 21v-2a6 6 0 0 0-12 0v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M17 3a4 4 0 0 1 0 8m2 4a5 5 0 0 1 3 4v2",
  filter: "M4 6h16M7 12h10M10 18h4", check: "m5 12 4 4L19 6", upload: "M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6",
  image: "M3 3h18v18H3zM3 16l5-5 4 4 3-3 6 6M8 7h.01", play: "m9 5 12 7-12 7V5Z",
  edit: "m15 4 5 5M4 20l5-1L21 7l-4-4L5 15l-1 5Z", trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7",
  back: "M20 12H4m6-6-6 6 6 6", clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  book: "M12 5v16M12 5C9 2 4 3 2 4v16c3-1 7-2 10 1 3-3 7-2 10-1V4c-3-1-7-2-10 1Z",
};
export function Icon({ name, size = 20, style }: { name: string; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name] || paths.dumbbell} /></svg>;
}
