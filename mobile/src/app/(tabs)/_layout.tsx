import React from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { Redirect, Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/src/context/session";
import { ActiveWorkoutBar } from "@/src/features/workouts/components/active-workout-bar";
import { C } from "@/src/constants/theme";

const ICONS = {
  index: ["home-outline", "home"],
  train: ["dumbbell", "dumbbell"],
  library: ["bookshelf", "bookshelf"],
  progress: ["chart-areaspline", "chart-areaspline"],
  profile: ["account-circle-outline", "account-circle"]
} as const;

type TabId = keyof typeof ICONS;

const TITLES: Record<TabId, string> = {
  index: "Home",
  train: "Train",
  library: "Exercises",
  progress: "Progress",
  profile: "Me"
};

const TAB_IDS = Object.keys(ICONS) as TabId[];

// derived from expo-router, so no extra package import is needed
type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>>[0];

// one short, smooth resize when the active tab changes (no bounce)
const TRANSITION = LinearTransition.duration(200);

function FloatingTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-4 gap-3"
      style={{ bottom: Math.max(insets.bottom, 12) }}
    >
      <ActiveWorkoutBar inline />
      <View
        className="h-18 flex-row items-center gap-1 rounded-full border border-border bg-panel p-2"
        // shadows are the one thing set in style: they need platform-specific props
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.35,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12
        }}
      >
        {state.routes.map((route, index) => {
          const id = route.name as TabId;
          if (!(id in ICONS)) return null;

          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Animated.View
              key={route.key}
              layout={TRANSITION}
              className={`h-12 overflow-hidden rounded-full ${focused ? "flex-[2.3] bg-brand" : "flex-1"}`}
            >
              <Pressable
                accessibilityRole="tab"
                accessibilityLabel={TITLES[id]}
                accessibilityState={{ selected: focused }}
                onPress={onPress}
                onLongPress={() =>
                  navigation.emit({ type: "tabLongPress", target: route.key })
                }
                className="h-full flex-row items-center justify-center"
              >
                <MaterialCommunityIcons
                  name={ICONS[id][focused ? 1 : 0]}
                  size={24}
                  color={focused ? C.bg : "white"}
                />

                {focused && (
                  <Text
                    numberOfLines={1}
                    className="ml-1.5 text text-bg"
                    style={{ fontFamily: "Outfit_600SemiBold" }}
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

/* -------------------------------------------------------------------------- */
/*  Layout                                                                     */
/* -------------------------------------------------------------------------- */

export default function TabsLayout() {
  const { ready, user, profile } = useSession();

  if (!ready) return null;

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!profile) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.bg }
      }}
    >
      {TAB_IDS.map(id => (
        <Tabs.Screen key={id} name={id} options={{ title: TITLES[id] }} />
      ))}
    </Tabs>
  );
}