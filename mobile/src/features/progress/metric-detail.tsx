import { MotionPressable as Pressable } from "@/src/components/motion";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { Sheet } from "./editors";
import { HistoryChart } from "../pro/history-chart";
import { TrendChart } from "./charts";
import { average } from "./analytics";
import {
  dateLabel,
  isTotalMetric,
  METRICS,
  METRIC_GROUPS,
  weightValue,
  type Metric,
  type MetricEvent,
  type MetricGroup,
} from "./model";

export function MetricDetail({
  initialMetric,
  metrics,
  start,
  end,
  days,
  unit,
  onClose,
  onEdit,
  onRangeChange,
  paged = false,
}: {
  initialMetric: Metric;
  metrics: MetricEvent[];
  start: string;
  end: string;
  days: number;
  unit: "kg" | "lb";
  onClose: () => void;
  onRangeChange?: (days: number) => void;
  paged?: boolean;
  onEdit: (metric: Metric, date: string) => void;
}) {
  const Chart = paged ? HistoryChart : TrendChart;
  const [metric, setMetric] = useState(initialMetric);
  const [group, setGroup] = useState<MetricGroup>(() =>
    (Object.keys(METRIC_GROUPS) as MetricGroup[]).find((key) =>
      (METRIC_GROUPS[key].metrics as readonly Metric[]).includes(initialMetric),
    )!,
  );
  const rows = metrics.filter(
    (entry) => entry.metric === metric && entry.date >= start && entry.date <= end,
  );
  const convert = (n: number) => (metric === "weight" ? weightValue(n, unit) : n);
  const values = rows.map((entry) => convert(entry.value!));
  const avg = average(values);
  const spec = METRICS[metric];
  const labelUnit = metric === "weight" ? unit : spec.unit;
  const stat = (value: number | null) =>
    value === null ? "—" : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  const totalsApply = isTotalMetric(metric);
  return (
    <Sheet
      title={METRICS[metric].label}
      subtitle={`${dateLabel(start)} — ${dateLabel(end)} · ${days}-day range`}
      onClose={onClose}
    >
      {onRangeChange && (
        <View className="mb-4 flex-row gap-2">
          {[7, 30, 90, 365].map((period) => (
            <Pressable
              key={period}
              accessibilityRole="button"
              accessibilityState={{ selected: days === period }}
              onPress={() => onRangeChange(period)}
              style={{
                flex: 1,
                minHeight: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: days === period ? C.ink : C.elevated,
              }}
            >
              <Txt
                weight="medium"
                style={{ color: days === period ? C.bg : C.muted, fontSize: 12 }}
              >
                {period === 365 ? "1 year" : `${period} days`}
              </Txt>
            </Pressable>
          ))}
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        <View className="flex-row gap-2">
          {(Object.keys(METRIC_GROUPS) as MetricGroup[]).map((key) => (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: group === key }}
              onPress={() => {
                setGroup(key);
                setMetric(METRIC_GROUPS[key].metrics[0]);
              }}
              style={{
                borderBottomWidth: 2,
                borderBottomColor: group === key ? C.brand : "transparent",
                minHeight: 44,
                paddingHorizontal: 10,
                justifyContent: "center",
              }}
            >
              <Txt className="text-xs" style={{ color: group === key ? C.brand : C.muted }}>
                {METRIC_GROUPS[key].label}
              </Txt>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
        <View className="flex-row gap-2">
          {METRIC_GROUPS[group].metrics.map((key) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: metric === key }}
              onPress={() => setMetric(key)}
              style={{
                borderRadius: 20,
                paddingHorizontal: 13,
                minHeight: 44,
                justifyContent: "center",
                backgroundColor: key === metric ? C.brand : C.elevated,
              }}
            >
              <Txt
                weight="semibold"
                className="text-xs"
                style={{ color: key === metric ? "#18181F" : C.muted }}
              >
                {METRICS[key].label}
              </Txt>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <Txt weight="semibold" className="text-[26px]" style={{ color: C.brand }}>
        {spec.label}
      </Txt>
      <Txt className="mb-5 mt-2 text-xs text-muted">
        {rows.length}/{days} days logged · {Math.round((rows.length / days) * 100)}% coverage
      </Txt>
      <Chart
        key={metric + start}
        points={rows.map((entry) => ({ date: entry.date, value: convert(entry.value!) }))}
        color={C.ink}
        unit={labelUnit}
      />
      <View className="my-6 flex-row flex-wrap gap-3">
        {[
          { label: "Average on logged days", value: avg },
          { label: "Lowest recorded", value: values.length ? Math.min(...values) : null },
          { label: "Highest recorded", value: values.length ? Math.max(...values) : null },
          {
            label: totalsApply ? "Total recorded" : "First → latest change",
            value: values.length
              ? totalsApply
                ? values.reduce((sum, n) => sum + n, 0)
                : values.at(-1)! - values[0]
              : null,
          },
        ].map((item) => (
          <View
            key={item.label}
            style={{ width: "47%", padding: 15, borderRadius: 18, backgroundColor: C.elevated }}
          >
            <Txt className="text-[11px] text-muted">{item.label}</Txt>
            <Txt weight="semibold" className="mt-2 text-xl" style={{ color: C.brand }}>
              {stat(item.value)}
            </Txt>
            <Txt className="text-[11px] text-muted">{labelUnit}</Txt>
          </View>
        ))}
      </View>
      <Txt className="mb-5 text-[11px] leading-5 text-muted">
        Only actual dated check-ins are plotted. Lines connect observations; they do not create
        measurements on missing days. Daily totals are replacements, so edits are not
        double-counted.
      </Txt>
      <Txt weight="semibold" className="text-base">
        Recorded days
      </Txt>
      {[...rows].reverse().map((entry) => (
        <Pressable
          key={entry.id}
          accessibilityRole="button"
          onPress={() => onEdit(metric, entry.date)}
          className="flex-row items-center justify-between py-4"
        >
          <View className="flex-1 pr-3">
            <Txt className="text-sm">
              {dateLabel(entry.date, { month: "short", day: "numeric", year: "numeric" })}
            </Txt>
            <Txt className="mt-1 text-[11px] text-muted">
              {entry.source === "pedometer" ? "Includes saved phone steps" : "Manual log"}
            </Txt>
            {entry.notes && <Txt className="mt-1 text-[11px] text-muted">{entry.notes}</Txt>}
          </View>
          <Txt weight="semibold" style={{ color: C.brand }}>
            {stat(convert(entry.value!))} {labelUnit} ↗
          </Txt>
        </Pressable>
      ))}
      {!rows.length && (
        <Txt className="mt-4 text-sm text-muted">
          No values logged for this metric in the selected range.
        </Txt>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => onEdit(metric, end)}
        style={{
          marginTop: 22,
          padding: 17,
          borderRadius: 18,
          alignItems: "center",
          backgroundColor: C.brand,
        }}
      >
        <Txt weight="semibold" style={{ color: C.bg }}>
          Log {spec.label.toLowerCase()}
        </Txt>
      </Pressable>
    </Sheet>
  );
}
