import React, { createContext, useContext, useEffect, useMemo } from "react";
import { View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type DerivedValue,
} from "react-native-reanimated";
import { MotionPressable } from "./motion";
import { TabGlassSurface } from "./glass-tabs";
import { TAB_SPRING, useTabBarMotion } from "./tab-bar-motion";
import { TAB_PADDING, tabBarLayout } from "./tab-bar-model";
import { TabArtwork, type TabArtworkName } from "./tab-artwork";
import { C } from "@/src/constants/theme";

type Layout = ReturnType<typeof tabBarLayout>;
const Context = createContext<{
  layout: DerivedValue<Layout>;
} | null>(null);

/** Real dimensions animate so the compact bar retains full-size touch targets. */
export function AnimatedTabBar({
  children,
  selectedIndex,
  count,
}: {
  children: React.ReactNode;
  selectedIndex: number;
  count: number;
}) {
  const { compact, reduced } = useTabBarMotion();
  const available = useSharedValue(0);
  const weights = useSharedValue<number[]>(
    Array.from({ length: count }, (_, index) => (index === selectedIndex ? 1 : 0)),
  );
  useEffect(() => {
    const next = Array.from({ length: count }, (_, index) => (index === selectedIndex ? 1 : 0));
    weights.set(reduced ? next : withSpring(next, TAB_SPRING));
  }, [count, selectedIndex, weights, reduced]);
  const layout = useDerivedValue(() => tabBarLayout(available.get(), compact.get(), weights.get()));
  const shell = useAnimatedStyle(() => ({
    width: layout.get().width,
    height: layout.get().height,
    opacity: available.get() > 0 ? 1 : 0,
  }));
  const indicator = useAnimatedStyle(() => ({
    left: layout.get().indicatorLeft,
    width: layout.get().indicatorWidth,
    height: layout.get().buttonHeight,
    opacity: selectedIndex >= 0 ? 1 : 0,
  }));
  const context = useMemo(() => ({ layout }), [layout]);
  return (
    <Context.Provider value={context}>
      <View
        onLayout={(event) => available.set(event.nativeEvent.layout.width)}
        className="w-full items-center"
      >
        <Animated.View
          className="overflow-hidden rounded-full bg-panel shadow-xl shadow-black/30"
          style={shell}
        >
          <TabGlassSurface />
          <Animated.View
            pointerEvents="none"
            accessible={false}
            className="absolute rounded-full bg-ink"
            style={[{ top: TAB_PADDING }, indicator]}
          />
          {children}
        </Animated.View>
      </View>
    </Context.Provider>
  );
}

export function AnimatedTabButton({
  index,
  focused,
  label,
  artwork,
  onPress,
  onLongPress,
}: {
  index: number;
  focused: boolean;
  label: string;
  artwork: TabArtworkName;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const navigation = useContext(Context);
  const { compact } = useTabBarMotion();
  if (!navigation) throw new Error("Tab buttons need AnimatedTabBar");
  const { layout } = navigation;
  const position = useAnimatedStyle(() => ({
    left: layout.get().positions[index],
    width: layout.get().widths[index],
    height: layout.get().buttonHeight,
  }));
  const symbolMotion = useAnimatedStyle(() => ({
    transform: [
      { scale: (1 - compact.get() * 0.08) * (1 + (layout.get().activation[index] ?? 0) * 0.04) },
    ],
  }));
  const outline = useAnimatedStyle(() => ({ opacity: 1 - (layout.get().activation[index] ?? 0) }));
  const filled = useAnimatedStyle(() => ({ opacity: layout.get().activation[index] ?? 0 }));
  const labelMotion = useAnimatedStyle(() => {
    const activation = Math.max(0, (layout.get().activation[index] ?? 0) * (1 - compact.get()));
    return {
      width: layout.get().labelCapacity * activation,
      marginRight: 6 * activation,
      opacity: interpolate(activation, [0, 0.25, 1], [0, 0, 1], Extrapolation.CLAMP),
    };
  });
  const textWidth = useAnimatedStyle(() => ({ width: layout.get().labelCapacity }));
  return (
    <Animated.View className="absolute top-1.5" style={position}>
      <MotionPressable
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: focused }}
        onPress={onPress}
        onLongPress={onLongPress}
        className="h-full w-full flex-row items-center justify-center rounded-full"
      >
        {focused && (
          <Animated.View
            pointerEvents="none"
            accessible={false}
            className="h-5 overflow-hidden"
            style={labelMotion}
          >
            <Animated.Text
              accessible={false}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              maxFontSizeMultiplier={1.2}
              className="absolute right-0 text-right font-poppins-medium text-xs leading-5 text-bg"
              style={textWidth}
            >
              {label}
            </Animated.Text>
          </Animated.View>
        )}
        <Animated.View
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          className="h-6 w-6 items-center justify-center"
          style={symbolMotion}
        >
          <Animated.View className="absolute" style={outline}>
            <TabArtwork name={artwork} color={C.muted} />
          </Animated.View>
          <Animated.View className="absolute" style={filled}>
            <TabArtwork name={artwork} color={C.bg} selected />
          </Animated.View>
        </Animated.View>
      </MotionPressable>
    </Animated.View>
  );
}
