import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trackEvent } from "@/src/services/telemetry";
import { firstEligibleMoment, parseMomentHistory, type UpgradeMoment } from "./moments";

let queue = Promise.resolve();
const shownThisSession = new Set<string>();
const reservations = new Map<string, symbol>();
export function useUpgradeMoment(
  ownerId: string,
  candidate: UpgradeMoment | null | readonly (UpgradeMoment | null)[],
  enabled: boolean,
) {
  const candidates = (Array.isArray(candidate) ? candidate : [candidate]).filter(
    (value): value is UpgradeMoment => !!value,
  );
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [snapshot, setSnapshot] = useState<{ ownerId: string; moment: UpgradeMoment } | null>(null);
  const current = useRef(candidates);
  const eligible = enabled && focused && foreground;
  const eligibility = useRef({ ownerId, enabled: eligible });
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active") eligibility.current.enabled = false;
      setForeground(state === "active");
    });
    return () => listener.remove();
  }, []);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        eligibility.current.enabled = false;
        setFocused(false);
      };
    }, []),
  );
  useLayoutEffect(() => {
    current.current = candidates;
    eligibility.current = { ownerId, enabled: eligible };
    return () => {
      eligibility.current.enabled = false;
    };
  });
  const candidateKey = JSON.stringify(candidates.map((moment) => moment.key));
  const recorded = useRef("");
  useEffect(() => {
    let active = true;
    let reservation: symbol | null = null;
    if (!ownerId || !eligible || candidateKey === "[]" || shownThisSession.has(ownerId)) return;
    const eventKey = candidateKey;
    const operation = queue.then(async () => {
      if (!active || shownThisSession.has(ownerId) || reservations.has(ownerId)) return;
      const history = parseMomentHistory(
        await AsyncStorage.getItem(`fitsync.upgrade-moments.v1.${ownerId}`),
      );
      const now = Date.now();
      if (
        !active ||
        shownThisSession.has(ownerId) ||
        reservations.has(ownerId) ||
        !eligibility.current.enabled ||
        eligibility.current.ownerId !== ownerId ||
        JSON.stringify(current.current.map((moment) => moment.key)) !== eventKey
      )
        return;
      const moment = firstEligibleMoment(history, current.current, now);
      if (!moment) return;
      trackEvent("upgrade_moment_eligible", { source: moment.source });
      reservation = Symbol();
      reservations.set(ownerId, reservation);
      setSnapshot({ ownerId, moment });
    });
    queue = operation.catch(() => {});
    return () => {
      active = false;
      if (reservation && reservations.get(ownerId) === reservation) reservations.delete(ownerId);
    };
  }, [ownerId, candidateKey, eligible]);
  const moment =
    eligible && snapshot?.ownerId === ownerId
      ? (candidates.find((value) => value.key === snapshot.moment.key) ?? null)
      : null;
  // Persist an impression after React has committed the visible card.
  useEffect(() => {
    if (
      !moment ||
      !eligibility.current.enabled ||
      eligibility.current.ownerId !== ownerId ||
      recorded.current === `${ownerId}:${moment.key}`
    )
      return;
    shownThisSession.add(ownerId);
    reservations.delete(ownerId);
    recorded.current = `${ownerId}:${moment.key}`;
    trackEvent("upgrade_moment_viewed", { source: moment.source });
    const key = `fitsync.upgrade-moments.v1.${ownerId}`;
    const operation = queue.then(async () => {
      const history = parseMomentHistory(await AsyncStorage.getItem(key));
      const now = Date.now();
      await AsyncStorage.setItem(
        key,
        JSON.stringify({
          seen: [...history.seen, moment.key].slice(-100),
          shown: [...history.shown.filter((at) => now - at < 7 * 86400_000), now],
        }),
      );
    });
    queue = operation.catch(() => {});
  }, [moment, ownerId]);
  return {
    moment,
    dismiss: () => {
      if (moment) trackEvent("upgrade_moment_dismissed", { source: moment.source });
      setSnapshot(null);
    },
  };
}
