import { Ionicons } from "@expo/vector-icons";

import { Modal, Pressable, Text, View } from "react-native";

interface Props {
  visible: boolean;

  canDelete: boolean;

  onRpe: () => void;

  onDuplicate: () => void;

  onDelete: () => void;

  onClose: () => void;
}

export function SetActionsModal({
  visible,
  canDelete,
  onRpe,
  onDuplicate,
  onDelete,
  onClose,
}: Props) {
  function run(callback: () => void) {
    onClose();

    callback();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/65">
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
          }}
          className="rounded-t-[28px] border-t border-white/10 bg-[#101010] px-5 pb-8 pt-5"
        >
          <View className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/15" />

          <Text className="mb-4 text-[18px] font-extrabold text-white">
            Set options
          </Text>

          <Option
            icon="speedometer-outline"
            title="Set RPE"
            onPress={() => {
              run(onRpe);
            }}
          />

          <Option
            icon="copy-outline"
            title="Duplicate set"
            onPress={() => {
              run(onDuplicate);
            }}
          />

          <Option
            icon="trash-outline"
            title="Delete set"
            danger
            disabled={!canDelete}
            onPress={() => {
              run(onDelete);
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Option({
  icon,
  title,
  danger = false,
  disabled = false,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];

  title: string;

  danger?: boolean;

  disabled?: boolean;

  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className="min-h-[56px] flex-row items-center rounded-xl px-3"
      style={{
        opacity: disabled ? 0.3 : 1,
      }}
    >
      <Ionicons name={icon} size={19} color={danger ? "#F87171" : "#FFFFFF"} />

      <Text
        className="ml-4 text-[14px] font-semibold"
        style={{
          color: danger ? "#FCA5A5" : "#FFFFFF",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
