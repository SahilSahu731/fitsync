import type { SetType } from "./api";
export const SET_TYPES: {
  value: SetType;
  label: string;
  letter: string;
  color: string;
  description: string;
}[] = [
  {
    value: "normal",
    label: "Normal",
    letter: "N",
    color: "#FFFFFF",
    description: "A regular working set",
  },
  {
    value: "warmup",
    label: "Warm-up",
    letter: "W",
    color: "#BDBDBD",
    description: "Preparation before working sets",
  },
  {
    value: "heavy",
    label: "Heavy",
    letter: "H",
    color: "#DEDEDE",
    description: "A heavier training set",
  },
  {
    value: "failure",
    label: "Failure",
    letter: "F",
    color: "#FFFFFF",
    description: "A set taken to muscular failure",
  },
  {
    value: "drop",
    label: "Drop",
    letter: "D",
    color: "#A3A3A3",
    description: "Reduced load after another set",
  },
];
export function setAppearance(type: SetType) {
  return SET_TYPES.find((item) => item.value === type) ?? SET_TYPES[0];
}
