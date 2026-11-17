import React, { useState } from "react";
import { View } from "react-native";
import { MotionPressable as Pressable, ProgressFill } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { Icon } from "./visuals";
import { NutritionArtwork, StepsArtwork, WaterArtwork } from "./tracking-artwork";
import { DailyMetricGrid, WeightCard, compact, displayMetric } from "./tracking-cards";
import {
  METRICS,
  METRIC_GROUPS,
  type Goals,
  type Metric,
  type MetricEvent,
  type MetricGroup,
} from "./model";

const BLUE = "#8FC8F5";
const GOLD = "#EBC887";
type DailyProps = {
  daily: (metric: Metric) => number | null;
  goals: Goals;
  unit: "kg" | "lb";
  canLog: boolean;
  onLog: (metric: Metric) => void;
  onDetail: (metric: Metric) => void;
};

function Value({ value, unit, size = 42 }: { value: string; unit: string; size?: number }) {
  return (
    <View className="min-w-0">
      <Txt
        weight="medium"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
        style={{ fontSize: size, lineHeight: size * 1.4, includeFontPadding: false }}
        className="tracking-[-1.2px]"
      >
        {value}
      </Txt>
      <Txt className="text-xs leading-5 text-muted">{unit}</Txt>
    </View>
  );
}

function LogButton({
  metric,
  onLog,
  canLog,
  color,
}: Pick<DailyProps, "onLog" | "canLog"> & { metric: Metric; color: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Log ${METRICS[metric].label}`}
      accessibilityState={{ disabled: !canLog }}
      disabled={!canLog}
      onPress={() => {
        if (canLog) onLog(metric);
      }}
      className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl px-3"
      style={{ backgroundColor: `${color}18`, opacity: canLog ? 1 : 0.4 }}
    >
      <Icon name="plus" size={18} color={color} />
      <Txt weight="medium" className="text-xs" style={{ color }}>
        Log {metric === "caloriesIn" ? "calories" : METRICS[metric].label.toLowerCase()}
      </Txt>
    </Pressable>
  );
}

function GoalLine({
  value,
  target,
  label,
  color,
}: {
  value: number | null;
  target: number | null;
  label: string;
  color: string;
}) {
  return (
    <View className="mt-4">
      {target != null && target > 0 ? (
        <>
          <ProgressFill
            ratio={(value ?? 0) / target}
            color={color}
            trackColor={`${color}14`}
            height={5}
          />
          <Txt className="mt-2 text-[11px] leading-5 text-muted">{label}</Txt>
        </>
      ) : (
        <Txt className="text-[11px] leading-5 text-muted">
          {value === null
            ? "Your first check-in starts here."
            : "Daily total saved. Every check-in counts."}
        </Txt>
      )}
    </View>
  );
}

export function StepsCard({
  daily,
  goals,
  unit,
  canLog,
  onLog,
  onDetail,
  walkCounter,
}: DailyProps & { walkCounter?: React.ReactNode }) {
  const value = daily("steps");
  const target = goals.steps;
  return (
    <View
      className="rounded-[28px] border p-5"
      style={{ backgroundColor: "#11150E", borderColor: "#C5F4601A" }}
    >
      <View className="flex-row items-center gap-2">
        <Icon name="shoe-print" size={18} color={C.brand} />
        <Txt weight="medium" className="text-sm">
          Steps
        </Txt>
        <Txt className="flex-1 text-right text-[10px] text-muted">MOVE A LITTLE MORE</Txt>
      </View>
      <View className="mt-3 flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View Steps history"
          onPress={() => onDetail("steps")}
          className="min-w-0 flex-1 py-2"
        >
          <Value value={displayMetric("steps", value, unit)} unit="steps" />
          <View className="mt-2 flex-row items-center gap-1">
            <Txt className="text-[11px] leading-5" style={{ color: C.brand }}>
              View your journey
            </Txt>
            <Icon name="arrow-up-right" size={14} color={C.brand} />
          </View>
        </Pressable>
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <StepsArtwork size={126} progress={target && value != null ? value / target : 0} />
        </View>
      </View>
      <GoalLine
        value={value}
        target={target}
        label={`${value === null ? "Not logged" : `${compact(value)} steps`} · Goal ${target == null ? "not set" : compact(target)}`}
        color={C.brand}
      />
      <View className="mt-4 flex-row">
        <LogButton metric="steps" onLog={onLog} canLog={canLog} color={C.brand} />
      </View>
      {walkCounter}
    </View>
  );
}

export function WaterCard({
  daily,
  goals,
  unit,
  canLog,
  onLog,
  onDetail,
  onWater,
  waterBusy,
}: DailyProps & { onWater: () => void; waterBusy: boolean }) {
  const value = daily("water");
  const target = goals.water;
  return (
    <View
      className="rounded-[28px] border p-5"
      style={{ backgroundColor: "#0E151A", borderColor: "#8FC8F51A" }}
    >
      <View className="flex-row items-center gap-2">
        <Icon name="water-outline" size={19} color={BLUE} />
        <Txt weight="medium" className="text-sm">
          Water
        </Txt>
        <Txt className="flex-1 text-right text-[10px] text-muted">ONE REFILL AT A TIME</Txt>
      </View>
      <View className="mt-3 flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View Water history"
          onPress={() => onDetail("water")}
          className="min-w-0 flex-1 py-2"
        >
          <Value value={displayMetric("water", value, unit)} unit="litres" />
          <View className="mt-2 flex-row items-center gap-1">
            <Txt className="text-[11px] leading-5" style={{ color: BLUE }}>
              Hydration history
            </Txt>
            <Icon name="arrow-up-right" size={14} color={BLUE} />
          </View>
        </Pressable>
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <WaterArtwork size={126} progress={target && value != null ? value / target : 0} />
        </View>
      </View>
      <GoalLine
        value={value}
        target={target}
        label={`${value === null ? "Not logged" : `${displayMetric("water", value, unit)} L`} · Goal ${target == null ? "not set" : `${displayMetric("water", target, unit)} L`}`}
        color={BLUE}
      />
      <View className="mt-4 flex-row gap-2">
        <LogButton metric="water" onLog={onLog} canLog={canLog} color={BLUE} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add 250 ml water"
          accessibilityState={{ disabled: waterBusy || !canLog, busy: waterBusy }}
          disabled={waterBusy || !canLog}
          onPress={() => {
            if (canLog && !waterBusy) onWater();
          }}
          className="min-h-12 flex-1 items-center justify-center rounded-2xl border px-3"
          style={{ borderColor: `${BLUE}30`, opacity: canLog && !waterBusy ? 1 : 0.4 }}
        >
          <Txt weight="medium" className="text-xs" style={{ color: BLUE }}>
            {waterBusy ? "Adding…" : "+ 250 ml"}
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

export function NutritionCard(props: DailyProps) {
  const { daily, goals, unit, canLog, onLog, onDetail } = props;
  const [expanded, setExpanded] = useState(false);
  const calories = daily("caloriesIn");
  return (
    <View
      className="rounded-[28px] border p-5"
      style={{ backgroundColor: "#18150F", borderColor: "#EBC8871A" }}
    >
      <View className="flex-row items-center gap-2">
        <Icon name="silverware-fork-knife" size={18} color={GOLD} />
        <Txt weight="medium" className="text-sm">
          Nutrition
        </Txt>
        <Txt className="flex-1 text-right text-[10px] text-muted">FUEL YOUR DAY</Txt>
      </View>
      <View className="mt-3 flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View Food calories history"
          onPress={() => onDetail("caloriesIn")}
          className="min-w-0 flex-1 py-2"
        >
          <Value
            value={displayMetric("caloriesIn", calories, unit)}
            unit="food calories · kcal"
            size={38}
          />
          {goals.caloriesIn != null && (
            <Txt className="mt-2 text-[11px] leading-5 text-muted">
              Goal {compact(goals.caloriesIn)} kcal
            </Txt>
          )}
        </Pressable>
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <NutritionArtwork size={126} />
        </View>
      </View>
      <View className="mb-4 mt-3 flex-row">
        <LogButton metric="caloriesIn" canLog={canLog} onLog={onLog} color={GOLD} />
      </View>
      <View className="flex-row gap-3">
        {(["protein", "carbs"] as const).map((metric) => {
          const value = daily(metric);
          const target = goals[metric];
          const color = metric === "protein" ? "#C8B5F0" : GOLD;
          return (
            <View key={metric} className="min-w-0 flex-1 rounded-[20px] bg-black/20 px-3 pb-3">
              <View className="flex-row items-center">
                <Txt weight="medium" className="min-w-0 flex-1 text-xs leading-5">
                  {METRICS[metric].label}
                </Txt>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Log ${METRICS[metric].label}`}
                  accessibilityState={{ disabled: !canLog }}
                  disabled={!canLog}
                  onPress={() => {
                    if (canLog) onLog(metric);
                  }}
                  className="-mr-2 h-11 w-11 items-center justify-center"
                >
                  <Icon name="plus-circle-outline" size={20} color={canLog ? color : C.muted} />
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View ${METRICS[metric].label} history`}
                onPress={() => onDetail(metric)}
                className="min-h-16"
              >
                <Value value={displayMetric(metric, value, unit)} unit="grams" size={28} />
              </Pressable>
              {target != null && target > 0 && (
                <View className="mt-2">
                  <ProgressFill
                    ratio={(value ?? 0) / target}
                    color={color}
                    trackColor={`${color}15`}
                    height={3}
                  />
                  <Txt className="mt-2 text-[10px] leading-4 text-muted">
                    Goal {compact(target)} g
                  </Txt>
                </View>
              )}
            </View>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? "Show fewer nutrients" : "Show more nutrients"}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        className="mt-3 min-h-12 flex-row items-center justify-center gap-2"
      >
        <Txt weight="medium" className="text-xs" style={{ color: GOLD }}>
          {expanded ? "Show less" : "Show more"}
        </Txt>
        <Icon name={expanded ? "chevron-up" : "chevron-down"} size={19} color={GOLD} />
      </Pressable>
      {expanded && (
        <View className="mt-2">
          <DailyMetricGrid
            metrics={["fat", "fiber", "sugar", "sodium", "caffeine"]}
            daily={daily}
            goals={goals}
            unit={unit}
            onLog={onLog}
            onDetail={onDetail}
            disabled={!canLog}
          />
        </View>
      )}
      <Txt className="mt-1 text-center text-[10px] leading-5 text-muted">
        Daily totals from your food log.
      </Txt>
    </View>
  );
}

export function TrackCards({
  group,
  latestWeight,
  weights,
  walkCounter,
  onWater,
  waterBusy,
  ...props
}: DailyProps & {
  group: MetricGroup;
  latestWeight?: MetricEvent;
  weights: MetricEvent[];
  walkCounter?: React.ReactNode;
  onWater: () => void;
  waterBusy: boolean;
}) {
  return (
    <View className="gap-4">
      {!props.canLog && (
        <Txt className="text-xs leading-5 text-muted">
          Logging is temporarily unavailable. Try refreshing Progress.
        </Txt>
      )}
      {group === "activity" && (
        <>
          <StepsCard {...props} walkCounter={walkCounter} />
          <WaterCard {...props} onWater={onWater} waterBusy={waterBusy} />
          <NutritionCard {...props} />
          <Txt weight="medium" className="mt-2 text-base">
            A little more movement
          </Txt>
          <DailyMetricGrid
            {...props}
            disabled={!props.canLog}
            metrics={["caloriesActive", "distance", "activeMinutes", "floors"]}
          />
        </>
      )}
      {group === "nutrition" && (
        <>
          <NutritionCard {...props} />
          <WaterCard {...props} onWater={onWater} waterBusy={waterBusy} />
        </>
      )}
      {group === "body" && (
        <>
          <WeightCard
            latest={latestWeight}
            weights={weights}
            unit={props.unit}
            onLog={() => {
              if (props.canLog) props.onLog("weight");
            }}
            onDetail={() => props.onDetail("weight")}
            disabled={!props.canLog}
          />
          <DailyMetricGrid
            {...props}
            disabled={!props.canLog}
            metrics={METRIC_GROUPS.body.metrics.filter((metric) => metric !== "weight")}
          />
        </>
      )}
      {group === "recovery" && (
        <DailyMetricGrid
          {...props}
          disabled={!props.canLog}
          metrics={METRIC_GROUPS.recovery.metrics}
        />
      )}
    </View>
  );
}
