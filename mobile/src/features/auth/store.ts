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

import {
  clearCachedUser,
  getCachedUser,
  saveCachedUser,
} from "./offline-user-storage";

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
      await clearCachedUser();

      set({
        status: "unauthenticated",

        user: null,
      });

      return;
    }

    /*
     * Load cached user immediately.
     *
     * This lets FitSync boot offline.
     */
    const cachedUser = await getCachedUser();

    try {
      const user = await getCurrentUser();

      await saveCachedUser(user);

      set({
        status: "authenticated",

        user,
      });
    } catch {
      /*
       * If token refresh invalidated the tokens,
       * the API layer should already have cleared
       * memory tokens.
       */
      if (!getMemoryTokens()) {
        await clearCachedUser();

        set({
          status: "unauthenticated",

          user: null,
        });

        return;
      }

      /*
       * Network failed, but credentials +
       * cached user still exist.
       *
       * Continue in offline mode.
       */
      if (cachedUser) {
        set({
          status: "offline",

          user: cachedUser,
        });

        return;
      }

      /*
       * Tokens exist but we've never cached
       * a user profile.
       *
       * We cannot safely construct one.
       */
      set({
        status: "offline",

        user: null,
      });
    }
  }

  async function clearLocalSession() {
    await clearTokens();

    await clearCachedUser();

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

      await saveCachedUser(response.user);

      queryClient.clear();

      set({
        status: "authenticated",

        user: response.user,
      });
    },

    authenticateWithGoogle: async (idToken) => {
      const response = await authenticateGoogleToken(idToken);

      await saveTokens(response.tokens);

      await saveCachedUser(response.user);

      queryClient.clear();

      set({
        status: "authenticated",

        user: response.user,
      });
    },

    setUser: (user) => {
      void saveCachedUser(user);

      set({
        user,
      });
    },

    refreshUser: async () => {
      const user = await getCurrentUser();

      await saveCachedUser(user);

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
        /*
         * Offline logout is still allowed.
         */
      } finally {
        await clearLocalSession();
      }
    },

    clearLocalSession,

    invalidateSession: () => {
      queryClient.clear();

      void clearCachedUser();

      set({
        status: "unauthenticated",

        user: null,
      });
    },
  };
});
