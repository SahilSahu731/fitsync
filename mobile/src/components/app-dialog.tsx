import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "@/src/constants/theme";
import { Txt } from "./ui";

type Action = {
  text?: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void | Promise<void>;
};
type Dialog = {
  title: string;
  message?: string;
  actions: Action[];
  tone: "info" | "success" | "error";
};
type AlertApi = {
  alert: (
    title: string,
    message?: string,
    actions?: Action[],
    tone?: Dialog["tone"],
  ) => void;
};
const Context = createContext<AlertApi | null>(null);

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<Dialog[]>([]);
  const pressed = useRef(false);
  const alert = useCallback<AlertApi["alert"]>(
    (title, message, actions, tone = "info") => {
      Keyboard.dismiss();
      setQueue((current) => [
        ...current,
        {
          title,
          message,
          actions: actions?.length ? actions : [{ text: "Got it" }],
          tone,
        },
      ]);
    },
    [],
  );
  const dialog = queue[0];
  const choose = (action?: Action) => {
    if (pressed.current) return;
    pressed.current = true;
    setQueue((current) => current.slice(1));
    Promise.resolve()
      .then(() => action?.onPress?.())
      .catch((error) => {
        alert(
          "Something went wrong",
          error instanceof Error ? error.message : "Please try again.",
          undefined,
          "error",
        );
      })
      .finally(() => {
        pressed.current = false;
      });
  };
  const destructive = dialog?.actions.some(
    (action) => action.style === "destructive",
  );
  const color = destructive || dialog?.tone === "error" ? "#FF8C83" : C.brand;
  return (
    <Context.Provider value={{ alert }}>
      <View
        className="flex-1"
        importantForAccessibility={dialog ? "no-hide-descendants" : "auto"}
      >
        {children}
      </View>
      <Modal
        transparent
        visible={!!dialog}
        animationType="fade"
        statusBarTranslucent
        onShow={() => {
          pressed.current = false;
        }}
        onRequestClose={() => {
          const cancel = dialog?.actions.find(
            (action) => action.style === "cancel",
          );
          if (cancel) choose(cancel);
          else if (dialog?.actions.length === 1 && !destructive)
            choose(dialog.actions[0]);
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/75 px-6 py-12">
          {dialog && (
            <View className="max-h-full flex w-full max-w-[400px] overflow-hidden rounded-[28px] bg-panel" accessibilityViewIsModal>
              <ScrollView
                bounces={false}
                contentContainerClassName="p-[26px]"
              >
                <View className="flex-row items-start gap-3">
                  <View className="h-8 w-8 mt-0.5 shrink-0 items-center justify-center">
                  <MaterialCommunityIcons
                    name={
                      destructive
                        ? "shield-alert-outline"
                        : dialog.tone === "success"
                          ? "check-circle"
                          : dialog.tone === "error"
                            ? "alert-circle"
                            : "information"
                    }
                    size={30}
                    color={color}
                  />
                  </View>
                  <View className="min-w-0 flex-1">
                <Txt
                  weight="bold"
                  accessibilityRole="header"
                  className="text-[25px] leading-[31px] tracking-[-0.5px] text-ink"
                >
                  {dialog.title}
                </Txt>
                {!!dialog.message && (
                  <Txt className="mt-1 text-base leading-6 text-muted">{dialog.message}</Txt>
                )}
                  </View>
                </View>
                <View className="mt-[26px] flex-row gap-3">
                  {dialog.actions.map((action, index) => (
                    <Pressable
                      key={index}
                      accessibilityRole="button"
                      onPress={() => choose(action)}
                      className={`min-h-[52px] flex-1 items-center justify-center rounded-2xl px-2 py-1 active:opacity-75 ${
                        action.style === "cancel" || (dialog.actions.length > 1 && index === 0 && action.style !== "destructive")
                          ? "bg-elevated"
                          : "bg-brand"
                      }`}
                    >
                      <Txt
                        weight="semibold"
                        className={`text-center text-lg ${
                          action.style === "cancel" || (dialog.actions.length > 1 && index === 0 && action.style !== "destructive")
                            ? "text-ink"
                            : "text-bg"
                        }`}
                      >
                        {action.text || "OK"}
                      </Txt>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </Context.Provider>
  );
}

export function useAppAlert() {
  const value = useContext(Context);
  if (!value) throw new Error("useAppAlert requires AppDialogProvider");
  return value;
}

