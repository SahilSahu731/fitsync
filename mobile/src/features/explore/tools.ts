export type ToolId =
    | "one-rep-max"
    | "plate-calculator"
    | "workout-volume"
    | "warmup-sets"
    | "percentage-load" | "rep-target" | "weight-converter" | "pace-calculator" | "session-time" | "progression" | "rest-planner" | "distance-converter" | "training-density" | "rep-tempo";

export type ToolDefinition = {
    id: string;
    name: string;
    calculator_key?: ToolId;
    cover_url?: string | null;
    explanation?: string;
    example?: string;
    description: string;
    icon:
    | "chart-line"
    | "weight-lifter"
    | "calculator"
    | "fire";
};

export const TOOLS: ToolDefinition[] = [
    {
        id: "one-rep-max",
        name: "Estimated 1RM",
        description:
            "Estimate a single-rep maximum from a recent set.",
        icon: "chart-line"
    },
    {
        id: "plate-calculator",
        name: "Plate calculator",
        description:
            "Find plates to load equally on both barbell sides.",
        icon: "weight-lifter"
    },
    {
        id: "workout-volume",
        name: "Workout volume",
        description:
            "Calculate sets × reps × weight.",
        icon: "calculator"
    },
    {
        id: "warmup-sets",
        name: "Warm-up sets",
        description:
            "Plan gradual warm-up loads for a working set.",
        icon: "fire"
    }
];

export function estimatedOneRepMax(
    weight: number,
    reps: number
) {
    if (
        !Number.isFinite(weight) ||
        !Number.isInteger(reps) ||
        weight <= 0 ||
        reps < 1 ||
        reps > 12
    ) {
        return null;
    }

    return reps === 1
        ? weight
        : Math.round(
            weight * (1 + reps / 30) * 10
        ) / 10;
}

export function workoutVolume(
    sets: number,
    reps: number,
    weight: number
) {
    if (
        ![sets, reps, weight].every(Number.isFinite) ||
        !Number.isInteger(sets) ||
        !Number.isInteger(reps) ||
        sets < 0 ||
        reps < 0 ||
        weight < 0
    ) {
        return null;
    }

    return Math.round(
        sets * reps * weight * 10
    ) / 10;
}

export type PlateCount = {
    weight: number;
    countPerSide: number;
};

export function calculatePlates(
    target: number,
    bar: number,
    plates: number[] = [
        25, 20, 15, 10, 5, 2.5, 1.25
    ]
): {
    perSide: PlateCount[];
    actualTotal: number;
    remaining: number;
} | null {
    if (
        ![target, bar, ...plates].every(Number.isFinite) ||
        bar <= 0 ||
        target < bar ||
        plates.some(x => x <= 0)
    ) {
        return null;
    }

    let remaining = (target - bar) / 2;

    const perSide: PlateCount[] = [];

    for (const weight of [...plates].sort(
        (a, b) => b - a
    )) {
        const countPerSide = Math.floor(
            (remaining + 1e-8) / weight
        );

        if (countPerSide > 0) {
            perSide.push({
                weight,
                countPerSide
            });
        }

        remaining -= countPerSide * weight;
    }

    remaining = Math.max(
        0,
        Math.round(remaining * 1000) / 1000
    );

    return {
        perSide,
        actualTotal:
            Math.round(
                (target - remaining * 2) * 1000
            ) / 1000,
        remaining
    };
}

export function warmupLoads(
    workingWeight: number,
    increment = 2.5
) {
    if (
        !Number.isFinite(workingWeight) ||
        workingWeight <= 0 ||
        !Number.isFinite(increment) ||
        increment <= 0
    ) {
        return null;
    }

    return [0.5, 0.7, 0.85].map(
        fraction =>
            Math.round(
                (workingWeight * fraction) / increment
            ) * increment
    );
}
export type CalculatorField = { key: string; label: string; initial: string };
export const EXTRA_CALCULATORS: Record<string, { fields: CalculatorField[]; calculate: (values: Record<string, number>) => string | null }> = {
  "percentage-load": { fields: [{ key: "weight", label: "Reference load (kg)", initial: "100" }, { key: "percent", label: "Percentage (0–100)", initial: "80" }], calculate: v => v.weight > 0 && v.percent > 0 && v.percent <= 100 ? `${round(v.weight * v.percent / 100)} kg` : null },
  "rep-target": { fields: [{ key: "weight", label: "Estimated 1RM (kg)", initial: "80" }, { key: "reps", label: "Target reps (1–12)", initial: "8" }], calculate: v => v.weight > 0 && integer(v.reps, 1, 12) ? `${round(v.reps === 1 ? v.weight : v.weight / (1 + v.reps / 30))} kg estimated load` : null },
  "weight-converter": { fields: [{ key: "weight", label: "Weight", initial: "20" }, { key: "direction", label: "Direction: 1 = kg to lb, 2 = lb to kg", initial: "1" }], calculate: v => v.weight >= 0 && [1, 2].includes(v.direction) ? `${round(v.direction === 1 ? v.weight / 0.45359237 : v.weight * 0.45359237, 3)} ${v.direction === 1 ? "lb" : "kg"}` : null },
  "pace-calculator": { fields: [{ key: "distance", label: "Distance (km)", initial: "5" }, { key: "minutes", label: "Elapsed minutes (decimal allowed)", initial: "30" }], calculate: v => { if (v.distance <= 0 || v.minutes <= 0) return null; const sec = Math.round(v.minutes * 60 / v.distance); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")} /km · ${round(v.distance * 60 / v.minutes)} km/h`; } },
  "session-time": { fields: [{ key: "sets", label: "Total straight sets", initial: "4" }, { key: "seconds", label: "Seconds per set", initial: "40" }, { key: "rest", label: "Rest between sets (seconds)", initial: "120" }], calculate: v => integer(v.sets, 1, 1000) && v.seconds > 0 && v.rest >= 0 ? duration(v.sets * v.seconds + (v.sets - 1) * v.rest) : null },
  "progression": { fields: [{ key: "weight", label: "Current load (kg)", initial: "50" }, { key: "reps", label: "Lowest completed reps across ALL sets", initial: "12" }, { key: "target", label: "Top of planned rep range", initial: "12" }, { key: "increase", label: "Chosen load increase (kg)", initial: "2.5" }], calculate: v => v.weight > 0 && v.increase > 0 && integer(v.reps, 0, 1000) && integer(v.target, 1, 1000) ? v.reps >= v.target ? `Candidate next load: ${round(v.weight + v.increase)} kg, if technique and effort met your plan` : `Repeat ${v.weight} kg until every set meets your target` : null },
  "rest-planner": { fields: [{ key: "exercises", label: "Exercises", initial: "4" }, { key: "sets", label: "Sets per exercise", initial: "3" }, { key: "rest", label: "Rest between sets (seconds)", initial: "90" }], calculate: v => integer(v.exercises, 1, 100) && integer(v.sets, 1, 100) && v.rest >= 0 ? duration(v.exercises * (v.sets - 1) * v.rest) : null },
  "distance-converter": { fields: [{ key: "distance", label: "Distance", initial: "5" }, { key: "direction", label: "Direction: 1 = km to miles, 2 = miles to km", initial: "1" }], calculate: v => v.distance >= 0 && [1, 2].includes(v.direction) ? `${round(v.direction === 1 ? v.distance / 1.609344 : v.distance * 1.609344, 3)} ${v.direction === 1 ? "miles" : "km"}` : null },
  "training-density": { fields: [{ key: "volume", label: "Volume load (kg)", initial: "1200" }, { key: "minutes", label: "Elapsed session minutes", initial: "20" }], calculate: v => v.volume >= 0 && v.minutes > 0 ? `${round(v.volume / v.minutes)} kg/min` : null },
  "rep-tempo": { fields: [{ key: "reps", label: "Repetitions", initial: "8" }, { key: "down", label: "Lowering seconds", initial: "3" }, { key: "bottom", label: "Bottom pause seconds", initial: "1" }, { key: "up", label: "Lifting seconds", initial: "1" }, { key: "top", label: "Top pause seconds", initial: "0" }], calculate: v => integer(v.reps, 1, 1000) && [v.down, v.bottom, v.up, v.top].every(n => n >= 0) && v.down + v.bottom + v.up + v.top > 0 ? duration(v.reps * (v.down + v.bottom + v.up + v.top)) : null },
};
function integer(n: number, min: number, max: number) { return Number.isInteger(n) && n >= min && n <= max; }
function round(n: number, places = 1) { return Math.round(n * 10 ** places) / 10 ** places; }
function duration(n: number) { const seconds = Math.round(n); return `${Math.floor(seconds / 60)} min ${seconds % 60} sec`; }
export function calculateExtra(id: string, raw: Record<string, string>) {
  const definition = EXTRA_CALCULATORS[id];
  if (!definition || definition.fields.some(f => !raw[f.key]?.trim() || !Number.isFinite(Number(raw[f.key])) || Math.abs(Number(raw[f.key])) > 1e9)) return null;
  return definition.calculate(Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Number(value)])));
}
