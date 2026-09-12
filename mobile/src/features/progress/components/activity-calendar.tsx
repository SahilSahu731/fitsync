import { Text, View } from "react-native";

import type { ActivityCalendarDay } from "../types";

interface Props {
  items: ActivityCalendarDay[];
}

export function ActivityCalendar({ items }: Props) {
  const today = new Date();

  const days = Array.from(
    {
      length: 84,
    },
    (_, index) => {
      const value = new Date(today);

      value.setHours(0, 0, 0, 0);

      value.setDate(today.getDate() - (83 - index));

      return value;
    },
  );

  const map = new Map(items.map((item) => [item.date, item]));

  return (
    <View>
      <Text className="text-[19px] font-extrabold text-white">Consistency</Text>

      <Text className="mt-1 text-[11px] text-white/25">
        Your last 12 weeks.
      </Text>

      <View className="mt-5 flex-row flex-wrap gap-[5px]">
        {days.map((day) => {
          const key = [
            day.getFullYear(),
            String(day.getMonth() + 1).padStart(2, "0"),
            String(day.getDate()).padStart(2, "0"),
          ].join("-");

          const activity = map.get(key);

          const count = activity?.workout_count ?? 0;

          return (
            <View
              key={key}
              className="h-[17px] w-[17px] rounded-[5px]"
              style={{
                backgroundColor:
                  count >= 2
                    ? "#2563EB"
                    : count === 1
                      ? "rgba(59,130,246,.55)"
                      : "rgba(255,255,255,.055)",
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
