import React, { useEffect, useState } from "react";
import { Image, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import type { AuthUser } from "@/src/context/session";

import Svg, { Rect, Defs, Stop, LinearGradient } from "react-native-svg";

import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export function HomeTopBar({
  user,
  isPro,
  onProfile,
  onPro,
  onReminders,
}: {
  user: AuthUser | null;
  isPro: boolean;
  onProfile: () => void;
  onPro: () => void;
  onReminders: () => void;
}) {
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const initials =
    user?.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "FS";

  const shine = useSharedValue(-30);

  useEffect(() => {
    shine.value = withRepeat(
      withSequence(
        withTiming(76, {
          duration: 850,
          easing: Easing.inOut(Easing.ease),
        }),
        withDelay(2400, withTiming(-30, { duration: 0 })),
      ),
      -1,
      false,
    );

    return () => cancelAnimation(shine);
  }, [shine]);

  const shineProps = useAnimatedProps(() => ({
    x: shine.value,
  }));

  return (
    <View className="mb-5 flex-row items-center justify-between gap-3">
      <View className="min-w-0 flex-1">
        <Txt weight="semibold" className="text-xl tracking-[-0.8px]">
          FITSYNC
        </Txt>
        {/* <Txt className="mt-0.5 text-[9px] tracking-[1.5px] text-muted"></Txt> */}
      </View>
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPro ? "Open Pro studio" : "Explore Pro"}
          onPress={onPro}
          className="relative h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-yellow-300/30 bg-yellow-500/15"
        >
          {/* Glass surface */}
          <View pointerEvents="none" className="absolute inset-0 rounded-full bg-white/5" />

          {/* Top glass reflection */}
          <View
            pointerEvents="none"
            className="absolute left-2 right-2 top-0 h-px bg-yellow-100/40"
          />

          {/* Crown */}
          <MaterialCommunityIcons
            name={isPro ? "crown" : "crown-outline"}
            size={23}
            color="#FFDB78"
          />

          {/* Animated shine */}
          <View pointerEvents="none" className="absolute inset-0">
            <Svg width="100%" height="100%" viewBox="0 0 44 44">
              <Defs>
                <LinearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0} />
                  <Stop offset="50%" stopColor="#FFF2C4" stopOpacity={0.65} />
                  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
                </LinearGradient>
              </Defs>

              <AnimatedRect
                animatedProps={shineProps}
                y={-5}
                width={18}
                height={60}
                transform="skewX(-22)"
                fill="url(#shine)"
              />
            </Svg>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open reminders"
          onPress={onReminders}
          className="h-11 w-11 items-center justify-center rounded-full bg-panel"
        >
          <MaterialCommunityIcons name="bell-outline" size={21} color="#FFFFFF" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open your profile"
          onPress={onProfile}
          className="h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-elevated"
        >
          {user?.avatarUrl && failedAvatar !== user.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              onError={() => setFailedAvatar(user.avatarUrl ?? null)}
              className="h-full w-full"
              resizeMode="cover"
              accessible={false}
            />
          ) : (
            <Txt weight="medium" className="text-sm">
              {initials}
            </Txt>
          )}
        </Pressable>
      </View>
    </View>
  );
}
