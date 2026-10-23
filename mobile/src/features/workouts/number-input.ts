// A fixed origin prevents rounding errors accumulating across gesture frames.
export function dragNumber(start: number, dy: number, step: number, max: number) {
  const value = start - Math.trunc(dy / 10) * step;
  return String(Math.round(Math.max(0, Math.min(max, value)) * 100) / 100);
}
