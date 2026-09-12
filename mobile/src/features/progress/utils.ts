import type { PersonalRecord } from "./types";

export function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}m`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  }

  return Math.round(value).toLocaleString();
}

export function formatDurationHours(seconds: number): string {
  const hours = Math.floor(seconds / 3600);

  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

export function prettifyEnum(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatPRType(record: PersonalRecord): string {
  switch (record.record_type) {
    case "WEIGHT":
      return "Weight PR";

    case "ESTIMATED_1RM":
      return "Estimated 1RM PR";

    case "SET_VOLUME":
      return "Set Volume PR";

    case "REPS_AT_WEIGHT":
      return record.weight > 0 ? "Rep PR" : "Rep PR";
  }
}

export function formatPRPerformance(record: PersonalRecord): string {
  if (record.weight > 0) {
    return `${record.weight} ${record.weight_unit} × ` + `${record.reps}`;
  }

  return `${record.reps} reps`;
}

export function relativeDate(value: string): string {
  const then = new Date(value);

  const now = new Date();

  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);

  if (days <= 0) {
    return "Today";
  }

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return `${days} days ago`;
  }

  return then.toLocaleDateString(undefined, {
    month: "short",

    day: "numeric",
  });
}
