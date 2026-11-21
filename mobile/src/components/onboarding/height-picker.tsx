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
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Path,
  Stop,
  LinearGradient as SvgGradient,
} from "react-native-svg";
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
const WINDOW_H = 300;
const WINDOW_W = 90;
const PAD = WINDOW_H / 2 - TICK_H / 2;
const TICK_X = 14;
const FEEDBACK_GAP_MS = 40;
const GLASS_DARK = "#0d0d0f";

// Stage: the man is drawn at his tallest (250 cm) and scaled down from his feet.
const STAGE_H = WINDOW_H;
const FIG_H = 250; // px height at 250 cm
const FIG_W = (FIG_H * 50) / 120; // keeps the 50:120 drawing ratio
const MIN_SCALE = MIN / MAX; // 100 cm is exactly 40% of 250 cm, so proportions are true
const FLOOR_PAD = 14; // space under his feet

// Index 0 is the tallest height, so scrolling down gives a shorter height.
const idxOf = (v: number) => Math.max(0, Math.min(COUNT - 1, MAX - Math.round(v)));
const heightOf = (i: number) => MAX - i;
const clampH = (v: number) => Math.max(MIN, Math.min(MAX, Math.round(v)));
const MAX_SCROLL = (COUNT - 1) * TICK_H;

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

/**
 * Big man standing on the floor. His head always reaches the glowing line,
 * and both move together as the ruler changes (UI thread only).
 */
const Man = memo(function Man({
  scrollY,
  live,
}: {
  scrollY: SharedValue<number>;
  live: number;
}) {
  const scale = useDerivedScale(scrollY);

  const figureStyle = useAnimatedStyle(() => ({
    transform: [
      // scale about the box center, then shift so the feet stay planted
      { translateY: ((1 - scale.value) * FIG_H) / 2 },
      { scale: scale.value },
    ],
  }));

  // top of his head, measured from the top of the stage
  const lineStyle = useAnimatedStyle(() => ({
    top: STAGE_H - FLOOR_PAD - FIG_H * scale.value,
  }));

  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      {/* floor */}
      <Svg
        width="100%"
        height={30}
        style={{ position: "absolute", left: 0, right: 0, bottom: FLOOR_PAD - 15 }}
      >
        <Defs>
          <SvgGradient id="floor" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={C.brand} stopOpacity={0} />
            <Stop offset="0.5" stopColor={C.brand} stopOpacity={0.6} />
            <Stop offset="1" stopColor={C.brand} stopOpacity={0} />
          </SvgGradient>
        </Defs>
        <Ellipse cx="50%" cy={15} rx="46%" ry={7} fill="url(#floor)" />
      </Svg>

      {/* man */}
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: FLOOR_PAD,
            alignSelf: "center",
            width: FIG_W,
            height: FIG_H,
          },
          figureStyle,
        ]}
      >
        <Svg width={FIG_W} height={FIG_H} viewBox="0 0 50 120">
          <Defs>
            <SvgGradient id="body" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={0.95} />
              <Stop offset="0.55" stopColor="#ffffff" stopOpacity={0.35} />
              <Stop offset="1" stopColor={C.brand} stopOpacity={0.6} />
            </SvgGradient>
          </Defs>
          <Circle cx={25} cy={10} r={8.5} fill="url(#body)" />
          <Path
            d="M16 24H34Q41 24 42 32L44 62Q44 65 41 65Q38 65 38 62L36 40L35 70L36 116Q36 119 33 119H29Q26 119 26 116L25 84L24 116Q24 119 21 119H17Q14 119 14 116L15 70L14 40L12 62Q12 65 9 65Q6 65 6 62L8 32Q9 24 16 24Z"
            fill="url(#body)"
          />
        </Svg>
      </Animated.View>

      {/* head line + value pill */}
      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", left: 0, right: 0, height: 0 }, lineStyle]}
      >
        <View
          style={{
            height: 0,
            borderTopWidth: 1.5,
            borderStyle: "dashed",
            borderColor: C.brand,
            opacity: 0.9,
          }}
        />
        <View
          style={{
            position: "absolute",
            right: 8,
            top: -26,
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.12)",
            shadowColor: C.brand,
            shadowOpacity: 0.8,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          <Txt weight="medium" className="text-xs text-white">
            {live} cm
          </Txt>
        </View>
      </Animated.View>
    </View>
  );
});

// scrollY 0 => 250 cm (scale 1), scrollY max => 100 cm (scale 0.4)
function useDerivedScale(scrollY: SharedValue<number>) {
  return useDerivedValue(() =>
    interpolate(scrollY.value, [0, MAX_SCROLL], [1, MIN_SCALE], Extrapolation.CLAMP),
  );
}

export function HeightPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const height = clampH(value);

  // `live` follows the ruler while dragging; the parent hears about it when the ruler settles.
  const [live, setLive] = useState(height);
  const [text, setText] = useState<string | null>(null);

  const scrollRef = useRef<Animated.ScrollView>(null);
  const curIndex = useRef(idxOf(height));
  const ready = useRef(false);
  const lastFx = useRef(0);
  const onChangeRef = useRef(onChange);
  const lastIdx = useSharedValue(idxOf(height));
  const scrollY = useSharedValue(idxOf(height) * TICK_H);
  const fade = useSharedValue(0);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Light tap on every cm, a firmer one on every 10 cm.
  const feedback = useCallback((h: number) => {
    const now = Date.now();
    if (now - lastFx.current < FEEDBACK_GAP_MS) return;
    lastFx.current = now;
    if (h % 10 === 0) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    else void Haptics.selectionAsync().catch(() => {});
  }, []);

  const onTick = useCallback(
    (index: number) => {
      if (index === curIndex.current) return;
      curIndex.current = index;
      setLive(heightOf(index));
      setText(null);
      feedback(heightOf(index));
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
      scrollY.value = e.contentOffset.y;
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
    scrollY.value = target * TICK_H;
    setLive(height);

    const y = target * TICK_H;
    if (first) {
      // Jump to the right spot while hidden, then fade in: no visible jump.
      scrollRef.current?.scrollTo({ y, animated: false });
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y, animated: false });
        fade.value = withTiming(1, { duration: 260 });
      });
      ready.current = true;
    } else {
      scrollRef.current?.scrollTo({ y, animated: false });
    }
  }, [height, lastIdx, scrollY, fade]);

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
    const next = clampH(live + amount);
    setLive(next);
    onChange(next);
    feedback(next);
  };

  const inches = Math.round(live / 2.54);
  const atMin = live <= MIN;
  const atMax = live >= MAX;

  return (
    <View>
      {/* Glass height-gauge slab */}
      <View className="gap-4 overflow-hidden rounded-[36px] bg-white/[0.06] p-4">
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.04)", "rgba(255,255,255,0)"]}
          style={{ position: "absolute", left: 0, right: 0, top: 0, height: 150 }}
        />

        {/* Stage + ruler */}
        <View className="flex-row gap-3">
          {/* Stage: the man */}
          <View
            className="flex-1 overflow-hidden rounded-3xl"
            style={{ height: STAGE_H, backgroundColor: GLASS_DARK }}
          >
            <Animated.View style={[{ flex: 1 }, fadeStyle]}>
              <Man scrollY={scrollY} live={live} />
            </Animated.View>

            <View
              pointerEvents="none"
              className="absolute left-3 top-3 flex-row items-center gap-2"
            >
              <MaterialCommunityIcons name="human-male-height" size={18} color={C.ink} />
              <Txt className="text-sm text-white/60">Your height</Txt>
            </View>
          </View>

          {/* Ruler window */}
          <View
            className="overflow-hidden rounded-3xl"
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

            {/* Lens band under the needle */}
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.09)", "rgba(255,255,255,0)"]}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: WINDOW_H / 2 - TICK_H * 3,
                height: TICK_H * 6,
              }}
            />

            {/* Glass fade at the top and bottom */}
            <LinearGradient
              pointerEvents="none"
              colors={[GLASS_DARK, "rgba(13,13,15,0)"]}
              style={{ position: "absolute", left: 0, right: 0, top: 0, height: 88 }}
            />
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(13,13,15,0)", GLASS_DARK]}
              style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 88 }}
            />

            {/* Needle with a glowing head */}
            <View
              pointerEvents="none"
              className="absolute left-0 top-1/2 -mt-[1.5px] h-[3px] w-[72px] rounded-r-full bg-ink"
              style={{
                shadowColor: C.brand,
                shadowOpacity: 1,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 0 },
              }}
            />
            <View
              pointerEvents="none"
              className="absolute top-1/2 h-[9px] w-[9px] rounded-full bg-white"
              style={{
                left: 68,
                marginTop: -4.5,
                shadowColor: C.brand,
                shadowOpacity: 1,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 0 },
              }}
            />
          </View>
        </View>

        {/* Readout card at the bottom */}
        <View
          className="flex-row items-center justify-between rounded-3xl px-5 py-3"
          style={{ backgroundColor: GLASS_DARK }}
        >
          <View>
            <View className="flex-row items-end gap-2">
              <TextInput
                accessibilityLabel="Height in centimeters"
                value={text ?? String(live)}
                onChangeText={(next) => {
                  setText(next);
                  const n = Number(next);
                  if (next.trim() && Number.isFinite(n)) {
                    const clamped = clampH(n);
                    setLive(clamped);
                    onChange(clamped);
                  }
                }}
                onEndEditing={() => setText(null)}
                keyboardType="number-pad"
                returnKeyType="done"
                selectTextOnFocus
                maxLength={3}
                className="min-w-[96px] p-0 font-poppins-semibold text-[48px] leading-[58px] text-white"
              />
              <Txt weight="medium" className="pb-3 text-lg text-ink">
                cm
              </Txt>
            </View>
            <Txt className="text-sm text-white/50">
              {Math.floor(inches / 12)}′ {inches % 12}″
            </Txt>
          </View>

          <View className="flex-row gap-2">
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
                  className={`h-12 w-12 items-center justify-center rounded-full bg-white/10 active:bg-white/20 ${disabled ? "opacity-30" : ""}`}
                >
                  <MaterialCommunityIcons
                    name={direction < 0 ? "minus" : "plus"}
                    size={24}
                    color="#fff"
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View className="mt-1 flex-row items-center justify-center gap-2">
        <MaterialCommunityIcons name="gesture-swipe-vertical" size={18} color={C.muted} />
        <Txt className="text-xs text-muted">Slide the ruler or tap the number to type</Txt>
      </View>
    </View>
  );
}