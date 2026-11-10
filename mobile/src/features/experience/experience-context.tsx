import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { requireOptionalNativeModule } from "expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import type { AudioPlayer } from "expo-audio";
import { DEFAULT_EXPERIENCE, parseExperience, type ExperiencePreferences } from "./model";

type Cue = "selection" | "set" | "workout";
type Experience = {
  preferences: ExperiencePreferences; ready: boolean; error: string;
  update: (patch: Partial<ExperiencePreferences>) => Promise<void>;
  feedback: (cue: Cue) => void;
};
const Context = createContext<Experience | null>(null);
const KEY = "fitsync.experience.v1";
const SOURCES = { set: require("../../../assets/sound/set-saved.wav"), workout: require("../../../assets/sound/workout-complete.wav") };

export function ExperienceProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_EXPERIENCE);
  const current = useRef(DEFAULT_EXPERIENCE);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const players = useRef<Partial<Record<"set" | "workout", AudioPlayer>>>({});
  const writes = useRef(Promise.resolve());
  const audioMode = useRef<Promise<void> | null>(null);
  const lastCue = useRef(0);
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(KEY).then(value => {
      if (active) { current.current = parseExperience(value); setPreferences(current.current); }
    }).catch(() => { if (active) setError("Could not load device preferences. Try saving them again."); }).finally(() => { if (active) setReady(true); });
    const subscription = AppState.addEventListener("change", state => {
      if (state !== "active") Object.values(players.current).forEach(player => player?.pause());
    });
    return () => { active = false; subscription.remove(); Object.values(players.current).forEach(player => player?.remove()); players.current = {}; };
  }, []);
  const update = useCallback((patch: Partial<ExperiencePreferences>) => {
    const write = writes.current.then(async () => {
      const next = { ...current.current, ...patch };
      try {
        await AsyncStorage.setItem(KEY, JSON.stringify(next));
        current.current = next; setPreferences(next); setError("");
        if (!next.sounds) Object.values(players.current).forEach(player => player?.pause());
      } catch { setError("Could not save device preferences. Please try again."); throw new Error("Could not save device preferences."); }
    });
    writes.current = write.catch(() => {});
    return write;
  }, []);
  const feedback = useCallback((cue: Cue) => {
    if (AppState.currentState !== "active") return;
    if (current.current.haptics) {
      const effect = cue === "selection" ? Haptics.selectionAsync() : cue === "workout"
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void effect.catch(() => {});
    }
    if (cue === "selection" || !current.current.sounds || Date.now() - lastCue.current < 150 || !requireOptionalNativeModule("ExpoAudio")) return;
    lastCue.current = Date.now();
    void (async () => {
      // Load on demand so older binaries can still open settings and account screens.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const audio = require("expo-audio") as typeof import("expo-audio");
      audioMode.current ??= audio.setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers", shouldPlayInBackground: false });
      try { await audioMode.current; } catch { audioMode.current = null; return; }
      if (!current.current.sounds || AppState.currentState !== "active") return;
      const player = players.current[cue] ??= audio.createAudioPlayer(SOURCES[cue]);
      player.volume = 0.35;
      await player.seekTo(0);
      if (current.current.sounds && AppState.currentState === "active") player.play();
    })().catch(() => { /* Audio never blocks durable workout logging. */ });
  }, []);
  return <Context.Provider value={{ preferences, ready, error, update, feedback }}>{children}</Context.Provider>;
}
export function useExperience() {
  const value = useContext(Context);
  if (!value) throw new Error("ExperienceProvider is missing.");
  return value;
}
