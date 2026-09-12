import { Ionicons } from "@expo/vector-icons";

import { Modal, Pressable, Text, View } from "react-native";

interface Props {
  visible: boolean;

  canMoveUp: boolean;

  canMoveDown: boolean;

  inSuperset: boolean;

  canSupersetNext: boolean;

  onMoveUp: () => void;

  onMoveDown: () => void;

  onSupersetNext: () => void;

  onRemoveSuperset: () => void;

  onRemoveExercise: () => void;

  onClose: () => void;
}

export function ExerciseOptionsModal({
  visible,
  canMoveUp,
  canMoveDown,
  inSuperset,
  canSupersetNext,
  onMoveUp,
  onMoveDown,
  onSupersetNext,
  onRemoveSuperset,
  onRemoveExercise,
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
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/60">
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="rounded-t-[30px] border-t border-white/10 bg-[#111111] px-5 pb-9 pt-5"
        >
          <View className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/15" />

          <Text className="text-[19px] font-extrabold text-white">
            Exercise options
          </Text>

          <View className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07]">
            <Option
              icon="arrow-up"
              title="Move up"
              disabled={!canMoveUp}
              onPress={() => {
                run(onMoveUp);
              }}
            />

            <Divider />

            <Option
              icon="arrow-down"
              title="Move down"
              disabled={!canMoveDown}
              onPress={() => {
                run(onMoveDown);
              }}
            />

            <Divider />

            {inSuperset ? (
              <Option
                icon="unlink-outline"
                title="Remove from superset"
                onPress={() => {
                  run(onRemoveSuperset);
                }}
              />
            ) : (
              <Option
                icon="link-outline"
                title="Superset with next exercise"
                disabled={!canSupersetNext}
                onPress={() => {
                  run(onSupersetNext);
                }}
              />
            )}

            <Divider />

            <Option
              icon="trash-outline"
              title="Remove exercise"
              danger
              onPress={() => {
                run(onRemoveExercise);
              }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Divider() {
  return <View className="ml-14 h-px bg-white/[0.06]" />;
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
      className="min-h-[55px] flex-row items-center px-4"
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
