import {
  Ionicons,
  type Ionicons as IoniconsType,
} from "@expo/vector-icons";

import {
  Pressable,
  Text,
  View,
} from "react-native";


interface ChoiceCardProps {
  title: string;

  description?: string;

  icon?: React.ComponentProps<
    typeof IoniconsType
  >["name"];

  selected: boolean;

  onPress: () => void;
}


export function ChoiceCard({
  title,
  description,
  icon,
  selected,
  onPress,
}: ChoiceCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className="rounded-[22px] border px-5 py-4"
      style={({
        pressed,
      }) => ({
        borderColor:
          selected
            ? "rgba(56,189,248,0.65)"
            : "rgba(255,255,255,0.10)",

        backgroundColor:
          selected
            ? "rgba(56,189,248,0.08)"
            : pressed
              ? "rgba(255,255,255,0.07)"
              : "rgba(255,255,255,0.035)",

        transform: [
          {
            scale:
              pressed
                ? 0.99
                : 1,
          },
        ],
      })}
    >
      <View className="flex-row items-center">
        {icon ? (
          <View
            className="mr-4 h-11 w-11 items-center justify-center rounded-2xl"
            style={{
              backgroundColor:
                selected
                  ? "rgba(56,189,248,0.14)"
                  : "rgba(255,255,255,0.07)",
            }}
          >
            <Ionicons
              name={icon}
              size={21}
              color={
                selected
                  ? "#38BDF8"
                  : "#FFFFFF"
              }
            />
          </View>
        ) : null}

        <View className="flex-1">
          <Text className="text-[16px] font-bold text-white">
            {title}
          </Text>

          {description ? (
            <Text className="mt-1 text-[13px] leading-5 text-white/45">
              {description}
            </Text>
          ) : null}
        </View>

        <View
          className="h-6 w-6 items-center justify-center rounded-full border"
          style={{
            borderColor:
              selected
                ? "#38BDF8"
                : "rgba(255,255,255,0.20)",

            backgroundColor:
              selected
                ? "#38BDF8"
                : "transparent",
          }}
        >
          {selected ? (
            <Ionicons
              name="checkmark"
              size={15}
              color="#090909"
            />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}