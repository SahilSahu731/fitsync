import type { ExperienceLevel, FitnessGoal } from "@/features/auth/types";

export const FITNESS_GOALS: {
  value: FitnessGoal;

  title: string;

  description: string;
}[] = [
  {
    value: "BUILD_MUSCLE",

    title: "Build muscle",

    description: "Hypertrophy and progressive overload.",
  },

  {
    value: "GET_STRONGER",

    title: "Get stronger",

    description: "Increase strength on your major lifts.",
  },

  {
    value: "LOSE_FAT",

    title: "Lose fat",

    description: "Improve body composition while training consistently.",
  },

  {
    value: "IMPROVE_ENDURANCE",

    title: "Improve endurance",

    description: "Increase conditioning and work capacity.",
  },

  {
    value: "STAY_ACTIVE",

    title: "Stay active",

    description: "Build a sustainable training habit.",
  },

  {
    value: "OTHER",

    title: "Something else",

    description: "Use FitSync without a specific goal.",
  },
];

export const EXPERIENCE_LEVELS: {
  value: ExperienceLevel;

  title: string;

  description: string;
}[] = [
  {
    value: "BEGINNER",

    title: "Beginner",

    description: "Still learning the fundamentals.",
  },

  {
    value: "INTERMEDIATE",

    title: "Intermediate",

    description: "Training consistently with solid fundamentals.",
  },

  {
    value: "ADVANCED",

    title: "Advanced",

    description: "Years of structured training experience.",
  },
];
