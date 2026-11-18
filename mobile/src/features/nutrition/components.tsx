import React, { useState } from "react";
import { Platform, TextInput, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { Sheet } from "../progress/editors";
import { addDays, dateLabel } from "../progress/model";
import { monthGrid, shiftMonth } from "../calendar/model";

export const amountLabel = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });
export function FoodField({
  label,
  value,
  onChange,
  numeric = false,
  placeholder,
  unit,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
  placeholder?: string;
  unit?: string;
  multiline?: boolean;
}) {
  return (
    <View className="min-w-0 gap-2">
      <Txt className="text-[11px] leading-5 text-muted">{label}</Txt>
      <View className="flex-row items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-4">
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          keyboardType={numeric ? "decimal-pad" : "default"}
          autoCorrect={!numeric}
          autoComplete="off"
          multiline={multiline}
          maxLength={numeric ? 9 : multiline ? 300 : 100}
          placeholder={placeholder}
          placeholderTextColor="#5D5D5D"
          selectionColor="#FFFFFF"
          underlineColorAndroid="transparent"
          className={`min-w-0 flex-1 py-4 font-poppins-medium text-base text-white ${multiline ? "min-h-24" : "min-h-14"}`}
        />
        {unit && <Txt className="text-xs text-muted">{unit}</Txt>}
      </View>
    </View>
  );
}
export function FoodButton({
  title,
  onPress,
  quiet = false,
  disabled = false,
  icon = "arrow-right",
}: {
  title: string;
  onPress: () => void;
  quiet?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-14 flex-row items-center justify-center gap-2 rounded-full px-5 py-3 ${quiet ? "border border-white/10 bg-white/5" : "bg-white"}`}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <MaterialCommunityIcons name={icon} size={19} color={quiet ? "#FFFFFF" : "#000000"} />
      <Txt weight="medium" className={`text-center text-sm ${quiet ? "text-white" : "text-black"}`}>
        {title}
      </Txt>
    </Pressable>
  );
}
export function FoodPill({
  title,
  active,
  onPress,
  disabled = false,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-11 items-center justify-center rounded-full px-4 py-3 ${active ? "bg-white" : "bg-white/5"}`}
      style={{ opacity: disabled ? 0.35 : 1 }}
    >
      <Txt weight="medium" className={`text-xs ${active ? "text-black" : "text-muted"}`}>
        {title}
      </Txt>
    </Pressable>
  );
}
export function PlateArt({ size = 92 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessible={false}>
      <Circle cx={62} cy={60} r={43} fill="#FFFFFF04" stroke="#FFFFFF22" strokeWidth={1.2} />
      <Circle cx={62} cy={60} r={32} fill="#FFFFFF03" stroke="#FFFFFF18" />
      <Path
        d="M47 45c9-12 25-5 25 6 0 8-6 16-15 18-9-3-15-15-10-24Z"
        fill="#FFFFFF"
        fillOpacity={0.85}
      />
      <Path
        d="M68 66c-1-11 6-18 15-16 6 10 0 21-10 23M60 59l5 13"
        stroke="#B5B5B5"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M9 28v21c0 5 9 5 9 0V28M13.5 28v63M111 29c-10 4-11 25-4 27h4v35M111 29v29"
        stroke="#D4D4D4"
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
      />
      <Line x1={29} y1={105} x2={97} y2={105} stroke="#FFFFFF10" />
    </Svg>
  );
}
export function MealTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const date = new Date();
  const [hours, minutes] = value.split(":").map(Number);
  date.setHours(hours, minutes, 0, 0);
  const choose = (selected?: Date) => {
    if (selected)
      onChange(
        `${String(selected.getHours()).padStart(2, "0")}:${String(selected.getMinutes()).padStart(2, "0")}`,
      );
  };
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose meal time"
        onPress={() => {
          if (Platform.OS === "android")
            DateTimePickerAndroid.open({
              value: date,
              mode: "time",
              is24Hour: true,
              onChange: (event, selected) => {
                if (event.type === "set") choose(selected);
              },
            });
          else setOpen(!open);
        }}
        className="min-h-14 flex-row items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4"
      >
        <View className="flex-row items-center gap-3">
          <MaterialCommunityIcons name="clock-outline" size={21} color="#A3A3A3" />
          <Txt className="text-sm">Meal time</Txt>
        </View>
        <Txt weight="medium" className="text-base">
          {value}
        </Txt>
      </Pressable>
      {open && Platform.OS === "ios" && (
        <>
          <DateTimePicker
            value={date}
            mode="time"
            display="spinner"
            themeVariant="dark"
            onChange={(_, selected) => choose(selected)}
          />
          <FoodButton title="Set time" quiet onPress={() => setOpen(false)} icon="check" />
        </>
      )}
      {open && Platform.OS === "web" && (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {[
            "07:00",
            "08:00",
            "09:00",
            "12:00",
            "13:00",
            "16:00",
            "18:00",
            "19:00",
            "20:00",
            "21:00",
          ].map((time) => (
            <FoodPill
              key={time}
              title={time}
              active={value === time}
              onPress={() => {
                onChange(time);
                setOpen(false);
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
export function FoodDatePicker({
  date,
  today,
  dates,
  onSelect,
  onClose,
}: {
  date: string;
  today: string;
  dates: ReadonlySet<string>;
  onSelect: (date: string) => void;
  onClose: () => void;
}) {
  const [month, setMonth] = useState(date.slice(0, 7));
  const days = monthGrid(month);
  return (
    <Sheet
      title="Choose your day"
      eyebrow="FOOD DIARY"
      subtitle="Look back or plan your next meals."
      onClose={onClose}
    >
      <View className="mb-4 flex-row items-center gap-2">
        <Txt weight="medium" className="flex-1 text-lg">
          {dateLabel(`${month}-01`, { month: "long", year: "numeric" })}
        </Txt>
        {[-1, 1].map((dir) => (
          <Pressable
            key={dir}
            accessibilityRole="button"
            accessibilityLabel={dir < 0 ? "Previous month" : "Next month"}
            onPress={() => setMonth(shiftMonth(month, dir))}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/5"
          >
            <MaterialCommunityIcons
              name={dir < 0 ? "chevron-left" : "chevron-right"}
              size={24}
              color="#FFFFFF"
            />
          </Pressable>
        ))}
      </View>
      <View className="mb-2 flex-row">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
          <Txt key={i} className="flex-1 text-center text-xs text-muted">
            {day}
          </Txt>
        ))}
      </View>
      {Array.from({ length: 6 }, (_, week) => (
        <View key={week} className="flex-row">
          {days.slice(week * 7, week * 7 + 7).map((day) => (
            <Pressable
              key={day.date}
              accessibilityRole="button"
              accessibilityLabel={`Choose ${day.date}`}
              accessibilityState={{ selected: date === day.date }}
              onPress={() => onSelect(day.date)}
              className="min-h-12 flex-1 items-center justify-center rounded-full"
              style={{
                backgroundColor: date === day.date ? "#FFFFFF" : "transparent",
                opacity: day.inMonth ? 1 : 0.35,
              }}
            >
              <Txt
                className={`text-sm ${date === day.date ? "text-black" : day.date === today ? "text-brand" : "text-white"}`}
              >
                {day.day}
              </Txt>
              <View
                className="mt-1 h-1 w-1 rounded-full"
                style={{
                  backgroundColor: dates.has(day.date)
                    ? date === day.date
                      ? "#000000"
                      : "#FFFFFF"
                    : "transparent",
                }}
              />
            </Pressable>
          ))}
        </View>
      ))}
      <View className="mt-5 flex-row gap-2">
        {[
          { title: "Today", value: today },
          { title: "Tomorrow", value: addDays(today, 1) },
        ].map((item) => (
          <FoodPill
            key={item.title}
            title={item.title}
            active={date === item.value}
            onPress={() => onSelect(item.value)}
          />
        ))}
      </View>
    </Sheet>
  );
}
