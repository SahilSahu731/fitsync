import React from "react";
import { Modal, ScrollView, View } from "react-native";
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { useKeyboardForm } from "@/src/features/progress/keyboard-visibility";

const entrance = FadeInDown.duration(420)
  .withInitialValues({ transform: [{ translateY: 48 }] })
  .reduceMotion(ReduceMotion.System);

export function OnboardingPopup({
  title,
  subtitle,
  eyebrow,
  busy = false,
  compact = false,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  eyebrow: string;
  busy?: boolean;
  compact?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const {
    viewportRef,
    scrollRef,
    bottomInset,
    keyboardOpen,
    onViewportLayout,
    onFocus,
    onScroll,
    revealInput,
  } = useKeyboardForm();
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <View ref={viewportRef} onLayout={onViewportLayout} className="flex-1 bg-black/80">
        <View
          className="flex-1 items-center justify-center px-5"
          style={{
            paddingTop: insets.top + 20,
            paddingBottom: Math.max(insets.bottom, 12) + 20 + bottomInset,
          }}
        >
          <Animated.View
            entering={entrance}
            accessibilityViewIsModal
            className={`w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#1B1D1C] ${compact ? "max-w-[350px]" : "max-w-[420px]"}`}
            style={{
              maxHeight: "100%",
              flexShrink: 1,
              elevation: 24,
              shadowColor: "#000",
              shadowOpacity: 0.35,
              shadowRadius: 28,
              shadowOffset: { width: 0, height: 12 },
            }}
          >
            <View className="mx-7 h-[3px] w-14 rounded-b-full bg-[#C5F460]" />
            <View
              className={`flex-row items-center justify-between px-6 pb-2 ${compact ? "pt-2" : "pt-4"}`}
            >
              <Txt
                weight="semibold"
                className="flex-1 pr-2 text-[9px] tracking-[2px] text-[#C5F460]"
              >
                {eyebrow}
              </Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close welcome popup"
                disabled={busy}
                onPress={onClose}
                className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5"
              >
                <MaterialCommunityIcons name="close" size={18} color="#C6CCC6" />
              </Pressable>
            </View>
            <ScrollView
              ref={scrollRef}
              onFocus={onFocus}
              onScroll={onScroll}
              onLayout={revealInput}
              onContentSizeChange={revealInput}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets={false}
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerClassName="px-6 pb-2"
              style={{ flexShrink: 1 }}
            >
              {!keyboardOpen && (
                <View className={compact ? "mb-4" : "mb-5"}>
                  <Txt
                    accessibilityRole="header"
                    weight="semibold"
                    className={
                      compact
                        ? "text-[24px] leading-[29px] tracking-[-0.8px]"
                        : "text-[28px] leading-[34px] tracking-[-1px]"
                    }
                  >
                    {title}
                  </Txt>
                  <Txt className="mt-2 text-xs leading-5 text-[#AEB7AE]">{subtitle}</Txt>
                </View>
              )}
              {children}
            </ScrollView>
            <View className={`px-6 ${compact ? "pb-3 pt-1" : "pb-5 pt-3"}`}>{footer}</View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}
