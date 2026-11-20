import { isIP } from "node:net";

export function proxyIdentity(headers: Headers, secret: string | undefined) {
  const forwardedIp = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  if (!secret || !forwardedIp || !isIP(forwardedIp)) return {};
  // One trusted ingress appends/overwrites X-Forwarded-For. Do not choose the
  // leftmost entry, which may have been supplied by an untrusted browser.
  return { "X-FitSync-Proxy-Secret": secret, "X-FitSync-Client-IP": forwardedIp };
}
