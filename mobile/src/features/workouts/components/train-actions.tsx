import React, { useEffect, useRef, useState } from "react";
import { Modal, PanResponder, Pressable, ScrollView, TextInput, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

type Action = { label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; danger?: boolean; run: () => void };
export function TrainActions({ title, actions, onClose }: { title: string; actions: Action[]; onClose: () => void }) {
  return <Modal transparent animationType="slide" onRequestClose={onClose}><View className="flex-1 justify-end bg-black/70"><Pressable className="flex-1" accessibilityLabel="Close options" onPress={onClose} /><SafeAreaView edges={["bottom"]} className="rounded-t-[28px] bg-panel px-6 pt-6"><Txt weight="bold" className="mb-4 text-xl" numberOfLines={2}>{title}</Txt>{actions.map(action => <Pressable key={action.label} accessibilityRole="button" onPress={() => { onClose(); action.run(); }} className="flex-row items-center gap-4 border-b border-border py-5"><MaterialCommunityIcons name={action.icon} size={24} color={action.danger ? "#FF8C83" : C.ink} /><Txt className={action.danger ? "text-red-300" : "text-ink"}>{action.label}</Txt></Pressable>)}<Pressable onPress={onClose} className="items-center py-5"><Txt className="text-muted">Cancel</Txt></Pressable></SafeAreaView></View></Modal>;
}
export function RenameRoutine({ name, onSave, onClose }: { name: string; onSave: (name: string) => Promise<void>; onClose: () => void }) {
  const [value, setValue] = useState(name); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <Modal transparent animationType="fade" onRequestClose={() => { if (!busy) onClose(); }}><View className="flex-1 justify-center bg-black/70 px-6"><View className="rounded-[28px] bg-panel p-6"><Txt weight="bold" className="mb-4 text-xl">Rename routine</Txt><TextInput autoFocus accessibilityLabel="Routine name" value={value} onChangeText={setValue} maxLength={120} editable={!busy} className="rounded-xl bg-elevated p-4 text-ink" returnKeyType="done" />{!!error && <Txt accessibilityRole="alert" className="mt-3 text-red-300">{error}</Txt>}<View className="mt-5 flex-row justify-end gap-6"><Pressable disabled={busy} onPress={onClose}><Txt>Cancel</Txt></Pressable><Pressable disabled={busy || !value.trim()} onPress={async () => { setBusy(true); try { await onSave(value.trim()); onClose(); } catch (e) { setError(e instanceof Error ? e.message : "Could not rename routine."); } finally { setBusy(false); } }}><Txt weight="bold" className="text-brand">{busy ? "Saving…" : "Save name"}</Txt></Pressable></View></View></View></Modal>;
}
export type OrderItem = { id: string; name: string };
const HEIGHT = 76;
export function ReorderTraining({ title, items, onClose, onSave }: { title: string; items: OrderItem[]; onClose: () => void; onSave: (ids: string[]) => Promise<void> }) {
  const [order, setOrder] = useState(items); const [drag, setDrag] = useState<{ id: string; origin: number; dy: number } | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const scroll = useRef<ScrollView>(null); const viewport = useRef<View>(null); const offset = useRef(0); const bounds = useRef({ top: 0, height: 0 });
  const live = useRef<{ id: string; origin: number; startScroll: number; dy: number; y: number } | null>(null);
  const move = (delta: number, y: number) => {
    const current = live.current; if (!current) return;
    current.dy = delta; current.y = y;
    const dy = delta + offset.current - current.startScroll;
    const destination = Math.max(0, Math.min(items.length - 1, current.origin + Math.round(dy / HEIGHT)));
    setOrder(rows => { const next = [...rows]; const index = next.findIndex(row => row.id === current.id); const [item] = next.splice(index, 1); next.splice(destination, 0, item); return next; });
    setDrag({ id: current.id, origin: current.origin, dy });
  };
  useEffect(() => {
    const timer = setInterval(() => {
      const current = live.current; if (!current) return;
      const { top, height } = bounds.current;
      const speed = current.y < top + 64 ? -8 : current.y > top + height - 64 ? 8 : 0;
      const next = Math.max(0, Math.min(items.length * HEIGHT - height, offset.current + speed));
      if (speed && next !== offset.current) { offset.current = next; scroll.current?.scrollTo({ y: next, animated: false }); move(current.dy, current.y); }
    }, 30);
    return () => clearInterval(timer);
    // move only depends on the fixed number of items in this reorder session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);
  const finish = () => { live.current = null; setDrag(null); };
  const close = () => { if (!busy) onClose(); };
  return <Modal animationType="slide" onRequestClose={close}><SafeAreaView className="flex-1 bg-bg"><View className="flex-row items-center justify-between p-5"><Pressable disabled={busy} onPress={close}><Txt>Cancel</Txt></Pressable><Txt weight="bold" className="text-lg">Reorder {title}</Txt><Pressable disabled={busy || !!drag} onPress={async () => { setBusy(true); try { await onSave(order.map(row => row.id)); onClose(); } catch (e) { setError(e instanceof Error ? e.message : "Could not save order."); } finally { setBusy(false); } }}><Txt weight="bold" className="text-brand">{busy ? "Saving…" : "Save"}</Txt></Pressable></View><Txt className="px-5 pb-5 text-muted">Drag a handle up or down. Your order is saved on this device.</Txt>{!!error && <Txt className="px-5 text-red-300" accessibilityRole="alert">{error}</Txt>}<View ref={viewport} className="flex-1" onLayout={() => viewport.current?.measureInWindow((_x, y, _width, height) => { bounds.current = { top: y, height }; })}><ScrollView ref={scroll} scrollEnabled={!drag && !busy} onScroll={e => { offset.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} contentContainerStyle={{ paddingHorizontal: 20 }}><View style={{ height: order.length * HEIGHT }}>{order.map((item, index) => <DragRow key={item.id} item={item} index={index} disabled={busy} active={drag?.id === item.id} translate={drag?.id === item.id ? drag.dy + (drag.origin - index) * HEIGHT : 0} onStart={y => { live.current = { id: item.id, origin: index, startScroll: offset.current, dy: 0, y }; setDrag({ id: item.id, origin: index, dy: 0 }); }} onMove={move} onEnd={finish} onAdjust={direction => setOrder(rows => { const next = [...rows]; const target = Math.max(0, Math.min(rows.length - 1, index + direction)); next.splice(index, 1); next.splice(target, 0, item); return next; })} />)}</View></ScrollView></View></SafeAreaView></Modal>;
}
function DragRow({ item, index, active, translate, disabled, onStart, onMove, onEnd, onAdjust }: { item: OrderItem; index: number; active: boolean; translate: number; disabled: boolean; onStart: (y: number) => void; onMove: (dy: number, y: number) => void; onEnd: () => void; onAdjust: (direction: number) => void }) {
  const responder = PanResponder.create({ onStartShouldSetPanResponder: () => !disabled, onMoveShouldSetPanResponder: () => !disabled, onPanResponderGrant: e => onStart(e.nativeEvent.pageY), onPanResponderMove: (_e, gesture) => onMove(gesture.dy, gesture.moveY), onPanResponderRelease: onEnd, onPanResponderTerminate: onEnd, onPanResponderTerminationRequest: () => false });
  return <Animated.View layout={active ? undefined : LinearTransition.duration(140)} style={{ position: "absolute", left: 0, right: 0, top: index * HEIGHT, height: HEIGHT - 8, transform: [{ translateY: translate }], zIndex: active ? 10 : 0, elevation: active ? 8 : 0, borderColor: active ? C.brand : C.border }} className="flex-row items-center rounded-2xl border bg-panel pl-4"><Txt className="mr-3 text-muted">{index + 1}</Txt><Txt className="flex-1" weight="semibold" numberOfLines={1}>{item.name}</Txt><View {...responder.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel={`Reorder ${item.name}`} accessibilityHint="Drag to move, or use the move up and move down actions" accessibilityActions={[{ name: "increment", label: "Move down" }, { name: "decrement", label: "Move up" }]} onAccessibilityAction={e => { if (!disabled) onAdjust(e.nativeEvent.actionName === "increment" ? 1 : -1); }} className="h-full w-16 items-center justify-center"><MaterialCommunityIcons name="drag-horizontal" size={28} color={active ? C.brand : C.muted} /></View></Animated.View>;
}
