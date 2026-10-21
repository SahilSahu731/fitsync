import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Keyboard, Pressable, TextInput, View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as Haptics from "expo-haptics";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

const MIN = 100;
const MAX = 250;
const COUNT = MAX - MIN + 1;
const TICK_H = 12; // px between ticks; one tick = 1 cm
const CHUNK = 40; // ticks per drawn chunk
const WINDOW_H = 320;
const WINDOW_W = 112;
const PAD = WINDOW_H / 2 - TICK_H / 2;
const TICK_X = 14;
const FEEDBACK_GAP_MS = 40;
const GLASS_DARK = "#0d0d0f";

// Index 0 is the tallest height, so scrolling down gives a shorter height (same as before).
const idxOf = (v: number) => Math.max(0, Math.min(COUNT - 1, MAX - Math.round(v)));
const heightOf = (i: number) => MAX - i;

/** 40 ticks as three SVG paths (one native view) plus labels. Static and memoized. */
const TickChunk = memo(function TickChunk({ start, end }: { start: number; end: number }) {
  const { major, mid, minor, labels } = useMemo(() => {
    let major = "";
    let mid = "";
    let minor = "";
    const labels: { y: number; text: string }[] = [];
    for (let i = start; i < end; i++) {
      const y = (i - start) * TICK_H + TICK_H / 2;
      const h = heightOf(i);
      if (h % 10 === 0) {
        major += `M${TICK_X} ${y}H${TICK_X + 32}`;
        labels.push({ y, text: String(h) });
      } else if (h % 5 === 0) mid += `M${TICK_X} ${y}H${TICK_X + 22}`;
      else minor += `M${TICK_X} ${y}H${TICK_X + 12}`;
    }
    return { major, mid, minor, labels };
  }, [start, end]);

  const h = (end - start) * TICK_H;
  return (
    <View style={{ width: WINDOW_W, height: h }}>
      <Svg width={WINDOW_W} height={h}>
        <Path d={minor} stroke="#fff" strokeOpacity={0.22} strokeWidth={1} />
        <Path d={mid} stroke="#fff" strokeOpacity={0.5} strokeWidth={1} />
        <Path d={major} stroke="#fff" strokeOpacity={0.9} strokeWidth={2} strokeLinecap="round" />
      </Svg>
      {labels.map((l) => (
        <Txt
          key={l.y}
          className="absolute left-[54px] text-[11px] text-white/50"
          style={{ top: l.y - 8 }}
        >
          {l.text}
        </Txt>
      ))}
    </View>
  );
});

export function HeightPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const height = Math.max(MIN, Math.min(MAX, Math.round(value)));

  // `live` follows the ruler while dragging; the parent hears about it when the ruler settles.
  const [live, setLive] = useState(height);
  const [text, setText] = useState<string | null>(null);

  const scrollRef = useRef<Animated.ScrollView>(null);
  const curIndex = useRef(idxOf(height));
  const ready = useRef(false);
  const lastFx = useRef(0);
  const onChangeRef = useRef(onChange);
  const lastIdx = useSharedValue(idxOf(height));
  const fade = useSharedValue(0);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const feedback = useCallback(() => {
    const now = Date.now();
    if (now - lastFx.current < FEEDBACK_GAP_MS) return;
    lastFx.current = now;
    void Haptics.selectionAsync().catch(() => {});
  }, []);

  const onTick = useCallback(
    (index: number) => {
      if (index === curIndex.current) return;
      curIndex.current = index;
      setLive(heightOf(index));
      setText(null);
      feedback();
    },
    [feedback],
  );

  const commit = useCallback((index: number) => {
    curIndex.current = index;
    setLive(heightOf(index));
    onChangeRef.current(heightOf(index));
  }, []);

  const dismiss = useCallback(() => {
    Keyboard.dismiss();
    setText(null);
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: () => {
      scheduleOnRN(dismiss);
    },
    onScroll: (e) => {
      const index = Math.max(0, Math.min(COUNT - 1, Math.round(e.contentOffset.y / TICK_H)));
      if (index !== lastIdx.value) {
        lastIdx.value = index;
        scheduleOnRN(onTick, index);
      }
    },
    onEndDrag: (e) => {
      // No fling momentum coming: the ruler is already at rest, so commit now.
      if (Math.abs(e.velocity?.y ?? 0) < 0.1) {
        const index = Math.max(0, Math.min(COUNT - 1, Math.round(e.contentOffset.y / TICK_H)));
        scheduleOnRN(commit, index);
      }
    },
    onMomentumEnd: (e) => {
      const index = Math.max(0, Math.min(COUNT - 1, Math.round(e.contentOffset.y / TICK_H)));
      scheduleOnRN(commit, index);
    },
  });

  // Keep the ruler in sync with outside changes (typing, +/-, saved value loading).
  useLayoutEffect(() => {
    const target = idxOf(height);
    const first = !ready.current;
    if (!first && target === curIndex.current) return;

    curIndex.current = target;
    lastIdx.value = target;
    setLive(height);

    const y = target * TICK_H;
    if (first) {
      // Jump to the right spot while hidden, then fade in: no visible jump.
      scrollRef.current?.scrollTo({ y, animated: false });
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y, animated: false });
        fade.value = withTiming(1, { duration: 220 });
      });
      ready.current = true;
    } else {
      scrollRef.current?.scrollTo({ y, animated: false });
    }
  }, [height, lastIdx, fade]);

  const chunks = useMemo(() => {
    const out = [];
    for (let start = 0; start < COUNT; start += CHUNK) {
      out.push(<TickChunk key={start} start={start} end={Math.min(COUNT, start + CHUNK)} />);
    }
    return out;
  }, []);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const nudge = (amount: number) => {
    dismiss();
    const next = Math.max(MIN, Math.min(MAX, live + amount));
    setLive(next);
    onChange(next);
    feedback();
  };

  const inches = Math.round(live / 2.54);
  const atMin = live <= MIN;
  const atMax = live >= MAX;

  return (
    <View>
      {/* Glass height-gauge slab */}
      <View className="flex-row gap-4 overflow-hidden rounded-[36px] border border-white/15 bg-white/[0.06] p-4">
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.04)", "rgba(255,255,255,0)"]}
          style={{ position: "absolute", left: 0, right: 0, top: 0, height: 150 }}
        />

        {/* Readout */}
        <View className="min-w-0 flex-1 justify-between">
          <View>
            <View className="flex-row items-center gap-2 pb-3">
              <MaterialCommunityIcons name="human-male-height" size={18} color={C.brand} />
              <Txt className="text-sm text-white/60">Your height</Txt>
            </View>

            <View
              className="rounded-3xl border border-white/10 px-3 py-4"
              style={{ backgroundColor: GLASS_DARK }}
            >
              <TextInput
                accessibilityLabel="Height in centimeters"
                value={text ?? String(live)}
                onChangeText={(next) => {
                  setText(next);
                  const n = Number(next);
                  if (next.trim() && Number.isFinite(n)) {
                    const clamped = Math.max(MIN, Math.min(MAX, Math.round(n)));
                    setLive(clamped);
                    onChange(clamped);
                  }
                }}
                onEndEditing={() => setText(null)}
                keyboardType="number-pad"
                returnKeyType="done"
                selectTextOnFocus
                maxLength={3}
                className="w-full p-0 font-outfit-semibold text-[56px] leading-[66px] text-white"
                style={{
                  textShadowColor: C.brand,
                  textShadowRadius: 16,
                  textShadowOffset: { width: 0, height: 0 },
                }}
              />
              <Txt weight="medium" className="text-lg text-brand">
                cm
              </Txt>
              <Txt className="mt-1 text-sm text-white/50">
                {Math.floor(inches / 12)} ft {inches % 12} in
              </Txt>
            </View>
          </View>

          <View>
            <View className="mt-5 flex-row gap-2">
              {([-1, 1] as const).map((direction) => {
                const disabled = direction < 0 ? atMin : atMax;
                return (
                  <Pressable
                    key={direction}
                    accessibilityRole="button"
                    accessibilityLabel={
                      direction < 0
                        ? "Decrease height by one centimeter"
                        : "Increase height by one centimeter"
                    }
                    disabled={disabled}
                    onPress={() => nudge(direction)}
                    hitSlop={6}
                    className={`h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 active:bg-white/20 ${disabled ? "opacity-30" : ""}`}
                  >
                    <MaterialCommunityIcons
                      name={direction < 0 ? "minus" : "plus"}
                      size={22}
                      color="#fff"
                    />
                  </Pressable>
                );
              })}
            </View>
            <Txt className="mt-3 text-xs text-white/40">Tap the number to type</Txt>
          </View>
        </View>

        {/* Ruler window */}
        <View
          className="overflow-hidden rounded-3xl border border-white/10"
          style={{ width: WINDOW_W, height: WINDOW_H, backgroundColor: GLASS_DARK }}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Height ruler"
          accessibilityValue={{
            min: MIN,
            max: MAX,
            now: live,
            text: `${live} centimeters`,
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
          <Animated.View style={fadeStyle} className="flex-1">
            <Animated.ScrollView
              ref={scrollRef}
              nestedScrollEnabled
              importantForAccessibility="no-hide-descendants"
              contentContainerStyle={{ paddingVertical: PAD }}
              showsVerticalScrollIndicator={false}
              snapToInterval={TICK_H}
              decelerationRate="fast"
              bounces={false}
              scrollEventThrottle={16}
              onScroll={scrollHandler}
            >
              {chunks}
            </Animated.ScrollView>
          </Animated.View>

          {/* Glass fade at the top and bottom */}
          <LinearGradient
            pointerEvents="none"
            colors={[GLASS_DARK, "rgba(13,13,15,0)"]}
            style={{ position: "absolute", left: 0, right: 0, top: 0, height: 72 }}
          />
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(13,13,15,0)", GLASS_DARK]}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 72 }}
          />

          {/* Needle */}
          <View
            pointerEvents="none"
            className="absolute left-0 top-1/2 -mt-[1.5px] h-[3px] w-[60px] rounded-r-full bg-brand"
            style={{
              shadowColor: C.brand,
              shadowOpacity: 0.9,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-center gap-2">
        <MaterialCommunityIcons name="gesture-swipe-vertical" size={18} color={C.muted} />
        <Txt className="text-sm text-muted">Slide the ruler to find your height</Txt>
      </View>
    </View>
  );
}