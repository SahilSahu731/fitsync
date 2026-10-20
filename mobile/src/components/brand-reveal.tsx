
import React, { useEffect, useRef } from "react";
import { Animated, Image } from "react-native";
import { Txt } from "@/src/components/ui";

export function BrandReveal({
  onDone
}: {
  onDone: () => void;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.74)).current;
  const rise = useRef(new Animated.Value(25)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          bounciness: 11,
          useNativeDriver: true
        }),
        Animated.timing(rise, {
          toValue: 0,
          duration: 550,
          useNativeDriver: true
        })
      ]),
      Animated.delay(240),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true
      })
    ]).start(({ finished }) => {
      if (finished) onDone();
    });
  }, [scale, rise, opacity, onDone]);

  return (
    <Animated.View
      pointerEvents="none"
      className="absolute inset-0 z-50 items-center justify-center bg-bg"
      style={{ opacity }}
    >
      <Animated.View
        className="items-center"
        style={{
          transform: [
            { scale },
            { translateY: rise }
          ]
        }}
      >
        <Image
          source={require("../../assets/images/splash-icon.png")}
          style={{ width: 180, height: 180 }}
          resizeMode="contain"
        />

        <Txt weight="extra" className="mt-2 text-4xl tracking-tight">
          FIT
          <Txt weight="extra" className="text-4xl text-brand">
            SYNC
          </Txt>
        </Txt>

        <Txt
          weight="medium"
          className="mt-2 text-xs uppercase tracking-[3px] text-muted"
        >
          Built for the next rep.
        </Txt>
      </Animated.View>
    </Animated.View>
  );
}
