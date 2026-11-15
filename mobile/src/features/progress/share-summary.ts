import type { ProgressAnalytics } from "./analytics";
import { dateLabel, weightValue } from "./model";

export function progressShareSummary(data: ProgressAnalytics, unit: "kg" | "lb") {
  const format = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  const range = `${dateLabel(data.start, { month: "short", day: "numeric", year: "numeric" })} – ${dateLabel(data.today, { month: "short", day: "numeric", year: "numeric" })}`;
  const stats = [
    {
      label: "Workouts",
      value: format(data.current.workouts),
      suffix: "completed",
      icon: "dumbbell",
      color: "#C5F460",
    },
    {
      label: "Training time",
      value: format(data.current.minutes),
      suffix: "minutes",
      icon: "timer-outline",
      color: "#7DCFFF",
    },
    {
      label: "Working sets",
      value: format(data.current.sets),
      suffix: "completed",
      icon: "layers-outline",
      color: "#FFB38A",
    },
    {
      label: "Volume load",
      value: format(weightValue(data.current.volume, unit)),
      suffix: `${unit} × reps`,
      icon: "weight-lifter",
      color: "#D4B5FF",
    },
  ] as const;
  const message = [
    "My FitSync progress",
    range,
    "",
    ...stats.map((stat) => `${stat.label}: ${stat.value} ${stat.suffix}`),
    "",
    "One session at a time.",
  ].join("\n");
  return { range, stats, message };
}
