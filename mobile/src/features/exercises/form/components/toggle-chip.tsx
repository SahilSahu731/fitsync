import { Pressable, Text } from "react-native";

interface Props {
  label: string;

  selected: boolean;

  onPress: () => void;
}

export function ToggleChip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-xl border px-3 py-2"
      style={{
        borderColor: selected
          ? "rgba(59,130,246,.65)"
          : "rgba(255,255,255,.10)",

        backgroundColor: selected
          ? "rgba(37,99,235,.14)"
          : "rgba(255,255,255,.035)",
      }}
    >
      <Text
        className="text-[12px] font-semibold"
        style={{
          color: selected ? "#60A5FA" : "rgba(255,255,255,.6)",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
