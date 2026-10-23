import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";
import { dragNumber } from "../number-input";

export function WorkoutDrawer({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior="padding"
        className="flex-1 justify-end bg-black/70"
      >
        <Pressable
          className="flex-1"
          onPress={onClose}
          accessibilityLabel="Close drawer"
        />
        <SafeAreaView
          edges={["bottom"]}
          style={{ maxHeight: "88%" }}
          className="rounded-t-[28px] bg-panel px-5 pt-3"
        >
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-muted/40" />
          <View className="mb-5 flex-row items-center justify-between">
            <Txt weight="bold" className="flex-1 text-xl">
              {title}
            </Txt>
            <Pressable
              onPress={onClose}
              accessibilityLabel="Close"
              hitSlop={8}
              className="h-11 w-11 items-center justify-center"
            >
              <MaterialCommunityIcons name="close" size={25} color={C.ink} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type NumberEntryProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  onFocus?: () => void;
  step?: number;
  max?: number;
  disabled?: boolean;
  compact?: boolean;
};

const HOLD_DELAY_MS = 400;
const HOLD_REPEAT_MS = 110;

function formatNumber(n: number) {
  return String(Math.round(n * 100) / 100);
}

export function NumberEntry({
  label,
  value,
  onChange,
  onCommit,
  onFocus,
  step = 1,
  max = 1000,
  disabled = false,
  compact = false,
}: NumberEntryProps) {
  const live = useRef({
    value,
    onChange,
    onCommit,
    onFocus,
    step,
    max,
    disabled,
  });
  useLayoutEffect(() => {
    live.current = { value, onChange, onCommit, onFocus, step, max, disabled };
  }, [value, onChange, onCommit, onFocus, step, max, disabled]);

  // Press-and-hold state for the stepper buttons.
  const holdTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdValue = useRef<string | null>(null);

  const clearHold = () => {
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
    if (holdInterval.current) clearInterval(holdInterval.current);
    holdTimeout.current = null;
    holdInterval.current = null;
  };

  useEffect(() => clearHold, []);

  // Applies one step in `direction` (+1 / -1). While holding, it builds on the
  // last value it produced so it never reads a stale prop between renders.
  const stepBy = (direction: number) => {
    const o = live.current;
    if (o.disabled) return;
    const base = Number(holdValue.current ?? o.value) || 0;
    const next = formatNumber(
      Math.min(o.max, Math.max(0, base + direction * o.step)),
    );
    holdValue.current = next;
    o.onChange(next);
  };

  const startHold = (direction: number) => {
    if (live.current.disabled) return;
    clearHold();
    holdValue.current = null;
    live.current.onFocus?.();
    stepBy(direction);
    holdTimeout.current = setTimeout(() => {
      holdInterval.current = setInterval(() => stepBy(direction), HOLD_REPEAT_MS);
    }, HOLD_DELAY_MS);
  };

  const endHold = () => {
    clearHold();
    const committed = holdValue.current;
    holdValue.current = null;
    if (committed !== null) live.current.onCommit?.(committed);
  };

  // One responder for the lifetime of the field. Recreating it on every value
  // change loses the current gesture's dy and causes sliders to stop mid-drag.
  // PanResponder stores callbacks; it does not invoke them during creation.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => {
    let start = 0;
    let latest = "";
    const end = () => live.current.onCommit?.(latest);
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        !live.current.disabled &&
        Math.abs(gesture.dy) > 5 &&
        Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderGrant: () => {
        start = Number(live.current.value) || 0;
        latest = live.current.value;
        live.current.onFocus?.();
      },
      onPanResponderMove: (_event, gesture) => {
        const options = live.current;
        if (options.disabled) return;
        const next = dragNumber(start, gesture.dy, options.step, options.max);
        if (next !== latest) {
          latest = next;
          options.onChange(next);
        }
      },
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    });
  });

  // Single-tap step used by the minus / plus buttons below the field.
  const adjust = (direction: number) => {
    const o = live.current;
    if (o.disabled) return;
    o.onFocus?.();
    const next = formatNumber(
      Math.min(o.max, Math.max(0, (Number(o.value) || 0) + direction * o.step)),
    );
    o.onChange(next);
    o.onCommit?.(next);
  };

  const iconSize = compact ? 20 : 24;
  const iconColor = disabled ? C.muted : C.brand;

  return (
    <View className="min-w-0 flex-1">
      <Txt className="mb-1 text-[10px] tracking-wider text-muted">
        {label}
      </Txt>
      <View
        {...pan.panHandlers}
        className={`flex-row items-center overflow-hidden rounded-xl bg-bg ${disabled ? "opacity-60" : ""}`}
      >
        <TextInput
          accessibilityLabel={label}
          value={value}
          onFocus={onFocus}
          onChangeText={onChange}
          onEndEditing={(e) => onCommit?.(e.nativeEvent.text)}
          keyboardType={step < 1 ? "decimal-pad" : "number-pad"}
          selectTextOnFocus
          editable={!disabled}
          className={`min-w-0 flex-1 text-center font-outfit-bold text-ink ${compact ? "h-11 px-1 text-base" : "h-14 px-2 text-xl"}`}
        />
        <View
          className={`bg-panel ${compact ? "h-11 w-8" : "h-14 w-12"}`}
        >
          <Pressable
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Increase ${label}`}
            onPressIn={() => startHold(1)}
            onPressOut={endHold}
            hitSlop={{ left: 8, right: 8 }}
            className="flex-1 items-center justify-center active:bg-brand/10"
          >
            <MaterialCommunityIcons
              name="chevron-up"
              size={iconSize}
              color={iconColor}
            />
          </Pressable>
          <Pressable
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${label}`}
            onPressIn={() => startHold(-1)}
            onPressOut={endHold}
            hitSlop={{ left: 8, right: 8 }}
            className="flex-1 items-center justify-center active:bg-brand/10"
          >
            <MaterialCommunityIcons
              name="chevron-down"
              size={iconSize}
              color={iconColor}
            />
          </Pressable>
        </View>
      </View>
      {!compact && (
        <View className="mt-1 flex-row items-center justify-between">
          <Pressable
            disabled={disabled}
            accessibilityLabel={`Decrease ${label} by one step`}
            onPress={() => adjust(-1)}
            className="h-9 w-11 items-center justify-center"
          >
            <MaterialCommunityIcons
              name="minus"
              size={20}
              color={disabled ? C.muted : C.ink}
            />
          </Pressable>
          <Txt className="text-[10px] text-muted">
            {step < 1 ? `${step} kg` : `±${step}`}
          </Txt>
          <Pressable
            disabled={disabled}
            accessibilityLabel={`Increase ${label} by one step`}
            onPress={() => adjust(1)}
            className="h-9 w-11 items-center justify-center"
          >
            <MaterialCommunityIcons
              name="plus"
              size={20}
              color={disabled ? C.muted : C.ink}
            />
          </Pressable>
        </View>
      )}
    </View>
  );
}