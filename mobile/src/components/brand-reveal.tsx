import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  useAnimatedValue,
} from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { Txt } from "@/src/components/ui";
import { useExperience } from "@/src/features/experience/experience-context";
import { C } from "@/src/constants/theme";

/* ---------- layout (tweak here) ---------- */
// START must equal `imageWidth` in app.json (expo-splash-screen plugin) so the
// native splash -> this overlay hand-off has no size jump.
const START = 240; // big centered logo
const END = 56; // logo size inside the final lockup
const GAP = 12; // logo <-> wordmark
const TEXT_SIZE = 42;
const TEXT_NUDGE_Y = 2; // optical vertical alignment of caps with the logo
const GLOW = 340;

/* ---------- motion (tweak here) ---------- */
const K = END / START;
const MOVE = Easing.bezier(0.65, 0, 0.15, 1); // soft start AND long soft landing
const SETTLE = Easing.bezier(0.16, 1, 0.3, 1); // expo-out for the letters
const MOVE_MS = 260;
const STAGGER_MS = 12;

const WORD = ["F", "I", "T", "S", "Y", "N", "C"];

export function BrandReveal({
  onReady,
  onDone,
}: {
  onReady: () => Promise<void>;
  onDone: () => void;
}) {
  // Not useReducedAppMotion(): it starts `true` until an async check resolves.
  const { preferences } = useExperience();
  const prefersReduced = preferences.reduceMotion;

  const [laidOut, setLaidOut] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [textW, setTextW] = useState(0);

  const overlay = useAnimatedValue(1);
  const exit = useAnimatedValue(0);
  const glow = useAnimatedValue(0);
  const pulse = useAnimatedValue(0); // tiny "anticipation" swell before the move
  const lockup = useAnimatedValue(0); // 0 big centered logo -> 1 final lockup
  const [letters] = useState(() => WORD.map(() => new Animated.Value(0)));

  useEffect(() => {
    if (!laidOut || !imageReady || textW === 0) return;

    let cancelled = false;
    let animation: Animated.CompositeAnimation | undefined;

    async function reveal() {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
      if (cancelled) return;

      // Native splash stays until this identical logo has painted.
      await onReady();
      if (cancelled) return;

      if (reduceMotion || prefersReduced) {
        onDone();
        return;
      }

      const t = (
        v: Animated.Value,
        to: number,
        duration: number,
        easing: (n: number) => number,
        delay = 0,
      ) => Animated.timing(v, { toValue: to, duration, easing, delay, useNativeDriver: true });

      animation = Animated.sequence([
        // 1) anticipation: glow blooms, logo swells a touch
        Animated.parallel([
          t(glow, 1, 100, Easing.out(Easing.cubic)),
          t(pulse, 1, 100, Easing.inOut(Easing.sin)),
        ]),
        // 2) one continuous gesture: logo settles left, letters follow in from the right
        Animated.parallel([
          t(lockup, 1, MOVE_MS, MOVE),
          t(pulse, 0, MOVE_MS, MOVE),
          Animated.stagger(
            STAGGER_MS,
            letters.map((v) => t(v, 1, 180, SETTLE)),
          ),
        ]),
        // 3) exit: gentle push-through and dissolve into the app
        Animated.parallel([
          t(overlay, 0, 140, Easing.inOut(Easing.quad)),
          t(exit, 1, 140, Easing.inOut(Easing.quad)),
        ]),
      ]);
      animation.start(({ finished }) => {
        if (finished && !cancelled) onDone();
      });
    }

    void reveal();
    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [
    laidOut,
    imageReady,
    textW,
    onReady,
    onDone,
    prefersReduced,
    overlay,
    exit,
    glow,
    pulse,
    lockup,
    letters,
  ]);

  const iconX = -(GAP + textW) / 2; // logo center, final
  const textX = (END + GAP) / 2; // wordmark center, final

  const logoX = lockup.interpolate({ inputRange: [0, 1], outputRange: [0, iconX] });
  const logoScale = Animated.multiply(
    lockup.interpolate({ inputRange: [0, 1], outputRange: [1, K] }),
    pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }),
  );
  const glowOpacity = Animated.multiply(
    glow,
    lockup.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
  );
  const glowScale = lockup.interpolate({ inputRange: [0, 1], outputRange: [1, K * 1.25] });
  const groupScale = exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  return (
    <Animated.View
      onLayout={() => setLaidOut(true)}
      accessibilityViewIsModal
      accessible
      accessibilityLabel="FitSync"
      style={[styles.overlay, { opacity: overlay }]}
    >
      <Animated.View style={[styles.group, { transform: [{ scale: groupScale }] }]}>
        {/* soft lime halo behind the logo */}
        <Animated.View
          pointerEvents="none"
          renderToHardwareTextureAndroid
          style={{
            position: "absolute",
            opacity: glowOpacity,
            transform: [{ translateX: logoX }, { scale: glowScale }],
          }}
        >
          <Svg width={GLOW} height={GLOW}>
            <Defs>
              <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={C.brand} stopOpacity="0.09" />
                <Stop offset="1" stopColor={C.brand} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#halo)" />
          </Svg>
        </Animated.View>

        {/* logo: big in the center -> settles on the left */}
        <Animated.View
          renderToHardwareTextureAndroid
          style={{
            position: "absolute",
            transform: [{ translateX: logoX }, { scale: logoScale }],
          }}
        >
          <Image
            source={require("../../assets/images/splash-icon.png")}
            onLoadEnd={() => setImageReady(true)}
            fadeDuration={0}
            style={{ width: START, height: START }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* wordmark: letters glide in from the right, one after another */}
        <View
          onLayout={(e) => {
            const w = Math.ceil(e.nativeEvent.layout.width);
            setTextW((prev) => prev || w);
          }}
          style={{
            position: "absolute",
            flexDirection: "row",
            marginTop: TEXT_NUDGE_Y,
            transform: [{ translateX: textX }],
          }}
        >
          {WORD.map((ch, i) => (
            <Animated.View
              key={i}
              renderToHardwareTextureAndroid
              style={{
                opacity: letters[i].interpolate({
                  inputRange: [0, 0.35, 1],
                  outputRange: [0, 1, 1],
                }),
                transform: [
                  {
                    translateX: letters[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [44, 0],
                    }),
                  },
                  {
                    translateY: letters[i].interpolate({ inputRange: [0, 1], outputRange: [6, 0] }),
                  },
                  { scale: letters[i].interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                ],
              }}
            >
              <Txt weight="semibold" style={[styles.letter, { color: i < 3 ? C.ink : C.brand }]}>
                {ch}
              </Txt>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
    backgroundColor: C.bg,
  },
  group: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  letter: {
    fontSize: TEXT_SIZE,
    lineHeight: TEXT_SIZE * 1.25,
    letterSpacing: -1.2,
    includeFontPadding: false,
  },
});
