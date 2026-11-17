import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  View,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

/** Only avoid the keyboard space that the native modal has not already resized. */
export function keyboardOverlap(
  viewportY: number,
  viewportHeight: number,
  keyboard: { screenY: number; height: number } | undefined,
) {
  if (!keyboard || keyboard.height <= 0 || !Number.isFinite(keyboard.screenY)) return 0;
  return Math.min(viewportHeight, Math.max(0, viewportY + viewportHeight - keyboard.screenY));
}

/** Keep the complete input inside the scroll viewport, which excludes pinned actions. */
export function focusedScrollOffset(
  scrollY: number,
  viewportY: number,
  viewportHeight: number,
  inputY: number,
  inputHeight: number,
  gap = 16,
) {
  // On a short display, preserve room for the full value before adding air.
  const visibleGap = Math.min(gap, Math.max(0, (viewportHeight - inputHeight) / 2));
  const top = viewportY + visibleGap;
  const bottom = viewportY + viewportHeight - visibleGap;
  if (inputHeight > bottom - top || inputY < top) {
    return Math.max(0, scrollY + inputY - top);
  }
  return Math.max(0, scrollY + Math.max(0, inputY + inputHeight - bottom));
}

/** Shared by check-ins, targets and every calculator rendered inside a Sheet. */
export function useKeyboardForm() {
  const viewportRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const keyboard = useRef(Keyboard.metrics());
  const frame = useRef<number | null>(null);
  const mounted = useRef(true);
  const hasFocusedInput = useRef(false);
  const [bottomInset, setBottomInset] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(Boolean(Keyboard.metrics()));

  const revealInput = useCallback(() => {
    if (!hasFocusedInput.current) return;
    const input = TextInput.State.currentlyFocusedInput();
    const scroll = scrollRef.current;
    const nativeScroll = scroll?.getNativeScrollRef();
    if (!input || !scroll || !nativeScroll) return;
    nativeScroll.measureInWindow((_x, viewportY, _width, viewportHeight) => {
      if (!mounted.current || viewportHeight <= 0) return;
      input.measureInWindow((_inputX, inputY, _inputWidth, inputHeight) => {
        // A user can switch fields while native measurements are in flight.
        if (!mounted.current || TextInput.State.currentlyFocusedInput() !== input) return;
        const nextY = focusedScrollOffset(
          scrollY.current,
          viewportY,
          viewportHeight,
          inputY,
          inputHeight,
        );
        if (Math.abs(nextY - scrollY.current) < 1) return;
        scrollY.current = nextY;
        scroll.scrollTo({ y: nextY, animated: false });
      });
    });
  }, []);

  const scheduleReveal = useCallback(() => {
    if (frame.current != null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      revealInput();
    });
  }, [revealInput]);

  const measureViewport = useCallback(() => {
    viewportRef.current?.measureInWindow((_x, y, _width, height) => {
      if (!mounted.current || height <= 0) return;
      setBottomInset(keyboardOverlap(y, height, keyboard.current));
      scheduleReveal();
    });
  }, [scheduleReveal]);

  useEffect(() => {
    mounted.current = true;
    const update = (event: KeyboardEvent) => {
      keyboard.current = event.endCoordinates;
      setKeyboardOpen(event.endCoordinates.height > 0);
      measureViewport();
    };
    const hide = () => {
      keyboard.current = undefined;
      setKeyboardOpen(false);
      setBottomInset(0);
    };
    const subscriptions = [
      Keyboard.addListener("keyboardDidShow", update),
      Keyboard.addListener("keyboardDidHide", hide),
      ...(Platform.OS === "ios" ? [Keyboard.addListener("keyboardWillChangeFrame", update)] : []),
    ];
    return () => {
      mounted.current = false;
      subscriptions.forEach((subscription) => subscription.remove());
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, [measureViewport]);

  const onFocus = useCallback(() => {
    hasFocusedInput.current = true;
    keyboard.current = Keyboard.metrics() ?? keyboard.current;
    measureViewport();
    scheduleReveal();
  }, [measureViewport, scheduleReveal]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
  }, []);

  return {
    viewportRef,
    scrollRef,
    bottomInset,
    keyboardOpen,
    onViewportLayout: measureViewport,
    onFocus,
    onScroll,
    revealInput: scheduleReveal,
  };
}
