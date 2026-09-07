import type {
  ExperienceLevel,
  FitnessGoal,
  WeightUnit,
} from "@/features/auth/types";

export interface OnboardingInput {
  display_name: string;

  username: string;

  fitness_goal: FitnessGoal;

  experience_level: ExperienceLevel;

  weight_unit: WeightUnit;

  weekly_workout_target: number;
}

export interface ProfileUpdateInput {
  display_name: string;

  username: string;
}

export interface PreferencesUpdateInput {
  fitness_goal: FitnessGoal;

  experience_level: ExperienceLevel;

  weight_unit: WeightUnit;

  weekly_workout_target: number;
}

export interface UsernameAvailability {
  username: string;

  available: boolean;
}
