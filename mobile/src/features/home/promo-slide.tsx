/* eslint-disable react-hooks/refs */
import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";

type Props = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  onPress: () => void;
  accent?: string;
};

export function PromoSlide({
  icon,
  eyebrow,
  title,
  body,
  cta,
  onPress,
  accent = "#FACC15",
}: Props) {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float]);

  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const rotate = float.interpolate({ inputRange: [0, 1], outputRange: ["-8deg", "-2deg"] });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${cta}`}
      onPress={onPress}
      className="min-h-[190px] flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-panel p-5"
    >
      {/* big floating icon in the corner */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: -14,
          top: 6,
          opacity: 0.18,
          transform: [{ translateY }, { rotate }],
        }}
      >
        <MaterialCommunityIcons name={icon} size={150} color={accent} />
      </Animated.View>

      <View className="self-start rounded-full px-2.5 py-1" style={{ backgroundColor: accent }}>
        <Txt weight="medium" className="text-[9px] tracking-[0.5px] text-black">
          {eyebrow}
        </Txt>
      </View>
      <Txt
        weight="medium"
        className="mt-4 max-w-[75%] text-[22px] leading-[28px] tracking-[-0.5px]"
      >
        {title}
      </Txt>
      <Txt className="mt-2 max-w-[75%] text-xs leading-5 text-muted">{body}</Txt>
      <View className="mt-auto flex-row items-center gap-2 pt-4">
        <Txt weight="medium" className="text-xs text-white">
          {cta}
        </Txt>
        <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}
