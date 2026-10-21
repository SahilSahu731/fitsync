import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Keyboard, LayoutChangeEvent, Pressable, TextInput, View } from "react-native";
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
import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

const TICK_W = 12; // px between ticks; one tick = one step
const MAJOR_EVERY = 10; // labelled tick every 10 steps
const MID_EVERY = 5;
const CHUNK = 40; // ticks per drawn chunk (keeps each native view small)
const FEEDBACK_GAP_MS = 40; // don't fire haptics faster than this
const GLASS_DARK = "#0d0d0f"; // recessed glass behind the readout and the dial
const TICK_TOP = 14;

type Props = {
  value: number;
  onChange: (value: number) => void;
  unit: "kg" | "lb";
  min: number;
  max: number;
};

/**
 * 40 ticks drawn as three SVG paths (one native view) plus the few labels.
 * Static and memoized: it never re-renders while the weight changes.
 */
const TickChunk = memo(function TickChunk({
  start,
  end,
  min,
  step,
}: {
  start: number;
  end: number;
  min: number;
  step: number;
}) {
  const { major, mid, minor, labels } = useMemo(() => {
    let major = "";
    let mid = "";
    let minor = "";
    const labels: { x: number; text: string }[] = [];
    for (let i = start; i < end; i++) {
      const x = (i - start) * TICK_W + TICK_W / 2;
      if (i % MAJOR_EVERY === 0) {
        major += `M${x} ${TICK_TOP}V${TICK_TOP + 36}`;
        labels.push({ x, text: String(Number((min + i * step).toFixed(1))) });
      } else if (i % MID_EVERY === 0) mid += `M${x} ${TICK_TOP}V${TICK_TOP + 24}`;
      else minor += `M${x} ${TICK_TOP}V${TICK_TOP + 14}`;
    }
    return { major, mid, minor, labels };
  }, [start, end, min, step]);

  const w = (end - start) * TICK_W;
  return (
    <View style={{ width: w, height: 86 }}>
      <Svg width={w} height={60}>
        <Path d={minor} stroke="#fff" strokeOpacity={0.22} strokeWidth={1} />
        <Path d={mid} stroke="#fff" strokeOpacity={0.5} strokeWidth={1} />
        <Path d={major} stroke="#fff" strokeOpacity={0.9} strokeWidth={2} strokeLinecap="round" />
      </Svg>
      {labels.map((l) => (
        <Txt
          key={l.x}
          className="absolute top-[58px] w-14 text-center text-xs text-white/50"
          style={{ left: l.x - 28 }}
        >
          {l.text}
        </Txt>
      ))}
    </View>
  );
});

export function WeightPicker({ value, onChange, unit, min, max }: Props) {
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

  const scrollRef = useRef<Animated.ScrollView>(null);
  const curIndex = useRef(idxOf(displayValue));
  const prevUnit = useRef(unit);
  const ready = useRef(false);
  const lastFx = useRef(0);
  const onChangeRef = useRef(onChange);
  const lastIdx = useSharedValue(idxOf(displayValue));
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

  // ---- scroll handling (UI thread) -> JS only when the tick under the needle changes ----
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

  // ---- keep the scale in sync with outside changes (typing, +/-, kg <-> lb) ------------
  useLayoutEffect(() => {
    if (width === 0) return;
    const target = idxOf(displayValue);
    const first = !ready.current;
    const unitChanged = prevUnit.current !== unit;
    prevUnit.current = unit;
    if (!first && !unitChanged && target === curIndex.current) return;

    curIndex.current = target;
    lastIdx.value = target;
    setLive(displayValue);

    const x = target * TICK_W;
    if (first || unitChanged) {
      // Hide for a beat, jump to the right spot, then fade back in: no visible jump.
      fade.value = 0;
      scrollRef.current?.scrollTo({ x, animated: false });
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ x, animated: false });
        fade.value = withTiming(1, { duration: first ? 220 : 140 });
      });
      ready.current = true;
    } else {
      scrollRef.current?.scrollTo({ x, animated: false });
    }
  }, [displayValue, unit, width, idxOf, lastIdx, fade]);

  // ---- static pieces ------------------------------------------------------------------
  const chunks = useMemo(() => {
    const out = [];
    for (let start = 0; start < count; start += CHUNK) {
      out.push(
        <TickChunk
          key={`${unit}-${start}`}
          start={start}
          end={Math.min(count, start + CHUNK)}
          min={min}
          step={step}
        />,
      );
    }
    return out;
  }, [count, min, step, unit]);

  const contentStyle = useMemo(
    () => ({ paddingHorizontal: Math.max(0, width / 2 - TICK_W / 2) }),
    [width],
  );
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

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
      {/* Glass weighing-scale slab */}
      <View className="overflow-hidden rounded-[36px] border border-white/15 bg-white/[0.06] px-4 pb-7 pt-4">
        {/* Light catching the top edge of the glass */}
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.04)", "rgba(255,255,255,0)"]}
          style={{ position: "absolute", left: 0, right: 0, top: 0, height: 150 }}
        />

        <View className="flex-row items-center justify-center gap-2 pb-3">
          <MaterialCommunityIcons name="scale-bathroom" size={18} color={C.brand} />
          <Txt className="text-sm text-white/60">Current weight</Txt>
        </View>

        {/* Readout */}
        <View
          className="flex-row items-center justify-between rounded-3xl border border-white/10 px-3 py-3"
          style={{ backgroundColor: GLASS_DARK }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Decrease weight by ${step} ${unit}`}
            disabled={atMin}
            onPress={() => nudge(-step)}
            hitSlop={8}
            className={`h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 active:bg-white/20 ${atMin ? "opacity-30" : ""}`}
          >
            <MaterialCommunityIcons name="minus" size={22} color="#fff" />
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
              className="min-w-[116px] p-0 text-center font-outfit-semibold text-[60px] leading-[72px] text-white"
              style={{
                textShadowColor: C.brand,
                textShadowRadius: 16,
                textShadowOffset: { width: 0, height: 0 },
              }}
            />
            <Txt weight="medium" className="pb-2.5 text-lg text-brand">
              {unit}
            </Txt>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Increase weight by ${step} ${unit}`}
            disabled={atMax}
            onPress={() => nudge(step)}
            hitSlop={8}
            className={`h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 active:bg-white/20 ${atMax ? "opacity-30" : ""}`}
          >
            <MaterialCommunityIcons name="plus" size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Dial window */}
        <View
          className="mt-3 h-[88px] overflow-hidden rounded-3xl border border-white/10"
          style={{ backgroundColor: GLASS_DARK }}
        >
          <View
            className="flex-1"
            onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={`Weight scale, ${live} ${unit}`}
            accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
            onAccessibilityAction={(e) =>
              nudge(e.nativeEvent.actionName === "increment" ? step : -step)
            }
          >
            <Animated.View style={fadeStyle} className="flex-1">
              <Animated.ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={TICK_W}
                decelerationRate="fast"
                scrollEventThrottle={16}
                onScroll={scrollHandler}
                contentContainerStyle={contentStyle}
              >
                {chunks}
              </Animated.ScrollView>
            </Animated.View>

            {/* Glass fade at both ends */}
            <LinearGradient
              pointerEvents="none"
              colors={[GLASS_DARK, "rgba(13,13,15,0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 64 }}
            />
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(13,13,15,0)", GLASS_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 64 }}
            />

            {/* Needle */}
            <View
              pointerEvents="none"
              className="absolute left-1/2 top-0 -ml-[1.5px] h-[56px] w-[3px] rounded-b-full bg-brand"
              style={{
                shadowColor: C.brand,
                shadowOpacity: 0.9,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 0 },
              }}
            />
          </View>
        </View>

        {/* Little rubber feet */}
        <View pointerEvents="none" className="absolute bottom-2.5 left-10 h-1.5 w-10 rounded-full bg-white/15" />
        <View pointerEvents="none" className="absolute bottom-2.5 right-10 h-1.5 w-10 rounded-full bg-white/15" />
      </View>

      <Txt className="mt-3 text-center text-sm text-muted">
        Drag the dial, or tap the number to type.
      </Txt>
    </View>
  );
}