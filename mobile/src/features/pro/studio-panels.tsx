import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { MotionPressable as Pressable, ProgressFill } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { Body } from "../workouts/components/muscle-focus";
import { dateLabel } from "../progress/model";
import type { ProAnalytics } from "./analytics";
import type { Recipe, WellnessState } from "../wellness/api";
import { PRO, type ProIcon } from "./hub-ui";

export function StudioSection({
  index,
  title,
  subtitle,
  action,
  onPress,
}: {
  index: string;
  title: string;
  subtitle?: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View className="mb-4 mt-8">
      <View className="flex-row items-center gap-2">
        <View className="h-1 w-1 rounded-full bg-brand" />
        <Txt className="text-[9px] tracking-[1.6px] text-muted">{index}</Txt>
      </View>
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
            <MaterialCommunityIcons name="arrow-top-right" size={16} color={PRO.accent} />
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
  const [back, setBack] = useState(false);
  const [selected, setSelected] = useState("");
  const trained = [...data.muscles]
    .filter((m) => m.primary + m.secondary > 0)
    .sort((a, b) => b.primary - a.primary || b.secondary - a.secondary);
  const muscle = data.muscles.find((m) => m.code === selected) ?? trained[0] ?? data.muscles[0];
  const max = Math.max(1, ...trained.map((m) => m.primary + m.secondary));
  const pretty = (value: string) => value.replaceAll("-", " ");
  return (
    <View className="overflow-hidden rounded-[28px] border border-[#C5F46020] bg-[#10150D]">
      <View className="flex-row items-center justify-between border-b border-white/5 px-5 py-4">
        <Txt className="text-[9px] tracking-[1.4px] text-brand">MUSCLE INTELLIGENCE</Txt>
        <Txt className="text-[9px] text-muted">Last 30 days</Txt>
      </View>
      <View className="flex-row items-center px-3 py-5">
        <View className="w-[47%] items-center">
          <Body
            muscles={trained.map((m) => m.code)}
            size={128}
            back={back}
            selected={muscle?.code}
            intensity={Object.fromEntries(
              trained.map((m) => [m.code, (m.primary + m.secondary) / max]),
            )}
            onSelect={setSelected}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={back ? "Show front muscles" : "Show back muscles"}
            onPress={() => setBack(!back)}
            className="mt-3 min-h-11 flex-row items-center gap-2 rounded-full border border-white/10 px-4"
          >
            <MaterialCommunityIcons name="rotate-3d-variant" color={PRO.accent} size={17} />
            <Txt className="text-[10px] text-muted">{back ? "Back" : "Front"}</Txt>
          </Pressable>
        </View>
        <View className="min-w-0 flex-1 pr-3">
          <Txt className="text-[9px] tracking-[1px] text-muted">SELECTED MUSCLE</Txt>
          <Txt weight="medium" className="mt-2 text-xl capitalize tracking-[-0.5px]">
            {pretty(muscle?.code ?? "chest")}
          </Txt>
          <View className="mt-5 flex-row items-baseline gap-2">
            <Txt weight="medium" className="text-[42px] leading-[50px] tracking-[-1.5px]">
              {loading && !data.mappedSets ? "—" : (muscle?.primary ?? 0)}
            </Txt>
            <Txt className="text-[10px] text-muted">primary sets</Txt>
          </View>
          <Txt className="mt-1 text-[11px] text-muted">
            {muscle?.secondary ?? 0} supporting sets
          </Txt>
          <View className="mt-5 border-t border-white/10 pt-4">
            <Txt className="text-[9px] text-muted">LAST TRAINED</Txt>
            <Txt weight="medium" className="mt-1 text-xs">
              {muscle?.lastDate ? dateLabel(muscle.lastDate) : "No mapped sets yet"}
            </Txt>
          </View>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 16 }}
      >
        {(trained.length ? trained : data.muscles.slice(0, 6)).map((m) => (
          <Pressable
            key={m.code}
            accessibilityRole="button"
            accessibilityState={{ selected: muscle?.code === m.code }}
            accessibilityLabel={`Select ${pretty(m.code)} muscle`}
            onPress={() => setSelected(m.code)}
            className={`min-h-11 justify-center rounded-full border px-4 ${muscle?.code === m.code ? "border-brand/25 bg-brand/10" : "border-white/10"}`}
          >
            <Txt
              className={`text-[10px] capitalize ${muscle?.code === m.code ? "text-brand" : "text-muted"}`}
            >
              {pretty(m.code)}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
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
            <Txt className="text-xs text-[#ECD7A8]">
              Muscle labels couldn’t refresh. Tap to retry.
            </Txt>
          </Pressable>
        )}
        <StudioButton title="Explore advanced muscle insights" onPress={onOpen} quiet />
      </View>
    </View>
  );
}

export function MealBrief({
  food,
  recipes,
  today,
  loading,
  error,
  onOpen,
}: {
  food: WellnessState | null;
  recipes: Recipe[];
  today: string;
  loading: boolean;
  error: string;
  onOpen: () => void;
}) {
  const meals = food?.plan?.days.find((day) => day.date === today)?.meals ?? [];
  const preferences = food?.plan ? food.plan.preferences : food?.preferences;
  const servings = food?.plan?.servings ?? food?.preferences.servings;
  return (
    <View className="overflow-hidden rounded-[26px] border border-[#ECD7A81C] bg-[#18160F] p-5">
      <View className="mb-4 flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#ECD7A815]">
          <MaterialCommunityIcons name="silverware-fork-knife" color={PRO.gold} size={23} />
        </View>
        <View className="flex-1">
          <Txt weight="medium" className="text-base">
            Fuel for your day.
          </Txt>
          <Txt className="mt-1 text-[10px] text-muted">
            {preferences
              ? `${preferences.diet === "any" ? "Flexible" : preferences.diet} · ${servings} ${servings === 1 ? "serving" : "servings"}`
              : food?.plan
                ? `Saved menu · ${servings} ${servings === 1 ? "serving" : "servings"}`
                : "Meals that fit your preferences"}
          </Txt>
        </View>
      </View>
      {meals.length ? (
        meals.map((meal, i) => {
          const recipe = recipes.find((item) => item.id === meal.recipeId);
          return (
            <Pressable
              key={meal.slot}
              accessibilityRole="button"
              onPress={onOpen}
              className="flex-row items-center gap-3 border-t border-white/5 py-4"
            >
              <Txt className="w-5 text-[10px] text-[#ECD7A8]">0{i + 1}</Txt>
              <View className="flex-1">
                <Txt className="text-[9px] uppercase tracking-[1px] text-muted">{meal.slot}</Txt>
                <Txt weight="medium" className="mt-1 text-xs">
                  {recipe?.name ?? "Open saved meal"}
                </Txt>
              </View>
              <Txt className="text-[10px] text-muted">
                {recipe ? `${recipe.minutes} min` : "View"}
              </Txt>
            </Pressable>
          );
        })
      ) : (
        <View className="mb-4 rounded-2xl border border-white/5 px-4 py-5">
          <Txt weight="medium" className="text-sm">
            {loading ? "Opening your meal plan…" : "Give your week a little structure."}
          </Txt>
          <Txt className="mt-2 text-xs leading-6 text-muted">
            Choose your diet, ingredients to avoid, portions and preparation time. Build a week of
            meals with recipes and a shopping list.
          </Txt>
        </View>
      )}
      {!!error && <Txt className="mb-3 text-[10px] leading-5 text-[#ECD7A8]">{error}</Txt>}
      <StudioButton
        title={food?.plan ? "Meals & shopping list" : "Plan my meals"}
        onPress={onOpen}
        quiet
        icon="arrow-top-right"
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
        <MaterialCommunityIcons name="arrow-top-right" color={PRO.muted} size={16} />
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
    <View className="mt-3 rounded-[24px] border border-white/5 bg-[#111111] p-4">
      <View className="mb-4 flex-row justify-between">
        <Txt weight="medium" className="text-xs">
          {title}
        </Txt>
        <Txt className="text-[9px] text-muted">Completed · Planned · Rest</Txt>
      </View>
      <View className="flex-row justify-between gap-1">
        {days.map((day) => (
          <View
            key={day.date}
            accessible
            accessibilityLabel={`${dateLabel(day.date)}${day.today ? ", today" : ""}, ${day.done ? "completed" : day.planned ? "planned workout" : "no session planned"}`}
            className={`min-w-0 flex-1 items-center rounded-2xl border px-1 py-3 ${day.today ? "border-brand/35 bg-brand/5" : "border-transparent"}`}
          >
            <Txt className="text-[8px] text-muted">
              {new Date(`${day.date}T12:00:00Z`).toLocaleDateString(undefined, {
                weekday: "narrow",
                timeZone: "UTC",
              })}
            </Txt>
            <View
              className={`my-2 h-7 w-7 items-center justify-center rounded-full ${day.done ? "bg-brand" : day.planned ? "border border-brand/35 bg-brand/5" : "bg-white/5"}`}
            >
              <MaterialCommunityIcons
                name={day.done ? "check" : day.planned ? "dumbbell" : "minus"}
                size={13}
                color={day.done ? "#111" : day.planned ? PRO.accent : "#626262"}
              />
            </View>
            <Txt className={`text-[10px] ${day.today ? "text-brand" : "text-muted"}`}>
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
