import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { formatProgramDate, type ScheduleDay } from "./program-view";

export function WeekStrip({ days, selectedDay, onSelect }: { days: ScheduleDay[]; selectedDay: number; onSelect: (day: number) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, gap: 3, paddingVertical: 14 }}>
    {days.map(day => {
      const selected = day.day === selectedDay;
      const done = day.slot?.status === "completed";
      const inProgress = day.slot?.status === "active";
      const color = selected ? C.bg : done ? "#86EFAC" : inProgress ? "#93C5FD" : C.ink;
      const status = done ? "Logged" : inProgress ? "In progress" : day.rest ? "Rest" : day.slot?.status === "overdue" ? "Open" : "Train";
      return <Pressable key={day.date} onPress={() => onSelect(day.day)} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${day.today ? "Today, " : ""}${formatProgramDate(day.date, { weekday: "long", month: "short", day: "numeric" })}. Day ${day.day}. ${day.label}. ${status}.`} className="min-w-[41px] flex-1 items-center py-1">
        <Txt weight={day.today ? "bold" : "regular"} style={{ color: day.today ? C.brand : C.muted, fontSize: 10 }}>{formatProgramDate(day.date, { weekday: "short" })}</Txt>
        <View style={{ width: 39, height: 43, borderRadius: 14, marginTop: 8, marginBottom: 8, alignItems: "center", justifyContent: "center", backgroundColor: selected ? "#F4F0E9" : day.today ? "#FF783818" : "transparent", borderWidth: day.today && !selected ? 1 : 0, borderColor: "#FF783850" }}>
          {done ? <MaterialCommunityIcons name="check" size={23} color={color} /> : <Txt weight="bold" style={{ color, fontSize: 17 }}>{Number(day.date.slice(-2))}</Txt>}
        </View>
        {day.rest ? <MaterialCommunityIcons name="weather-night" size={11} color={C.muted} /> : <View style={{ width: 4, height: 4, marginVertical: 3.5, borderRadius: 2, backgroundColor: done ? "#86EFAC" : inProgress ? "#93C5FD" : C.brand }} />}
        <Txt style={{ fontSize: 8, marginTop: 5, color: day.today ? C.brand : C.muted }}>{day.today ? "Today" : status}</Txt>
      </Pressable>;
    })}
  </ScrollView>;
}
