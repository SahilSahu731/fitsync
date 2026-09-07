import { create } from "zustand";

import {
  authenticateGoogleToken,
  getCurrentUser,
  logoutRequest,
  verifyEmailCode,
} from "./api";

import {
  clearTokens,
  getMemoryTokens,
  hydrateTokens,
  saveTokens,
} from "./token-storage";

import { queryClient } from "@/lib/query/query-client";

import type { AuthStatus, User } from "./types";

interface EmailVerificationInput {
  challengeId: string;

  code: string;
}

interface AuthState {
  status: AuthStatus;

  user: User | null;

  bootstrap: () => Promise<void>;

  authenticateWithEmail: (input: EmailVerificationInput) => Promise<void>;

  authenticateWithGoogle: (idToken: string) => Promise<void>;

  setUser: (user: User) => void;

  refreshUser: () => Promise<User>;

  logout: () => Promise<void>;

  clearLocalSession: () => Promise<void>;

  invalidateSession: () => void;
}

let bootstrapPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set) => {
  async function runBootstrap() {
    set({
      status: "booting",
    });

    const tokens = await hydrateTokens();

    if (!tokens) {
      set({
        status: "unauthenticated",

        user: null,
      });

      return;
    }

    try {
      const user = await getCurrentUser();

      set({
        status: "authenticated",

        user,
      });
    } catch {
      if (!getMemoryTokens()) {
        set({
          status: "unauthenticated",

          user: null,
        });

        return;
      }

      set({
        status: "offline",

        user: null,
      });
    }
  }

  async function clearLocalSession() {
    await clearTokens();

    queryClient.clear();

    set({
      status: "unauthenticated",

      user: null,
    });
  }

  return {
    status: "booting",

    user: null,

    bootstrap: async () => {
      if (!bootstrapPromise) {
        bootstrapPromise = runBootstrap().finally(() => {
          bootstrapPromise = null;
        });
      }

      return bootstrapPromise;
    },

    authenticateWithEmail: async (input) => {
      const response = await verifyEmailCode(input);

      await saveTokens(response.tokens);

      queryClient.clear();

      set({
        status: "authenticated",

        user: response.user,
      });
    },

    authenticateWithGoogle: async (idToken) => {
      const response = await authenticateGoogleToken(idToken);

      await saveTokens(response.tokens);

      queryClient.clear();

      set({
        status: "authenticated",

        user: response.user,
      });
    },

    setUser: (user) => {
      set({
        user,
      });
    },

    refreshUser: async () => {
      const user = await getCurrentUser();

      set({
        user,

        status: "authenticated",
      });

      return user;
    },

    logout: async () => {
      try {
        await logoutRequest();
      } catch {
        // Offline logout should still work.
      } finally {
        await clearLocalSession();
      }
    },

    clearLocalSession,

    invalidateSession: () => {
      queryClient.clear();

      set({
        status: "unauthenticated",

        user: null,
      });
    },
  };
});
