import { db } from "../../config/supabase.js";
import { checkDbError } from "../../common/errors.js";
import { programDetail } from "./program.service.js";
import { canSendReminder, reminderCopy } from "./program.reminders.js";

const PUSH_URL = "https://exp.host/--/api/v2/push";
async function expoRequest(path: string, body: unknown) {
  const response = await fetch(`${PUSH_URL}/${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error(`expo_http_${response.status}`);
  return response.json() as Promise<{ data?: any; errors?: unknown[] }>;
}
async function updateJob(id: string, values: Record<string, unknown>) {
  const result = await db.from("program_reminder_jobs").update(values).eq("id", id);
  checkDbError(result.error, "update program reminder job");
}
async function disableDevice(id: string) {
  const result = await db.from("program_push_devices").update({ enabled: false }).eq("id", id);
  checkDbError(result.error, "disable expired push device");
}
async function receipts() {
  const now = Date.now();
  // Expo recommends checking receipts after 15 minutes; they expire after 24h.
  const result = await db.from("program_reminder_jobs").select("id,device_id,ticket_id")
    .eq("status", "accepted").lt("attempted_at", new Date(now - 15 * 60_000).toISOString()).limit(100);
  checkDbError(result.error, "load reminder receipts");
  const jobs = (result.data ?? []).filter(job => job.ticket_id);
  if (jobs.length) {
    const response = await expoRequest("getReceipts", { ids: jobs.map(job => job.ticket_id) });
    for (const job of jobs) {
      const receipt = response.data?.[job.ticket_id];
      if (!receipt) continue;
      if (receipt.status === "ok") await updateJob(job.id, { status: "sent" });
      else {
        const code = receipt.details?.error ?? "receipt_error";
        await updateJob(job.id, { status: "failed", error_code: code });
        if (code === "DeviceNotRegistered") await disableDevice(job.device_id);
      }
    }
  }
  const expired = await db.from("program_reminder_jobs").update({ status: "failed", error_code: "receipt_expired" })
    .eq("status", "accepted").lt("attempted_at", new Date(now - 24 * 60 * 60_000).toISOString());
  checkDbError(expired.error, "expire reminder receipts");
}

export async function runProgramReminders() {
  // No retries after an ambiguous network response: favour avoiding duplicates.
  const abandoned = await db.from("program_reminder_jobs").update({ status: "failed", error_code: "worker_interrupted" })
    .eq("status", "sending").lt("attempted_at", new Date(Date.now() - 10 * 60_000).toISOString());
  checkDbError(abandoned.error, "recover interrupted reminders");
  await receipts();
  const queued = await db.rpc("queue_fitsync_program_reminders");
  checkDbError(queued.error, "queue program reminders");
  // Bounded work per invocation; the cron picks up the remaining queue.
  let attempted = 0;
  for (let batch = 0; batch < 10; batch++) {
    const claimed = await db.rpc("claim_fitsync_program_reminders", { p_limit: 50 });
    checkDbError(claimed.error, "claim program reminders");
    if (!claimed.data?.length) break;
    await Promise.all(claimed.data.map(async (job: any) => {
      try {
        const [enrollment, device] = await Promise.all([
          db.from("program_enrollments").select("*").eq("id", job.enrollment_id).maybeSingle(),
          db.from("program_push_devices").select("*").eq("id", job.device_id).maybeSingle()
        ]);
        checkDbError(enrollment.error, "load reminder enrollment"); checkDbError(device.error, "load reminder device");
        const e = enrollment.data; const d = device.data;
        if (!e || !d?.enabled || d.user_id !== e.user_id || !canSendReminder(e, job.local_date)) {
          await updateJob(job.id, { status: "cancelled" }); return;
        }
        const auth = await db.from("auth_sessions").select("id").eq("id", d.session_id).eq("user_id", e.user_id).is("revoked_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
        checkDbError(auth.error, "check reminder device session");
        if (!auth.data) { await updateJob(job.id, { status: "cancelled" }); return; }
        const preference = await db.from("user_settings").select("workout_reminders").eq("user_id", e.user_id).maybeSingle();
        checkDbError(preference.error, "check reminder consent");
        const copy = preference.data?.workout_reminders ? reminderCopy(await programDetail(e.user_id, e.id)) : null;
        if (!copy) { await updateJob(job.id, { status: "cancelled" }); return; }
        attempted++;
        const response = await expoRequest("send", [{ to: d.token, ...copy, sound: "rest_complete.wav", channelId: "program-reminders-v1", ttl: 3600,
          data: { type: "program-reminder", enrollmentId: e.id }, priority: "normal" }]);
        const ticket = response.data?.[0];
        if (ticket?.status === "ok" && ticket.id) await updateJob(job.id, { status: "accepted", ticket_id: ticket.id });
        else {
          const code = ticket?.details?.error ?? "ticket_error";
          await updateJob(job.id, { status: "failed", error_code: code });
          if (code === "DeviceNotRegistered") await disableDevice(d.id);
        }
      } catch {
        // Do not log tokens, request payloads, or personal workout names.
        await updateJob(job.id, { status: "failed", error_code: "send_or_lookup_failed" });
      }
    }));
  }
  return { queued: queued.data, attempted };
}
