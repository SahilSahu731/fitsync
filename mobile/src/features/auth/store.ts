import { create } from "zustand";

import { getMe, logoutRequest, verifyEmailCode } from "./api";

import {
  clearTokens,
  getMemoryTokens,
  hydrateTokens,
  saveTokens,
} from "./token-storage";

import { queryClient } from "@/lib/query/query-client";

import type { AuthStatus, User } from "./types";

interface VerifyInput {
  challengeId: string;

  code: string;
}

interface AuthState {
  status: AuthStatus;

  user: User | null;

  bootstrap: () => Promise<void>;

  authenticateWithEmail: (input: VerifyInput) => Promise<void>;

  logout: () => Promise<void>;

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
      /*
       * If access JWT expired,
       * apiClient automatically:
       *
       * refreshes
       * rotates tokens
       * retries /auth/me
       */

      const user = await getMe();

      set({
        status: "authenticated",

        user,
      });
    } catch {
      /*
       * If the server explicitly
       * rejected refresh tokens,
       * the interceptor cleared them.
       */

      if (!getMemoryTokens()) {
        set({
          status: "unauthenticated",

          user: null,
        });

        return;
      }

      /*
       * Tokens remain:
       *
       * likely network outage
       * or temporary server error.
       */

      set({
        status: "offline",

        user: null,
      });
    }
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

      /*
       * Credentials MUST persist
       * before auth state flips.
       */

      await saveTokens(response.tokens);

      queryClient.clear();

      set({
        status: "authenticated",

        user: response.user,
      });
    },

    logout: async () => {
      try {
        await logoutRequest();
      } catch {
        /*
         * Local logout must
         * still work offline.
         */
      } finally {
        await clearTokens();

        queryClient.clear();

        set({
          status: "unauthenticated",

          user: null,
        });
      }
    },

    invalidateSession: () => {
      queryClient.clear();

      set({
        status: "unauthenticated",

        user: null,
      });
    },
  };
});
