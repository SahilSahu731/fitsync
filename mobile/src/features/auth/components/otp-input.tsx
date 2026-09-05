import {
  useEffect,
  useRef,
} from "react";

import {
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

interface OtpInputProps {
  value: string;

  onChange: (
    value: string,
  ) => void;

  onComplete?: (
    value: string,
  ) => void;

  error?: boolean;

  disabled?: boolean;
}

const OTP_LENGTH = 6;

export function OtpInput({
  value,
  onChange,
  onComplete,
  error = false,
  disabled = false,
}: OtpInputProps) {
  const inputRef =
    useRef<TextInput>(
      null,
    );

  useEffect(() => {
    const timeout =
      setTimeout(
        () => {
          inputRef.current
            ?.focus();
        },
        350,
      );

    return () => {
      clearTimeout(
        timeout,
      );
    };
  }, []);

  function handleChange(
    rawValue: string,
  ) {
    const digits =
      rawValue
        .replace(
          /\D/g,
          "",
        )
        .slice(
          0,
          OTP_LENGTH,
        );

    onChange(
      digits,
    );

    if (
      digits.length ===
      OTP_LENGTH
    ) {
      onComplete?.(
        digits,
      );
    }
  }

  const activeIndex =
    Math.min(
      value.length,
      OTP_LENGTH - 1,
    );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Enter six digit verification code"
      onPress={() =>
        inputRef.current
          ?.focus()
      }
      className="relative"
    >
      <TextInput
        ref={
          inputRef
        }
        value={
          value
        }
        editable={
          !disabled
        }
        onChangeText={
          handleChange
        }
        keyboardType="number-pad"
        autoComplete="one-time-code"
        maxLength={
          OTP_LENGTH
        }
        caretHidden
        contextMenuHidden={
          false
        }
        className="absolute h-px w-px opacity-0"
      />

      <View className="flex-row gap-2">
        {Array.from({
          length:
            OTP_LENGTH,
        }).map(
          (
            _,
            index,
          ) => {
            const digit =
              value[
                index
              ] ?? "";

            const isActive =
              !disabled &&
              (
                index ===
                  activeIndex ||
                (
                  value.length ===
                    OTP_LENGTH &&
                  index ===
                    OTP_LENGTH -
                      1
                )
              );

            const borderClass =
              error
                ? "border-red-400/70"
                : isActive
                  ? "border-white/70"
                  : digit
                    ? "border-white/30"
                    : "border-white/15";

            return (
              <View
                key={
                  index
                }
                className={[
                  "h-[50px]",
                  "flex-1",
                  "items-center",
                  "justify-center",
                  "rounded-2xl",
                  "border",
                  "bg-black/35",
                  borderClass,
                ].join(
                  " ",
                )}
              >
                <Text className="text-[22px] font-bold text-white">
                  {
                    digit
                  }
                </Text>
              </View>
            );
          },
        )}
      </View>
    </Pressable>
  );
}