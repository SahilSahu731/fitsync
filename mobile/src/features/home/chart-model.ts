import type { HealthPoint } from "./health-model";
import type { HomeSnapshot } from "./model";

export type MacroKey = "protein" | "carbs" | "fat";
export type MacroItem = {
  key: MacroKey;
  label: string;
  grams: number | null;
  energy: number | null;
  color: string;
  fraction: number;
};
export type MacroBreakdown = {
  items: MacroItem[];
  /** Energy represented by the recorded macros, separate from logged food calories. */
  totalEnergy: number;
  recorded: number;
  complete: boolean;
};

const MACROS = [
  { key: "protein", label: "Protein", color: "#C5F460", energyPerGram: 4 },
  { key: "carbs", label: "Carbs", color: "#80CBFF", energyPerGram: 4 },
  { key: "fat", label: "Fat", color: "#FFB184", energyPerGram: 9 },
] as const;

/** Unknown macros stay unknown; a recorded zero still counts as a complete entry. */
export function macroBreakdown(snapshot: HomeSnapshot, date: string): MacroBreakdown {
  const values = new Map(
    snapshot.metrics
      .filter((entry) => entry.date === date)
      .map((entry) => [entry.metric, entry.value]),
  );
  const items = MACROS.map(({ key, label, color, energyPerGram }) => {
    const value = values.get(key);
    const known =
      value != null &&
      Number.isFinite(value) &&
      value >= 0 &&
      Number.isFinite(value * energyPerGram);
    return {
      key,
      label,
      color,
      grams: known ? value : null,
      energy: known ? value * energyPerGram : null,
      fraction: 0,
    };
  });
  const totalEnergy = items.reduce((sum, item) => sum + (item.energy ?? 0), 0);
  const recorded = items.filter((item) => item.grams != null).length;
  return {
    items: items.map((item) => ({
      ...item,
      fraction: totalEnergy > 0 ? (item.energy ?? 0) / totalEnergy : 0,
    })),
    totalEnergy,
    recorded,
    complete: recorded === MACROS.length,
  };
}

/** Use the requested date range even when that date has no food-calorie entry. */
export function macroHistory(snapshot: HomeSnapshot, points: HealthPoint[]) {
  return points.map(({ date }) => ({ date, breakdown: macroBreakdown(snapshot, date) }));
}

const DAY_MS = 24 * 60 * 60 * 1000;
function calendarDay(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const value = Date.parse(`${date}T12:00:00Z`);
  return Number.isFinite(value) && new Date(value).toISOString().slice(0, 10) === date
    ? value
    : null;
}

/** Monday-first rows. Null cells outside the selected range have no date to select. */
export function workoutCalendar(points: HealthPoint[]): (HealthPoint | null)[] {
  const dated = points
    .map((point) => ({ point, day: calendarDay(point.date) }))
    .filter((entry): entry is { point: HealthPoint; day: number } => entry.day != null)
    .sort((left, right) => left.day - right.day);
  if (!dated.length) return [];

  const first = dated[0].day;
  const last = dated[dated.length - 1].day;
  const leading = (new Date(first).getUTCDay() + 6) % 7;
  const days = Math.round((last - first) / DAY_MS) + 1;
  const count = Math.ceil((leading + days) / 7) * 7;
  const values = new Map(dated.map(({ point }) => [point.date, point.value]));

  return Array.from({ length: count }, (_, index) => {
    const offset = index - leading;
    if (offset < 0 || offset >= days) return null;
    const date = new Date(first + offset * DAY_MS).toISOString().slice(0, 10);
    const value = values.get(date);
    return {
      date,
      value: value != null && Number.isFinite(value) && value >= 0 ? value : null,
    };
  });
}
