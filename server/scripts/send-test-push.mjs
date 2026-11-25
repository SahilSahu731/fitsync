import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
  debug: false,
  override: false,
});

const ticketId = /^[A-Za-z0-9_-]{1,128}$/;
const knownErrors = new Set([
  "DeviceNotRegistered",
  "InvalidCredentials",
  "MessageRateExceeded",
  "MessageTooBig",
  "MismatchSenderId",
  "UNAUTHORIZED",
  "TOO_MANY_REQUESTS",
  "PUSH_TOO_MANY_EXPERIENCE_IDS",
  "PUSH_TOO_MANY_NOTIFICATIONS",
  "PUSH_TOO_MANY_RECEIPTS",
]);

// Expo's descriptive error messages can contain the recipient's push token.
function safeError(code) {
  return knownErrors.has(code) ? code : "unknown Expo error";
}

async function request(path, payload) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (process.env.EXPO_ACCESS_TOKEN)
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  const response = await fetch(`https://exp.host/--/api/v2/push/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
    redirect: "error",
  }).catch(() => {
    throw new Error("Expo did not confirm the request. Check your connection and the phone.");
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.errors?.length) {
    throw new Error(
      `Expo returned HTTP ${response.status} (${safeError(result?.errors?.[0]?.code)}).`,
    );
  }
  if (!result?.data || typeof result.data !== "object") throw new Error("Invalid Expo response.");
  return result.data;
}

async function main(args) {
  if (args.length) {
    const [flag, id] = args;
    if (flag !== "--receipt" || args.length !== 2 || !ticketId.test(id)) {
      throw new Error("Usage: npm run push:test or npm run push:test -- --receipt <ticket>");
    }
    const receipts = await request("getReceipts", { ids: [id] });
    if (Array.isArray(receipts)) throw new Error("Invalid Expo receipt response.");
    if (!Object.hasOwn(receipts, id)) {
      console.log(
        "No receipt available. Check about 15 minutes after sending. Receipts expire after 24 hours.",
      );
      return;
    }
    const receipt = receipts[id];
    if (receipt?.status !== "ok")
      throw new Error(`Expo receipt failed (${safeError(receipt?.details?.error)}).`);
    console.log(
      "Firebase accepted the notification. Check the phone’s notification shade to confirm display.",
    );
    return;
  }

  const to = process.env.FITSYNC_TEST_PUSH_TOKEN?.trim() ?? "";
  if (to.length > 256 || !/^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/.test(to)) {
    throw new Error(
      "Set FITSYNC_TEST_PUSH_TOKEN to one phone’s Expo push token in server/.env or your environment.",
    );
  }
  const result = await request("send", {
    to,
    channelId: "general-v1",
    title: "FitSync test",
    body: "Your test notification has arrived.",
    priority: "high",
    ttl: 300,
  });
  if (Array.isArray(result) && result.length !== 1)
    throw new Error("Invalid Expo ticket response.");
  const ticket = Array.isArray(result) ? result[0] : result;
  if (ticket?.status !== "ok")
    throw new Error(`Expo rejected the test (${safeError(ticket?.details?.error)}).`);
  if (typeof ticket.id !== "string" || !ticketId.test(ticket.id))
    throw new Error("Expo did not return a usable ticket ID.");
  console.log("Expo accepted one test notification. Check the phone to confirm display.");
  console.log(`Check the receipt: npm run push:test -- --receipt ${ticket.id}`);
}

main(process.argv.slice(2)).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
