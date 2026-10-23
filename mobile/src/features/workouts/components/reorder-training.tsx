import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Modal, PanResponder, Pressable, ScrollView, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { dragPosition, edgeScroll, moveItem } from "../reorder";
import { ExerciseImage } from "./exercise-image";

export type OrderItem = { id: string; name: string; imageUrl?: string | null };
const HEIGHT = 80;
type Drag = { id: string; origin: number; startScroll: number; dy: number; y: number };

export function ReorderTraining({ title, items, onClose, onSave, hint = "Your order is saved on this device." }: {
  title: string; items: OrderItem[]; onClose: () => void; onSave: (ids: string[]) => Promise<void>; hint?: string;
}) {
  // Keep the render/key order fixed for the entire gesture. Only positions move.
  const [initial] = useState(items);
  const [order, setOrder] = useState(items);
  const currentOrder = useRef(items);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useSharedValue<string | null>(null);
  const dragY = useSharedValue(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const viewport = useRef<View>(null);
  const offset = useRef(0);
  const bounds = useRef({ top: 0, height: 0 });
  const live = useRef<Drag | null>(null);
  const measure = () => viewport.current?.measureInWindow((_x, top, _width, height) => { bounds.current = { top, height }; });

  const applyMove = useCallback((dy: number, y: number) => {
    const drag = live.current;
    if (!drag) return;
    drag.dy = dy; drag.y = y;
    const position = dragPosition(drag.origin, dy, offset.current - drag.startScroll, initial.length, HEIGHT);
    dragY.set(position);
    const next = moveItem(currentOrder.current, drag.id, Math.round(position / HEIGHT));
    if (next !== currentOrder.current) { currentOrder.current = next; setOrder(next); }
  }, [dragY, initial.length]);

  useEffect(() => {
    if (!activeId) return;
    let frame = 0; let previous = 0;
    const tick = (time: number) => {
      const drag = live.current;
      if (!drag) return;
      const elapsed = previous ? Math.min(32, time - previous) / 1000 : 0;
      previous = time;
      const { top, height } = bounds.current;
      const speed = edgeScroll(drag.y, top, height);
      const max = Math.max(0, initial.length * HEIGHT - height);
      const next = Math.max(0, Math.min(max, offset.current + speed * elapsed));
      if (next !== offset.current) {
        offset.current = next;
        scroll.current?.scrollTo({ y: next, animated: false });
        applyMove(drag.dy, drag.y);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activeId, applyMove, initial.length]);

  const finish = () => { live.current = null; active.set(null); setActiveId(null); };
  const close = () => { if (!saving.current) { finish(); onClose(); } };
  return <Modal animationType="slide" onRequestClose={close} onShow={measure}>
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable disabled={busy} onPress={close} className="p-3"><Txt>Cancel</Txt></Pressable>
        <Txt weight="bold" className="flex-1 text-center text-lg" numberOfLines={1}>Reorder {title}</Txt>
        <Pressable disabled={busy || !!activeId} className="p-3" onPress={async () => {
          if (saving.current || live.current) return;
          saving.current = true; setBusy(true); setError("");
          try { await onSave(currentOrder.current.map(row => row.id)); onClose(); }
          catch (e) { setError(e instanceof Error ? e.message : "Could not save order."); }
          finally { saving.current = false; setBusy(false); }
        }}><Txt weight="bold" className="text-brand">{busy ? "Saving…" : "Save"}</Txt></Pressable>
      </View>
      <Txt className="px-6 pb-4 text-sm text-muted">Drag a handle to move an item. Hold near an edge to scroll. {hint}</Txt>
      {!!error && <Txt className="px-6 pb-4 text-red-300" accessibilityRole="alert">{error}</Txt>}
      <View ref={viewport} collapsable={false} className="flex-1" onLayout={measure}>
        <ScrollView ref={scroll} scrollEnabled={!activeId && !busy} removeClippedSubviews={false} onScroll={event => {
          if (!live.current) offset.current = Math.max(0, event.nativeEvent.contentOffset.y);
        }} scrollEventThrottle={16} contentContainerStyle={{ paddingHorizontal: 20 }}>
          <View style={{ height: initial.length * HEIGHT }}>
            {initial.map(item => {
              const index = order.findIndex(row => row.id === item.id);
              return <DragRow key={item.id} item={item} index={index} count={order.length} disabled={busy} active={active} dragY={dragY}
                onStart={y => {
                  if (saving.current || live.current) return;
                  measure();
                  const origin = currentOrder.current.findIndex(row => row.id === item.id);
                  live.current = { id: item.id, origin, startScroll: offset.current, dy: 0, y };
                  dragY.set(origin * HEIGHT); active.set(item.id); setActiveId(item.id);
                }} onMove={applyMove} onEnd={finish}
                onAdjust={direction => {
                  if (live.current || saving.current) return;
                  const from = currentOrder.current.findIndex(row => row.id === item.id);
                  const next = moveItem(currentOrder.current, item.id, from + direction);
                  currentOrder.current = next; setOrder(next);
                }} />;
            })}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  </Modal>;
}

type DragRowProps = {
  item: OrderItem; index: number; count: number; disabled: boolean;
  active: SharedValue<string | null>; dragY: SharedValue<number>;
  onStart: (y: number) => void; onMove: (dy: number, y: number) => void;
  onEnd: () => void; onAdjust: (direction: number) => void;
};
function DragRow(props: DragRowProps) {
  const { item, index, count, disabled, active, dragY, onAdjust } = props;
  const live = useRef(props);
  useLayoutEffect(() => { live.current = props; }, [props]);
  // Only event callbacks read the ref; responder identity survives reordering.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !live.current.disabled,
    onMoveShouldSetPanResponder: () => !live.current.disabled,
    onPanResponderGrant: e => live.current.onStart(e.nativeEvent.pageY),
    onPanResponderMove: (_e, gesture) => live.current.onMove(gesture.dy, gesture.moveY),
    onPanResponderRelease: () => live.current.onEnd(),
    onPanResponderTerminate: () => live.current.onEnd(),
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }));
  const style = useAnimatedStyle(() => {
    const dragging = active.get() === item.id;
    return {
      transform: [{ translateY: dragging ? dragY.get() : withTiming(index * HEIGHT, { duration: 150 }) }, { scale: withTiming(dragging ? 1.02 : 1, { duration: 120 }) }],
      zIndex: dragging ? 10 : 0, elevation: dragging ? 8 : 0,
      borderColor: dragging ? C.brand : C.border,
    };
  });
  return <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, height: HEIGHT - 8 }, style]} className="flex-row items-center rounded-2xl border bg-panel pl-3">
    <Txt className="mr-3 text-sm text-muted">{index + 1}</Txt>
    {!!item.imageUrl && <ExerciseImage uri={item.imageUrl} name={item.name} size={42} />}
    <Txt className="ml-2 flex-1" weight="semibold" numberOfLines={2}>{item.name}</Txt>
    <View {...responder.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel={`Reorder ${item.name}`} accessibilityValue={{ min: 1, max: count, now: index + 1 }} accessibilityHint="Drag up or down to move" accessibilityActions={[{ name: "increment", label: "Move down" }, { name: "decrement", label: "Move up" }]} onAccessibilityAction={e => { if (!disabled) onAdjust(e.nativeEvent.actionName === "increment" ? 1 : -1); }} className="h-full w-16 items-center justify-center"><MaterialCommunityIcons name="drag-horizontal" size={28} color={C.muted} /></View>
  </Animated.View>;
}
