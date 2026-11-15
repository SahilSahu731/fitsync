import React, { useId, useState } from "react";
import { View } from "react-native";
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
import { MotionPressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { dateLabel } from "./model";
import { Icon } from "./visuals";

const ink = "#F4F4F5";
const muted = "#A1A1AA";
const grid = "#FFFFFF12";
const format = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });
const axisFormat = (value: number) =>
  value >= 1_000_000
    ? `${format(value / 1_000_000)}m`
    : value >= 1_000
      ? `${format(value / 1_000)}k`
      : format(value);

function SelectionControl({
  index,
  count,
  label,
  onChange,
  children,
}: {
  index: number;
  count: number;
  label: string;
  onChange: (index: number) => void;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-2 min-h-11 flex-row items-center gap-2">
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel={`Previous ${label}`}
        accessibilityState={{ disabled: index <= 0 }}
        disabled={index <= 0}
        onPress={() => onChange(index - 1)}
        className="h-11 w-11 items-center justify-center rounded-full"
      >
        <Icon name="chevron-left" size={20} color={index <= 0 ? "#52525B" : ink} />
      </MotionPressable>
      <View className="flex-1" accessibilityLiveRegion="polite">
        {children}
      </View>
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel={`Next ${label}`}
        accessibilityState={{ disabled: index >= count - 1 }}
        disabled={index >= count - 1}
        onPress={() => onChange(index + 1)}
        className="h-11 w-11 items-center justify-center rounded-full"
      >
        <Icon name="chevron-right" size={20} color={index >= count - 1 ? "#52525B" : ink} />
      </MotionPressable>
    </View>
  );
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <View className="min-h-36 justify-center rounded-2xl border border-dashed border-white/10 px-4">
      <Txt className="text-sm leading-5 text-muted">{children}</Txt>
    </View>
  );
}

function axisMaximum(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * magnitude;
}

export type CumulativePoint = { date: string; value: number };

/** Values are cumulative totals at the end of each supplied date. */
export function CumulativeChart({ points, unit }: { points: CumulativePoint[]; unit: string }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const gradientId = `cumulative-${useId().replace(/:/g, "")}`;
  const available = points
    .filter((point) => Number.isFinite(point.value) && point.value >= 0)
    .toSorted((a, b) => a.date.localeCompare(b.date));
  if (!available.length) {
    return <EmptyChart>Complete a workout to start your cumulative training trend.</EmptyChart>;
  }
  const selectedIndex = available.findIndex((point) => point.date === selectedDate);
  const index = selectedIndex < 0 ? available.length - 1 : selectedIndex;
  const active = available[index];
  const maximum = axisMaximum(Math.max(...available.map((point) => point.value)));
  const times = available.map((point) => Date.parse(`${point.date}T12:00:00Z`));
  const first = times[0];
  const last = times.at(-1)!;
  const left = 52;
  const right = 346;
  const top = 14;
  const bottom = 140;
  const x = (i: number) =>
    last === first
      ? (left + right) / 2
      : left + ((times[i] - first) / (last - first)) * (right - left);
  const y = (value: number) => bottom - (value / maximum) * (bottom - top);
  const steps = available
    .map((point, i) => `${i ? `H${x(i)} V` : `M${x(i)},`}${y(point.value)}`)
    .join(" ");
  const area = `${steps} L${x(available.length - 1)},${bottom} L${x(0)},${bottom} Z`;
  return (
    <View>
      <SelectionControl
        index={index}
        count={available.length}
        label="cumulative date"
        onChange={(i) => setSelectedDate(available[i].date)}
      >
        <Txt className="text-[10px] text-muted">Through {dateLabel(active.date)}</Txt>
        <Txt weight="medium" className="mt-0.5 text-xs">
          {format(active.value)} {unit} in this range
        </Txt>
      </SelectionControl>
      <Svg
        width="100%"
        height={174}
        viewBox="0 0 360 174"
        accessibilityLabel={`Cumulative ${unit}, from ${dateLabel(available[0].date)} to ${dateLabel(available.at(-1)!.date)}. Selected ${dateLabel(active.date)}: ${format(active.value)} ${unit}. The vertical scale starts at zero.`}
      >
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={ink} stopOpacity={0.18} />
            <Stop offset="1" stopColor={ink} stopOpacity={0.01} />
          </LinearGradient>
        </Defs>
        {[0, maximum / 2, maximum].map((value) => (
          <React.Fragment key={value}>
            <Line
              x1={left}
              x2={right}
              y1={y(value)}
              y2={y(value)}
              stroke={grid}
              strokeDasharray="3 5"
            />
            <SvgText x={left - 9} y={y(value) + 4} fontSize={15} fill={muted} textAnchor="end">
              {axisFormat(value)}
            </SvgText>
          </React.Fragment>
        ))}
        <Path d={area} fill={`url(#${gradientId})`} />
        <Path d={steps} fill="none" stroke={ink} strokeWidth={2.5} strokeLinejoin="round" />
        <Line
          x1={x(index)}
          x2={x(index)}
          y1={top}
          y2={bottom}
          stroke="#FFFFFF35"
          strokeDasharray="3 5"
        />
        <Circle
          cx={x(index)}
          cy={y(active.value)}
          r={4.5}
          fill={ink}
          stroke="#18181B"
          strokeWidth={2}
        />
        <SvgText x={left} y={165} fill={muted} fontSize={15}>
          {dateLabel(available[0].date)}
        </SvgText>
        <SvgText x={right} y={165} fill={muted} fontSize={15} textAnchor="end">
          {available.length > 1 ? dateLabel(available.at(-1)!.date) : ""}
        </SvgText>
      </Svg>
      <Txt className="mt-1 text-[10px] leading-4 text-muted">
        Running total · flat sections mean no additional {unit} logged.
      </Txt>
    </View>
  );
}

export type SessionPoint = {
  id: string;
  date: string;
  name: string;
  minutes: number;
  sets: number;
};

export function SessionScatter({ points }: { points: SessionPoint[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const available = points.filter(
    (point) =>
      Number.isFinite(point.minutes) &&
      point.minutes >= 0 &&
      Number.isFinite(point.sets) &&
      point.sets >= 0,
  );
  if (!available.length) {
    return (
      <EmptyChart>
        No recorded session duration in this range. Workouts with a recorded duration will appear
        here.
      </EmptyChart>
    );
  }
  const selectedIndex = available.findIndex((point) => point.id === selectedId);
  const index = selectedIndex < 0 ? available.length - 1 : selectedIndex;
  const active = available[index];
  const maxMinutes = axisMaximum(Math.max(...available.map((point) => point.minutes)));
  const maxSets = Math.max(2, axisMaximum(Math.max(...available.map((point) => point.sets))));
  const left = 45;
  const right = 344;
  const top = 20;
  const bottom = 151;
  const x = (value: number) => left + (value / maxMinutes) * (right - left);
  const y = (value: number) => bottom - (value / maxSets) * (bottom - top);
  return (
    <View>
      <SelectionControl
        index={index}
        count={available.length}
        label="workout in session chart"
        onChange={(i) => setSelectedId(available[i].id)}
      >
        <Txt numberOfLines={1} className="text-[10px] text-muted">
          {dateLabel(active.date)} · {active.name}
        </Txt>
        <Txt weight="medium" className="mt-0.5 text-xs">
          {format(active.minutes)} min · {format(active.sets)} working sets
        </Txt>
      </SelectionControl>
      <Svg
        width="100%"
        height={204}
        viewBox="0 0 360 204"
        accessibilityLabel={`Session duration versus working sets. ${available.length} workouts. Selected ${active.name} on ${dateLabel(active.date)}: ${format(active.minutes)} minutes, ${format(active.sets)} working sets. Both axes start at zero.`}
      >
        <SvgText x={left} y={14} fill={muted} fontSize={15}>
          Working sets
        </SvgText>
        {[0, maxSets / 2, maxSets].map((value) => (
          <React.Fragment key={`sets-${value}`}>
            <Line
              x1={left}
              x2={right}
              y1={y(value)}
              y2={y(value)}
              stroke={grid}
              strokeDasharray="3 5"
            />
            <SvgText x={left - 8} y={y(value) + 4} fill={muted} fontSize={15} textAnchor="end">
              {axisFormat(value)}
            </SvgText>
          </React.Fragment>
        ))}
        {[0, maxMinutes / 2, maxMinutes].map((value) => (
          <React.Fragment key={`minutes-${value}`}>
            <Line
              x1={x(value)}
              x2={x(value)}
              y1={top}
              y2={bottom}
              stroke={grid}
              strokeDasharray="3 5"
            />
            <SvgText x={x(value)} y={171} fill={muted} fontSize={15} textAnchor="middle">
              {axisFormat(value)}
            </SvgText>
          </React.Fragment>
        ))}
        {available.map((point) => (
          <Circle
            key={point.id}
            cx={x(point.minutes)}
            cy={y(point.sets)}
            r={point.id === active.id ? 6 : 4.5}
            fill={point.id === active.id ? ink : "#8B8B94"}
            fillOpacity={point.id === active.id ? 1 : 0.7}
            stroke={point.id === active.id ? "#18181B" : "none"}
            strokeWidth={2}
            onPress={() => setSelectedId(point.id)}
          />
        ))}
        <Circle
          cx={x(active.minutes)}
          cy={y(active.sets)}
          r={10}
          fill="none"
          stroke="#F4F4F566"
          strokeWidth={1}
          pointerEvents="none"
        />
        <SvgText x={(left + right) / 2} y={194} fill={muted} fontSize={15} textAnchor="middle">
          Session duration (minutes)
        </SvgText>
      </Svg>
      <Txt className="text-[10px] leading-4 text-muted">
        One dot per workout. Overlapping dots may represent multiple sessions. Warm-up sets
        excluded.
      </Txt>
    </View>
  );
}

export type DurationDistribution = {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  count: number;
};

export function DurationBoxPlot({ distribution }: { distribution: DurationDistribution | null }) {
  if (!distribution || !distribution.count) {
    return (
      <EmptyChart>
        No recorded session duration in this range. Workouts with a recorded duration will appear
        here.
      </EmptyChart>
    );
  }
  const { min, q1, median, q3, max, count } = distribution;
  const maximum = axisMaximum(max);
  const left = 24;
  const right = 336;
  const x = (value: number) => left + (value / maximum) * (right - left);
  return (
    <View>
      <View className="mb-1 flex-row items-baseline justify-between gap-3">
        <Txt weight="medium" className="text-2xl tracking-[-0.8px]">
          {format(median)} <Txt className="text-xs text-muted">min median</Txt>
        </Txt>
        <Txt className="text-[10px] text-muted">
          {count} {count === 1 ? "session" : "sessions"}
        </Txt>
      </View>
      <Svg
        width="100%"
        height={100}
        viewBox="0 0 360 100"
        accessibilityLabel={`Session duration distribution in minutes. ${count} sessions. Minimum ${format(min)}, lower quartile ${format(q1)}, median ${format(median)}, upper quartile ${format(q3)}, maximum ${format(max)}. Whiskers show the full range, not outlier thresholds.`}
      >
        {[0, maximum / 2, maximum].map((value) => (
          <React.Fragment key={value}>
            <Line x1={x(value)} x2={x(value)} y1={8} y2={66} stroke={grid} strokeDasharray="3 5" />
            <SvgText x={x(value)} y={85} fill={muted} fontSize={15} textAnchor="middle">
              {axisFormat(value)}
            </SvgText>
          </React.Fragment>
        ))}
        <Line x1={x(min)} x2={x(max)} y1={37} y2={37} stroke="#A1A1AA" strokeWidth={2} />
        <Line x1={x(min)} x2={x(min)} y1={27} y2={47} stroke="#A1A1AA" strokeWidth={2} />
        <Line x1={x(max)} x2={x(max)} y1={27} y2={47} stroke="#A1A1AA" strokeWidth={2} />
        <Rect
          x={x(q1)}
          y={19}
          width={Math.max(0, x(q3) - x(q1))}
          height={36}
          rx={3}
          fill="#FFFFFF18"
          stroke="#D4D4D8"
          strokeWidth={1.5}
        />
        <Line x1={x(median)} x2={x(median)} y1={19} y2={55} stroke={ink} strokeWidth={3} />
      </Svg>
      <View className="flex-row justify-between gap-2">
        <Txt className="text-[10px] text-muted">Shortest {format(min)} min</Txt>
        <Txt className="text-[10px] text-muted">Longest {format(max)} min</Txt>
      </View>
      <Txt className="mt-2 text-[10px] leading-4 text-muted">
        {count === 1
          ? "One recorded session. Add more workouts to see the spread."
          : `Box: middle 50% (${format(q1)}–${format(q3)} min). White line: median. Whiskers: shortest to longest.`}
      </Txt>
    </View>
  );
}
