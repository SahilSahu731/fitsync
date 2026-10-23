import React, { useLayoutEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";
import { dragNumber } from "../number-input";

export function WorkoutDrawer({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <Modal transparent animationType="slide" onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 justify-end bg-black/70"><Pressable className="flex-1" onPress={onClose} accessibilityLabel="Close drawer" /><SafeAreaView edges={["bottom"]} style={{ maxHeight: "88%" }} className="rounded-t-[28px] bg-panel px-5 pt-5"><View className="mb-5 flex-row items-center justify-between"><Txt weight="bold" className="flex-1 text-xl">{title}</Txt><Pressable onPress={onClose} accessibilityLabel="Close" className="h-11 w-11 items-center justify-center"><MaterialCommunityIcons name="close" size={25} color={C.ink} /></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>{children}</ScrollView></SafeAreaView></KeyboardAvoidingView></Modal>;
}
type NumberEntryProps = {
  label: string; value: string; onChange: (value: string) => void;
  onCommit?: (value: string) => void; onFocus?: () => void;
  step?: number; max?: number; disabled?: boolean; compact?: boolean;
};

export function NumberEntry({ label, value, onChange, onCommit, onFocus, step = 1, max = 1000, disabled = false, compact = false }: NumberEntryProps) {
  const live = useRef({ value, onChange, onCommit, onFocus, step, max, disabled });
  useLayoutEffect(() => { live.current = { value, onChange, onCommit, onFocus, step, max, disabled }; }, [value, onChange, onCommit, onFocus, step, max, disabled]);
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
      onMoveShouldSetPanResponderCapture: (_event, gesture) => !live.current.disabled && Math.abs(gesture.dy) > 5 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderGrant: () => {
        start = Number(live.current.value) || 0;
        latest = live.current.value;
        live.current.onFocus?.();
      },
      onPanResponderMove: (_event, gesture) => {
        const options = live.current;
        if (options.disabled) return;
        const next = dragNumber(start, gesture.dy, options.step, options.max);
        if (next !== latest) { latest = next; options.onChange(next); }
      },
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    });
  });
  const adjust = (direction: number) => {
    if (disabled) return;
    onFocus?.();
    const updated = dragNumber(Number(value) || 0, -direction * 10, step, max);
    onChange(updated); onCommit?.(updated);
  };
  return <View className="min-w-0 flex-1">
    <Txt className="mb-1 text-[10px] uppercase tracking-wider text-muted">{label}</Txt>
    <View {...pan.panHandlers} className={`flex-row items-center rounded-xl bg-bg ${disabled ? "opacity-60" : ""}`}>
      <TextInput accessibilityLabel={label} value={value} onFocus={onFocus} onChangeText={onChange} onEndEditing={e => onCommit?.(e.nativeEvent.text)} keyboardType={step < 1 ? "decimal-pad" : "number-pad"} selectTextOnFocus editable={!disabled} className={`min-w-0 flex-1 text-center font-outfit-bold text-ink ${compact ? "h-11 px-1 text-base" : "h-14 px-2 text-xl"}`} />
      <View accessible accessibilityRole="adjustable" accessibilityLabel={`Slide to adjust ${label}`} accessibilityValue={{ min: 0, max, now: Number(value) || 0 }} accessibilityHint="Slide up to increase and down to decrease. You can also type or use the plus and minus buttons." accessibilityState={{ disabled }} accessibilityActions={[{ name: "increment" }, { name: "decrement" }]} onAccessibilityAction={e => adjust(e.nativeEvent.actionName === "increment" ? 1 : -1)} className={`items-center justify-center rounded-r-xl bg-panel ${compact ? "h-11 w-4" : "h-14 w-11"}`}>
        <MaterialCommunityIcons name="chevron-up" size={compact ? 12 : 18} color={C.brand} /><MaterialCommunityIcons name="chevron-down" size={compact ? 12 : 18} color={C.brand} />
      </View>
    </View>
    {!compact && <View className="mt-1 flex-row items-center justify-between">
      <Pressable disabled={disabled} accessibilityLabel={`Decrease ${label}`} onPress={() => adjust(-1)} className="h-9 w-11 items-center justify-center"><MaterialCommunityIcons name="minus" size={19} color={disabled ? C.muted : C.ink} /></Pressable>
      <Txt className="text-[10px] text-muted">{step < 1 ? `${step} kg` : `±${step}`}</Txt>
      <Pressable disabled={disabled} accessibilityLabel={`Increase ${label}`} onPress={() => adjust(1)} className="h-9 w-11 items-center justify-center"><MaterialCommunityIcons name="plus" size={19} color={disabled ? C.muted : C.ink} /></Pressable>
    </View>}
  </View>;
}
