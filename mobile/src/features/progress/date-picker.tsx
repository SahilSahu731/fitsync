import React, { useState } from "react";
import { View } from "react-native";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { monthGrid, shiftMonth } from "../calendar/model";
import { Sheet } from "./editors";
import { addDays, dateLabel } from "./model";
import { Icon } from "./visuals";

export function CheckInDatePicker({
  date,
  today,
  loggedDates,
  onSelect,
  onClose,
}: {
  date: string;
  today: string;
  loggedDates: ReadonlySet<string>;
  onSelect: (date: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(date);
  const [month, setMonth] = useState(date.slice(0, 7));
  const currentMonth = today.slice(0, 7);
  const days = monthGrid(month);
  const weeks = Array.from({ length: 6 }, (_, index) => days.slice(index * 7, index * 7 + 7));
  const canGoForward = month < currentMonth;

  function select(next: string) {
    if (next > today) return;
    setSelected(next);
    setMonth(next.slice(0, 7));
  }

  return (
    <Sheet
      eyebrow="YOUR PROGRESS"
      title="Choose a day"
      subtitle={dateLabel(selected, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })}
      onClose={onClose}
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open selected day"
          onPress={() => {
            if (selected <= today) onSelect(selected);
          }}
          className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-brand px-4"
        >
          <Txt weight="semibold" className="text-sm text-bg">
            Open this day
          </Txt>
          <Icon name="arrow-right" size={19} color={C.bg} />
        </Pressable>
      }
    >
      <View className="mb-4 flex-row items-center gap-3">
        <Txt
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
          weight="medium"
          className="flex-1 text-lg tracking-[-0.4px]"
        >
          {dateLabel(`${month}-01`, { month: "long", year: "numeric" })}
        </Txt>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => setMonth(shiftMonth(month, -1))}
          className="h-11 w-11 items-center justify-center rounded-full bg-elevated"
        >
          <Icon name="chevron-left" size={23} color={C.ink} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: !canGoForward }}
          disabled={!canGoForward}
          onPress={() => {
            if (canGoForward) setMonth(shiftMonth(month, 1));
          }}
          className="h-11 w-11 items-center justify-center rounded-full bg-elevated"
          style={{ opacity: canGoForward ? 1 : 0.3 }}
        >
          <Icon name="chevron-right" size={23} color={C.ink} />
        </Pressable>
      </View>

      <View className="mb-2 flex-row">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <View key={day} className="flex-1 items-center py-1">
            <Txt className="text-[10px] text-muted">{day}</Txt>
          </View>
        ))}
      </View>
      <View accessibilityLabel="Check-in calendar" className="gap-1">
        {weeks.map((week) => (
          <View key={week[0].date} className="flex-row">
            {week.map((day) => {
              const active = selected === day.date;
              const isToday = day.date === today;
              const disabled = day.date > today;
              const hasData = !disabled && loggedDates.has(day.date);
              return (
                <Pressable
                  key={day.date}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${dateLabel(day.date, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}`}
                  accessibilityHint={hasData ? "Has saved check-ins or workouts." : undefined}
                  accessibilityState={{ selected: active, disabled }}
                  disabled={disabled}
                  onPress={() => select(day.date)}
                  className="min-h-12 flex-1 items-center justify-center rounded-2xl border"
                  style={{
                    backgroundColor: active ? C.brand : "transparent",
                    borderColor: active ? C.brand : isToday ? `${C.brand}70` : "transparent",
                    opacity: disabled ? 0.2 : day.inMonth || active ? 1 : 0.45,
                  }}
                >
                  <Txt
                    weight={active || isToday ? "semibold" : "regular"}
                    className="text-sm"
                    style={{ color: active ? C.bg : isToday ? C.brand : C.ink }}
                  >
                    {day.day}
                  </Txt>
                  <View
                    className="mt-1 h-1 w-1 rounded-full"
                    style={{ backgroundColor: hasData ? (active ? C.bg : C.brand) : "transparent" }}
                  />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View className="mt-4 flex-row items-center justify-center gap-2">
        <View className="h-1.5 w-1.5 rounded-full bg-brand" />
        <Txt className="text-[10px] text-muted">Saved check-ins or workouts</Txt>
      </View>
      <View className="mt-5 flex-row gap-3">
        {[
          { label: "Today", date: today, action: "Jump to today" },
          { label: "Yesterday", date: addDays(today, -1), action: "Jump to yesterday" },
        ].map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityLabel={item.action}
            accessibilityState={{ selected: selected === item.date }}
            onPress={() => select(item.date)}
            className="min-h-11 flex-1 items-center justify-center rounded-xl bg-elevated px-3"
          >
            <Txt
              weight="medium"
              className="text-xs"
              style={{ color: selected === item.date ? C.brand : C.ink }}
            >
              {item.label}
            </Txt>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}
