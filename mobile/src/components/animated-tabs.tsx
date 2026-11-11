import React, { useEffect } from "react";
import { Image, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  Extrapolation,
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { MotionPressable, useReducedAppMotion } from "./motion";
import { TabGlassSurface } from "./glass-tabs";
import { C } from "@/src/constants/theme";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
const SPRING = {
  damping: 28,
  stiffness: 340,
  mass: 0.8,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
};
const PADDING = 8;
const GAP = 4;

/** One continuous selection moves beneath the fixed, generous touch targets. */
export function AnimatedTabBar({
  children,
  selectedIndex,
  count,
}: {
  children: React.ReactNode;
  selectedIndex: number;
  count: number;
}) {
  const reduced = useReducedAppMotion();
  const width = useSharedValue(0);
  const selection = useSharedValue(selectedIndex);

  useEffect(() => {
    selection.set(reduced ? selectedIndex : withSpring(selectedIndex, SPRING));
  }, [selectedIndex, reduced, selection]);

  const indicator = useAnimatedStyle(() => {
    const cell = Math.max(0, (width.get() - PADDING * 2 - GAP * (count - 1)) / count);
    return {
      width: cell,
      opacity: cell > 0 && selectedIndex >= 0 ? 1 : 0,
      transform: [{ translateX: selection.get() * (cell + GAP) }],
    };
  });

  return (
    <View className="overflow-hidden rounded-[30px] bg-panel shadow-xl shadow-black/30">
      <TabGlassSurface />
      <View
        onLayout={(event) => width.set(event.nativeEvent.layout.width)}
        className="h-[72px] flex-row gap-1 p-2"
      >
        <Animated.View
          pointerEvents="none"
          accessible={false}
          className="absolute left-2 top-2 h-14 rounded-[22px] bg-ink"
          style={indicator}
        />
        {children}
      </View>
    </View>
  );
}

export function AnimatedTabButton({
  focused,
  label,
  icons,
  avatarUrl,
  onAvatarError,
  onPress,
  onLongPress,
}: {
  focused: boolean;
  label: string;
  icons: readonly [IconName, IconName];
  avatarUrl?: string;
  onAvatarError: () => void;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const reduced = useReducedAppMotion();
  const activation = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    activation.set(reduced ? (focused ? 1 : 0) : withSpring(focused ? 1 : 0, SPRING));
  }, [focused, reduced, activation]);

  const iconMotion = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(activation.get(), [0, 1], [0, -7], Extrapolation.CLAMP) },
      { scale: interpolate(activation.get(), [0, 1], [1, 1.06], Extrapolation.CLAMP) },
    ],
  }));
  const outline = useAnimatedStyle(() => ({ opacity: 1 - activation.get() }));
  const filled = useAnimatedStyle(() => ({ opacity: activation.get() }));
  const labelMotion = useAnimatedStyle(() => ({
    opacity: interpolate(activation.get(), [0, 0.2, 1], [0, 0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(activation.get(), [0, 1], [7, 0], Extrapolation.CLAMP) }],
  }));

  return (
    <MotionPressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      onLongPress={onLongPress}
      className="h-14 min-w-0 flex-1 items-center justify-center rounded-[22px]"
    >
      <Animated.View
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        className="h-7 w-7 items-center justify-center"
        style={iconMotion}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            onError={onAvatarError}
            resizeMode="cover"
            className="h-7 w-7 rounded-full"
          />
        ) : (
          <>
            <Animated.View className="absolute" style={outline}>
              <MaterialCommunityIcons name={icons[0]} size={25} color={C.muted} />
            </Animated.View>
            <Animated.View className="absolute" style={filled}>
              <MaterialCommunityIcons name={icons[1]} size={25} color={C.bg} />
            </Animated.View>
          </>
        )}
      </Animated.View>
      {focused && (
        <Animated.Text
          accessible={false}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          maxFontSizeMultiplier={1.2}
          className="absolute inset-x-0 bottom-1.5 text-center font-poppins-medium text-[11px] leading-[14px] text-bg"
          style={labelMotion}
        >
          {label}
        </Animated.Text>
      )}
    </MotionPressable>
  );
}
