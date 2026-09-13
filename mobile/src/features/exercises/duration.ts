export function formatExerciseDuration(seconds: number | null): string {
  if (seconds === null) {
    return "";
  }

  const safe = Math.max(0, Math.floor(seconds));

  const hours = Math.floor(safe / 3600);

  const minutes = Math.floor((safe % 3600) / 60);

  const remaining = safe % 60;

  if (hours > 0) {
    return (
      `${hours}:` +
      `${minutes.toString().padStart(2, "0")}:` +
      `${remaining.toString().padStart(2, "0")}`
    );
  }

  return `${minutes}:` + `${remaining.toString().padStart(2, "0")}`;
}

export function parseExerciseDuration(value: string): number | null {
  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  if (/^\d+$/.test(cleaned)) {
    return Number(cleaned);
  }

  const parts = cleaned.split(":").map(Number);

  if (parts.some((value) => Number.isNaN(value))) {
    return null;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;

    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;

    return hours * 3600 + minutes * 60 + seconds;
  }

  return null;
}
