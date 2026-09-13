import { Ionicons } from "@expo/vector-icons";

import { useState } from "react";

import { Modal, Pressable, Text, View } from "react-native";

const REST_OPTIONS = [0, 30, 60, 90, 120, 180, 300] as const;

interface Props {
  visible: boolean;

  exerciseName: string;

  restSeconds: number;

  canMoveUp: boolean;

  canMoveDown: boolean;

  inSuperset: boolean;

  canSupersetNext: boolean;

  onViewExercise: () => void;

  onReplace: () => void;

  onRestChange: (seconds: number) => void;

  onMoveUp: () => void;

  onMoveDown: () => void;

  onSupersetNext: () => void;

  onRemoveSuperset: () => void;

  onRemoveExercise: () => void;

  onClose: () => void;
}

export function ExerciseOptionsModal({
  visible,
  exerciseName,
  restSeconds,
  canMoveUp,
  canMoveDown,
  inSuperset,
  canSupersetNext,
  onViewExercise,
  onReplace,
  onRestChange,
  onMoveUp,
  onMoveDown,
  onSupersetNext,
  onRemoveSuperset,
  onRemoveExercise,
  onClose,
}: Props) {
  const [page, setPage] = useState<"main" | "rest">("main");

  function closeModal() {
    setPage("main");

    onClose();
  }

  function run(callback: () => void) {
    closeModal();

    callback();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={closeModal}
    >
      <Pressable
        onPress={closeModal}
        className="flex-1 justify-end bg-black/65"
      >
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
          }}
          className="rounded-t-[30px] border-t border-white/10 bg-[#101010] px-5 pb-9 pt-5"
        >
          <View className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/15" />

          {page === "rest" ? (
            <>
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => {
                    setPage("main");
                  }}
                  className="h-9 w-9 items-center justify-center"
                >
                  <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
                </Pressable>

                <Text className="ml-2 text-[19px] font-extrabold text-white">
                  Rest timer
                </Text>
              </View>

              <View className="mt-5 flex-row flex-wrap gap-2">
                {REST_OPTIONS.map((seconds) => {
                  const selected = restSeconds === seconds;

                  const label =
                    seconds === 0
                      ? "Off"
                      : seconds >= 60
                        ? `${seconds / 60} min`
                        : `${seconds} sec`;

                  return (
                    <Pressable
                      key={seconds}
                      onPress={() => {
                        onRestChange(seconds);

                        closeModal();
                      }}
                      className="min-w-[30%] flex-1 items-center justify-center rounded-xl px-3 py-4"
                      style={{
                        backgroundColor: selected
                          ? "#2563EB"
                          : "rgba(255,255,255,.05)",
                      }}
                    >
                      <Text
                        className="text-[13px] font-bold"
                        style={{
                          color: selected ? "#FFFFFF" : "rgba(255,255,255,.55)",
                        }}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              <Text className="text-[19px] font-extrabold text-white">
                {exerciseName}
              </Text>

              <View className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07]">
                <Option
                  icon="information-circle-outline"
                  title="Exercise details"
                  onPress={() => {
                    run(onViewExercise);
                  }}
                />

                <Divider />

                <Option
                  icon="swap-horizontal-outline"
                  title="Replace exercise"
                  onPress={() => {
                    run(onReplace);
                  }}
                />

                <Divider />

                <Option
                  icon="timer-outline"
                  title="Rest timer"
                  trailing={
                    restSeconds === 0
                      ? "Off"
                      : restSeconds >= 60
                        ? `${restSeconds / 60} min`
                        : `${restSeconds}s`
                  }
                  onPress={() => {
                    setPage("rest");
                  }}
                />

                <Divider />

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
            </>
          )}
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
  trailing,
  danger = false,
  disabled = false,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];

  title: string;

  trailing?: string;

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
        className="ml-4 flex-1 text-[14px] font-semibold"
        style={{
          color: danger ? "#FCA5A5" : "#FFFFFF",
        }}
      >
        {title}
      </Text>

      {trailing ? (
        <Text className="text-[12px] font-semibold text-white/30">
          {trailing}
        </Text>
      ) : null}
    </Pressable>
  );
}
