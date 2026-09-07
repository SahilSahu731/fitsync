export type FitnessGoal =
  | "BUILD_MUSCLE"
  | "GET_STRONGER"
  | "LOSE_FAT"
  | "STAY_ACTIVE"
  | "IMPROVE_ENDURANCE"
  | "OTHER";

export type ExperienceLevel =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED";

export type WeightUnit =
  | "KG"
  | "LB";

export interface User {
  id: string;

  email: string;

  display_name: string | null;

  username: string | null;

  avatar_url: string | null;

  email_verified: boolean;

  onboarding_complete: boolean;

  fitness_goal: FitnessGoal | null;

  experience_level:
    ExperienceLevel | null;

  weight_unit: WeightUnit;

  weekly_workout_target: number;

  created_at: string;
}

export interface TokenPair {
  access_token: string;

  refresh_token: string;

  token_type: "bearer";

  expires_in: number;
}

export interface EmailStartResponse {
  challenge_id: string;

  expires_in: number;

  resend_after: number;
}

export interface EmailAuthResponse {
  user: User;

  tokens: TokenPair;

  is_new_user: boolean;
}

export interface GoogleAuthResponse {
  user: User;

  tokens: TokenPair;

  is_new_user: boolean;
}

export type AuthStatus =
  | "booting"
  | "authenticated"
  | "unauthenticated"
  | "offline";