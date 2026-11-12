import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { Platform, ScrollView, type ScrollViewProps } from "react-native";
import { useFocusEffect } from "expo-router";
import Animated, {
  ReduceMotion,
  useAnimatedScrollHandler,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { useReducedAppMotion } from "./motion";
import { nextTabScroll } from "./tab-bar-model";

export const TAB_SPRING = {
  damping: 28,
  stiffness: 340,
  mass: 0.8,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
};

type Motion = {
  compact: SharedValue<number>;
  target: SharedValue<number>;
  reduced: boolean;
  expand: () => void;
};
const Context = createContext<Motion | null>(null);

export function TabBarMotionProvider({ children }: { children: React.ReactNode }) {
  const compact = useSharedValue(0);
  const target = useSharedValue(0);
  const reduced = useReducedAppMotion();
  const expand = useCallback(() => {
    target.set(0);
    compact.set(reduced ? 0 : withSpring(0, TAB_SPRING));
  }, [compact, target, reduced]);
  useEffect(() => {
    if (reduced) compact.set(target.get());
  }, [compact, target, reduced]);
  const value = useMemo(
    () => ({ compact, target, reduced, expand }),
    [compact, target, reduced, expand],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useTabBarMotion() {
  const value = useContext(Context);
  if (!value) throw new Error("Tab navigation needs TabBarMotionProvider");
  return value;
}

type Props = Omit<ScrollViewProps, "onScroll" | "horizontal"> & {
  contentContainerClassName?: string;
};

/** Attach only to the primary vertical list; nested horizontal carousels stay independent. */
export const TabScrollView = forwardRef<ScrollView, Props>(function TabScrollView(props, ref) {
  const motion = useContext(Context);
  const compact = motion?.compact;
  const target = motion?.target;
  const reduced = motion?.reduced ?? true;
  const expand = motion?.expand;
  const offset = useSharedValue(0);
  const distance = useSharedValue(0);
  const active = useSharedValue(false);
  const dragging = useSharedValue(false);
  const momentum = useSharedValue(false);
  useFocusEffect(
    useCallback(() => {
      active.set(true);
      distance.set(0);
      dragging.set(false);
      momentum.set(false);
      expand?.();
      return () => {
        active.set(false);
      };
    }, [active, distance, dragging, momentum, expand]),
  );

  const handler = useAnimatedScrollHandler({
    onBeginDrag: (event) => {
      if (!active.get()) return;
      dragging.set(true);
      momentum.set(false);
      offset.set(
        Math.max(
          0,
          Math.min(
            event.contentOffset.y,
            Math.max(0, event.contentSize.height - event.layoutMeasurement.height),
          ),
        ),
      );
      distance.set(0);
    },
    onScroll: (event) => {
      if (!active.get() || !compact || !target) return;
      // Native scroll restoration after a tab switch must not compact the newly focused tab.
      if (Platform.OS !== "web" && !dragging.get() && !momentum.get()) {
        offset.set(
          Math.max(
            0,
            Math.min(
              event.contentOffset.y,
              Math.max(0, event.contentSize.height - event.layoutMeasurement.height),
            ),
          ),
        );
        return;
      }
      const next = nextTabScroll(
        { offset: offset.get(), distance: distance.get(), compact: target.get() === 1 },
        event.contentOffset.y,
        event.contentSize.height - event.layoutMeasurement.height,
      );
      offset.set(next.offset);
      distance.set(next.distance);
      const destination = next.compact ? 1 : 0;
      if (destination !== target.get()) {
        target.set(destination);
        compact.set(reduced ? destination : withSpring(destination, TAB_SPRING));
      }
    },
    onEndDrag: () => {
      if (!active.get()) return;
      dragging.set(false);
    },
    onMomentumBegin: () => {
      if (!active.get()) return;
      momentum.set(true);
    },
    onMomentumEnd: () => {
      if (!active.get()) return;
      momentum.set(false);
    },
  });
  return <Animated.ScrollView {...props} ref={ref} onScroll={handler} scrollEventThrottle={16} />;
});
