import React, { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { MotionPressable as Pressable, ProgressFill } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { AnatomicalBody } from "./anatomical-body";
import { dateLabel } from "../progress/model";
import type { ProAnalytics } from "./analytics";
import { dayNutrition, portionNutrition, type FoodEntry } from "../nutrition/model";
import { PlateArt } from "../nutrition/components";
import { PRO, type ProIcon } from "./hub-ui";

export function StudioSection({
  title,
  subtitle,
  action,
  onPress,
}: {
  index?: string;
  title: string;
  subtitle?: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View className="mb-4 mt-8">
      <View className="mt-2 flex-row items-center gap-3">
        <Txt
          accessibilityRole="header"
          weight="medium"
          className="flex-1 text-[23px] tracking-[-0.7px]"
        >
          {title}
        </Txt>
        {action && onPress && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action}
            onPress={onPress}
            className="min-h-11 flex-row items-center gap-1"
          >
            <Txt className="text-[10px] text-brand">{action}</Txt>
            <MaterialCommunityIcons name="arrow-right" size={16} color={PRO.accent} />
          </Pressable>
        )}
      </View>
      {subtitle && <Txt className="mt-1 text-xs leading-5 text-muted">{subtitle}</Txt>}
    </View>
  );
}

export function StudioButton({
  title,
  onPress,
  quiet = false,
  icon = "arrow-right",
}: {
  title: string;
  onPress: () => void;
  quiet?: boolean;
  icon?: ProIcon;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className={`min-h-12 flex-row items-center justify-between gap-3 rounded-2xl px-4 py-3 ${quiet ? "border border-white/10 bg-white/5" : "bg-brand"}`}
    >
      <Txt weight="medium" className={`flex-1 text-xs ${quiet ? "text-ink" : "text-bg"}`}>
        {title}
      </Txt>
      <MaterialCommunityIcons name={icon} size={19} color={quiet ? "white" : "#0C0F08"} />
    </Pressable>
  );
}

export function StudioArt({ small = false }: { small?: boolean }) {
  return (
    <Svg
      width={small ? 90 : 145}
      height={small ? 78 : 130}
      viewBox="0 0 160 140"
      accessible={false}
    >
      <Circle cx={80} cy={70} r={59} stroke="#C5F46025" fill="none" />
      <Circle cx={80} cy={70} r={43} stroke="#C5F46018" fill="none" />
      <Path
        d="M25 97 L77 35 104 67 133 31"
        stroke="#C5F460"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M119 31 H133 V46"
        stroke="#C5F460"
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
      {[
        { x: 40, y: 91, h: 22 },
        { x: 65, y: 78, h: 35 },
        { x: 90, y: 86, h: 27 },
        { x: 115, y: 61, h: 52 },
      ].map((p, i) => (
        <Rect
          key={i}
          x={p.x}
          y={p.y}
          width={13}
          height={p.h}
          rx={4}
          fill={i === 3 ? "#C5F460" : "#C5F46025"}
        />
      ))}
      <Line x1={30} y1={121} x2={139} y2={121} stroke="#C5F46030" />
    </Svg>
  );
}

export function MuscleBrief({
  data,
  error,
  loading,
  onOpen,
  onRetry,
}: {
  data: ProAnalytics;
  error: string;
  loading: boolean;
  onOpen: () => void;
  onRetry: () => void;
}) {
  const [selected, setSelected] = useState("");
  const { width } = useWindowDimensions();
  const figureSize = Math.min(170, Math.max(100, (width - 64) / 2));
  const trained = [...data.muscles]
    .filter((m) => m.primary + m.secondary > 0)
    .sort((a, b) => b.primary - a.primary || b.secondary - a.secondary);
  const muscle = data.muscles.find((m) => m.code === selected) ?? trained[0] ?? data.muscles[0];
  const max = Math.max(1, ...trained.map((m) => m.primary + m.secondary));
  const intensity = Object.fromEntries(
    trained.map((m) => [m.code, (m.primary + m.secondary) / max]),
  );
  const pretty = (value: string) => value.replaceAll("-", " ");
  const featured = (trained.length ? trained : data.muscles).slice(0, 5);
  if (muscle && !featured.some((item) => item.code === muscle.code)) featured.push(muscle);
  return (
    <View className="overflow-hidden rounded-[28px] border border-white/10 bg-[#111111]">
      <View className="flex-row flex-wrap items-center justify-between gap-2 border-b border-white/5 px-5 py-4">
        <Txt weight="medium" className="text-[10px] leading-5 tracking-[1.2px] text-white">
          MUSCLE INTELLIGENCE
        </Txt>
        <Txt className="text-[10px] leading-5 text-muted">Last 30 days</Txt>
      </View>
      <View className="flex-row items-end justify-center px-2 pb-3 pt-5">
        {[false, true].map((back) => (
          <View key={String(back)} className="min-w-0 flex-1 items-center">
            <AnatomicalBody
              muscles={trained.map((m) => m.code)}
              size={figureSize}
              back={back}
              selected={muscle?.code}
              intensity={intensity}
              onSelect={setSelected}
            />
            <Txt className="mt-2 text-[9px] leading-4 tracking-[1.5px] text-white/45">
              {back ? "BACK" : "FRONT"}
            </Txt>
          </View>
        ))}
      </View>
      <Txt className="mb-4 px-5 text-center text-[10px] leading-5 text-muted">
        Tap a muscle to see where the work goes.
      </Txt>
      <View className="mx-5 mb-5 rounded-[22px] border border-white/10 bg-black/30 p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Txt className="text-[9px] leading-4 tracking-[1px] text-muted">SELECTED MUSCLE</Txt>
            <Txt weight="medium" className="mt-1 text-xl capitalize leading-7 tracking-[-0.5px]">
              {pretty(muscle?.code ?? "chest")}
            </Txt>
          </View>
          <View className="items-end">
            <Txt className="text-[9px] leading-4 text-muted">LAST TRAINED</Txt>
            <Txt weight="medium" className="mt-1 text-[11px] leading-5">
              {muscle?.lastDate ? dateLabel(muscle.lastDate) : "No mapped sets yet"}
            </Txt>
          </View>
        </View>
        <View className="mt-3 flex-row flex-wrap items-baseline gap-x-3 gap-y-1">
          <View className="flex-row items-baseline gap-2">
            <Txt weight="medium" className="text-[36px] leading-[48px] tracking-[-1px]">
              {loading && !data.mappedSets ? "—" : (muscle?.primary ?? 0)}
            </Txt>
            <Txt className="text-[10px] leading-5 text-muted">primary sets</Txt>
          </View>
          <Txt className="text-[11px] leading-5 text-muted">
            {muscle?.secondary ?? 0} supporting sets
          </Txt>
        </View>
      </View>
      <View className="px-5 pb-4">
        <View className="mb-1 flex-row items-center justify-between gap-3">
          <Txt className="text-[10px] leading-5 text-muted">Muscle</Txt>
          <Txt className="text-[10px] leading-5 text-muted">Primary · supporting sets</Txt>
        </View>
        {featured.map((m) => (
          <Pressable
            key={m.code}
            accessibilityRole="button"
            accessibilityState={{ selected: muscle?.code === m.code }}
            accessibilityLabel={`Select ${pretty(m.code)} muscle`}
            accessibilityHint={`${m.primary} primary sets and ${m.secondary} supporting sets.`}
            onPress={() => setSelected(m.code)}
            className="min-h-14 justify-center py-2"
          >
            <View className="mb-2 flex-row items-center justify-between gap-3">
              <Txt
                weight={muscle?.code === m.code ? "medium" : "regular"}
                className="min-w-0 flex-1 text-xs capitalize leading-5"
                style={{ color: muscle?.code === m.code ? "#80C6FF" : "#FFFFFF" }}
              >
                {pretty(m.code)}
              </Txt>
              <Txt className="text-xs leading-5 text-white/65">
                {m.primary} · {m.secondary}
              </Txt>
            </View>
            <ProgressFill
              ratio={(m.primary + m.secondary) / max}
              color={muscle?.code === m.code ? "#159CFF" : "#94B9D7"}
              trackColor="#FFFFFF08"
              height={4}
            />
          </Pressable>
        ))}
      </View>
      <View className="border-t border-white/5 px-5 pb-5 pt-4">
        <Txt className="mb-4 text-[10px] leading-5 text-muted">
          {data.mappedSets} of {data.mappedSets + data.unknownSets} working sets have muscle labels.
          Counts show involvement, not a recovery or growth score.
        </Txt>
        {!!error && (
          <Pressable
            onPress={onRetry}
            accessibilityRole="button"
            className="mb-3 min-h-11 justify-center"
          >
            <Txt className="text-xs text-white">Muscle labels couldn’t refresh. Tap to retry.</Txt>
          </Pressable>
        )}
        <StudioButton title="Explore advanced muscle insights" onPress={onOpen} quiet />
      </View>
    </View>
  );
}

export function MealBrief({
  entries,
  today,
  loading,
  error,
  onOpen,
}: {
  entries: FoodEntry[];
  today: string;
  loading: boolean;
  error: string;
  onOpen: () => void;
}) {
  const day = entries.filter((entry) => entry.date === today);
  const eaten = dayNutrition(entries, today, "eaten");
  const planned = dayNutrition(entries, today, "planned");
  const next = day
    .filter((entry) => entry.status === "planned")
    .sort((a, b) => a.time.localeCompare(b.time))[0];
  const n = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return (
    <View className="overflow-hidden rounded-[28px] border border-white/10 bg-[#141414] p-5">
      <View className="flex-row items-center gap-3">
        <View className="min-w-0 flex-1">
          <Txt className="text-[10px] tracking-[1.5px] text-muted">YOUR EVERYDAY FUEL</Txt>
          <Txt weight="medium" className="mt-2 text-[24px] leading-8 tracking-[-0.7px]">
            Fuel for your day.
          </Txt>
          <Txt className="mt-2 text-xs leading-5 text-muted">
            Your foods, in the portions you choose.
          </Txt>
        </View>
        <PlateArt size={78} />
      </View>
      {loading ? (
        <Txt className="my-5 text-xs text-muted">Opening your food diary…</Txt>
      ) : day.length ? (
        <>
          <View className="mb-4 mt-5 flex-row flex-wrap items-baseline gap-x-2">
            <Txt weight="medium" className="text-[38px] leading-[50px] tracking-[-1.5px]">
              {n(eaten.calories)}
            </Txt>
            <Txt className="text-xs text-muted">kcal eaten · {n(planned.calories)} planned</Txt>
          </View>
          <View className="mb-5 flex-row gap-3 border-t border-white/10 pt-4">
            {(
              [
                { key: "protein", label: "Protein" },
                { key: "carbs", label: "Carbs" },
                { key: "fat", label: "Fat" },
              ] as const
            ).map((item) => (
              <View key={item.key} className="min-w-0 flex-1">
                <Txt className="text-[10px] text-muted">{item.label}</Txt>
                <Txt weight="medium" className="mt-2 text-lg">
                  {n(eaten[item.key])} <Txt className="text-[10px] text-muted">g</Txt>
                </Txt>
              </View>
            ))}
          </View>
          {next && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open planned food: ${next.name}`}
              onPress={onOpen}
              className="mb-4 flex-row items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] p-4"
            >
              <MaterialCommunityIcons name="clock-outline" size={21} color="#FFFFFF" />
              <View className="min-w-0 flex-1">
                <Txt className="text-[9px] text-muted">ON YOUR FOOD PLAN · {next.time}</Txt>
                <Txt weight="medium" className="mt-1 text-xs leading-5">
                  {next.name}
                </Txt>
                <Txt className="mt-1 text-[10px] text-muted">
                  {n(next.quantity)} {next.unit} · {n(portionNutrition(next).calories)} kcal
                </Txt>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#A3A3A3" />
            </Pressable>
          )}
        </>
      ) : (
        <View className="my-5 rounded-[22px] border border-dashed border-white/10 p-4">
          <Txt weight="medium" className="text-sm">
            Build a menu that feels like you.
          </Txt>
          <Txt className="mt-2 text-xs leading-5 text-muted">
            Add what you’ll eat, how much, and its nutrition. Plan ahead and set a reminder for your
            meals.
          </Txt>
        </View>
      )}
      {!!error && (
        <Txt accessibilityRole="alert" className="mb-4 text-xs leading-5 text-muted">
          {error}
        </Txt>
      )}
      <StudioButton
        title={day.length ? "Open my food diary" : "Add my first food"}
        onPress={onOpen}
        quiet
        icon="plus"
      />
    </View>
  );
}

export function ToolTile({
  title,
  detail,
  icon,
  onPress,
  color = PRO.accent,
}: {
  title: string;
  detail: string;
  icon: ProIcon;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className="min-w-0 flex-1 rounded-[23px] border border-white/10 bg-[#141414] p-4"
    >
      <View className="mb-5 flex-row items-center justify-between">
        <MaterialCommunityIcons name={icon} color={color} size={26} />
        <MaterialCommunityIcons name="arrow-right" color={PRO.muted} size={16} />
      </View>
      <Txt weight="medium" className="text-[14px] leading-6">
        {title}
      </Txt>
      <Txt className="mt-2 text-[10px] leading-5 text-muted">{detail}</Txt>
    </Pressable>
  );
}

export function WeekRhythm({
  days,
  title,
}: {
  title: string;
  days: { date: string; done: boolean; planned: boolean; today: boolean }[];
}) {
  return (
    <View className="mt-3 rounded-[28px] border border-white/10 bg-black px-2 py-4">
      <View className="mx-2 mb-5 flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Txt weight="medium" className="text-xs leading-5 text-white">
          {title}
        </Txt>
        <Txt className="text-[9px] leading-4 text-white/45">Completed · Planned · Rest</Txt>
      </View>
      <View className="flex-row justify-between gap-0.5">
        {days.map((day) => (
          <View
            key={day.date}
            accessible
            accessibilityLabel={`${dateLabel(day.date)}${day.today ? ", today" : ""}, ${day.done ? "completed" : day.planned ? "planned workout" : "no session planned"}`}
            className="min-w-0 flex-1 items-center"
          >
            <Txt className="text-[9px] leading-4 text-white/50">
              {new Date(`${day.date}T12:00:00Z`).toLocaleDateString(undefined, {
                weekday: "narrow",
                timeZone: "UTC",
              })}
            </Txt>
            <View
              className={`my-2 w-full max-w-12 items-center justify-center rounded-full border p-px ${day.today ? "border-white/70" : "border-transparent"}`}
              style={{ aspectRatio: 1 }}
            >
              <View
                className={`w-full flex-1 items-center justify-center rounded-full border ${day.done ? "border-white bg-white" : day.planned ? "border-white/50 bg-black" : "border-white/10 bg-black"}`}
              >
                <MaterialCommunityIcons
                  name={day.done ? "check" : day.planned ? "dumbbell" : "minus"}
                  size={17}
                  color={day.done ? "#000000" : day.planned ? "#FFFFFF" : "#FFFFFF55"}
                />
              </View>
            </View>
            <Txt
              weight="medium"
              className={`text-[11px] leading-5 ${day.today ? "text-white" : "text-white/50"}`}
            >
              {Number(day.date.slice(-2))}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

export function StudioProgress({ completed, total }: { completed: number; total: number }) {
  return (
    <View className="mt-4">
      <View className="mb-2 flex-row justify-between">
        <Txt className="text-[10px] text-muted">Your completed sessions</Txt>
        <Txt className="text-[10px] text-brand">
          {completed} / {total}
        </Txt>
      </View>
      <ProgressFill ratio={total ? completed / total : 0} color={PRO.accent} height={4} />
    </View>
  );
}
