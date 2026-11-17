import React, { useRef, useState } from "react";
import { Keyboard, Modal, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { Icon, type IconName } from "./visuals";
import { parseGoalValue } from "./goal-draft";
import { useKeyboardForm } from "./keyboard-visibility";
import type { Goals } from "./model";

export function GoalValueDialog({
  goal,
  label,
  icon,
  color,
  suffix,
  initialValue,
  weightUnit,
  onCancel,
  onSave,
  onRemove,
}: {
  goal: keyof Goals;
  label: string;
  icon: IconName;
  color: string;
  suffix: string;
  initialValue: string;
  weightUnit: "kg" | "lb";
  onCancel: () => void;
  onSave: (value: string) => void;
  onRemove?: () => void;
}) {
  const input = useRef<TextInput>(null);
  const { viewportRef, scrollRef, bottomInset, onViewportLayout, onFocus, onScroll, revealInput } =
    useKeyboardForm();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");
  function cancel() {
    Keyboard.dismiss();
    onCancel();
  }
  function save() {
    if (!value.trim()) {
      setError("Enter a target to continue.");
      return;
    }
    try {
      parseGoalValue(goal, value, weightUnit);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Enter a valid target.");
      return;
    }
    Keyboard.dismiss();
    onSave(value.trim());
  }
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onShow={() => input.current?.focus()}
      onRequestClose={cancel}
    >
      <View ref={viewportRef} onLayout={onViewportLayout} className="flex-1 bg-black/75">
        <View className="flex-1" style={{ paddingBottom: bottomInset }}>
          <SafeAreaView edges={["top", "bottom"]} className="flex-1">
            <ScrollView
              ref={scrollRef}
              onFocus={onFocus}
              onScroll={onScroll}
              onLayout={revealInput}
              onContentSizeChange={revealInput}
              scrollEventThrottle={16}
              automaticallyAdjustKeyboardInsets={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
              contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
            >
              <View
                accessibilityViewIsModal
                className="w-full max-w-[400px] self-center rounded-[28px] bg-panel p-6"
              >
                <View className="mb-4 flex-row items-center justify-between">
                  <View
                    className="h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${color}18` }}
                  >
                    <Icon name={icon} size={26} color={color} />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancel target edit"
                    onPress={cancel}
                    className="h-11 w-11 items-center justify-center rounded-full bg-elevated"
                  >
                    <Icon name="close" size={21} color={C.muted} />
                  </Pressable>
                </View>
                <Txt accessibilityRole="header" weight="semibold" className="text-xl">
                  {label} target
                </Txt>
                <Txt className="mb-4 mt-1 text-sm text-muted">{suffix}</Txt>
                <TextInput
                  ref={input}
                  accessibilityLabel={`${label} target in ${suffix}`}
                  value={value}
                  onChangeText={(next) => {
                    setValue(next);
                    setError("");
                  }}
                  selectTextOnFocus
                  keyboardType={goal === "weeklyWorkouts" ? "number-pad" : "decimal-pad"}
                  returnKeyType="done"
                  onSubmitEditing={save}
                  maxLength={12}
                  placeholder="Enter your target"
                  placeholderTextColor={C.muted}
                  className="min-h-14 rounded-2xl bg-elevated px-4 font-poppins-medium text-2xl text-ink"
                  style={{ paddingVertical: 14, lineHeight: 34, textAlignVertical: "center" }}
                />
                {!!error && (
                  <Txt
                    accessibilityRole="alert"
                    className="mt-3 text-xs leading-5"
                    style={{ color: "#FF9A94" }}
                  >
                    {error}
                  </Txt>
                )}
                <View className="mt-5 flex-row gap-3">
                  <Pressable
                    accessibilityRole="button"
                    onPress={cancel}
                    className="min-h-12 flex-1 items-center justify-center rounded-full bg-elevated"
                  >
                    <Txt weight="medium" className="text-sm">
                      Cancel
                    </Txt>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={save}
                    className="min-h-12 flex-1 items-center justify-center rounded-full"
                    style={{ backgroundColor: color }}
                  >
                    <Txt weight="semibold" className="text-sm text-bg">
                      Set target
                    </Txt>
                  </Pressable>
                </View>
                {onRemove && !!initialValue && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      Keyboard.dismiss();
                      onRemove();
                    }}
                    className="mt-2 min-h-11 items-center justify-center"
                  >
                    <Txt className="text-xs text-muted">Remove target</Txt>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}
