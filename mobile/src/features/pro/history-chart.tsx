import React, { useState } from "react";
import { View } from "react-native";
import { Txt } from "@/src/components/ui";
import { TrendChart } from "../progress/charts";
import { ProPill } from "./ui";
// Pagination keeps every logged point available without creating thousands of native targets.
export function HistoryChart(props: React.ComponentProps<typeof TrendChart>) {
  const [page, setPage] = useState(0);
  const size = 60;
  const actualPage = Math.min(page, Math.max(0, Math.ceil(props.points.length / size) - 1));
  const end = Math.max(0, props.points.length - actualPage * size);
  const start = Math.max(0, end - size);
  const points = props.points.slice(start, end);
  return (
    <>
      <TrendChart {...props} points={points} />
      {props.points.length > size && (
        <View className="mt-4">
          <View className="flex-row justify-between gap-3">
            <ProPill
              label="← Older"
              selected={false}
              disabled={start === 0}
              onPress={() => setPage(actualPage + 1)}
            />
            <ProPill
              label="Newer →"
              selected={false}
              disabled={actualPage === 0}
              onPress={() => setPage(actualPage - 1)}
            />
          </View>
          <Txt className="mt-3 text-center text-[10px] text-muted">
            Showing {start + 1}–{end} of {props.points.length} saved values. All history is
            available.
          </Txt>
        </View>
      )}
    </>
  );
}
