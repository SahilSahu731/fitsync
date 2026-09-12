import { Text, View } from "react-native";

import type { ProgressTotals, WeightUnit } from "../types";

import { formatDurationHours, formatNumber } from "../utils";

interface Props {
  totals: ProgressTotals;

  unit: WeightUnit;
}

export function SummaryStats({ totals, unit }: Props) {
  return (
    <View className="flex-row rounded-[24px] border border-white/[0.07] bg-white/[0.02] p-5">
      <Stat label="Workouts" value={String(totals.workouts)} />

      <Stat label="Volume" value={`${formatNumber(totals.volume)} ${unit}`} />

      <Stat label="Sets" value={formatNumber(totals.working_sets)} />

      <Stat label="Time" value={formatDurationHours(totals.duration_seconds)} />
    </View>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <View className="flex-1">
      <Text className="text-white/22 text-[9px] font-bold uppercase tracking-[1px]">
        {label}
      </Text>

      <Text
        numberOfLines={1}
        className="mt-2 text-[14px] font-extrabold text-white"
      >
        {value}
      </Text>
    </View>
  );
}
