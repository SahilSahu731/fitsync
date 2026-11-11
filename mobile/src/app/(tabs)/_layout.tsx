import React, { useEffect, useState } from "react";

import { Keyboard, View } from "react-native";

import { Redirect, Tabs } from "expo-router";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/src/context/session";

import { ActiveWorkoutBar } from "@/src/features/workouts/components/active-workout-bar";

import { AnimatedTabBar, AnimatedTabButton } from "@/src/components/animated-tabs";
import { TabGlassProvider, TabGlassScene } from "@/src/components/glass-tabs";
import { useExperience } from "@/src/features/experience/experience-context";

import { C } from "@/src/constants/theme";

const ICONS = {
  index: ["home-outline", "home"],
  train: ["dumbbell", "dumbbell"],
  library: ["bookshelf", "bookshelf"],
  progress: ["chart-areaspline", "chart-areaspline"],
  profile: ["account-circle-outline", "account-circle"],
} as const;

type TabId = keyof typeof ICONS;

const TITLES: Record<TabId, string> = {
  index: "Home",
  train: "Train",
  library: "Library",
  progress: "Progress",
  profile: "Me",
};

const TAB_IDS = Object.keys(ICONS) as TabId[];

type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>>[0];

const AVATAR_KEYS = [
  "avatarUrl",
  "avatar_url",
  "avatar",
  "photoURL",
  "photoUrl",
  "photo_url",
  "photo",
  "profilePicture",
  "profile_picture",
  "profilePic",
  "profileImage",
  "profile_image",
  "imageUrl",
  "image_url",
  "image",
  "picture",
  "pfp",
];

function pickUrl(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;

    return pickUrl(v.url) ?? pickUrl(v.uri) ?? pickUrl(v.publicUrl);
  }

  return null;
}

function resolveAvatar(...sources: unknown[]): string | null {
  for (const source of sources) {
    if (!source || typeof source !== "object") {
      continue;
    }

    const obj = source as Record<string, unknown>;

    for (const key of AVATAR_KEYS) {
      const url = pickUrl(obj[key]);

      if (url) {
        return url;
      }
    }
  }

  return null;
}

function FloatingTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { feedback } = useExperience();

  const { profile, user } = useSession();

  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const avatarUrl = resolveAvatar(
    profile,
    user,
    (
      user as {
        user_metadata?: unknown;
      } | null
    )?.user_metadata,
  );

  const routes = state.routes.filter((route) => TAB_IDS.includes(route.name as TabId));
  const selectedIndex = routes.findIndex((route) => route.key === state.routes[state.index]?.key);

  if (keyboardOpen) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-4 gap-3"
      style={{
        bottom: Math.max(insets.bottom, 12),
      }}
    >
      <View className="w-full max-w-md self-center gap-3">
        <ActiveWorkoutBar inline />
        <AnimatedTabBar selectedIndex={selectedIndex} count={routes.length}>
          {routes.map((route) => {
            const id = route.name as TabId;
            const focused = route.key === state.routes[state.index]?.key;
            const showAvatar = id === "profile" && avatarUrl && failedAvatarUrl !== avatarUrl;
            return (
              <AnimatedTabButton
                key={route.key}
                focused={focused}
                label={TITLES[id]}
                icons={ICONS[id]}
                avatarUrl={showAvatar ? avatarUrl : undefined}
                onAvatarError={() => setFailedAvatarUrl(avatarUrl)}
                onPress={() => {
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    feedback("selection");
                    navigation.navigate(route.name, route.params);
                  }
                }}
                onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
              />
            );
          })}
        </AnimatedTabBar>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { ready, user, profile } = useSession();

  if (!ready) {
    return null;
  }

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!profile) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <TabGlassProvider>
      <Tabs
        screenLayout={({ children }) => <TabGlassScene>{children}</TabGlassScene>}
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          sceneStyle: {
            backgroundColor: C.bg,
          },
        }}
      >
        {TAB_IDS.map((id) => (
          <Tabs.Screen
            key={id}
            name={id}
            options={{
              title: TITLES[id],
            }}
          />
        ))}
      </Tabs>
    </TabGlassProvider>
  );
}
