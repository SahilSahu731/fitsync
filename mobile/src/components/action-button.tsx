import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface ActionButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  destructive?: boolean;
}

export function ActionButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  destructive = false,
}: ActionButtonProps) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={styles.touchTarget}
    >
      {({ pressed }) => (
        <View
          pointerEvents="none"
          style={[
            styles.surface,
            destructive ? styles.danger : styles.primary,
            inactive && styles.disabled,
            pressed && !inactive && styles.pressed,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.label}>{title}</Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    width: "100%",
    alignSelf: "stretch",
    flexShrink: 0,
    minHeight: 60,
  },
  surface: {
    width: "100%",
    minHeight: 60,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: "#0EA5E9",
    borderColor: "#38BDF8",
  },
  danger: {
    backgroundColor: "#B91C1C",
    borderColor: "#EF4444",
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  label: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    textAlign: "center",
  },
});
