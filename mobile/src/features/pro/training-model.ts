export type Plate = { weight: number; count: number };
export type Ramp = { percent: number; reps: number };
export const DEFAULT_RAMPS: Ramp[] = [
  { percent: 40, reps: 8 },
  { percent: 60, reps: 5 },
  { percent: 75, reps: 3 },
  { percent: 90, reps: 1 },
];
export function numeric(text: string): number | null {
  return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text.trim()) && Number.isFinite(Number(text))
    ? Number(text)
    : null;
}
export const toKg = (value: number, unit: "kg" | "lb") =>
  unit === "lb" ? value * 0.45359237 : value;
export const fromKg = (value: number, unit: "kg" | "lb") =>
  unit === "lb" ? value / 0.45359237 : value;
export function parsePlates(text: string): Plate[] {
  const parts = text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length || parts.length > 12)
    throw new Error("Enter 1–12 plate sizes, like 20x2, 10x1, 5x2. Counts are per side.");
  const rows = parts.map((part) => {
    const match = part.match(/^(\d+(?:\.\d{1,2})?)\s*[x×]\s*(\d{1,2})$/i);
    if (!match)
      throw new Error(
        "Use weight x count for each plate size, separated by commas. Counts are per side.",
      );
    const weight = Number(match[1]),
      count = Number(match[2]);
    if (weight <= 0 || weight > 100 || count < 1 || count > 12)
      throw new Error(
        "Plate sizes must be above zero and at most 100; counts must be 1–12 per side.",
      );
    return { weight, count };
  });
  if (new Set(rows.map((p) => p.weight)).size !== rows.length)
    throw new Error("List each plate size once, with its available count per side.");
  return rows;
}
function gcd(a: number, b: number): number {
  while (b) {
    const r = a % b;
    a = b;
    b = r;
  }
  return a;
}
// Bounded dynamic programming handles combinations that greedy plate selection misses.
export function assemblePlates(target: number, bar: number, plates: Plate[]) {
  if (
    !Number.isFinite(target) ||
    target <= 0 ||
    target > 2200 ||
    !Number.isFinite(bar) ||
    bar < 0 ||
    bar > 220 ||
    target < bar ||
    plates.length > 12 ||
    plates.some(
      (p) =>
        !Number.isFinite(p.weight) ||
        p.weight <= 0 ||
        p.weight > 100 ||
        !Number.isInteger(p.count) ||
        p.count < 0 ||
        p.count > 12,
    )
  )
    throw new Error("Choose a valid load, bar and bounded plate inventory.");
  const ticks = plates.map((p) => Math.round(p.weight * 100));
  const divisor = ticks.reduce(gcd, 0) || 1;
  const max = Math.floor(((target - bar + 1e-9) * 100) / 2 / divisor);
  if (max > 110000) throw new Error("Use a smaller load or simpler plate sizes.");
  let reachable = new Uint8Array(max + 1);
  reachable[0] = 1;
  const rows: { weight: number; taken: Int8Array }[] = [];
  for (let i = 0; i < plates.length; i++) {
    const weight = ticks[i] / divisor,
      next = new Uint8Array(max + 1),
      taken = new Int8Array(max + 1);
    taken.fill(-1);
    for (let sum = 0; sum <= max; sum++) {
      if (reachable[sum]) {
        next[sum] = 1;
        taken[sum] = 0;
      } else if (sum >= weight && next[sum - weight] && taken[sum - weight] < plates[i].count) {
        next[sum] = 1;
        taken[sum] = taken[sum - weight] + 1;
      }
    }
    rows.push({ weight, taken });
    reachable = next;
  }
  let best = max;
  while (best > 0 && !reachable[best]) best--;
  const actual = bar + (best * divisor * 2) / 100;
  const counts = plates.map(() => 0);
  for (let i = rows.length - 1; i >= 0; i--) {
    counts[i] = rows[i].taken[best];
    best -= counts[i] * rows[i].weight;
  }
  return {
    actual,
    residual: Math.max(0, target - actual),
    perSide: plates
      .map((p, i) => ({ weight: p.weight, count: counts[i] }))
      .filter((p) => p.count > 0)
      .sort((a, b) => b.weight - a.weight),
  };
}
export function calculateWarmup(
  target: number,
  bar: number,
  plates: Plate[],
  increment: number,
  ramps: Ramp[] = DEFAULT_RAMPS,
) {
  if (
    !Number.isFinite(target) ||
    target <= 0 ||
    target > 2200 ||
    !Number.isFinite(bar) ||
    bar < 0 ||
    bar > 220 ||
    !Number.isFinite(increment) ||
    increment <= 0 ||
    increment > 100 ||
    !ramps.length ||
    ramps.length > 8 ||
    ramps.some(
      (r) =>
        !Number.isFinite(r.percent) ||
        r.percent <= 0 ||
        r.percent >= 100 ||
        !Number.isInteger(r.reps) ||
        r.reps < 1 ||
        r.reps > 30,
    )
  )
    throw new Error("Check your load, bar, increment and stages. Use 1–99% and 1–30 reps.");
  const sets: {
    reps: number;
    requestedPercent: number;
    actualPercent: number;
    desired: number;
    actual: number;
    residual: number;
    perSide: Plate[];
  }[] = [];
  const seen = new Set<number>();
  const noBar = target <= bar;
  for (const stage of [...ramps].sort((a, b) => a.percent - b.percent)) {
    const desired = Math.floor(((target * stage.percent) / 100 + 1e-9) / increment) * increment;
    if (desired <= 0 || desired >= target || (!noBar && desired < bar)) continue;
    const assembly = noBar
      ? { actual: desired, residual: 0, perSide: [] }
      : assemblePlates(desired, bar, plates);
    if (assembly.actual <= 0 || assembly.actual >= target || seen.has(assembly.actual)) continue;
    seen.add(assembly.actual);
    sets.push({
      reps: stage.reps,
      requestedPercent: stage.percent,
      actualPercent: (assembly.actual / target) * 100,
      desired,
      ...assembly,
    });
  }
  if (!sets.length && !noBar && bar > 0)
    sets.push({
      reps: 8,
      requestedPercent: 0,
      actualPercent: (bar / target) * 100,
      desired: bar,
      actual: bar,
      residual: 0,
      perSide: [],
    });
  return { noBar, sets };
}
export function estimateOneRepMax(weight: number, reps: number) {
  if (
    !Number.isFinite(weight) ||
    weight <= 0 ||
    weight > 2200 ||
    !Number.isInteger(reps) ||
    reps < 1 ||
    reps > 12
  )
    throw new Error("Use a positive load and 1–12 completed repetitions.");
  return reps === 1
    ? { epley: weight, brzycki: weight }
    : { epley: weight * (1 + reps / 30), brzycki: (weight * 36) / (37 - reps) };
}
