import React, { ReactNode, useEffect, useState } from "react";
import { Animated, Easing, PanResponder, PanResponderInstance, View } from "react-native";

const SIDE = 32; // visible sliver of the neighbour cards
const CARD_OVERLAP = 0.94; // how far neighbours sit from the centre (tucked behind)

/**
 * Holds all the mutable gesture/animation state, so the component itself never touches refs.
 * Position `pos` is continuous (1.0 = slide 1 centered). Every card derives its place from
 * `modulo`, which is what makes the deck infinite.
 */
class DeckController {
  readonly pos: Animated.Value;
  readonly intro = new Animated.Value(0);
  readonly responder: PanResponderInstance;
  private n: number;
  private half: Animated.Value;
  private base: number;
  private current: number;
  private active: number;
  private step = 1;
  private touched = false;
  private locked = false;
  private heights: number[];
  private subs = new Set<(i: number) => void>();
  private cache = new Map<number, { raw: any; intro: any }>();

  constructor(n: number, initial: number) {
    this.n = n;
    this.half = new Animated.Value(n / 2);
    this.pos = new Animated.Value(initial);
    this.base = initial;
    this.current = initial;
    this.active = initial;
    this.heights = new Array(n).fill(0);

    this.pos.addListener(({ value }) => {
      this.current = value;
      const idx = ((Math.round(value) % n) + n) % n;
      if (idx !== this.active) {
        this.active = idx;
        this.subs.forEach((fn) => fn(idx));
      }
    });

    this.responder = PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) =>
        this.n > 1 && Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        this.touched = true;
        this.pos.stopAnimation();
        this.base = this.current;
      },
      onPanResponderMove: (_, g) => this.pos.setValue(this.base - g.dx / this.step),
      onPanResponderRelease: (_, g) => this.settle(g.dx, g.vx),
      onPanResponderTerminate: (_, g) => this.settle(g.dx, g.vx),
    });
  }

  setStep(step: number) {
    this.step = Math.max(1, step);
  }

  subscribe(fn: (i: number) => void) {
    this.subs.add(fn);
    return () => {
      this.subs.delete(fn);
    };
  }

  /** Collects each slide's natural height; returns the tallest once all are known (only once). */
  report(i: number, h: number) {
    if (this.locked) return 0;
    this.heights[i] = h;
    if (this.heights.some((x) => !x)) return 0;
    this.locked = true;
    return Math.max(...this.heights);
  }

  /** Position of slide i relative to the centre: 0 = centre, ±1 = neighbours. */
  rel(i: number) {
    let hit = this.cache.get(i);
    if (!hit) {
      const offset = new Animated.Value(i + this.n / 2 + this.n * 1000);
      const raw = Animated.subtract(
        Animated.modulo(Animated.subtract(offset, this.pos), this.n),
        this.half,
      );
      hit = { raw, intro: Animated.multiply(raw, this.intro) };
      this.cache.set(i, hit);
    }
    return hit;
  }

  private settle(dx: number, vx: number) {
    const from = Math.round(this.base);
    const projected = this.base - (dx + vx * 140) / this.step;
    const target = Math.max(from - 1, Math.min(from + 1, Math.round(projected)));
    Animated.spring(this.pos, {
      toValue: target,
      friction: 9,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }

  private nudge() {
    if (this.touched) return;
    const c = Math.round(this.current);
    Animated.sequence([
      Animated.timing(this.pos, { toValue: c + 0.2, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(this.pos, { toValue: c - 0.2, duration: 520, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.spring(this.pos, { toValue: c, friction: 6, tension: 90, useNativeDriver: true }),
    ]).start();
  }

  /** Deal the cards out, then wiggle both ways as a hint until the user touches. */
  start() {
    this.touched = false;
    this.intro.setValue(0);
    Animated.spring(this.intro, { toValue: 1, friction: 7, tension: 45, useNativeDriver: true }).start();
    if (this.n < 2) return () => {};
    const first = setTimeout(() => this.nudge(), 1500);
    const loop = setInterval(() => this.nudge(), 7000);
    return () => {
      clearTimeout(first);
      clearInterval(loop);
      this.intro.stopAnimation();
      this.pos.stopAnimation();
    };
  }
}

type Props = { slides: ReactNode[]; initialIndex?: number };

export function HomeHeroCarousel({ slides, initialIndex = 0 }: Props) {
  const n = slides.length;
  const [ctl] = useState(() => new DeckController(n, Math.min(initialIndex, n - 1)));
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [active, setActive] = useState(Math.min(initialIndex, n - 1));

  const cardW = Math.max(0, width - SIDE * 2);
  const stepX = cardW * CARD_OVERLAP;
  const ready = width > 0 && height > 0;

  useEffect(() => ctl.subscribe(setActive), [ctl]);
  useEffect(() => {
    ctl.setStep(stepX);
  }, [ctl, stepX]);
  useEffect(() => {
    if (!ready) return;
    return ctl.start();
  }, [ctl, ready]);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ opacity: ready ? 1 : 0 }}>
      {width > 0 && (
        <>
          <View style={{ height: height || undefined }} {...ctl.responder.panHandlers}>
            {slides.map((slide, i) => {
              const r = ctl.rel(i).intro;
              const translateX = r.interpolate({
                inputRange: [-1.5, 1.5],
                outputRange: [-1.5 * stepX, 1.5 * stepX],
              });
              const translateY = r.interpolate({
                inputRange: [-1.5, -1, 0, 1, 1.5],
                outputRange: [12, 7, 0, 7, 12],
                extrapolate: "clamp",
              });
              const rotate = r.interpolate({
                inputRange: [-1.5, -1, 0, 1, 1.5],
                outputRange: ["-10deg", "-6deg", "0deg", "6deg", "10deg"],
                extrapolate: "clamp",
              });
              const scale = r.interpolate({
                inputRange: [-1.5, -1, 0, 1, 1.5],
                outputRange: [0.8, 0.9, 1, 0.9, 0.8],
                extrapolate: "clamp",
              });
              const opacity = r.interpolate({
                inputRange: [-1.5, -1.15, -1, 0, 1, 1.15, 1.5],
                outputRange: [0, 0, 0.7, 1, 0.7, 0, 0],
                extrapolate: "clamp",
              });
              return (
                <Animated.View
                  key={i}
                  pointerEvents={i === active ? "auto" : "none"}
                  onLayout={(e) => {
                    const h = ctl.report(i, e.nativeEvent.layout.height);
                    if (h) setHeight(h);
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: SIDE,
                    width: cardW,
                    height: height || undefined,
                    zIndex: i === active ? 3 : 1,
                    opacity,
                    transform: [{ translateX }, { translateY }, { rotate }, { scale }],
                  }}
                >
                  {slide}
                </Animated.View>
              );
            })}
          </View>

          {/* {n > 1 && (
            <View className="mt-3 flex-row items-center justify-center gap-1.5">
              {slides.map((_, i) => {
                const r = ctl.rel(i).raw;
                const scaleX = r.interpolate({
                  inputRange: [-1.5, -1, 0, 1, 1.5],
                  outputRange: [1, 1, 3.5, 1, 1],
                  extrapolate: "clamp",
                });
                const opacity = r.interpolate({
                  inputRange: [-1.5, -1, 0, 1, 1.5],
                  outputRange: [0.3, 0.3, 1, 0.3, 0.3],
                  extrapolate: "clamp",
                });
                return (
                  <Animated.View
                    key={i}
                    accessibilityElementsHidden
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: "#FFFFFF",
                      opacity,
                      transform: [{ scaleX }],
                    }}
                  />
                );
              })}
            </View>
          )} */}
        </>
      )}
    </View>
  );
}