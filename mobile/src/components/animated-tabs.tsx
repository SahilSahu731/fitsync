import React, { createContext, useContext, useEffect, useMemo } from "react";
import { Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type DerivedValue,
  type SharedValue,
} from "react-native-reanimated";
import { MotionPressable } from "./motion";
import { TabGlassSurface } from "./glass-tabs";
import { TAB_SPRING, useTabBarMotion } from "./tab-bar-motion";
import { TAB_ICON_SIZE, TAB_LABEL_GAP, TAB_PADDING, tabBarLayout } from "./tab-bar-model";
import { TabArtwork, type TabArtworkName } from "./tab-artwork";

// Icon colours: white when idle (on the glass), black when selected (on the white pill).
const ICON_IDLE = "#E8E4E3";
const ICON_ACTIVE = "#000000";
const PILL_BG = "#F2F2F4";

type Layout = ReturnType<typeof tabBarLayout>;
const Context = createContext<{
  layout: DerivedValue<Layout>;
  labelWidths: SharedValue<number[]>;
} | null>(null);

/** Real dimensions animate so the compact bar retains full-size touch targets. */
export function AnimatedTabBar({
  children,
  selectedIndex,
  labels,
}: {
  children: React.ReactNode;
  selectedIndex: number;
  labels: string[];
}) {
  const { compact, reduced } = useTabBarMotion();
  const count = labels.length;
  const labelWidths = useSharedValue(labels.map((label) => label.length * 7));
  const available = useSharedValue(0);
  const weights = useSharedValue<number[]>(
    Array.from({ length: count }, (_, index) => (index === selectedIndex ? 1 : 0)),
  );
  useEffect(() => {
    const next = Array.from({ length: count }, (_, index) => (index === selectedIndex ? 1 : 0));
    weights.set(reduced ? next : withSpring(next, TAB_SPRING));
  }, [count, selectedIndex, weights, reduced]);
  const layout = useDerivedValue(() =>
    tabBarLayout(available.get(), compact.get(), weights.get(), labelWidths.get()),
  );
  const shell = useAnimatedStyle(() => ({
    width: layout.get().width,
    height: layout.get().height,
    opacity: available.get() > 0 ? 1 : 0,
  }));
  const context = useMemo(() => ({ layout, labelWidths }), [layout, labelWidths]);
  return (
    <Context.Provider value={context}>
      <View
        onLayout={(event) => available.set(event.nativeEvent.layout.width)}
        className="w-full items-center"
      >
        <Animated.View
          className="rounded-full"
          style={[
            shell,
            {
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.24,
              shadowRadius: 16,
              elevation: 8,
            },
          ]}
        >
          <View className="flex-1 overflow-hidden rounded-full">
            <TabGlassSurface />
            {children}
            <View
              pointerEvents="none"
              className="absolute inset-0 rounded-full"
              style={{ borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}
            />
          </View>
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
  const { layout, labelWidths } = navigation;
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
  const labelMotion = useAnimatedStyle(() => {
    const activation = Math.max(0, (layout.get().activation[index] ?? 0) * (1 - compact.get()));
    return {
      width: (layout.get().labelCapacities[index] ?? 0) * activation,
      marginLeft: TAB_LABEL_GAP * activation,
      opacity: focused ? interpolate(activation, [0, 0.25, 1], [0, 0, 1], Extrapolation.CLAMP) : 0,
    };
  });
  const textWidth = useAnimatedStyle(() => ({ width: layout.get().labelCapacities[index] ?? 0 }));
  return (
    <Animated.View className="absolute" style={[{ top: TAB_PADDING }, position]}>
      <MotionPressable
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: focused }}
        onPress={onPress}
        onLongPress={onLongPress}
        className="h-full w-full flex-row items-center justify-center rounded-full"
      >
        {focused && (
          <View
            pointerEvents="none"
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: PILL_BG }}
          />
        )}
        <View
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          className="absolute left-0 top-0 flex-row opacity-0"
          style={{ width: 160 }}
        >
          <Text
            accessible={false}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            className="font-poppins-medium text-xs leading-5"
            onLayout={(event) => {
              const width = Math.ceil(event.nativeEvent.layout.width);
              if (width > 0 && Math.abs((labelWidths.get()[index] ?? 0) - width) > 0.5) {
                const next = [...labelWidths.get()];
                next[index] = width;
                labelWidths.set(next);
              }
            }}
          >
            {label}
          </Text>
        </View>
        <Animated.View
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          className="items-center justify-center"
          style={[{ width: TAB_ICON_SIZE, height: TAB_ICON_SIZE }, symbolMotion]}
        >
          <TabArtwork name={artwork} color={focused ? ICON_ACTIVE : ICON_IDLE} />
        </Animated.View>

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
            className="absolute left-0 text-left font-poppins-medium text-xs leading-5"
            style={[textWidth, { color: ICON_ACTIVE }]}
          >
            {label}
          </Animated.Text>
        </Animated.View>
      </MotionPressable>
    </Animated.View>
  );
}
