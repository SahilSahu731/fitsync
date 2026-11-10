import { getAuth } from "../../middleware/auth.js";
import { billingService } from "./billing.service.js";
import { createProGuard } from "./billing.guard.js";

// Mount after requireAuth; the account always comes from the verified session.
export const requirePro = createProGuard({
  configured: billingService.configured,
  userId: req => getAuth(req).userId,
  getEntitlement: billingService.getEntitlement
});
