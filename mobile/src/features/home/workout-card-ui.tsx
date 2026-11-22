import React, { useEffect, useState } from "react";
import { ActivityIndicator, Animated, Easing, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const INDIGO = "#818CF8";
const GREEN = "#4ADE80";

type ShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  icon: IconName;
  meta?: string[];
  hero?: boolean;
  children?: React.ReactNode;
};

export function WorkoutShell({
  eyebrow,
  title,
  description,
  icon,
  meta,
  hero,
  children,
}: ShellProps) {
  const live = /progress/i.test(eyebrow);
  const accent = live ? GREEN : INDIGO;
  const [pulse] = useState(() => new Animated.Value(0));
  const [ripple] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const b = Animated.loop(
      Animated.timing(ripple, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    a.start();
    if (live) b.start();
    return () => {
      a.stop();
      b.stop();
      ripple.setValue(0);
    };
  }, [pulse, ripple, live]);

  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.24] });
  const float = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  const dot = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const rippleScale = ripple.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const rippleOpacity = ripple.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <View
      style={{
        flex: 1,
        minHeight: 124,
        overflow: "hidden",
        borderRadius: 26,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: live ? "#050D08" : "#070A14",
        borderWidth: 1,
        borderColor: live ? "rgba(74,222,128,0.22)" : "rgba(129,140,248,0.22)",
        borderTopColor: live ? "rgba(74,222,128,0.5)" : "rgba(129,140,248,0.5)",
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: -60,
          top: -70,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: accent,
          opacity: glow,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: -80,
          bottom: -100,
          width: 190,
          height: 190,
          borderRadius: 95,
          backgroundColor: live ? "#16A34A" : "#6366F1",
          opacity: 0.1,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: -10,
          top: -10,
          width: 116,
          height: 116,
          borderRadius: 58,
          borderWidth: 1,
          borderColor: `${accent}2E`,
        }}
      />
      {hero && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: 16,
            top: 16,
            width: 70,
            height: 70,
            borderRadius: 35,
            borderWidth: 1,
            borderColor: `${accent}20`,
          }}
        />
      )}

      {/* top row: status pill + meta */}
      <View className="flex-row items-center justify-between gap-2">
        <View
          className="flex-row items-center gap-1.5 rounded-full px-2 py-0.5"
          style={{ backgroundColor: `${accent}22`, borderWidth: 1, borderColor: `${accent}44` }}
        >
          {live && (
            <Animated.View
              style={{
                height: 6,
                width: 6,
                borderRadius: 3,
                backgroundColor: accent,
                opacity: dot,
              }}
            />
          )}
          <Txt
            weight="medium"
            className="text-[9px] tracking-[0.6px]"
            style={{ color: accent }}
            numberOfLines={1}
          >
            {eyebrow.toUpperCase()}
          </Txt>
        </View>
        {!!meta?.length && (
          <Txt className="shrink text-[10px] text-muted" numberOfLines={1}>
            {meta.join(" · ")}
          </Txt>
        )}
      </View>

      {/* title + icon */}
      <View className="mt-2.5 flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Txt
            weight="medium"
            className={
              hero
                ? "text-[22px] leading-[26px] tracking-[-0.6px]"
                : "text-[19px] leading-[23px] tracking-[-0.5px]"
            }
            numberOfLines={1}
          >
            {title}
          </Txt>
          {!!description && (
            <Txt className="mt-0.5 text-[11px] leading-4 text-muted" numberOfLines={1}>
              {description}
            </Txt>
          )}
        </View>
        <View style={{ height: 44, width: 44, alignItems: "center", justifyContent: "center" }}>
          {live && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                height: 44,
                width: 44,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: accent,
                opacity: rippleOpacity,
                transform: [{ scale: rippleScale }],
              }}
            />
          )}
          <Animated.View
            style={{
              height: 44,
              width: 44,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: `${accent}22`,
              borderWidth: 1,
              borderColor: `${accent}55`,
              transform: [{ translateY: float }],
            }}
          >
            <MaterialCommunityIcons name={icon} size={23} color={accent} />
          </Animated.View>
        </View>
      </View>

      {/* actions */}
      <View
        style={{
          marginTop: "auto",
          paddingTop: 10,
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
        }}
      >
        {children}
      </View>
    </View>
  );
}

export function HomeButton({
  title,
  icon,
  onPress,
  disabled,
  loading,
}: {
  title: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={{
        flexGrow: 1,
        flexBasis: 150,
        minHeight: 40,
        borderRadius: 20,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "#FFFFFF",
        opacity: disabled && !loading ? 0.5 : 1,
      }}
    >
      {loading && <ActivityIndicator size="small" color="#000000" />}
      <Txt weight="medium" className="text-[13px] text-black" numberOfLines={1}>
        {title}
      </Txt>
      {!loading && !!icon && <MaterialCommunityIcons name={icon} size={16} color="#000000" />}
    </Pressable>
  );
}

export function SecondaryLink({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 40,
        paddingHorizontal: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Txt weight="medium" className="text-[11px] text-muted" numberOfLines={1}>
        {title}
      </Txt>
      <MaterialCommunityIcons name="chevron-right" size={15} color="#A1A1AA" />
    </Pressable>
  );
}
