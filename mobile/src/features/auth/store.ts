import {
  create,
} from "zustand";

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
  queryClient,
} from "@/lib/query/query-client";

import type {
  AuthStatus,
  User,
} from "./types";

interface EmailVerificationInput {
  challengeId: string;

  code: string;
}

interface AuthState {
  status: AuthStatus;

  user: User | null;

  bootstrap: () => Promise<void>;

  authenticateWithEmail: (
    input: EmailVerificationInput,
  ) => Promise<void>;

  authenticateWithGoogle: (
    idToken: string,
  ) => Promise<void>;

  logout: () => Promise<void>;

  invalidateSession: () => void;
}

let bootstrapPromise:
  | Promise<void>
  | null = null;

export const useAuthStore =
  create<AuthState>((set) => {
    async function runBootstrap(): Promise<void> {
      set({
        status: "booting",
      });

      const tokens =
        await hydrateTokens();

      if (!tokens) {
        set({
          status: "unauthenticated",

          user: null,
        });

        return;
      }

      try {
        /*
         * If the access token has expired,
         * apiClient automatically:
         *
         * 1. receives 401
         * 2. refreshes the FitSync session
         * 3. rotates the refresh token
         * 4. stores the new pair
         * 5. retries /auth/me
         */
        const user =
          await getCurrentUser();

        set({
          status: "authenticated",

          user,
        });
      } catch {
        /*
         * If refresh credentials were
         * explicitly rejected, the Axios
         * interceptor clears SecureStore.
         */
        if (!getMemoryTokens()) {
          set({
            status: "unauthenticated",

            user: null,
          });

          return;
        }

        /*
         * Credentials still exist.
         *
         * This is probably a temporary
         * network/backend outage rather
         * than an invalid session.
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
        /*
         * Prevent multiple bootstraps from
         * running at the same time.
         */
        if (!bootstrapPromise) {
          bootstrapPromise =
            runBootstrap().finally(() => {
              bootstrapPromise = null;
            });
        }

        return bootstrapPromise;
      },

      authenticateWithEmail:
        async (input) => {
          const response =
            await verifyEmailCode(
              input,
            );

          /*
           * Persist credentials BEFORE
           * changing the navigation state.
           */
          await saveTokens(
            response.tokens,
          );

          /*
           * Prevent cached data from a
           * previous account surviving
           * an account switch.
           */
          queryClient.clear();

          set({
            status:
              "authenticated",

            user:
              response.user,
          });
        },

      authenticateWithGoogle:
        async (
          idToken,
        ) => {
          const response =
            await authenticateGoogleToken(
              idToken,
            );

          /*
           * Google proves identity,
           * but from this point onward
           * these are normal FitSync
           * session credentials.
           */
          await saveTokens(
            response.tokens,
          );

          queryClient.clear();

          set({
            status:
              "authenticated",

            user:
              response.user,
          });
        },

      logout: async () => {
        try {
          /*
           * Revoke the current FitSync
           * backend session when online.
           */
          await logoutRequest();
        } catch {
          /*
           * Local logout must still work
           * when offline.
           */
        } finally {
          await clearTokens();

          queryClient.clear();

          set({
            status:
              "unauthenticated",

            user:
              null,
          });
        }
      },

      invalidateSession: () => {
        /*
         * Called by the Axios auth
         * invalidation event when the
         * refresh credential is rejected.
         */
        queryClient.clear();

        set({
          status:
            "unauthenticated",

          user:
            null,
        });
      },
    };
  });