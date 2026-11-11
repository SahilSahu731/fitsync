import React, { useEffect, useState } from "react";

import { Keyboard, View } from "react-native";

import { Redirect, Tabs } from "expo-router";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/src/context/session";

import { ActiveWorkoutBar } from "@/src/features/workouts/components/active-workout-bar";

import { TabBarMotionProvider, useTabBarMotion } from "@/src/components/tab-bar-motion";
import type { TabArtworkName } from "@/src/components/tab-artwork";
import { AnimatedTabBar, AnimatedTabButton } from "@/src/components/animated-tabs";
import { TabGlassProvider, TabGlassScene } from "@/src/components/glass-tabs";
import { useExperience } from "@/src/features/experience/experience-context";

import { C } from "@/src/constants/theme";

const ARTWORK = {
  index: "home",
  train: "train",
  library: "library",
  progress: "progress",
  profile: "profile",
} as const satisfies Record<string, TabArtworkName>;
type TabId = keyof typeof ARTWORK;

const TITLES: Record<TabId, string> = {
  index: "Home",
  train: "Train",
  library: "Library",
  progress: "Progress",
  profile: "Me",
};

const TAB_IDS = Object.keys(ARTWORK) as TabId[];

type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>>[0];

function FloatingTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { feedback } = useExperience();

  const { expand } = useTabBarMotion();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const routes = state.routes.filter((route) => TAB_IDS.includes(route.name as TabId));
  const selectedIndex = routes.findIndex((route) => route.key === state.routes[state.index]?.key);

  if (keyboardOpen || !routes.length) return null;

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
          {routes.map((route, index) => {
            const id = route.name as TabId;
            const focused = route.key === state.routes[state.index]?.key;
            return (
              <AnimatedTabButton
                key={route.key}
                index={index}
                focused={focused}
                label={TITLES[id]}
                artwork={ARTWORK[id]}
                onPress={() => {
                  expand();
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
    <TabBarMotionProvider>
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
    </TabBarMotionProvider>
  );
}
