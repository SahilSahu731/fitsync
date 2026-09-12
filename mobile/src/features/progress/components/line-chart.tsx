import { useMemo, useState } from "react";

import { Text, View } from "react-native";

import Svg, { Circle, Line, Path } from "react-native-svg";

export interface LineChartPoint {
  id: string;

  value: number;

  label: string;
}

interface Props {
  points: LineChartPoint[];

  suffix?: string;

  height?: number;
}

export function LineChart({ points, suffix = "", height = 190 }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const width = 340;

  const paddingX = 18;

  const paddingY = 20;

  const layout = useMemo(() => {
    if (points.length === 0) {
      return null;
    }

    const values = points.map((point) => point.value);

    const min = Math.min(...values);

    const max = Math.max(...values);

    const range = Math.max(max - min, Math.abs(max) * 0.05, 1);

    const usableWidth = width - paddingX * 2;

    const usableHeight = height - paddingY * 2;

    const coordinates = points.map((point, index) => {
      const x =
        points.length === 1
          ? width / 2
          : paddingX + (index / (points.length - 1)) * usableWidth;

      const y = paddingY + (1 - (point.value - min) / range) * usableHeight;

      return {
        x,
        y,
      };
    });

    const path = coordinates
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    return {
      min,
      max,
      coordinates,
      path,
    };
  }, [points, height]);

  if (points.length < 2 || !layout) {
    return (
      <View className="h-[190px] items-center justify-center">
        <Text className="text-white/28 text-center text-[12px] leading-5">
          Complete more sessions to build a trend.
        </Text>
      </View>
    );
  }

  const selectedPoint = selected !== null ? points[selected] : null;

  return (
    <View>
      {selectedPoint ? (
        <View className="mb-2 items-center">
          <Text className="text-[14px] font-extrabold text-white">
            {selectedPoint.value.toFixed(1)}
            {suffix}
          </Text>

          <Text className="mt-1 text-[10px] text-white/30">
            {selectedPoint.label}
          </Text>
        </View>
      ) : (
        <View className="mb-2 h-[31px]" />
      )}

      <View className="items-center">
        <Svg width={width} height={height}>
          {[0.25, 0.5, 0.75].map((ratio) => (
            <Line
              key={ratio}
              x1={paddingX}
              x2={width - paddingX}
              y1={height * ratio}
              y2={height * ratio}
              stroke="rgba(255,255,255,.055)"
              strokeWidth={1}
            />
          ))}

          <Path
            d={layout.path}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {layout.coordinates.map((coordinate, index) => (
            <Circle
              key={points[index].id}
              cx={coordinate.x}
              cy={coordinate.y}
              r={selected === index ? 6 : 4}
              fill={selected === index ? "#FFFFFF" : "#3B82F6"}
              stroke="#2563EB"
              strokeWidth={2}
              onPress={() => {
                setSelected(index);
              }}
            />
          ))}
        </Svg>
      </View>
    </View>
  );
}
