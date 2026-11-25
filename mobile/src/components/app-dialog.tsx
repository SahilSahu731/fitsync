import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Keyboard, Linking, Modal, Pressable, ScrollView, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "@/src/constants/theme";
import { useSession } from "@/src/context/session";
import { openPlayReviews } from "@/src/features/experience/review-prompt";
import { trackEvent } from "@/src/services/telemetry";
import {
  registerPermissionPresenter,
  type PermissionPrompt,
} from "@/src/services/permission-prompts";
import { PermissionDialog } from "./permission-dialog";
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
  permission?: PermissionPrompt;
  review?: boolean;
  owner?: symbol;
};
type AlertApi = {
  alert: (title: string, message?: string, actions?: Action[], tone?: Dialog["tone"]) => void;
  inviteReview: () => void;
};
const Context = createContext<AlertApi | null>(null);

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const ownerId = user?.id ?? "";
  const owner = useMemo(() => Symbol(ownerId), [ownerId]);
  const activeOwner = useRef<symbol | null>(owner);
  const [queue, setQueue] = useState<Dialog[]>([]);
  const pressed = useRef(new WeakSet<Dialog>());
  const alert = useCallback<AlertApi["alert"]>((title, message, actions, tone = "info") => {
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
  }, []);
  const enqueueForOwner = useCallback(
    (item: Dialog) => {
      if (activeOwner.current !== owner) return;
      Keyboard.dismiss();
      setQueue((current) => {
        const visible = current.filter((entry) => !entry.owner || entry.owner === owner);
        if (item.review && visible.some((entry) => entry.review)) return current;
        return [...visible, { ...item, owner }];
      });
    },
    [owner],
  );
  const inviteReview = useCallback(() => {
    enqueueForOwner({
      title: "Rate FitSync",
      message: "Share your experience to help others choose a workout tracker.",
      tone: "info",
      review: true,
      actions: [
        { text: "Rate on Google Play", onPress: () => openPlayReviews("workout_summary") },
        {
          text: "Maybe later",
          style: "cancel",
          onPress: () => trackEvent("review_invitation_dismissed", { source: "workout_summary" }),
        },
      ],
    });
  }, [enqueueForOwner]);
  const api = useMemo(() => ({ alert, inviteReview }), [alert, inviteReview]);
  useEffect(() => {
    // A pending consent belongs to the account that opened it. Cancelling the
    // presenter also releases any native request waiting during sign-out.
    activeOwner.current = owner;
    const unregister = registerPermissionPresenter((permission, complete) => {
      enqueueForOwner({
        title: "Optional permission",
        tone: "info",
        permission,
        actions: [
          { text: "Not now", style: "cancel", onPress: () => complete(false) },
          {
            text: permission.blocked ? "Open phone settings" : "Continue",
            onPress: async () => {
              if (permission.blocked) {
                try {
                  await Linking.openSettings();
                } finally {
                  complete(false);
                }
              } else complete(true);
            },
          },
        ],
      });
    });
    return () => {
      activeOwner.current = null;
      unregister();
    };
  }, [owner, enqueueForOwner]);
  const dialog = queue.find((item) => !item.owner || item.owner === owner);
  const shownReview = useRef<Dialog | undefined>(undefined);
  useEffect(() => {
    if (!dialog?.review || shownReview.current === dialog) return;
    shownReview.current = dialog;
    trackEvent("review_invitation_shown", { source: "workout_summary" });
  }, [dialog]);
  const choose = (action?: Action) => {
    if (!dialog || pressed.current.has(dialog)) return;
    pressed.current.add(dialog);
    setQueue((current) => current.filter((item) => item !== dialog));
    Promise.resolve()
      .then(() => {
        if (!dialog.owner || activeOwner.current === dialog.owner) return action?.onPress?.();
      })
      .catch((error) => {
        if (dialog.owner && activeOwner.current !== dialog.owner) return;
        alert(
          "Something went wrong",
          error instanceof Error ? error.message : "Please try again.",
          undefined,
          "error",
        );
      });
  };
  const destructive = dialog?.actions.some((action) => action.style === "destructive");
  const color = destructive || dialog?.tone === "error" ? "#FF8C83" : C.brand;
  return (
    <Context.Provider value={api}>
      <View className="flex-1" importantForAccessibility={dialog ? "no-hide-descendants" : "auto"}>
        {children}
      </View>
      <Modal
        transparent
        visible={!!dialog}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          const cancel = dialog?.actions.find((action) => action.style === "cancel");
          if (cancel) choose(cancel);
          else if (dialog?.actions.length === 1 && !destructive) choose(dialog.actions[0]);
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/75 px-6 py-12">
          {dialog && (
            <View
              className="max-h-full flex w-full max-w-[400px] overflow-hidden rounded-[24px] bg-panel"
              accessibilityViewIsModal
            >
              <ScrollView bounces={false} contentContainerClassName="p-[26px]">
                {dialog.permission ? (
                  <PermissionDialog
                    prompt={dialog.permission}
                    onCancel={() => choose(dialog.actions[0])}
                    onContinue={() => choose(dialog.actions[1])}
                  />
                ) : dialog.review ? (
                  <View className="items-center">
                    <View importantForAccessibility="no-hide-descendants">
                      <MaterialCommunityIcons name="star-outline" size={32} color={C.ink} />
                    </View>
                    <Txt
                      accessibilityRole="header"
                      weight="semibold"
                      className="mt-4 text-center text-[26px] leading-[34px] tracking-[-0.6px]"
                    >
                      {dialog.title}
                    </Txt>
                    <Txt className="mt-2 text-center text-base leading-6 text-muted">
                      {dialog.message}
                    </Txt>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => choose(dialog.actions[0])}
                      className="mt-6 min-h-14 w-full items-center justify-center rounded-2xl bg-ink px-4 py-3 active:opacity-80"
                    >
                      <Txt weight="semibold" className="text-center text-base text-bg">
                        {dialog.actions[0].text}
                      </Txt>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => choose(dialog.actions[1])}
                      className="mt-1 min-h-12 w-full items-center justify-center rounded-2xl px-4 py-3 active:opacity-75"
                    >
                      <Txt weight="medium" className="text-center text-sm text-muted">
                        {dialog.actions[1].text}
                      </Txt>
                    </Pressable>
                  </View>
                ) : (
                  <>
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
                          size={26}
                          color={color}
                        />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Txt
                          weight="medium"
                          accessibilityRole="header"
                          className="text-[25px] leading-[31px] tracking-[-0.5px] text-ink"
                        >
                          {dialog.title}
                        </Txt>
                        {!!dialog.message && (
                          <Txt className="mt-1 text-sm leading-6 text-muted">{dialog.message}</Txt>
                        )}
                      </View>
                    </View>
                    <View className="mt-[26px] flex-row gap-3">
                      {dialog.actions.map((action, index) => (
                        <Pressable
                          key={index}
                          accessibilityRole="button"
                          onPress={() => choose(action)}
                          className={`min-h-[40px] flex-1 items-center justify-center rounded-2xl px-2 py-1 active:opacity-75 ${
                            action.style === "cancel" ||
                            (dialog.actions.length > 1 &&
                              index === 0 &&
                              action.style !== "destructive")
                              ? "bg-elevated"
                              : "bg-ink"
                          }`}
                        >
                          <Txt
                            weight="semibold"
                            className={`text-center text-lg ${
                              action.style === "cancel" ||
                              (dialog.actions.length > 1 &&
                                index === 0 &&
                                action.style !== "destructive")
                                ? "text-ink"
                                : "text-bg"
                            }`}
                          >
                            {action.text || "OK"}
                          </Txt>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}
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
