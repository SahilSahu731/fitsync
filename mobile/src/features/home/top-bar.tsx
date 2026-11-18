import React, { useState } from "react";
import { Image, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import type { AuthUser } from "@/src/context/session";

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
  return (
    <View className="mb-7 flex-row items-center justify-between gap-3">
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
          className="h-11 w-11 items-center justify-center rounded-full bg-yellow-500"
        >
          <MaterialCommunityIcons
            name={isPro ? "star-four-points-outline" : "crown-outline"}
            size={23}
            color="#000"
          />
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
