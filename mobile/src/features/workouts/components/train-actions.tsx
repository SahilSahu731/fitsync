import React, { useState } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";
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
export { ReorderTraining } from "./reorder-training";
export type { OrderItem } from "./reorder-training";
