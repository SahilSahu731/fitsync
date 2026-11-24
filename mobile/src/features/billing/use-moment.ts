import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trackEvent } from "@/src/services/telemetry";
import { canShowMoment, parseMomentHistory, type UpgradeMoment } from "./moments";

let queue = Promise.resolve();
let shownThisSession = false;
export function useUpgradeMoment(
  ownerId: string,
  candidate: UpgradeMoment | null,
  enabled: boolean,
) {
  const [focused, setFocused] = useState(false);
  const [snapshot, setSnapshot] = useState<{ ownerId: string; moment: UpgradeMoment } | null>(null);
  const current = useRef(candidate);
  const eligible = enabled && focused;
  const eligibility = useRef({ ownerId, enabled: eligible });
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
    current.current = candidate;
    eligibility.current = { ownerId, enabled: eligible };
    return () => {
      eligibility.current.enabled = false;
    };
  }, [candidate, ownerId, eligible]);
  const candidateKey = candidate?.key;
  const recorded = useRef("");
  useEffect(() => {
    let active = true;
    if (!ownerId || !eligible || !candidateKey || shownThisSession) return;
    const eventKey = candidateKey;
    const operation = queue.then(async () => {
      if (!active || shownThisSession) return;
      const history = parseMomentHistory(
        await AsyncStorage.getItem(`fitsync.upgrade-moments.v1.${ownerId}`),
      );
      const now = Date.now();
      if (
        !active ||
        shownThisSession ||
        !eligibility.current.enabled ||
        eligibility.current.ownerId !== ownerId ||
        current.current?.key !== eventKey ||
        !canShowMoment(history, eventKey, now)
      )
        return;
      trackEvent("upgrade_moment_eligible", { source: current.current?.source ?? "home" });
      shownThisSession = true;
      setSnapshot({ ownerId, moment: current.current });
    });
    queue = operation.catch(() => {});
    return () => {
      active = false;
    };
  }, [ownerId, candidateKey, eligible]);
  const moment =
    eligible && snapshot?.ownerId === ownerId && snapshot.moment.key === candidate?.key
      ? candidate
      : null;
  // Persist an impression after React has committed the visible card.
  useEffect(() => {
    if (!moment || recorded.current === moment.key) return;
    recorded.current = moment.key;
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
