
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GoogleSignin,
  isSuccessResponse
} from "@react-native-google-signin/google-signin";

const USER_KEY = "@fitsync/ui-only-google-user";
const profileKey = (id: string) => `@fitsync/onboarding/${id}`;

export type Gender =
  | "male"
  | "female"
  | "prefer_not_to_say";

export type Goal =
  | "muscle"
  | "strength"
  | "fitness"
  | "fat_loss";

export type Experience =
  | "beginner"
  | "intermediate"
  | "advanced";

export type Equipment =
  | "gym"
  | "dumbbells"
  | "bodyweight";

export type Profile = {
  goal: Goal;
  experience: Experience;
  weightKg: number;
  heightCm: number;
  gender: Gender;
  trainingDays: number;
  minutesPerWorkout: 30 | 45 | 60;
  equipment: Equipment;
  completedAt: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  photo?: string | null;
  demo?: boolean;
};

type SessionContextType = {
  ready: boolean;
  user: AuthUser | null;
  profile: Profile | null;

  signInGoogle: () => Promise<boolean>;
  previewDevelopment: () => Promise<void>;
  saveProfile: (profile: Profile) => Promise<void>;
  redoOnboarding: () => Promise<void>;
  deleteLocalProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext =
  createContext<SessionContextType | null>(null);

function toUser(user: {
  id: string;
  email: string;
  name: string | null;
  photo: string | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name || user.email.split("@")[0],
    photo: user.photo
  };
}

export function SessionProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const applyUser = useCallback(
    async (nextUser: AuthUser | null) => {
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        await AsyncStorage.removeItem(USER_KEY);
        return;
      }

      await AsyncStorage.setItem(
        USER_KEY,
        JSON.stringify(nextUser)
      );

      const storedProfile = await AsyncStorage.getItem(
        profileKey(nextUser.id)
      );

      setProfile(
        storedProfile
          ? (JSON.parse(storedProfile) as Profile)
          : null
      );
    },
    []
  );

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        GoogleSignin.configure({
          webClientId:
            process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
            undefined
        });

        const cachedUser = await AsyncStorage.getItem(USER_KEY);

        if (cachedUser) {
          const restored = JSON.parse(cachedUser) as AuthUser;

          if (!restored.demo || __DEV__) {
            if (mounted) await applyUser(restored);
          } else {
            await AsyncStorage.removeItem(USER_KEY);
          }
        } else {
          try {
            const result = await GoogleSignin.signInSilently();

            if (mounted && isSuccessResponse(result)) {
              await applyUser(toUser(result.data.user));
            }
          } catch {
            // Offline or no Google session.
          }
        }
      } catch (error) {
        console.warn("Session restoration failed", error);
      } finally {
        if (mounted) setReady(true);
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, [applyUser]);

  const signInGoogle = useCallback(async () => {
    const webClientId =
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

    if (!webClientId || webClientId.includes("YOUR_WEB")) {
      throw new Error(
        "Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to mobile/.env"
      );
    }

    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true
    });

    const result = await GoogleSignin.signIn();

    if (!isSuccessResponse(result)) {
      return false;
    }

    await applyUser(toUser(result.data.user));

    return true;
  }, [applyUser]);

  const previewDevelopment = useCallback(async () => {
    if (!__DEV__) return;

    await applyUser({
      id: "preview-local",
      email: "preview@local.test",
      name: "Demo Athlete",
      demo: true
    });
  }, [applyUser]);

  const saveProfile = useCallback(
    async (value: Profile) => {
      if (!user) throw new Error("Please sign in first");

      await AsyncStorage.setItem(
        profileKey(user.id),
        JSON.stringify(value)
      );

      setProfile(value);
    },
    [user]
  );

  const redoOnboarding = useCallback(async () => {
    if (!user) return;

    await AsyncStorage.removeItem(profileKey(user.id));
    setProfile(null);
  }, [user]);

  const deleteLocalProfile = useCallback(async () => {
    if (!user) return;

    await AsyncStorage.removeItem(profileKey(user.id));
    setProfile(null);
  }, [user]);

  const signOut = useCallback(async () => {
    try {
      if (user && !user.demo) {
        await GoogleSignin.signOut();
      }
    } catch (error) {
      console.warn("Google sign-out failed", error);
    }

    await applyUser(null);
  }, [user, applyUser]);

  const contextValue = useMemo(
    () => ({
      ready,
      user,
      profile,
      signInGoogle,
      previewDevelopment,
      saveProfile,
      redoOnboarding,
      deleteLocalProfile,
      signOut
    }),
    [
      ready,
      user,
      profile,
      signInGoogle,
      previewDevelopment,
      saveProfile,
      redoOnboarding,
      deleteLocalProfile,
      signOut
    ]
  );

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error(
      "useSession must be used inside SessionProvider"
    );
  }

  return context;
}
