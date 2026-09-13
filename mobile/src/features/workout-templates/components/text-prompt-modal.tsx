import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";

export function TextPromptModal({
  visible,
  title,
  initialValue = "",
  onSubmit,
  onClose,
}: {
  visible: boolean;
  title: string;
  initialValue?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const cleaned = value.trim();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/70 px-6">
        <View className="w-full max-w-[420px] rounded-[24px] bg-[#111214] p-5">
          <Text className="text-[18px] font-extrabold text-white">{title}</Text>
          <TextInput
            autoFocus
            value={value}
            onChangeText={setValue}
            placeholder="Name"
            placeholderTextColor="rgba(255,255,255,.2)"
            className="mt-5 min-h-[48px] rounded-xl bg-white/[0.05] px-4 text-white"
          />
          <View className="mt-5 flex-row gap-2">
            <Pressable
              onPress={onClose}
              className="min-h-[45px] flex-1 items-center justify-center rounded-xl bg-white/[0.05]"
            >
              <Text className="font-bold text-white/50">Cancel</Text>
            </Pressable>
            <Pressable
              disabled={!cleaned}
              onPress={() => cleaned && onSubmit(cleaned)}
              className="min-h-[45px] flex-1 items-center justify-center rounded-xl bg-brand"
              style={{ opacity: cleaned ? 1 : 0.4 }}
            >
              <Text className="font-extrabold text-white">Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
