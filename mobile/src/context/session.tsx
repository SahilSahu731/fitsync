import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";

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

  const [user, setUser] = useState<AuthUser | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);

  const [settings, setSettings] = useState<UserSettings | null>(null);

  const applyMe = useCallback((data: MeResponse) => {
    setUser(data.user);
    setProfile(data.profile);
    setSettings(data.settings);
  }, []);

  const resetState = useCallback(() => {
    setUser(null);
    setProfile(null);
    setSettings(null);
  }, []);

  const reloadMe = useCallback(async () => {
    const data = await apiRequest<MeResponse>("/me");
    applyMe(data);
  }, [applyMe]);

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

      const response = await apiRequest<MeResponse>("/me/profile", {
        method: "PUT",
        json: input,
      });

      applyMe(response);
    },
    [applyMe],
  );

  const updateAccount = useCallback(
    async (value: { name?: string; bio?: string }) => {
      const response = await apiRequest<MeResponse>("/me", {
        method: "PATCH",
        json: value,
      });

      applyMe(response);
    },
    [applyMe],
  );

  const updateFitness = useCallback(
    async (value: Partial<Omit<Profile, "completedAt">>) => {
      const response = await apiRequest<MeResponse>("/me/profile", {
        method: "PATCH",
        json: value,
      });

      applyMe(response);
    },
    [applyMe],
  );

  const updateSettings = useCallback(
    async (value: Partial<UserSettings>) => {
      const response = await apiRequest<MeResponse>("/me/settings", {
        method: "PATCH",
        json: value,
      });

      applyMe(response);
    },
    [applyMe],
  );

  const uploadAvatar = useCallback(
    async (uri: string, mimeType = "image/jpeg") => {
      const form = new FormData();

      form.append("avatar", {
        uri,
        name: "fitsync-avatar.jpg",
        type: mimeType,
      } as any);

      const response = await apiRequest<MeResponse>("/me/avatar", {
        method: "POST",
        form,
      });

      applyMe(response);
    },
    [applyMe],
  );

  const removeAvatar = useCallback(async () => {
    const response = await apiRequest<MeResponse>("/me/avatar", {
      method: "DELETE",
    });

    applyMe(response);
  }, [applyMe]);

  const redoOnboarding = useCallback(async () => {
    const response = await apiRequest<MeResponse>("/me/profile", {
      method: "DELETE",
    });

    applyMe(response);
  }, [applyMe]);

  const signOut = useCallback(async () => {
    try {
      await apiRequest("/auth/logout", {
        method: "POST",
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
    await apiRequest("/me", {
      method: "DELETE",
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
