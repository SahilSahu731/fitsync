import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
export function Icon({ name, color = C.ink, size = 22 }: { name: IconName; color?: string; size?: number }) {
  return <MaterialCommunityIcons name={name} color={color} size={size} />;
}

export function PanelCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ backgroundColor: C.panel, borderRadius: 24, padding: 20, marginBottom: 16 }, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View className="mb-3 mt-6 flex-row items-center justify-between gap-3">
    <Txt accessibilityRole="header" weight="bold" className="flex-1 text-[20px]">{title}</Txt>
    {action && <MotionPressable accessibilityRole="button" onPress={onAction} style={{ minHeight: 44, justifyContent: "center" }}><Txt weight="semibold" className="text-sm text-brand">{action}</Txt></MotionPressable>}
  </View>;
}

export function SmallButton({ label, icon = "plus", color = C.brand, onPress, disabled = false }: { label: string; icon?: IconName; color?: string; onPress: () => void; disabled?: boolean }) {
  return <MotionPressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={{ minHeight: 44, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderRadius: 24, backgroundColor: C.elevated, opacity: disabled ? 0.4 : 1 }}><Icon name={icon} color={color} size={18} /><Txt weight="semibold" style={{ color, fontSize: 13 }}>{label}</Txt></MotionPressable>;
}

export function IconButton({ icon, label, onPress, disabled = false }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return <MotionPressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: C.panel, opacity: disabled ? 0.3 : 1 }}><Icon name={icon} size={21} /></MotionPressable>;
}
