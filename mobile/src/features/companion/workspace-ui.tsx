import React from "react";
import { ScrollView, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { PRO, type ProIcon } from "../pro/hub-ui";
import type { Readiness } from "./api";

export const COMPANION_TABS = [
  "today",
  "readiness",
  "insights",
  "goals",
  "focus",
  "photos",
  "nutrition",
  "experiments",
  "reminders",
  "sharing",
  "reports",
  "desktop",
] as const;
export type CompanionTab = (typeof COMPANION_TABS)[number];

export const COMPANION_SECTIONS: Record<CompanionTab, { label: string; detail: string }> = {
  today: { label: "Today", detail: "A little support for the day ahead." },
  readiness: { label: "Check-in", detail: "Sleep, energy and time. Start with how you feel." },
  insights: { label: "Insights", detail: "Find useful patterns in the work you’ve already done." },
  goals: { label: "Milestones", detail: "Give your next small win somewhere to live." },
  focus: { label: "Muscle focus", detail: "Make room in your training for what matters to you." },
  photos: { label: "Progress photos", detail: "A private record of change, on your own terms." },
  nutrition: { label: "Food & fuel", detail: "Your food, your portions, your plan." },
  experiments: {
    label: "Experiments",
    detail: "Try one change. See what your training tells you.",
  },
  reminders: { label: "Reminders", detail: "Helpful nudges that fit your day, on your schedule." },
  sharing: { label: "Coach sharing", detail: "Choose what to share and who gets to see it." },
  reports: { label: "Monthly reports", detail: "Step back and see how far you’ve come." },
  desktop: { label: "Web workspace", detail: "Keep planning with a little more room." },
};

export const COMPANION_GROUPS: {
  id: string;
  label: string;
  icon: ProIcon;
  tabs: readonly CompanionTab[];
}[] = [
  { id: "day", label: "Today", icon: "white-balance-sunny", tabs: ["today"] },
  {
    id: "training",
    label: "Training",
    icon: "dumbbell",
    tabs: ["insights", "goals", "focus", "experiments"],
  },
  {
    id: "health",
    label: "Health",
    icon: "heart-outline",
    tabs: ["nutrition", "readiness", "photos"],
  },
  {
    id: "more",
    label: "More",
    icon: "dots-horizontal",
    tabs: ["reminders", "sharing", "reports", "desktop"],
  },
];

export function CompanionNavigation({
  tab,
  onSelect,
}: {
  tab: CompanionTab;
  onSelect: (next: CompanionTab) => void;
}) {
  const active = COMPANION_GROUPS.find((group) => group.tabs.includes(tab)) ?? COMPANION_GROUPS[0];
  return (
    <View className="mb-6">
      <View className="flex-row rounded-full border border-white/5 bg-[#111111] p-1.5">
        {COMPANION_GROUPS.map((group) => {
          const selected = group.id === active.id;
          return (
            <MotionPressable
              key={group.id}
              accessibilityRole="tab"
              accessibilityLabel={`${group.label} sections`}
              accessibilityState={{ selected }}
              onPress={() => onSelect(selected ? tab : group.tabs[0])}
              className="min-h-16 min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-1 py-2"
              style={{ backgroundColor: selected ? "#FFFFFF" : "transparent" }}
            >
              <MaterialCommunityIcons
                name={group.icon}
                size={21}
                color={selected ? "#000000" : PRO.muted}
              />
              <Txt
                weight="medium"
                className="text-[10px]"
                style={{ color: selected ? "#000000" : PRO.muted }}
              >
                {group.label}
              </Txt>
            </MotionPressable>
          );
        })}
      </View>
      {active.tabs.length > 1 && (
        <ScrollView
          key={active.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingTop: 16, paddingBottom: 2 }}
        >
          {active.tabs.map((item) => (
            <MotionPressable
              key={item}
              accessibilityRole="tab"
              accessibilityLabel={COMPANION_SECTIONS[item].label}
              accessibilityState={{ selected: tab === item }}
              onPress={() => onSelect(item)}
              className="min-h-11 items-center justify-center rounded-full border px-4"
              style={{
                borderColor: tab === item ? "#FFFFFF55" : "#FFFFFF0D",
                backgroundColor: tab === item ? "#FFFFFF0F" : "transparent",
              }}
            >
              <Txt
                weight="medium"
                className="text-xs"
                style={{ color: tab === item ? "#FFFFFF" : PRO.muted }}
              >
                {COMPANION_SECTIONS[item].label}
              </Txt>
            </MotionPressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export function CompanionDayBrief({
  name,
  date,
  readiness,
  hasCheckIn,
  onSelect,
}: {
  name: string;
  date: string;
  readiness: Readiness;
  hasCheckIn: boolean;
  onSelect: (next: CompanionTab) => void;
}) {
  const firstName = name.trim().split(/\s+/)[0];
  const dateText = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const readings = [
    {
      label: "Sleep",
      value: readiness.sleepHours != null ? `${readiness.sleepHours} h` : "—",
      icon: "moon-waning-crescent" as const,
    },
    {
      label: "Energy",
      value: readiness.energy != null ? `${readiness.energy}/5` : "—",
      icon: "lightning-bolt-outline" as const,
    },
    {
      label: "Time",
      value: readiness.availableMinutes != null ? `${readiness.availableMinutes} min` : "—",
      icon: "clock-outline" as const,
    },
  ];
  return (
    <View className="mb-6 overflow-hidden rounded-[30px] border border-white/10 bg-[#141414] p-5">
      <View className="mb-5 flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2">
          <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRO.accent }} />
          <Txt className="text-[10px] tracking-[1.2px] text-muted">YOUR DAY, CONNECTED</Txt>
        </View>
        <Txt className="text-[10px] text-muted">{dateText}</Txt>
      </View>
      <Txt
        accessibilityRole="header"
        weight="medium"
        className="text-[29px] leading-[37px] tracking-[-1px]"
      >
        {firstName ? `In your corner,\n${firstName}.` : "A little support.\nEvery day."}
      </Txt>
      <Txt className="mb-6 mt-3 max-w-xs text-xs leading-6 text-muted">
        Training, food and recovery. Make a little room for yourself today.
      </Txt>
      <View className="mb-5 flex-row rounded-[22px] bg-black/25 px-1 py-4">
        {readings.map((reading, index) => (
          <View
            key={reading.label}
            className="min-w-0 flex-1 items-center px-1"
            style={{ borderLeftWidth: index ? 1 : 0, borderLeftColor: "#FFFFFF12" }}
          >
            <MaterialCommunityIcons name={reading.icon} color="#A3A3A3" size={18} />
            <Txt weight="medium" className="mt-2 text-base">
              {reading.value}
            </Txt>
            <Txt className="mt-1 text-[10px] text-muted">{reading.label}</Txt>
          </View>
        ))}
      </View>
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel={hasCheckIn ? "Update today’s check-in" : "Check in for today"}
        onPress={() => onSelect("readiness")}
        className="min-h-14 flex-row items-center justify-between gap-3 rounded-full bg-white px-5"
      >
        <Txt weight="semibold" className="flex-1 text-xs text-black">
          {hasCheckIn ? "Update today’s check-in" : "How are you feeling?"}
        </Txt>
        <MaterialCommunityIcons name="arrow-top-right" color="#000000" size={20} />
      </MotionPressable>
    </View>
  );
}

export function CompanionShortcuts({ onSelect }: { onSelect: (next: CompanionTab) => void }) {
  return (
    <View className="mb-1">
      <View className="mb-4 flex-row items-center justify-between">
        <Txt weight="medium" className="text-lg tracking-[-0.4px]">
          The little things count.
        </Txt>
        <MaterialCommunityIcons name="star-four-points-outline" color={PRO.accent} size={20} />
      </View>
      <View className="flex-row gap-3">
        {(
          [
            {
              tab: "nutrition",
              label: "Food & fuel",
              detail: "Plan your next meal",
              icon: "silverware-fork-knife",
            },
            {
              tab: "reminders",
              label: "Your rhythm",
              detail: "Set a helpful nudge",
              icon: "bell-outline",
            },
          ] as const
        ).map((item) => (
          <MotionPressable
            key={item.tab}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}. ${item.detail}`}
            onPress={() => onSelect(item.tab)}
            className="min-h-36 min-w-0 flex-1 rounded-[26px] border border-white/5 bg-[#111111] p-4"
          >
            <View className="mb-5 flex-row items-center justify-between">
              <MaterialCommunityIcons name={item.icon} color="#FFFFFF" size={24} />
              <MaterialCommunityIcons name="arrow-top-right" color={PRO.muted} size={17} />
            </View>
            <Txt weight="medium" className="text-sm">
              {item.label}
            </Txt>
            <Txt className="mt-1 text-[10px] leading-[18px] text-muted">{item.detail}</Txt>
          </MotionPressable>
        ))}
      </View>
    </View>
  );
}
