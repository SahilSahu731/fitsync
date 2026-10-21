import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Keyboard, LayoutChangeEvent, Pressable, TextInput, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

const TICK_SOUND = require("@/assets/sounds/tick.wav");
const TICK_W = 12; // px between ticks; one tick = one step
const MAJOR_EVERY = 10; // labelled tick every 10 steps
const MID_EVERY = 5;
const FEEDBACK_GAP_MS = 40; // don't fire haptics/sound faster than this

type Props = {
  value: number;
  onChange: (value: number) => void;
  unit: "kg" | "lb";
  min: number;
  max: number;
  sound?: boolean;
};

const Tick = memo(function Tick({ i, min, step }: { i: number; min: number; step: number }) {
  const major = i % MAJOR_EVERY === 0;
  const mid = !major && i % MID_EVERY === 0;
  return (
    <View className="items-center" style={{ width: TICK_W }}>
      <View
        className={
          major
            ? "h-9 w-[2px] rounded-full bg-muted"
            : mid
              ? "h-6 w-px bg-muted opacity-70"
              : "h-4 w-px bg-muted opacity-35"
        }
      />
      {major && (
        <Txt className="absolute top-11 w-14 text-center text-xs text-muted">
          {Number((min + i * step).toFixed(1))}
        </Txt>
      )}
    </View>
  );
});

export function WeightPicker({ value, onChange, unit, min, max, sound = true }: Props) {
  const step = unit === "kg" ? 0.5 : 1;
  const count = Math.round((max - min) / step) + 1;
  const displayValue = Number(value.toFixed(1));

  const idxOf = useCallback(
    (v: number) => Math.max(0, Math.min(count - 1, Math.round((v - min) / step))),
    [count, min, step],
  );
  const valOf = useCallback((i: number) => Number((min + i * step).toFixed(1)), [min, step]);

  // `live` follows the scale while dragging; the parent only hears about it when the scale settles.
  const [live, setLive] = useState(displayValue);
  const [text, setText] = useState<string | null>(null);
  const [width, setWidth] = useState(0);

  const listRef = useRef<FlatList<number>>(null);
  const curIndex = useRef(idxOf(displayValue));
  const prevUnit = useRef(unit);
  const lastFx = useRef(0);
  const onChangeRef = useRef(onChange);
  const lastIdx = useSharedValue(idxOf(displayValue));

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Tick sound: a small pool so fast scrolling can overlap clicks.
  const p0 = useAudioPlayer(TICK_SOUND);
  const p1 = useAudioPlayer(TICK_SOUND);
  const p2 = useAudioPlayer(TICK_SOUND);
  const pool = useMemo(() => [p0, p1, p2], [p0, p1, p2]);
  const poolPos = useRef(0);

  useEffect(() => {
    // Respect the silent switch and don't interrupt the user's music.
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" }).catch(
      () => {},
    );
  }, []);

  const feedback = useCallback(() => {
    const now = Date.now();
    if (now - lastFx.current < FEEDBACK_GAP_MS) return;
    lastFx.current = now;
    void Haptics.selectionAsync().catch(() => {});
    if (sound) {
      const player = pool[poolPos.current++ % pool.length];
      try {
        player.seekTo(0);
        player.play();
      } catch {
        // sound is a nicety; never break the picker
      }
    }
  }, [pool, sound]);

  // JS side of the UI-thread scroll handler: runs only when the tick under the marker changes.
  const onTick = useCallback(
    (index: number) => {
      if (index === curIndex.current) return;
      curIndex.current = index;
      setLive(valOf(index));
      setText(null);
      feedback();
    },
    [valOf, feedback],
  );

  const commit = useCallback(
    (index: number) => {
      const next = valOf(index);
      curIndex.current = index;
      setLive(next);
      onChangeRef.current(next);
    },
    [valOf],
  );

  const dismiss = useCallback(() => {
    Keyboard.dismiss();
    setText(null);
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: () => {
      scheduleOnRN(dismiss);
    },
    onScroll: (e) => {
      const index = Math.max(0, Math.min(count - 1, Math.round(e.contentOffset.x / TICK_W)));
      if (index !== lastIdx.value) {
        lastIdx.value = index;
        scheduleOnRN(onTick, index);
      }
    },
    onEndDrag: (e) => {
      // No fling momentum coming: the scale is already at rest, so commit now.
      if (Math.abs(e.velocity?.x ?? 0) < 0.1) {
        const index = Math.max(0, Math.min(count - 1, Math.round(e.contentOffset.x / TICK_W)));
        scheduleOnRN(commit, index);
      }
    },
    onMomentumEnd: (e) => {
      const index = Math.max(0, Math.min(count - 1, Math.round(e.contentOffset.x / TICK_W)));
      scheduleOnRN(commit, index);
    },
  });

  // Keep the scale in sync when the value changes from outside (typing, +/-, or a unit switch).
  useEffect(() => {
    if (width === 0) return;
    const target = idxOf(displayValue);
    const unitChanged = prevUnit.current !== unit;
    prevUnit.current = unit;
    if (target === curIndex.current && !unitChanged) return;
    curIndex.current = target;
    lastIdx.value = target;
    setLive(displayValue);
    listRef.current?.scrollToOffset({ offset: target * TICK_W, animated: !unitChanged && width > 0 });
  }, [displayValue, unit, width, idxOf, lastIdx]);

  const data = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  const renderItem = useCallback(
    ({ item }: { item: number }) => <Tick i={item} min={min} step={step} />,
    [min, step],
  );
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: TICK_W, offset: TICK_W * index, index }),
    [],
  );
  const contentStyle = useMemo(
    () => ({ paddingHorizontal: Math.max(0, width / 2 - TICK_W / 2) }),
    [width],
  );

  const nudge = (amount: number) => {
    dismiss();
    const next = Number(Math.max(min, Math.min(max, live + amount)).toFixed(1));
    setLive(next);
    onChange(next);
    feedback();
  };

  const atMin = live <= min;
  const atMax = live >= max;

  return (
    <View>
      <Txt className="text-center text-sm text-muted">Current weight</Txt>

      <View className="mt-3 flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease weight by ${step} ${unit}`}
          disabled={atMin}
          onPress={() => nudge(-step)}
          hitSlop={8}
          className={`h-12 w-12 items-center justify-center rounded-full border border-border active:bg-elevated ${atMin ? "opacity-30" : ""}`}
        >
          <MaterialCommunityIcons name="minus" size={22} color={C.ink} />
        </Pressable>

        <View className="flex-row items-end justify-center gap-1.5">
          <TextInput
            accessibilityLabel={`Weight in ${unit}`}
            value={text ?? live.toFixed(1)}
            onChangeText={(next) => {
              setText(next);
              const n = Number(next.replace(",", "."));
              if (next.trim() && Number.isFinite(n)) {
                const clamped = Number(Math.max(min, Math.min(max, n)).toFixed(1));
                setLive(clamped);
                onChange(clamped);
              }
            }}
            onEndEditing={() => setText(null)}
            keyboardType="decimal-pad"
            returnKeyType="done"
            selectTextOnFocus
            maxLength={6}
            className="min-w-[120px] p-0 text-center font-outfit-semibold text-[68px] leading-[80px] text-ink"
          />
          <Animated.View key={unit} entering={FadeIn.duration(220)} exiting={FadeOut.duration(100)}>
            <Txt weight="medium" className="pb-3 text-xl text-brand">
              {unit}
            </Txt>
          </Animated.View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase weight by ${step} ${unit}`}
          disabled={atMax}
          onPress={() => nudge(step)}
          hitSlop={8}
          className={`h-12 w-12 items-center justify-center rounded-full border border-border active:bg-elevated ${atMax ? "opacity-30" : ""}`}
        >
          <MaterialCommunityIcons name="plus" size={22} color={C.ink} />
        </Pressable>
      </View>

      <View
        className="mt-6 h-[88px]"
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Weight scale, ${live} ${unit}`}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) =>
          nudge(e.nativeEvent.actionName === "increment" ? step : -step)
        }
      >
        {/* Keyed by unit so kg <-> lb crossfades instead of jumping. */}
        <Animated.View
          key={unit}
          entering={FadeIn.duration(260)}
          exiting={FadeOut.duration(140)}
          className="absolute inset-0"
        >
          <Animated.FlatList
            ref={listRef}
            horizontal
            data={data}
            renderItem={renderItem}
            keyExtractor={String}
            getItemLayout={getItemLayout}
            initialNumToRender={60}
            maxToRenderPerBatch={40}
            windowSize={9}
            removeClippedSubviews
            showsHorizontalScrollIndicator={false}
            snapToInterval={TICK_W}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={scrollHandler}
            contentOffset={{ x: idxOf(displayValue) * TICK_W, y: 0 }}
            contentContainerStyle={contentStyle}
          />
        </Animated.View>

        <View
          pointerEvents="none"
          className="absolute left-1/2 top-0 -ml-[2px] h-12 w-1 rounded-full bg-brand"
        />
        <View pointerEvents="none" className="absolute inset-y-0 left-0 flex-row">
          <View className="w-6 bg-bg opacity-100" />
          <View className="w-6 bg-bg opacity-60" />
          <View className="w-6 bg-bg opacity-25" />
        </View>
        <View pointerEvents="none" className="absolute inset-y-0 right-0 flex-row">
          <View className="w-6 bg-bg opacity-25" />
          <View className="w-6 bg-bg opacity-60" />
          <View className="w-6 bg-bg opacity-100" />
        </View>
      </View>

      <Txt className="mt-2 text-center text-sm text-muted">
        Drag the scale, or tap the number to type.
      </Txt>
    </View>
  );
}