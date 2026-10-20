
import React from "react";
import { Redirect, Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/src/context/session";
import { C } from "@/src/constants/theme";

const ICONS = {
  index: ["home-variant-outline", "home-variant"],
  train: ["dumbbell", "dumbbell"],
  library: ["bookshelf", "bookshelf"],
  progress: ["chart-areaspline", "chart-areaspline"],
  profile: ["account-circle-outline", "account-circle"]
} as const;

export default function TabsLayout() {
  const { ready, user, profile } = useSession();
  const insets = useSafeAreaInsets();

  if (!ready) return null;

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!profile) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: "#85858B",

        tabBarLabelStyle: {
          fontFamily: "Outfit_600SemiBold",
          fontSize: 10,
          marginTop: 3
        },

        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 9)
        },

        tabBarIconStyle: {
          marginTop: 1
        },

        sceneStyle: {
          backgroundColor: C.bg
        }
      }}
    >
      {(
        [
          "index",
          "train",
          "library",
          "progress",
          "profile"
        ] as const
      ).map(id => (
        <Tabs.Screen
          key={id}
          name={id}
          options={{
            title:
              id === "index"
                ? "Home"
                : id === "train"
                  ? "Train"
                  : id === "library"
                    ? "Exercises"
                    : id === "progress"
                      ? "Progress"
                      : "Me",

            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={ICONS[id][focused ? 1 : 0]}
                size={24}
                color={color}
              />
            )
          }}
        />
      ))}
    </Tabs>
  );
}
