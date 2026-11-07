import React, { useEffect, useState } from "react";

import { Image, Text, View } from "react-native";

import Animated, { LinearTransition, ReduceMotion } from "react-native-reanimated";

import { Redirect, Tabs } from "expo-router";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/src/context/session";

import { ActiveWorkoutBar } from "@/src/features/workouts/components/active-workout-bar";

import { MotionPressable as Pressable } from "@/src/components/motion";

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

type TabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>
>[0];

const TRANSITION = LinearTransition.springify().damping(24).stiffness(260).reduceMotion(ReduceMotion.System);

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

  const { profile, user } = useSession();

  const [avatarFailed, setAvatarFailed] = useState(false);

  const avatarUrl = resolveAvatar(
    profile,
    user,
    (
      user as {
        user_metadata?: unknown;
      } | null
    )?.user_metadata,
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAvatarFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    if (__DEV__ && !avatarUrl) {
      console.log(
        "[tabs] no avatar field found. profile keys:",
        profile ? Object.keys(profile) : null,
        "user keys:",
        user ? Object.keys(user) : null,
      );
    }
  }, [avatarUrl, profile, user]);

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-4 gap-3"
      style={{
        bottom: Math.max(insets.bottom, 12),
      }}
    >
      <ActiveWorkoutBar inline />

      <View
        className="h-18 flex-row items-center gap-1 overflow-hidden rounded-full border p-2"
        style={{
          backgroundColor: C.panel,
          borderColor: C.border,
          shadowColor: "#000",
          shadowOpacity: 0.35,
          shadowRadius: 18,
          shadowOffset: {
            width: 0,
            height: 8,
          },
          elevation: 12,
        }}
      >
        {state.routes.map((route, index) => {
          const id = route.name as TabId;

          if (!(id in ICONS)) {
            return null;
          }

          const focused = state.index === index;

          const showAvatar = id === "profile" && !!avatarUrl && !avatarFailed;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Animated.View
              key={route.key}
              layout={TRANSITION}
              className={`h-12 overflow-hidden rounded-full ${
                focused ? "flex-[2.3] bg-brand" : "flex-1"
              }`}
            >
              <Pressable
                accessibilityRole="tab"
                accessibilityLabel={TITLES[id]}
                accessibilityState={{
                  selected: focused,
                }}
                onPress={onPress}
                onLongPress={() =>
                  navigation.emit({
                    type: "tabLongPress",
                    target: route.key,
                  })
                }
                className="h-full flex-row items-center justify-center"
              >
                {showAvatar ? (
                  <View
                    className="overflow-hidden rounded-full"
                    style={{
                      width: 28,
                      height: 28,
                    }}
                  >
                    <Image
                      source={{
                        uri: avatarUrl!,
                      }}
                      onError={() => setAvatarFailed(true)}
                      style={{
                        width: "100%",
                        height: "100%",
                      }}
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <MaterialCommunityIcons
                    name={ICONS[id][focused ? 1 : 0]}
                    size={24}
                    color={focused ? C.bg : "white"}
                  />
                )}

                {focused && (
                  <Text
                    numberOfLines={1}
                    className="ml-1.5 text text-bg"
                    style={{
                      fontFamily: "Outfit_600SemiBold",
                    }}
                  >
                    {TITLES[id]}
                  </Text>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
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
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
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
  );
}
