import React from "react";
import { View } from "react-native";
import { MotionPressable as Pressable, ProgressFill } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { Icon, type IconName } from "./visuals";

export const ACCENTS = {
  training: C.brand,
  body: "#9CCFF2",
  recovery: "#C6B5EF",
  nutrition: "#E5C58F",
};
export const numberLabel = (value: number | null, digits = 1) =>
  value === null || !Number.isFinite(value)
    ? "—"
    : value.toLocaleString(undefined, { maximumFractionDigits: digits });
export function AnalyticsCard({
  title,
  subtitle,
  icon,
  color = C.brand,
  children,
  pro = false,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  color?: string;
  children: React.ReactNode;
  pro?: boolean;
}) {
  return (
    <View className="mt-4 overflow-hidden rounded-[26px] border border-white/[0.06] bg-panel p-5">
      <View className="mb-4 flex-row items-center gap-2.5">
        {icon && (
          <View
            className="h-8 w-8 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${color}14` }}
          >
            <Icon name={icon} size={18} color={color} />
          </View>
        )}
        <Txt
          accessibilityRole="header"
          weight="medium"
          className="flex-1 text-base tracking-[-0.3px]"
        >
          {title}
        </Txt>
        {pro && (
          <View className="rounded-full bg-brand/10 px-2 py-1">
            <Txt weight="semibold" className="text-[8px] tracking-[1px] text-brand">
              PRO
            </Txt>
          </View>
        )}
      </View>
      {subtitle && <Txt className="-mt-2 mb-4 text-[11px] leading-5 text-muted">{subtitle}</Txt>}
      {children}
    </View>
  );
}
export function MetricTile({
  label,
  value,
  unit,
  icon,
  color = C.brand,
  caption,
  onPress,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: IconName;
  color?: string;
  caption?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      className="min-w-0 flex-1 rounded-[20px] border border-white/5 bg-panel p-4"
    >
      <View className="flex-row items-center justify-between">
        <Icon name={icon} color={color} size={19} />
        {onPress && <Icon name="arrow-top-right" size={14} color={C.muted} />}
      </View>
      <Txt className="mt-3 text-[10px] text-muted">{label}</Txt>
      <Txt
        weight="medium"
        numberOfLines={1}
        adjustsFontSizeToFit
        className="mt-1 text-[25px] leading-9 tracking-[-0.7px]"
      >
        {value}
        <Txt className="text-[10px] text-muted">{unit ? ` ${unit}` : ""}</Txt>
      </Txt>
      {caption && <Txt className="mt-1 text-[10px] leading-4 text-muted">{caption}</Txt>}
    </Pressable>
  );
}
export function Choices<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="mb-4 flex-row gap-1 rounded-[14px] bg-black/30 p-1">
      {options.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === item.id }}
          onPress={() => onChange(item.id)}
          className={`min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl px-1 py-2 ${value === item.id ? "bg-white/10" : ""}`}
        >
          <Txt
            weight="medium"
            className={`text-center text-[10px] ${value === item.id ? "text-ink" : "text-muted"}`}
          >
            {item.label}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}
export function DataBars({
  rows,
  color = C.brand,
  suffix = "",
  maximum,
}: {
  rows: { label: string; value: number; detail?: string; onPress?: () => void }[];
  color?: string;
  suffix?: string;
  maximum?: number;
}) {
  const max = maximum ?? Math.max(1, ...rows.map((row) => row.value));
  return (
    <View className="gap-4">
      {rows.map((row) => (
        <Pressable
          key={row.label}
          accessibilityRole={row.onPress ? "button" : undefined}
          accessibilityLabel={`${row.label}: ${row.detail ?? `${numberLabel(row.value)} ${suffix}`}`}
          onPress={row.onPress}
        >
          <View className="mb-2 flex-row items-center gap-3">
            <Txt numberOfLines={1} className="min-w-0 flex-1 text-xs">
              {row.label}
            </Txt>
            <Txt weight="medium" className="max-w-[60%] text-right text-[11px]" style={{ color }}>
              {row.detail ?? `${numberLabel(row.value)}${suffix ? ` ${suffix}` : ""}`}
            </Txt>
          </View>
          <ProgressFill ratio={row.value / max} color={color} height={5} />
        </Pressable>
      ))}
    </View>
  );
}
export function EmptyInsight({ title, detail }: { title: string; detail: string }) {
  return (
    <View className="rounded-2xl bg-white/[0.025] p-4">
      <Txt weight="medium" className="text-sm">
        {title}
      </Txt>
      <Txt className="mt-2 text-xs leading-6 text-muted">{detail}</Txt>
    </View>
  );
}
