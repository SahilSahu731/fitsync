import React, { useEffect, useRef } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useSession } from "@/src/context/session";
import { useBilling } from "../billing/billing-context";
import { ProScreen } from "../billing/paywall";
import { ProScene } from "./hub-ui";
import { MemberWorkspace } from "./member-workspace";

// Private resources mount only while this account has a verified entitlement.
export function ProHubScreen() {
  const { user } = useSession();
  const billing = useBilling();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const waiting = useRef(!billing.isPro);
  useEffect(() => {
    if (!billing.isPro) {
      waiting.current = true;
      return;
    }
    if (!user?.id || !waiting.current) return;
    waiting.current = false;
    // Deliver the outcome that opened checkout as soon as access is verified.
    if (source === "weekly_review") router.replace("/coach/review");
    else if (source === "missed_session") router.replace("/(tabs)");
    else if (source === "personal_best" || source === "workout_three")
      router.replace({ pathname: "/companion", params: { tab: "insights" } });
  }, [billing.isPro, source, user?.id]);
  if (!billing.isPro || !user?.id) return <ProScreen embedded />;
  return (
    <ProScene>
      <MemberWorkspace key={user.id} ownerId={user.id} />
    </ProScene>
  );
}
