export type ToolId =
    | "one-rep-max"
    | "plate-calculator"
    | "workout-volume"
    | "warmup-sets";

export type ToolDefinition = {
    id: ToolId;
    name: string;
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