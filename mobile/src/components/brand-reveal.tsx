import React, { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, View, useAnimatedValue } from "react-native";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

export function BrandReveal({
  onReady,
  onDone
}: {
  onReady: () => Promise<void>;
  onDone: () => void;
}) {
  const [laidOut, setLaidOut] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const opacity = useAnimatedValue(1);
  const scale = useAnimatedValue(1);
  const pulse = useAnimatedValue(0);
  const caption = useAnimatedValue(0);

  useEffect(() => {
    if (!laidOut || !imageReady) return;

    let cancelled = false;
    let animation: Animated.CompositeAnimation | undefined;

    async function reveal() {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
      if (cancelled) return;

      // Keep the native splash until this matching image has painted.
      await onReady();
      if (cancelled) return;
      if (reduceMotion) {
        onDone();
        return;
      }

      animation = Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1.08,
              duration: 280,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true
            }),
            Animated.spring(scale, {
              toValue: 1,
              damping: 16,
              stiffness: 180,
              mass: 0.6,
              useNativeDriver: true
            })
          ]),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 850,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          }),
          Animated.timing(caption, {
            toValue: 1,
            duration: 450,
            delay: 100,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          })
        ]),
        Animated.delay(160),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true
        })
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
  }, [laidOut, imageReady, onReady, onDone, opacity, scale, pulse, caption]);

  return (
    <Animated.View
      onLayout={() => setLaidOut(true)}
      accessibilityViewIsModal
      accessible
      accessibilityLabel="FitSync. Built for the next rep."
      style={[styles.overlay, { opacity }]}
    >
      <View style={styles.mark}>
        <Animated.View
          style={[
            styles.ring,
            {
              opacity: pulse.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.4, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.5] }) }]
            }
          ]}
        />
        <Animated.View style={{ transform: [{ scale }] }}>
          <Image
            source={require("../../assets/images/splash-icon.png")}
            onLoadEnd={() => setImageReady(true)}
            fadeDuration={0}
            style={styles.image}
            resizeMode="contain"
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.caption,
            {
              opacity: caption,
              transform: [{ translateY: caption.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }]
            }
          ]}
        >
          <Txt weight="extra" style={styles.wordmark}>
            FIT<Txt weight="extra" style={styles.accent}>SYNC</Txt>
          </Txt>
          <Txt weight="medium" style={styles.tagline}>BUILT FOR THE NEXT REP.</Txt>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center"
  },
  mark: { width: 200, height: 200, alignItems: "center", justifyContent: "center" },
  image: { width: 200, height: 200 },
  ring: {
    position: "absolute",
    width: 184,
    height: 184,
    borderRadius: 92,
    borderWidth: 1,
    borderColor: C.brand
  },
  caption: { position: "absolute", top: 204, width: 300, alignItems: "center" },
  wordmark: { fontSize: 36, letterSpacing: -1.2, color: C.ink },
  accent: { color: C.brand },
  tagline: { marginTop: 10, fontSize: 10, letterSpacing: 2.4, color: C.muted }
});
