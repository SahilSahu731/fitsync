import type { Profile } from "@/src/context/session";

export type Draft = Omit<Profile, "completedAt">;
export type StepProps = { draft: Draft; update: (patch: Partial<Draft>) => void };
export const DEFAULT_DRAFT: Draft = {
  gender: "prefer_not_to_say", heightCm: 175, weightKg: 70, bodyType: null,
  goal: "muscle", experience: "beginner", trainingDays: 4,
  minutesPerWorkout: 45, equipment: "gym",
};
export const STEPS = [
  { label: "Your goal", title: "What brings you here?", subtitle: "Pick what matters most to you right now." },
  { label: "Experience", title: "Find your starting point.", subtitle: "Every level belongs here." },
  { label: "Height", title: "How tall are you?", subtitle: "A starting point. You can change it later." },
  { label: "Weight", title: "How much you weigh?.", subtitle: "Add your current weight. No judgment." },
  { label: "Your routine", title: "Make room for you.", subtitle: "A routine that fits your life is easier to keep." },
  { label: "Your space", title: "Where will you train?", subtitle: "Choose the equipment you usually have." },
  { label: "About you", title: "A little more about you.", subtitle: "These details are optional. Skip if you prefer." },
  { label: "Ready when you are", title: "Looks like a good start.", subtitle: "Tap any detail to make a change." },
] as const;
export const GOALS = [
  { value: "muscle", title: "Build muscle", description: "Grow stronger, one rep at a time.", icon: "arm-flex-outline" },
  { value: "strength", title: "Get stronger", description: "Build confidence in your lifts.", icon: "weight-lifter" },
  { value: "fat_loss", title: "Lose fat", description: "Work toward your body composition goals.", icon: "fire" },
  { value: "fitness", title: "Feel fitter", description: "More movement. More everyday energy.", icon: "heart-pulse" },
] as const;
export const EXPERIENCE = [
  { value: "beginner", title: "Just getting started", description: "New to training, or finding my way back.", icon: "sprout-outline" },
  { value: "intermediate", title: "Finding my rhythm", description: "I train regularly and know the basics.", icon: "dumbbell" },
  { value: "advanced", title: "In my element", description: "Training is already part of my routine.", icon: "lightning-bolt-outline" },
] as const;
export const EQUIPMENT = [
  { value: "gym", title: "At the gym", description: "Machines, cables and free weights.", icon: "weight-lifter" },
  { value: "dumbbells", title: "With dumbbells", description: "A few weights. Plenty of possibilities.", icon: "dumbbell" },
  { value: "bodyweight", title: "Just me", description: "A little space is all I need.", icon: "human-handsup" },
] as const;

// Saved drafts are untrusted local data; restore only supported values.
export function restoreDraft(value: unknown): Draft {
  const draft = { ...DEFAULT_DRAFT };
  if (!value || typeof value !== "object") return draft;
  const raw = value as Record<string, unknown>;
  for (const key of ["gender", "goal", "experience", "equipment", "bodyType"] as const) {
    const options = { gender: ["male", "female", "prefer_not_to_say"], goal: GOALS.map(o => o.value), experience: EXPERIENCE.map(o => o.value), equipment: EQUIPMENT.map(o => o.value), bodyType: ["slim", "medium", "broad", null] };
    if ((options[key] as unknown[]).includes(raw[key])) Object.assign(draft, { [key]: raw[key] });
  }
  for (const [key, min, max] of [["heightCm", 100, 250], ["weightKg", 25, 350], ["trainingDays", 1, 7]] as const) {
    const number = raw[key];
    if (typeof number === "number" && Number.isFinite(number) && number >= min && number <= max) {
      draft[key] = key === "trainingDays" ? Math.round(number) : number;
    }
  }
  if ([30, 45, 60].includes(Number(raw.minutesPerWorkout))) draft.minutesPerWorkout = Number(raw.minutesPerWorkout) as 30 | 45 | 60;
  return draft;
}
