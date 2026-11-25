import React from "react";
import { Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "@/src/constants/theme";
import { PERMISSION_CONTENT, type PermissionPrompt } from "@/src/services/permission-prompts";
import { Txt } from "./ui";

export function PermissionDialog({
  prompt,
  onContinue,
  onCancel,
}: {
  prompt: PermissionPrompt;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const content = PERMISSION_CONTENT[prompt.kind];
  return (
    <View>
      <View importantForAccessibility="no-hide-descendants">
        <MaterialCommunityIcons name={content.icon} size={30} color={C.ink} />
      </View>
      <Txt
        accessibilityRole="header"
        weight="semibold"
        className="mt-5 text-[26px] leading-[33px] tracking-[-0.5px]"
      >
        {content.title}
      </Txt>
      <Txt className="mt-2 text-base leading-6 text-ink">{content.message}</Txt>
      <Txt className="mt-3 text-sm leading-6 text-muted">
        {prompt.blocked
          ? "Access is turned off. You can change it in your phone’s settings or continue without it."
          : content.detail}
      </Txt>
      <Pressable
        accessibilityRole="button"
        onPress={onContinue}
        className="mt-6 min-h-12 items-center justify-center rounded-2xl bg-ink px-5 py-3 active:opacity-80"
      >
        <Txt weight="semibold" className="text-center text-base text-bg">
          {prompt.blocked ? "Open phone settings" : "Continue"}
        </Txt>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onCancel}
        className="mt-1 min-h-12 items-center justify-center rounded-2xl px-5 py-3 active:opacity-70"
      >
        <Txt weight="medium" className="text-sm text-muted">
          Not now
        </Txt>
      </Pressable>
    </View>
  );
}
