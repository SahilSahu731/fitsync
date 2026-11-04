import React, { useState } from "react";

import { Image, Pressable, View } from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

import type { ExploreCard, ExploreDestination } from "./api";


import { EXPLORE_LABELS } from "./navigation";
import { ToolDefinition } from "./tools";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export const SECTION_ICONS: Record<ExploreDestination, IconName> = {
  workouts: "dumbbell",
  programs: "calendar-check-outline",
  exercises: "weight-lifter",
  mobility: "human-handsup",
  learn: "book-open-variant",
  tools: "calculator-variant",
};

export function ExploreHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <View className="mb-5 pt-3">
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        className="mb-5 h-10 w-10 items-center justify-center rounded-full bg-panel"
      >
        <MaterialCommunityIcons name="arrow-left" color={C.ink} size={22} />
      </Pressable>

      <Txt weight="bold" className="text-[32px]">
        {title}
      </Txt>

      {subtitle ? (
        <Txt className="mt-1 text-sm text-muted">{subtitle}</Txt>
      ) : null}
    </View>
  );
}

export function ExploreCardTile({
  card,
  onPress,
  compact = false,
}: {
  card: ExploreCard;
  onPress: () => void;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${card.title}`}
      className="min-w-0 flex-1 overflow-hidden rounded-2xl bg-panel active:opacity-80"
    >
      <View
        className={`items-center justify-center overflow-hidden bg-elevated ${
          compact ? "h-28" : "h-32"
        }`}
      >
        {card.imageUrl && !failed ? (
          <Image
            source={{ uri: card.imageUrl }}
            resizeMode="cover"
            onError={() => setFailed(true)}
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        ) : (
          <MaterialCommunityIcons
            name={SECTION_ICONS[card.section]}
            size={40}
            color={C.brand}
          />
        )}
      </View>

      <View className="min-h-[80px] justify-between p-3">
        <Txt numberOfLines={2} weight="bold" className="text-[16px] leading-5">
          {card.title}
        </Txt>

        <Txt numberOfLines={1} className="mt-2 text-[11px] text-muted">
          {card.meta}
        </Txt>
      </View>
    </Pressable>
  );
}

export function ToolTile({
  tool,
  onPress,
}: {
  tool: ToolDefinition;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${tool.name}`}
      className="min-w-0 flex-1 justify-between rounded-2xl bg-panel p-4 active:opacity-80"
      style={{ minHeight: 140 }}
    >
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand/10">
        <MaterialCommunityIcons name={tool.icon} size={26} color={C.brand} />
      </View>

      <View className="mt-5">
        <Txt weight="bold" numberOfLines={2} className="">
          {tool.name}
        </Txt>

        <Txt numberOfLines={2} className="mt-1 text-sm text-muted">
          {tool.description}
        </Txt>
      </View>
    </Pressable>
  );
}

export function ExploreSectionBlock({
  section,
  items,
  onAll,
  onOpen,
  warning,
}: {
  section: ExploreDestination;
  items: ExploreCard[];
  onAll: () => void;
  onOpen: (card: ExploreCard) => void;
  warning?: boolean;
}) {
  const first = items.slice(0, 2);
  const second = items.slice(2, 4);

  return (
    <View className="mt-9">
      <View className="mb-4 flex-row items-center justify-between gap-2">
        <Txt weight="bold" className="flex-1 text-[24px]">
          {EXPLORE_LABELS[section]}
        </Txt>

        <Pressable
          onPress={onAll}
          accessibilityRole="button"
          accessibilityLabel={`See all ${EXPLORE_LABELS[section]}`}
          className="flex-row items-center py-2 pl-3"
        >
          <Txt weight="semibold" className="text-sm text-brand">
            See all
          </Txt>

          <MaterialCommunityIcons
            name="chevron-right"
            size={19}
            color={C.brand}
          />
        </Pressable>
      </View>

      {warning ? (
        <View className="rounded-xl border border-border bg-panel p-4">
          <Txt className="text-sm text-muted">
            This section couldn&apos;t load. Pull down to retry.
          </Txt>
        </View>
      ) : items.length === 0 ? (
        <View className="rounded-xl border border-dashed border-border p-4">
          <Txt className="text-sm text-muted">
            No published content yet. Check back soon.
          </Txt>
        </View>
      ) : (
        <View className="gap-3">
          {[first, second]
            .filter((row) => row.length)
            .map((row, index) => (
              <View key={index} className="flex-row gap-3">
                {row.map((item) => (
                  <ExploreCardTile
                    key={item.id}
                    card={item}
                    onPress={() => onOpen(item)}
                  />
                ))}

                {row.length === 1 ? <View className="flex-1" /> : null}
              </View>
            ))}
        </View>
      )}
    </View>
  );
}
