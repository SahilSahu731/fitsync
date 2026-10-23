import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useSession } from "@/src/context/session";
import { useWorkout } from "@/src/features/workouts/workout-context";
import { programFollowApi, type FollowedProgram } from "./api";
import { notificationProgramId, registerProgramNotifications } from "./notifications";

type Context = { active: FollowedProgram | null; loading: boolean; error: string; refresh: () => Promise<void>; };
const ProgramContext = createContext<Context | null>(null);
export function ProgramProvider({ children }: { children: React.ReactNode }) {
  const { user, ready, settings } = useSession();
  const { session } = useWorkout();
  const [snapshot, setSnapshot] = useState<{ userId: string; active: FollowedProgram | null; error: string } | null>(null);
  const generation = useRef(0);
  const userId = user?.id;
  const active = snapshot?.userId === userId ? snapshot?.active ?? null : null;
  const loading = !!userId && snapshot?.userId !== userId;
  const error = snapshot?.userId === userId ? snapshot?.error ?? "" : "";
  const invalidate = useCallback(() => { generation.current++; }, []);
  const refresh = useCallback(async () => {
    if (!userId || !ready) return;
    const request = ++generation.current;
    try {
      const next = await programFollowApi.active();
      if (request === generation.current) { setSnapshot({ userId, active: next, error: "" }); }
    } catch (cause) {
      if (request === generation.current) setSnapshot(previous => ({ userId, active: previous?.userId === userId ? previous.active : null, error: cause instanceof Error ? cause.message : "Could not load your program." }));
    }
  }, [userId, ready]);
  useEffect(() => {
    void refresh();
    return invalidate;
  }, [refresh, invalidate, session?.id]);
  useEffect(() => {
    if (!userId || !ready) return;
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void refresh(); });
    return () => subscription.remove();
  }, [refresh, userId, ready]);
  useEffect(() => {
    if (!userId || !ready || !active?.enrollment.reminder_enabled || !settings?.workoutReminders || Platform.OS === "web") return;
    const register = () => { void registerProgramNotifications().catch(() => { /* Explicit reminder settings surface registration failures. */ }); };
    register();
    const foreground = AppState.addEventListener("change", state => { if (state === "active") register(); });
    const token = Notifications.addPushTokenListener(register);
    return () => { foreground.remove(); token.remove(); };
  }, [userId, ready, active?.enrollment.reminder_enabled, settings?.workoutReminders]);
  return <ProgramContext.Provider value={{ active, loading, error, refresh }}>{children}</ProgramContext.Provider>;
}
export function useProgram() {
  const context = useContext(ProgramContext);
  if (!context) throw new Error("useProgram needs ProgramProvider");
  return context;
}

// Mount only once the root navigator and fonts are ready.
export function ProgramNotificationLinks() {
  const { user, ready } = useSession();
  const userId = user?.id;
  useEffect(() => {
    if (!userId || !ready || Platform.OS === "web") return;
    let mounted = true;
    let lastId: string | null = null;
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!mounted || !response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const request = response.notification.request;
      if (lastId === request.identifier) return;
      lastId = request.identifier;
      const id = notificationProgramId(request.content.data ?? {});
      if (id) {
        router.push({ pathname: "/programs/[id]", params: { id } });
        void Notifications.clearLastNotificationResponseAsync().catch(console.warn);
      }
    };
    void Notifications.getLastNotificationResponseAsync().then(open).catch(console.warn);
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => { mounted = false; subscription.remove(); };
  }, [userId, ready]);
  return null;
}
