import { Modal, Pressable, Text, View } from "react-native";

import type { WorkoutSetType } from "../types";

const OPTIONS: {
  value: WorkoutSetType;

  short: string;

  title: string;
}[] = [
  {
    value: "NORMAL",

    short: "1",

    title: "Normal Set",
  },

  {
    value: "WARMUP",

    short: "W",

    title: "Warm-up Set",
  },

  {
    value: "BACKOFF",

    short: "B",

    title: "Back-off Set",
  },

  {
    value: "DROP",

    short: "D",

    title: "Drop Set",
  },

  {
    value: "FAILURE",

    short: "F",

    title: "Failure Set",
  },

  {
    value: "AMRAP",

    short: "A",

    title: "AMRAP",
  },
];

interface Props {
  visible: boolean;

  value: WorkoutSetType;

  onSelect: (value: WorkoutSetType) => void;

  onClose: () => void;
}

export function SetTypeModal({ visible, value, onSelect, onClose }: Props) {
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
          className="rounded-t-[30px] border-t border-white/10 bg-[#111111] px-5 pb-9 pt-5"
        >
          <View className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/15" />

          <Text className="text-[20px] font-extrabold text-white">
            Set type
          </Text>

          <View className="mt-5 gap-2">
            {OPTIONS.map((option) => {
              const selected = value === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onSelect(option.value);

                    onClose();
                  }}
                  className="flex-row items-center rounded-2xl border px-4 py-4"
                  style={{
                    borderColor: selected
                      ? "rgba(59,130,246,.4)"
                      : "rgba(255,255,255,.06)",

                    backgroundColor: selected
                      ? "rgba(37,99,235,.10)"
                      : "rgba(255,255,255,.025)",
                  }}
                >
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]">
                    <Text
                      className="text-[13px] font-extrabold"
                      style={{
                        color:
                          option.value === "WARMUP"
                            ? "#F59E0B"
                            : selected
                              ? "#60A5FA"
                              : "#FFFFFF",
                      }}
                    >
                      {option.short}
                    </Text>
                  </View>

                  <Text className="ml-3 flex-1 text-[14px] font-bold text-white">
                    {option.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
