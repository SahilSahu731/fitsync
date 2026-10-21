import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

const MIN = 100;
const MAX = 250;
const TICK_HEIGHT = 12;
const heights = Array.from({ length: MAX - MIN + 1 }, (_, i) => MAX - i);

export function HeightPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const ruler = useRef<ScrollView>(null);
  const lastScrollValue = useRef<number | null>(null);
  const dragging = useRef(false);
  const [initialOffset] = useState(() => ({
    x: 0,
    y: (MAX - Math.round(value)) * TICK_HEIGHT,
  }));
  const [text, setText] = useState<string | null>(null);
  const inches = Math.round(value / 2.54);

  useEffect(() => {
    if (lastScrollValue.current === value) return;
    ruler.current?.scrollTo({
      y: (MAX - Math.round(value)) * TICK_HEIGHT,
      animated: false,
    });
  }, [value]);

  const update = (next: number) => {
    const height = Math.max(MIN, Math.min(MAX, Math.round(next)));
    onChange(height);
  };
  const scroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Only user-driven scrolling changes the draft. Programmatic movement
    // follows typing / buttons without feeding rounded values back into them.
    if (!dragging.current) return;
    const height = Math.max(
      MIN,
      Math.min(
        MAX,
        MAX - Math.round(nativeEvent.contentOffset.y / TICK_HEIGHT),
      ),
    );
    if (height !== lastScrollValue.current) {
      lastScrollValue.current = height;
      onChange(height);
    }
  };
  const nudge = (amount: number) => {
    dragging.current = false;
    Keyboard.dismiss();
    setText(null);
    lastScrollValue.current = null;
    update(value + amount);
    void Haptics.selectionAsync().catch(() => {});
  };

  return (
    <View>
      <View className="flex-row items-center gap-4 rounded-3xl bg-panel p-4">
        <View className="min-w-0 flex-1">
          <Txt className="mb-2 text-xs tracking-widest text-muted">
            YOUR HEIGHT
          </Txt>
          <TextInput
            accessibilityLabel="Height in centimeters"
            value={text ?? String(Math.round(value))}
            onChangeText={(next) => {
              setText(next);
              const number = Number(next);
              if (next.trim() && Number.isFinite(number)) {
                dragging.current = false;
                lastScrollValue.current = null;
                update(number);
              }
            }}
            onEndEditing={() => setText(null)}
            keyboardType="number-pad"
            returnKeyType="done"
            selectTextOnFocus
            maxLength={3}
            className="w-full p-0 font-outfit-semibold text-[54px] leading-[64px] text-ink"
          />
          <Txt weight="medium" className="text-lg text-brand">
            cm
          </Txt>
          <Txt className="mt-2 text-sm text-muted">
            {Math.floor(inches / 12)} ft {inches % 12} in
          </Txt>
          <View className="mt-7 flex-row gap-2">
            {([-1, 1] as const).map((direction) => (
              <Pressable
                key={direction}
                accessibilityRole="button"
                accessibilityLabel={
                  direction < 0
                    ? "Decrease height by one centimeter"
                    : "Increase height by one centimeter"
                }
                disabled={direction < 0 ? value <= MIN : value >= MAX}
                onPress={() => nudge(direction)}
                className={`h-11 w-11 items-center justify-center rounded-xl border border-border bg-elevated active:bg-border ${direction < 0 ? (value <= MIN ? "opacity-40" : "") : value >= MAX ? "opacity-40" : ""}`}
              >
                <MaterialCommunityIcons
                  name={direction < 0 ? "minus" : "plus"}
                  size={20}
                  color={C.ink}
                />
              </Pressable>
            ))}
          </View>
          <Txt className="mt-3 text-xs text-muted">Tap to enter a value</Txt>
        </View>
        <View
          className="h-[320px] w-[104px] overflow-hidden rounded-2xl bg-bg"
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Height ruler"
          accessibilityValue={{
            min: MIN,
            max: MAX,
            now: value,
            text: `${Math.round(value)} centimeters`,
          }}
          accessibilityActions={[
            { name: "increment", label: "Increase height" },
            { name: "decrement", label: "Decrease height" },
          ]}
          onAccessibilityAction={({ nativeEvent }) => {
            if (nativeEvent.actionName === "increment") nudge(1);
            if (nativeEvent.actionName === "decrement") nudge(-1);
          }}
        >
          <ScrollView
            ref={ruler}
            nestedScrollEnabled
            contentOffset={initialOffset}
            importantForAccessibility="no-hide-descendants"
            contentContainerClassName="py-[154px]"
            showsVerticalScrollIndicator={false}
            snapToInterval={TICK_HEIGHT}
            decelerationRate="fast"
            bounces={false}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => {
              Keyboard.dismiss();
              setText(null);
              dragging.current = true;
            }}
            onScroll={scroll}
            onMomentumScrollEnd={(event) => {
              scroll(event);
              dragging.current = false;
              void Haptics.selectionAsync().catch(() => {});
            }}
            accessibilityLabel="Height ruler. Swipe up for a shorter height, down for a taller height."
          >
            {heights.map((height) => (
              <View
                key={height}
                className="h-[12px] flex-row items-center gap-2 pl-3"
                accessible={false}
              >
                <View
                  className={`h-px ${height % 10 === 0 ? "w-8 bg-muted" : height % 5 === 0 ? "w-6 bg-muted" : "w-3 bg-border"}`}
                />
                {height % 10 === 0 && (
                  <Txt className="text-[11px] text-muted">{height}</Txt>
                )}
              </View>
            ))}
          </ScrollView>
          <View
            pointerEvents="none"
            className="absolute left-0 right-0 top-1/2 -mt-[3px] flex-row items-center"
          >
            <View className="h-[6px] w-[6px] rounded-full bg-brand" />
            <View className="h-[2px] flex-1 bg-brand" />
          </View>
        </View>
      </View>
      <View className="mt-4 flex-row items-center justify-center gap-2">
        <MaterialCommunityIcons
          name="gesture-swipe-vertical"
          size={18}
          color={C.muted}
        />
        <Txt className="text-sm text-muted">
          Slide the ruler to find your height
        </Txt>
      </View>
    </View>
  );
}
