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

import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import { createAvatarForm } from "@/src/services/avatar-upload";

import {
  apiRequest,
  clearSessionTokens,
  googleBackendLogin,
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

type SessionContextType = {
  ready: boolean;

  user: AuthUser | null;
  profile: Profile | null;
  settings: UserSettings | null;

  signInGoogle: () => Promise<boolean>;
  reloadMe: () => Promise<void>;

  saveProfile: (value: Profile) => Promise<void>;

  updateAccount: (
    value: Partial<Pick<AuthUser, "name" | "bio">>,
  ) => Promise<void>;

  updateFitness: (
    value: Partial<Omit<Profile, "completedAt">>,
  ) => Promise<void>;

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

  const applyMe = useCallback((data: MeResponse) => {
    identity.current = data.user.id;
    setUser(data.user);
    setProfile(data.profile);
    setSettings(data.settings);
  }, []);

  const resetState = useCallback(() => {
    identity.current = null;
    generation.current++;
    setUser(null);
    setProfile(null);
    setSettings(null);
  }, []);

  const accountRequest = useCallback(async (path: string, options: Parameters<typeof apiRequest>[1] = {}) => {
    const ownerId = identity.current; const revision = generation.current;
    if (!ownerId) throw new Error("Sign in to update your account.");
    const response = await apiRequest<MeResponse>(path, { ...options, expectedOwnerId: ownerId });
    if (identity.current !== ownerId || generation.current !== revision || response.user.id !== ownerId) throw new Error("Your account changed. Reopen this screen.");
    return response;
  }, []);

  const reloadMe = useCallback(async () => {
    const data = await accountRequest("/me");
    applyMe(data);
  }, [applyMe, accountRequest]);

  // Restore backend session after reopening the app.

  useEffect(() => {
    let mounted = true;

    async function restore() {
      try {
        const exists = await restoreBackendSession();

        if (exists && mounted) {
          const data = await apiRequest<MeResponse>("/me");

          if (mounted) {
            applyMe(data);
          }
        }
      } catch (error) {
        console.warn("Could not restore backend session:", error);
      } finally {
        if (mounted) setReady(true);
      }
    }

    restore();

    return () => {
      mounted = false;
    };
  }, [applyMe]);

  const signInGoogle = useCallback(async () => {
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    const response = await GoogleSignin.signIn();

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

    await storeSessionTokens({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    const data = result as unknown as MeResponse;
    applyMe(data);

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
    identity.current = null; generation.current++;
    await unregisterProgramNotifications().catch(() => console.warn("Could not unregister program reminders on this device."));
    try {
      await apiRequest("/auth/logout", {
        method: "POST",
        expectedOwnerId: account ?? undefined,
      });
    } catch (error) {
      console.warn("Server logout failed:", error);
    }

    await clearSessionTokens();

    try {
      await GoogleSignin.signOut();
    } catch {
      // Clear the local FitSync session regardless.
    }

    resetState();
  }, [resetState]);

  const deleteAccount = useCallback(async () => {
    const account = identity.current;
    if (!account) throw new Error("Sign in to delete your account.");
    await apiRequest("/me", {
      method: "DELETE",
      expectedOwnerId: account,
      json: {
        confirmation: "DELETE",
      },
    });

    await clearSessionTokens();

    try {
      await GoogleSignin.signOut();
    } catch {
      // Google account itself is not deleted.
    }

    resetState();
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

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be called inside SessionProvider");
  }

  return context;
}
