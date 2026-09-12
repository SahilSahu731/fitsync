import { Modal, Pressable, Text, View } from "react-native";

const VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

function description(value: number): string {
  if (value <= 6) {
    return "4+ reps left";
  }

  if (value <= 7) {
    return "3 reps left";
  }

  if (value <= 8) {
    return "2 reps left";
  }

  if (value <= 9) {
    return "1 rep left";
  }

  return "Max effort";
}

interface Props {
  visible: boolean;

  value: number | null;

  onSelect: (value: number | null) => void;

  onClose: () => void;
}

export function RpeModal({ visible, value, onSelect, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 justify-end bg-black/65" onPress={onClose}>
        <Pressable
          className="rounded-t-[30px] border-t border-white/10 bg-[#111111] px-5 pb-9 pt-5"
          onPress={(event) => {
            event.stopPropagation();
          }}
        >
          <View className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/15" />

          <Text className="text-[20px] font-extrabold text-white">RPE</Text>

          <Text className="mt-1 text-[12px] text-white/35">
            How difficult was the set?
          </Text>

          <View className="mt-5 flex-row flex-wrap gap-2">
            {VALUES.map((option) => {
              const selected = value === option;

              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    onSelect(option);

                    onClose();
                  }}
                  className="w-[31%] rounded-2xl border px-3 py-4"
                  style={{
                    borderColor: selected
                      ? "rgba(59,130,246,.5)"
                      : "rgba(255,255,255,.08)",

                    backgroundColor: selected
                      ? "rgba(37,99,235,.12)"
                      : "rgba(255,255,255,.025)",
                  }}
                >
                  <Text
                    className="text-center text-[17px] font-extrabold"
                    style={{
                      color: selected ? "#60A5FA" : "#FFFFFF",
                    }}
                  >
                    {option}
                  </Text>

                  <Text className="mt-1 text-center text-[9px] text-white/30">
                    {description(option)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => {
              onSelect(null);

              onClose();
            }}
            className="mt-4 min-h-[48px] items-center justify-center rounded-2xl bg-white/[0.04]"
          >
            <Text className="text-[13px] font-bold text-white/55">
              Clear RPE
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
