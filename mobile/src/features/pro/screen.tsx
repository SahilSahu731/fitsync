import React from "react";
import { useSession } from "@/src/context/session";
import { useBilling } from "../billing/billing-context";
import { ProScreen } from "../billing/paywall";
import { ProScene } from "./hub-ui";
import { MemberWorkspace } from "./member-workspace";

// Private resources mount only while this account has a verified entitlement.
export function ProHubScreen() {
  const { user } = useSession();
  const billing = useBilling();
  if (!billing.isPro || !user?.id) return <ProScreen embedded />;
  return (
    <ProScene>
      <MemberWorkspace key={user.id} ownerId={user.id} />
    </ProScene>
  );
}
