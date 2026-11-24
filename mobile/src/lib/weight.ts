export type WeightUnit = "kg" | "lb";
export const toKg = (value: number, unit: WeightUnit) =>
  unit === "lb" ? value * 0.45359237 : value;
export const fromKg = (value: number, unit: WeightUnit) =>
  unit === "lb" ? value / 0.45359237 : value;
// Use the same practical plate increment in previews and the live logger.
export const weightIncrementKg = (unit: WeightUnit) => toKg(unit === "lb" ? 5 : 2.5, unit);
export const weightText = (kg: number, unit: WeightUnit) =>
  String(Math.round(fromKg(kg, unit) * 100) / 100);
// Completing an untouched lb field must not round-trip its display rounding back
// into storage (which could otherwise manufacture tiny personal bests).
export function inputWeightKg(text: string, storedKg: number | null, unit: WeightUnit) {
  return storedKg !== null && text.trim() === weightText(storedKg, unit)
    ? storedKg
    : toKg(Number(text), unit);
}
