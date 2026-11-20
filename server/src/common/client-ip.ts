import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { Request } from "express";
import { ipKeyGenerator } from "express-rate-limit";

// The web BFF is another network hop. Only it may assert an end-user IP;
// arbitrary public requests must continue to use Express's trusted ingress IP.
export function authRateLimitKey(req: Request) {
  const expected = process.env.WEB_PROXY_SECRET;
  const supplied = req.get("X-FitSync-Proxy-Secret");
  const clientIp = req.get("X-FitSync-Client-IP");
  const authenticated =
    expected &&
    supplied &&
    Buffer.byteLength(expected) === Buffer.byteLength(supplied) &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
  return ipKeyGenerator(
    authenticated && clientIp && isIP(clientIp) ? clientIp : req.ip || "unknown",
  );
}
