import type { SetType } from "./api";
export const SET_TYPES: { value: SetType; label: string; letter: string; color: string; description: string }[] = [
  { value: "normal", label: "Normal", letter: "N", color: "#60A5FA", description: "A regular working set" },
  { value: "warmup", label: "Warm-up", letter: "W", color: "#FBBF24", description: "Preparation before working sets" },
  { value: "heavy", label: "Heavy", letter: "H", color: "#C084FC", description: "A heavier training set" },
  { value: "failure", label: "Failure", letter: "F", color: "#FB7185", description: "A set taken to muscular failure" },
  { value: "drop", label: "Drop", letter: "D", color: "#2DD4BF", description: "Reduced load after another set" },
];
export function setAppearance(type: SetType) { return SET_TYPES.find(item => item.value === type) ?? SET_TYPES[0]; }
