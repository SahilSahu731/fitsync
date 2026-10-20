
import React from "react";

import {
  Alert,
  Pressable,
  ScrollView,
  View
} from "react-native";

import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";
import { useSession } from "@/src/context/session";

const goalNames: Record<string, string> = {
  muscle: "Build muscle",
  strength: "Get stronger",
  fitness: "Feel fitter",
  fat_loss: "Lose fat"
};

export default function ProfileScreen() {
  const router = useRouter();

  const {
    user,
    profile,
    signOut,
    redoOnboarding,
    deleteLocalProfile
  } = useSession();

  const logout = () => {
    Alert.alert(
      "Sign out?",
      "Your locally saved onboarding preferences will remain on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/(auth)/sign-in");
          }
        }
      ]
    );
  };

  const resetOnboarding = () => {
    Alert.alert(
      "Redo your setup?",
      "You can update your training preferences.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: async () => {
            await redoOnboarding();
            router.replace("/onboarding");
          }
        }
      ]
    );
  };

  const removeProfile = () => {
    Alert.alert(
      "Delete local onboarding data?",
      "Your measurements and training preferences will be removed from this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteLocalProfile();
            await signOut();
            router.replace("/(auth)/sign-in");
          }
        }
      ]
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{
        padding: 24,
        paddingBottom: 50
      }}
    >
      <Txt
        weight="medium"
        className="text-xs tracking-[2px] text-brand"
      >
        ATHLETE PROFILE
      </Txt>

      <Txt weight="extra" className="mt-1 text-[37px]">
        YOUR CORNER.
      </Txt>

      {/* User profile */}

      <View className="mt-7 flex-row items-center rounded-3xl border border-border bg-panel p-5">
        <View className="mr-4 h-16 w-16 items-center justify-center rounded-2xl bg-brand">
          <Txt
            weight="extra"
            className="text-3xl text-bg"
          >
            {(user?.name || "A")[0].toUpperCase()}
          </Txt>
        </View>

        <View className="flex-1">
          <Txt
            weight="extra"
            className="text-[21px]"
          >
            {user?.name || "Athlete"}
          </Txt>

          <Txt className="text-xs text-muted">
            {user?.email || ""}
          </Txt>

          <Txt
            weight="medium"
            className="mt-1 text-xs text-brand"
          >
            {user?.demo
              ? "DEV PREVIEW"
              : "GOOGLE ACCOUNT"}
          </Txt>
        </View>
      </View>

      {/* Measurements */}

      <Txt
        weight="extra"
        className="mb-4 mt-8 text-[21px]"
      >
        YOUR BASELINE
      </Txt>

      <View className="mb-3 flex-row gap-3">
        {[
          [`${profile?.weightKg ?? "–"} kg`, "WEIGHT"],
          [`${profile?.heightCm ?? "–"} cm`, "HEIGHT"],
          [`${profile?.trainingDays ?? "–"}`, "DAYS/WK"]
        ].map(([value, label]) => (
          <View
            key={label}
            className="flex-1 items-center rounded-2xl border border-border bg-panel px-2 py-4"
          >
            <Txt weight="extra" className="text-xl">
              {value}
            </Txt>

            <Txt className="mt-2 text-[10px] tracking-[1px] text-muted">
              {label}
            </Txt>
          </View>
        ))}
      </View>

      <View className="rounded-2xl border border-border bg-panel px-5 py-4">
        <View className="flex-row items-center justify-between">
          <Txt className="text-sm text-muted">
            Main goal
          </Txt>

          <Txt weight="bold" className="text-sm">
            {goalNames[profile?.goal || "muscle"]}
          </Txt>
        </View>

        <View className="mt-4 flex-row items-center justify-between">
          <Txt className="text-sm text-muted">
            Experience
          </Txt>

          <Txt weight="bold" className="text-sm capitalize">
            {profile?.experience}
          </Txt>
        </View>

        <View className="mt-4 flex-row items-center justify-between">
          <Txt className="text-sm text-muted">
            Training space
          </Txt>

          <Txt weight="bold" className="text-sm capitalize">
            {profile?.equipment}
          </Txt>
        </View>
      </View>

      {/* Settings */}

      <Txt weight="extra" className="mb-4 mt-8 text-[21px]">
        SETTINGS
      </Txt>

      <Pressable
        onPress={resetOnboarding}
        className="mb-2.5 flex-row items-center rounded-2xl border border-border bg-panel p-4"
      >
        <MaterialCommunityIcons
          name="tune-variant"
          size={22}
          color={C.brand}
        />

        <Txt
          weight="bold"
          className="ml-4 flex-1 text-sm"
        >
          Update training setup
        </Txt>

        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={C.muted}
        />
      </Pressable>

      <Pressable
        onPress={removeProfile}
        className="mb-2.5 flex-row items-center rounded-2xl border border-border bg-panel p-4"
      >
        <MaterialCommunityIcons
          name="delete-outline"
          size={22}
          color={C.brand}
        />

        <Txt
          weight="bold"
          className="ml-4 flex-1 text-sm"
        >
          Delete local profile data
        </Txt>

        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={C.muted}
        />
      </Pressable>

      <Pressable
        onPress={logout}
        className="mt-4 flex-row items-center justify-center rounded-2xl border border-[#743C36] bg-[#2A1B1C] py-4"
      >
        <MaterialCommunityIcons
          name="logout"
          size={20}
          color="#FF9789"
        />

        <Txt
          weight="bold"
          className="ml-3 text-[#FF9789]"
        >
          SIGN OUT
        </Txt>
      </Pressable>

      <Txt className="mt-6 text-center text-xs text-muted">
        FitSync UI starter · Version 0.1
      </Txt>
    </ScrollView>
  );
}
