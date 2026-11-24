import { trackEvent, recordError } from "@/src/services/telemetry";
import { unregisterProgramNotifications } from "@/src/features/program-follow/notifications";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { GoogleSignin, isSuccessResponse } from "@react-native-google-signin/google-signin";
import { createAvatarForm } from "@/src/services/avatar-upload";
import { deleteAccountData } from "@/src/services/account-data";

import {
  apiRequest,
  cacheSessionSnapshot,
  clearSessionTokens,
  googleBackendLogin,
  hasStoredSession,
  HttpError,
  readSessionSnapshot,
  restoreBackendSession,
  storeSessionTokens,
} from "@/src/services/api";

export type Gender = "male" | "female" | "prefer_not_to_say";

export type Goal = "muscle" | "strength" | "fat_loss" | "fitness";

export type Experience = "beginner" | "intermediate" | "advanced";

export type Equipment = "gym" | "dumbbells" | "bodyweight";

export type BodyType = "slim" | "medium" | "broad";

export type Profile = {
  goal: Goal;
  experience: Experience;
  gender: Gender;

  heightCm: number;
  weightKg: number;
  bodyType: BodyType | null;

  trainingDays: number;
  minutesPerWorkout: 30 | 45 | 60;
  equipment: Equipment;

  completedAt: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  bio: string;
  avatarUrl: string | null;
  hasCustomAvatar: boolean;
  createdAt: string;
};

export type UserSettings = {
  weightUnit: "kg" | "lb";
  restSeconds: 30 | 60 | 90 | 120 | 180;
  workoutReminders: boolean;
};

export type MeResponse = {
  user: AuthUser;
  profile: Profile | null;
  settings: UserSettings;
};

function isMeResponse(value: unknown): value is MeResponse {
  if (!value || typeof value !== "object") return false;
  const { user, profile, settings } = value as MeResponse;
  if (
    !user ||
    typeof user.id !== "string" ||
    !user.id.trim() ||
    typeof user.email !== "string" ||
    typeof user.name !== "string" ||
    typeof user.bio !== "string" ||
    (user.avatarUrl !== null && typeof user.avatarUrl !== "string") ||
    typeof user.hasCustomAvatar !== "boolean" ||
    typeof user.createdAt !== "string" ||
    !settings ||
    !["kg", "lb"].includes(settings.weightUnit) ||
    ![30, 60, 90, 120, 180].includes(settings.restSeconds) ||
    typeof settings.workoutReminders !== "boolean"
  )
    return false;
  return (
    profile === null ||
    Boolean(
      profile &&
      ["muscle", "strength", "fat_loss", "fitness"].includes(profile.goal) &&
      ["beginner", "intermediate", "advanced"].includes(profile.experience) &&
      ["male", "female", "prefer_not_to_say"].includes(profile.gender) &&
      Number.isFinite(profile.heightCm) &&
      Number.isFinite(profile.weightKg) &&
      [null, "slim", "medium", "broad"].includes(profile.bodyType) &&
      Number.isInteger(profile.trainingDays) &&
      profile.trainingDays >= 1 &&
      profile.trainingDays <= 7 &&
      [30, 45, 60].includes(profile.minutesPerWorkout) &&
      ["gym", "dumbbells", "bodyweight"].includes(profile.equipment) &&
      typeof profile.completedAt === "string",
    )
  );
}

type SessionContextType = {
  ready: boolean;

  user: AuthUser | null;
  profile: Profile | null;
  settings: UserSettings | null;

  signInGoogle: () => Promise<boolean>;
  reloadMe: () => Promise<void>;

  saveProfile: (value: Profile) => Promise<void>;

  updateAccount: (value: Partial<Pick<AuthUser, "name" | "bio">>) => Promise<void>;

  updateFitness: (value: Partial<Omit<Profile, "completedAt">>) => Promise<void>;

  updateSettings: (value: Partial<UserSettings>) => Promise<void>;

  uploadAvatar: (uri: string, mimeType?: string) => Promise<void>;
  removeAvatar: () => Promise<void>;

  redoOnboarding: () => Promise<void>;

  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const SessionContext = createContext<SessionContextType | null>(null);

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const identity = useRef<string | null>(null);
  const generation = useRef(0);

  const [user, setUser] = useState<AuthUser | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);

  const [settings, setSettings] = useState<UserSettings | null>(null);

  const applyMe = useCallback((data: MeResponse, persist = true) => {
    if (!isMeResponse(data))
      throw new Error("The server returned incomplete account information. Please try again.");
    identity.current = data.user.id;
    setUser(data.user);
    setProfile(data.profile);
    setSettings(data.settings);
    if (persist)
      void cacheSessionSnapshot(data).catch((error) => recordError(error, "session_cache"));
  }, []);

  const resetState = useCallback(() => {
    identity.current = null;
    generation.current++;
    setUser(null);
    setProfile(null);
    setSettings(null);
  }, []);

  const accountRequest = useCallback(
    async (path: string, options: Parameters<typeof apiRequest>[1] = {}) => {
      const ownerId = identity.current;
      const revision = generation.current;
      if (!ownerId) throw new Error("Sign in to update your account.");
      const response = await apiRequest<MeResponse>(path, { ...options, expectedOwnerId: ownerId });
      if (
        identity.current !== ownerId ||
        generation.current !== revision ||
        response.user.id !== ownerId
      )
        throw new Error("Your account changed. Reopen this screen.");
      return response;
    },
    [],
  );

  const reloadMe = useCallback(async () => {
    const data = await accountRequest("/me");
    applyMe(data);
  }, [applyMe, accountRequest]);

  // Restore backend session after reopening the app.

  useEffect(() => {
    let mounted = true;
    const revision = generation.current;
    const current = () => mounted && generation.current === revision;

    async function restore() {
      try {
        const cached = await readSessionSnapshot<unknown>();
        if (!current()) return;
        if (isMeResponse(cached)) applyMe(cached, false);
      } catch (error) {
        recordError(error, "session_cache_restore");
      }
      if (!current()) return;
      // Open saved workouts immediately; server verification continues in the background.
      setReady(true);
      try {
        const exists = await restoreBackendSession();
        if (!current()) return;
        if (!exists) {
          resetState();
          return;
        }
        const data = await apiRequest<MeResponse>("/me");
        if (current()) applyMe(data);
      } catch (error) {
        recordError(error, "session_restore");
        if (!current()) return;
        if (error instanceof HttpError && (error.status === 401 || error.status === 403)) {
          await clearSessionTokens().catch((cause) => recordError(cause, "session_clear"));
          if (current()) resetState();
          return;
        }
        try {
          // A network failure preserves local access; revoked/missing credentials do not.
          const stored = await hasStoredSession();
          if (current() && !stored) resetState();
        } catch (cause) {
          recordError(cause, "session_credentials_read");
        }
      }
    }

    restore();

    return () => {
      mounted = false;
    };
  }, [applyMe, resetState]);

  const signInGoogle = useCallback(async () => {
    const revision = ++generation.current;
    const current = () => generation.current === revision;
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    trackEvent("sign_in_started");
    const response = await GoogleSignin.signIn();
    if (!current()) throw new Error("Your account changed. Please try again.");

    if (!isSuccessResponse(response)) {
      return false;
    }

    let idToken = response.data.idToken;

    if (!idToken) {
      const tokens = await GoogleSignin.getTokens();
      idToken = tokens.idToken;
    }

    if (!idToken) {
      throw new Error("Google did not provide an ID token.");
    }

    // Verify the identity on our Express backend.

    const result = await googleBackendLogin(idToken);
    if (!current()) throw new Error("Your account changed. Please try again.");

    const user = result.user;
    const settings = result.settings;

    if (!isMeResponse({ user, profile: result.profile, settings })) {
      throw new Error("The server returned incomplete account information. Please try again.");
    }

    await storeSessionTokens({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    if (!current()) throw new Error("Your account changed. Please try again.");

    const data = result as unknown as MeResponse;
    applyMe(data);
    trackEvent("sign_in_completed");

    return true;
  }, [applyMe]);

  const saveProfile = useCallback(
    async (value: Profile) => {
      const { completedAt, ...input } = value;

      const response = await accountRequest("/me/profile", {
        method: "PUT",
        json: input,
      });

      applyMe(response);
    },
    [applyMe, accountRequest],
  );

  const updateAccount = useCallback(
    async (value: { name?: string; bio?: string }) => {
      const response = await accountRequest("/me", {
        method: "PATCH",
        json: value,
      });

      applyMe(response);
    },
    [applyMe, accountRequest],
  );

  const updateFitness = useCallback(
    async (value: Partial<Omit<Profile, "completedAt">>) => {
      const response = await accountRequest("/me/profile", {
        method: "PATCH",
        json: value,
      });

      applyMe(response);
    },
    [applyMe, accountRequest],
  );

  const updateSettings = useCallback(
    async (value: Partial<UserSettings>) => {
      const response = await accountRequest("/me/settings", {
        method: "PATCH",
        json: value,
      });

      applyMe(response);
    },
    [applyMe, accountRequest],
  );

  const uploadAvatar = useCallback(
    async (uri: string, mimeType = "image/jpeg") => {
      const form = await createAvatarForm(uri, mimeType);

      const response = await accountRequest("/me/avatar", {
        method: "POST",
        form,
      });

      applyMe(response);
    },
    [applyMe, accountRequest],
  );

  const removeAvatar = useCallback(async () => {
    const response = await accountRequest("/me/avatar", {
      method: "DELETE",
    });

    applyMe(response);
  }, [applyMe, accountRequest]);

  const redoOnboarding = useCallback(async () => {
    const response = await accountRequest("/me/profile", {
      method: "DELETE",
    });

    applyMe(response);
  }, [applyMe, accountRequest]);

  const signOut = useCallback(async () => {
    const account = identity.current;
    identity.current = null;
    const revision = ++generation.current;
    await unregisterProgramNotifications().catch(() =>
      console.warn("Could not unregister program reminders on this device."),
    );
    try {
      await apiRequest("/auth/logout", {
        method: "POST",
        expectedOwnerId: account ?? undefined,
      });
    } catch (error) {
      console.warn("Server logout failed:", error);
    }

    if (generation.current !== revision) return;
    try {
      await clearSessionTokens();
    } finally {
      if (generation.current === revision) {
        try {
          await GoogleSignin.signOut();
        } catch {
          // Clear the local FitSync session regardless.
        } finally {
          if (generation.current === revision) resetState();
        }
      }
    }
  }, [resetState]);

  const deleteAccount = useCallback(async () => {
    const account = identity.current;
    const revision = generation.current;
    if (!account) throw new Error("Sign in to delete your account.");
    await apiRequest("/me", {
      method: "DELETE",
      expectedOwnerId: account,
      json: {
        confirmation: "DELETE",
      },
    });
    if (generation.current !== revision || identity.current !== account)
      throw new Error("Your account changed. Please try again.");

    // Fence pending local saves before account providers unmount.
    const localCleanup = deleteAccountData(account).then(
      () => null,
      (error: unknown) => error,
    );
    try {
      await clearSessionTokens();
    } catch (error) {
      // The account is already deleted on the server, including its refresh sessions.
      recordError(error, "deleted_session_clear");
    } finally {
      if (generation.current === revision) {
        try {
          await GoogleSignin.signOut();
        } catch {
          // Google account itself is not deleted.
        } finally {
          if (generation.current === revision) resetState();
        }
      }
    }
    const cleanupFailure = await localCleanup;
    if (cleanupFailure) {
      recordError(cleanupFailure, "deleted_account_data_clear");
      throw new Error(
        "Your account was deleted, but some saved data on this device could not be removed. Reopen the app and try clearing its local data in Android settings.",
      );
    }
  }, [resetState]);

  const value = useMemo(
    () => ({
      ready,
      user,
      profile,
      settings,
      signInGoogle,
      reloadMe,
      saveProfile,
      updateAccount,
      updateFitness,
      updateSettings,
      uploadAvatar,
      removeAvatar,
      redoOnboarding,
      signOut,
      deleteAccount,
    }),
    [
      ready,
      user,
      profile,
      settings,
      signInGoogle,
      reloadMe,
      saveProfile,
      updateAccount,
      updateFitness,
      updateSettings,
      uploadAvatar,
      removeAvatar,
      redoOnboarding,
      signOut,
      deleteAccount,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be called inside SessionProvider");
  }

  return context;
}
