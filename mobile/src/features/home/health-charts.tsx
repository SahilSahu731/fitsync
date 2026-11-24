import React, { useId, useState } from "react";
import { View, type GestureResponderEvent } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { dateLabel } from "../progress/model";
import type { HomeSnapshot } from "./model";
import { macroBreakdown, macroHistory, workoutCalendar } from "./chart-model";
import { MacroDonut } from "./health-artwork";
import {
  HEALTH,
  healthChartGeometry,
  healthFormat,
  type HealthKind,
  type HealthPoint,
} from "./health-model";

type HistoryProps = {
  points: HealthPoint[];
  selected: number;
  onSelect: (index: number) => void;
};

/** One focusable surface plus the drawer's large previous/next controls. */
function ChartSurface({
  points,
  selected,
  onSelect,
  title,
  unit,
  height = 180,
  locate,
  valueText,
  children,
}: HistoryProps & {
  title: string;
  unit: string;
  height?: number;
  locate?: (x: number, y: number) => number;
  valueText?: (index: number) => string;
  children: React.ReactNode;
}) {
  const [width, setWidth] = useState(320);
  const active = points[selected];
  const select = (event: GestureResponderEvent) => {
    const x = (event.nativeEvent.locationX / Math.max(1, width)) * 320;
    const index = locate
      ? locate(x, event.nativeEvent.locationY)
      : Math.round(((x - 14) / 292) * (points.length - 1));
    if (locate && index < 0) return;
    onSelect(Math.max(0, Math.min(points.length - 1, index)));
  };
  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel={title}
      accessibilityValue={{
        min: 0,
        max: points.length - 1,
        now: selected,
        text: `${dateLabel(active.date)}: ${valueText ? valueText(selected) : active.value == null ? "No entry" : `${healthFormat(active.value)} ${unit}`}`,
      }}
      accessibilityActions={[
        { name: "increment", label: "Next day" },
        { name: "decrement", label: "Previous day" },
      ]}
      onAccessibilityAction={(event) => {
        if (!["increment", "decrement"].includes(event.nativeEvent.actionName)) return;
        onSelect(
          Math.max(
            0,
            Math.min(
              points.length - 1,
              selected + (event.nativeEvent.actionName === "increment" ? 1 : -1),
            ),
          ),
        );
      }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      onPress={select}
      style={{ height }}
    >
      {children}
    </Pressable>
  );
}

function RangeLabels({ points, caption }: { points: HealthPoint[]; caption: string }) {
  return (
    <View className="mt-2 flex-row items-center justify-between gap-2">
      <Txt className="text-[9px] text-muted">{dateLabel(points[0].date)}</Txt>
      <Txt className="text-[9px] text-muted">{caption}</Txt>
      <Txt className="text-[9px] text-muted">{dateLabel(points.at(-1)!.date)}</Txt>
    </View>
  );
}

function SeriesChart({
  points,
  kind,
  selected,
  onSelect,
  goal,
  unit,
}: HistoryProps & {
  kind: Exclude<HealthKind, "workouts">;
  goal: number | null;
  unit: string;
}) {
  const id = useId().replace(/:/g, "");
  const { x, y, segments, low, high } = healthChartGeometry(
    points,
    kind,
    kind === "weight" ? null : goal,
  );
  const color = HEALTH[kind].color;
  const bars = kind === "steps" || kind === "nutrition";
  const targetVisible = goal != null && goal >= low && goal <= high;
  return (
    <View>
      <View className="mb-2 flex-row justify-between gap-3">
        <Txt className="text-[10px] text-muted">
          {healthFormat(high, kind === "steps" || kind === "nutrition" ? 0 : 1)} {unit}
        </Txt>
        <Txt className="text-[10px] text-muted">{bars ? "Tap a bar" : "Tap a day"}</Txt>
      </View>
      <ChartSurface
        points={points}
        selected={selected}
        onSelect={onSelect}
        title={`${HEALTH[kind].title} history graph`}
        unit={unit}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 320 166"
          preserveAspectRatio="none"
          accessible={false}
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.36" />
              <Stop offset="1" stopColor={color} stopOpacity="0.015" />
            </LinearGradient>
          </Defs>
          {[24, 85, 146].map((at) => (
            <Line
              key={at}
              x1="0"
              x2="320"
              y1={at}
              y2={at}
              stroke="#FFFFFF"
              strokeOpacity="0.065"
              strokeDasharray="3 6"
            />
          ))}
          {targetVisible && (
            <Line
              x1="0"
              x2="320"
              y1={y(goal!)}
              y2={y(goal!)}
              stroke={color}
              strokeOpacity="0.7"
              strokeDasharray="5 4"
            />
          )}
          <Line
            x1={x(selected)}
            x2={x(selected)}
            y1="14"
            y2="153"
            stroke={color}
            strokeOpacity="0.24"
            strokeDasharray="3 4"
          />
          {bars ? (
            points.map((point, index) =>
              point.value == null ? (
                <Circle
                  key={point.date}
                  cx={x(index)}
                  cy="150"
                  r="1.5"
                  fill="#FFFFFF"
                  opacity="0.2"
                />
              ) : (
                <Rect
                  key={point.date}
                  x={x(index) - Math.max(3, 80 / points.length)}
                  y={point.value === 0 ? 144 : y(point.value)}
                  width={Math.max(6, 160 / points.length)}
                  height={point.value === 0 ? 2 : 146 - y(point.value)}
                  rx={points.length === 7 ? 5 : 2}
                  fill={color}
                  opacity={
                    index === selected
                      ? 1
                      : goal != null && point.value >= goal
                        ? 0.8
                        : point.value === 0
                          ? 0.22
                          : 0.4
                  }
                />
              ),
            )
          ) : (
            <React.Fragment>
              {segments.map((segment, index) => {
                const coords = segment.match(/(?:M|L)[\d.,-]+/g) ?? [];
                const first = coords[0]?.slice(1).split(",")[0],
                  last = coords.at(-1)?.slice(1).split(",")[0];
                return (
                  <React.Fragment key={index}>
                    {kind === "water" && coords.length > 1 && (
                      <Path d={`${segment} L${last},146 L${first},146 Z`} fill={`url(#${id})`} />
                    )}
                    <Path
                      d={segment}
                      stroke={color}
                      strokeWidth={kind === "weight" ? 2 : 2.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </React.Fragment>
                );
              })}
              {points.map((point, index) =>
                point.value == null ? null : (
                  <Circle
                    key={point.date}
                    cx={x(index)}
                    cy={y(point.value)}
                    r={index === selected ? 5 : kind === "weight" ? 3.5 : 2}
                    fill={index === selected ? color : "#192329"}
                    stroke={color}
                    strokeWidth={index === selected ? 2.5 : 1.5}
                  />
                ),
              )}
            </React.Fragment>
          )}
        </Svg>
      </ChartSurface>
      <RangeLabels
        points={points}
        caption={
          targetVisible
            ? `Dashed: target ${healthFormat(goal!)} ${unit}`
            : `${healthFormat(low)} ${unit} baseline`
        }
      />
    </View>
  );
}

function TrainingCalendar({ points, selected, onSelect }: HistoryProps) {
  const cells = workoutCalendar(points);
  const rows = cells.length / 7,
    height = rows * 42 + 36;
  const max = Math.max(1, ...points.map((p) => p.value ?? 0));
  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between">
        <Txt className="text-[10px] text-muted">Every square is a day</Txt>
        <Txt className="text-[10px] text-muted">Tap to inspect</Txt>
      </View>
      <ChartSurface
        points={points}
        selected={selected}
        onSelect={onSelect}
        title="Workouts activity calendar"
        unit="sessions"
        height={height}
        locate={(x, y) => {
          const column = Math.floor((x - 14) / 42),
            row = Math.floor((y - 30) / 42);
          if (column < 0 || column > 6 || row < 0 || row >= rows) return -1;
          const point = cells[row * 7 + column];
          return point ? points.findIndex((p) => p.date === point.date) : -1;
        }}
      >
        <Svg
          width="100%"
          height={height}
          viewBox={`0 0 320 ${height}`}
          preserveAspectRatio="none"
          accessible={false}
          pointerEvents="none"
        >
          {["M", "T", "W", "T", "F", "S", "S"].map((day, col) => (
            <SvgText
              key={col}
              x={31 + col * 42}
              y="13"
              fill="#969C96"
              fontSize="10"
              textAnchor="middle"
            >
              {day}
            </SvgText>
          ))}
          {cells.map((point, i) => {
            if (!point) return null;
            const active = point.date === points[selected].date,
              trained = (point.value ?? 0) > 0;
            const x = 14 + (i % 7) * 42,
              y = 30 + Math.floor(i / 7) * 42;
            return (
              <React.Fragment key={point.date}>
                <Rect
                  x={x}
                  y={y}
                  width="34"
                  height="32"
                  rx="9"
                  fill={trained ? "#C1A9FF" : "#FFFFFF"}
                  fillOpacity={trained ? 0.38 + 0.5 * (point.value! / max) : 0.045}
                  stroke={active ? "#E4D9FF" : "#FFFFFF"}
                  strokeOpacity={active ? 1 : 0.06}
                  strokeWidth={active ? 2 : 1}
                />
                <SvgText
                  x={x + 17}
                  y={y + 20}
                  fill={trained ? "#17101F" : "#969C96"}
                  fontSize="11"
                  fontWeight={trained ? "600" : "400"}
                  textAnchor="middle"
                >
                  {Number(point.date.slice(-2))}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </ChartSurface>
      <View className="mt-2 flex-row items-center justify-between gap-2">
        <Txt className="text-[10px] text-muted">
          {points.filter((p) => (p.value ?? 0) > 0).length} training days
        </Txt>
        <View className="flex-row items-center gap-1.5">
          <Txt className="text-[9px] text-muted">No session</Txt>
          {[0.05, 0.38, 0.64, 0.88].map((opacity) => (
            <View
              key={opacity}
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ backgroundColor: `rgba(193,169,255,${opacity})` }}
            />
          ))}
          <Txt className="text-[9px] text-muted">More</Txt>
        </View>
      </View>
      <RangeLabels points={points} caption="Completed sessions" />
    </View>
  );
}

function NutritionChart({
  snapshot,
  points,
  selected,
  onSelect,
  goal,
}: HistoryProps & { snapshot: HomeSnapshot; goal: number | null }) {
  const [mode, setMode] = useState<"macros" | "calories">("macros");
  const active = macroBreakdown(snapshot, points[selected].date);
  const history = macroHistory(snapshot, points);
  const max = Math.max(1, ...history.map((p) => p.breakdown.totalEnergy));
  const x = (i: number) => 14 + (i / Math.max(1, points.length - 1)) * 292;
  return (
    <View>
      <View className="mb-5 flex-row items-center gap-4">
        <View
          accessible
          accessibilityLabel={`Macro energy breakdown. ${active.recorded} of 3 macros logged. ${active.items.map((item) => `${item.label}: ${item.grams == null ? "not logged" : `${healthFormat(item.grams)} grams, ${Math.round(item.fraction * 100)} percent of logged macro energy`}`).join(". ")}`}
          className="relative h-[124px] w-[124px] items-center justify-center"
        >
          <MacroDonut breakdown={active} size={124} />
          <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
            <Txt weight="semibold" className="text-xl">
              {active.recorded ? healthFormat(active.totalEnergy, 0) : "—"}
            </Txt>
            <Txt className="text-[9px] text-muted">macro kcal</Txt>
          </View>
        </View>
        <View className="min-w-0 flex-1 gap-3">
          {active.items.map((item) => (
            <View key={item.key} className="flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <View className="flex-1">
                <Txt className="text-[10px] text-muted">{item.label}</Txt>
                <Txt weight="medium" className="text-xs">
                  {item.grams == null ? "Not logged" : `${healthFormat(item.grams)} g`}
                </Txt>
              </View>
              <Txt className="text-[10px] text-muted">
                {item.grams == null || active.totalEnergy === 0
                  ? "—"
                  : `${Math.round(item.fraction * 100)}%`}
              </Txt>
            </View>
          ))}
        </View>
      </View>
      <Txt className="mb-4 text-[10px] leading-5 text-muted">
        {active.recorded === 0
          ? "Log protein, carbs or fat to build your breakdown."
          : active.complete
            ? "Share of energy from logged macros. Food calories are tracked separately."
            : "Partial breakdown: missing macros are unknown. Percentages use only logged macro energy."}
      </Txt>
      <View className="mb-4 flex-row gap-2">
        {(["macros", "calories"] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={`Show ${value === "macros" ? "stacked macro" : "calorie"} history`}
            accessibilityState={{ selected: mode === value }}
            onPress={() => setMode(value)}
            className="min-h-11 flex-1 items-center justify-center rounded-xl border border-white/5 px-3"
            style={{ backgroundColor: mode === value ? "#C5F46015" : "transparent" }}
          >
            <Txt className="text-[11px]" style={{ color: mode === value ? "#C5F460" : "#969C96" }}>
              {value === "macros" ? "Macro balance" : "Food calories"}
            </Txt>
          </Pressable>
        ))}
      </View>
      {mode === "calories" ? (
        <SeriesChart
          points={points}
          kind="nutrition"
          selected={selected}
          onSelect={onSelect}
          goal={goal}
          unit="kcal"
        />
      ) : (
        <View>
          <View className="mb-2 flex-row justify-between gap-2">
            <Txt className="text-[10px] text-muted">Logged macro energy · kcal</Txt>
            <Txt className="text-[10px] text-muted">Tap a stack</Txt>
          </View>
          <ChartSurface
            points={points}
            selected={selected}
            onSelect={onSelect}
            title="Nutrition stacked macro history"
            unit="macro kcal"
            valueText={(index) => {
              const b = history[index].breakdown;
              return b.recorded
                ? `${healthFormat(b.totalEnergy)} macro kilocalories, ${b.recorded} of 3 macros recorded`
                : "No macros logged";
            }}
          >
            <Svg
              width="100%"
              height="100%"
              viewBox="0 0 320 166"
              preserveAspectRatio="none"
              accessible={false}
              pointerEvents="none"
            >
              {[24, 85, 146].map((at) => (
                <Line
                  key={at}
                  x1="0"
                  x2="320"
                  y1={at}
                  y2={at}
                  stroke="#FFFFFF"
                  strokeOpacity="0.06"
                  strokeDasharray="3 6"
                />
              ))}
              <Line
                x1={x(selected)}
                x2={x(selected)}
                y1="14"
                y2="153"
                stroke="#C5F460"
                strokeOpacity="0.3"
                strokeDasharray="3 4"
              />
              {history.map((point, index) => {
                const top = 146 - (point.breakdown.totalEnergy / max) * 122;
                if (!point.breakdown.recorded)
                  return (
                    <Circle
                      key={point.date}
                      cx={x(index)}
                      cy="150"
                      r="1.5"
                      fill="#FFFFFF"
                      opacity="0.2"
                    />
                  );
                return (
                  <React.Fragment key={point.date}>
                    {point.breakdown.items.map((item, itemIndex) => {
                      if (item.energy == null || item.energy <= 0) return null;
                      const height = (item.energy / max) * 122;
                      const bottom =
                        146 -
                        (point.breakdown.items
                          .slice(0, itemIndex + 1)
                          .reduce((sum, entry) => sum + (entry.energy ?? 0), 0) /
                          max) *
                          122;
                      return (
                        <Rect
                          key={item.key}
                          x={x(index) - Math.max(3, 80 / points.length)}
                          y={bottom}
                          width={Math.max(6, 160 / points.length)}
                          height={height}
                          fill={item.color}
                          opacity={index === selected ? 1 : 0.55}
                        />
                      );
                    })}
                    {point.breakdown.totalEnergy === 0 && (
                      <Rect
                        x={x(index) - 3}
                        y="144"
                        width="6"
                        height="2"
                        fill="#C5F460"
                        opacity="0.4"
                      />
                    )}
                    {!point.breakdown.complete && (
                      <Circle
                        cx={x(index)}
                        cy={top - 5}
                        r="2.5"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeOpacity="0.6"
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </Svg>
          </ChartSurface>
          <RangeLabels points={points} caption="○ Partial log" />
        </View>
      )}
    </View>
  );
}

export function HealthHistoryChart({
  kind,
  snapshot,
  points,
  selected,
  onSelect,
  goal,
  unit,
}: HistoryProps & {
  kind: HealthKind;
  snapshot: HomeSnapshot;
  goal: number | null;
  unit: string;
}) {
  if (kind === "workouts")
    return <TrainingCalendar points={points} selected={selected} onSelect={onSelect} />;
  if (kind === "nutrition")
    return (
      <NutritionChart
        snapshot={snapshot}
        points={points}
        selected={selected}
        onSelect={onSelect}
        goal={goal}
      />
    );
  return (
    <SeriesChart
      kind={kind}
      points={points}
      selected={selected}
      onSelect={onSelect}
      goal={goal}
      unit={unit}
    />
  );
}
