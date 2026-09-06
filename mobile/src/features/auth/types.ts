export interface User {
  id: string;

  email: string;

  display_name: string | null;

  username: string | null;

  avatar_url: string | null;

  email_verified: boolean;

  onboarding_complete: boolean;

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

export type AuthStatus =
  "booting" | "authenticated" | "unauthenticated" | "offline";
