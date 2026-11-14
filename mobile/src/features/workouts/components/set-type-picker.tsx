import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { type SetType } from "../api";
import { SET_TYPES, setAppearance } from "../set-types";
import { WorkoutDrawer } from "./workout-controls";

export function SetTypePicker({
  value,
  number,
  onChange,
  disabled = false,
  table = false,
}: {
  value: SetType;
  number: number;
  onChange: (value: SetType) => void;
  disabled?: boolean;
  table?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = setAppearance(value);
  return (
    <>
      <View style={{ width: 44 }}>
        {!table && <Txt className="mb-1 text-center text-[11px] text-muted">{number}</Txt>}
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          accessibilityLabel={`Set ${number}: ${selected.label}. Choose set type`}
          onPress={() => setOpen(true)}
          style={{ backgroundColor: `${selected.color}10` }}
          className="h-12 items-center justify-center rounded-xl"
        >
          <View className="flex-row items-center gap-0.5">
            <Txt weight="semibold" className="text-base" style={{ color: selected.color }}>
              {selected.letter}
            </Txt>
            {table && (
              <MaterialCommunityIcons name="chevron-down" size={11} color={selected.color} />
            )}
          </View>
        </Pressable>
      </View>
      {open && (
        <WorkoutDrawer title={`Choose Set ${number} type`} onClose={() => setOpen(false)}>
          {SET_TYPES.map((item) => (
            <Pressable
              key={item.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: value === item.value }}
              onPress={() => {
                setOpen(false);
                onChange(item.value);
              }}
              className="mb-2 flex-row items-center rounded-xl bg-elevated p-3"
            >
              <View
                className="mr-3 h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${item.color}20` }}
              >
                <Txt weight="semibold" className="text-lg" style={{ color: item.color }}>
                  {item.letter}
                </Txt>
              </View>
              <View className="flex-1">
                <Txt weight="semibold" className="text-xl" style={{ color: item.color }}>
                  {item.label}
                </Txt>
                <Txt className="mt-1 text-sm text-muted">{item.description}</Txt>
              </View>
              {value === item.value && (
                <View style={{ backgroundColor: item.color }} className="h-2 w-2 rounded-full" />
              )}
            </Pressable>
          ))}
        </WorkoutDrawer>
      )}
    </>
  );
}
