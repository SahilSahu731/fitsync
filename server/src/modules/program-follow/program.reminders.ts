import { dateInZone, dayDifference, summarizeProgram } from "./program.analytics.js";

type Detail = ReturnType<typeof summarizeProgram>;
// Deterministic daily rotation keeps retries from changing the message.
export function reminderCopy(detail: Detail, now = new Date()) {
  const { enrollment, slots } = detail;
  const today = dateInZone(enrollment.timezone, now);
  const day = dayDifference(enrollment.start_date, today);
  if (enrollment.status !== "active" || !enrollment.reminder_enabled || day < 0) return null;
  if (slots.some(slot => slot.completedAt && dateInZone(enrollment.timezone, new Date(slot.completedAt)) === today)) return null;
  const due = slots.find(slot => slot.date === today && slot.status !== "completed");
  const active = slots.find(slot => slot.status === "active");
  if (active) return { title: "Your workout has a cliffhanger 👀", body: `Still training? ${active.routineName} is ready when you are. Finished? Save your log.` };
  if (due) {
    const messages = [
      { title: "Your dumbbells asked about you 👀", body: `${due.routineName} is on today's menu. Ready for your first set?` },
      { title: "Your workout reservation is ready 💪", body: `${due.routineName} is up today. Train at your pace, then save your log.` },
      { title: "A little less scroll, a little more swole?", body: `${due.routineName} is ready. Already trained? Give your workout its credit.` },
      { title: "Your plan has entered the chat ✨", body: `Today's pick: ${due.routineName}. Open your program whenever you're ready.` }
    ];
    return messages[day % messages.length];
  }
  if (slots.some(slot => slot.date < today && slot.status !== "completed")) return {
    title: "Your log is saving you a seat 📝", body: "Trained and forgot to log it? Pick up an unfinished session. Your plan can wait for you."
  };
  if (slots.some(slot => slot.date === today && slot.status === "completed")) return {
    title: "Ahead of the plan? Look at you ✨", body: "Today's session is already logged. Enjoy some downtime, or check what's next."
  };
  const recovery = [
    { title: "Today's special: recovery 😌", body: "Rest is on the plan. Recharge today; your next workout will be waiting." },
    { title: "Your muscles booked a day off 🛋️", body: "A recovery day is part of your program too. Check your plan whenever you're ready." },
    { title: "No reps on the menu today ☕", body: "Your plan says recovery. Enjoy the breather; the next session is saved for you." }
  ];
  return recovery[day % recovery.length];
}

export function canSendReminder(enrollment: Detail["enrollment"], localDate: string, now = new Date()) {
  if (enrollment.status !== "active" || !enrollment.reminder_enabled || dateInZone(enrollment.timezone, now) !== localDate || localDate < enrollment.start_date) return false;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: enrollment.timezone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).formatToParts(now);
  const minute = Number(parts.find(p => p.type === "hour")!.value) * 60 + Number(parts.find(p => p.type === "minute")!.value);
  const difference = minute - (enrollment.reminder_hour * 60 + enrollment.reminder_minute);
  return difference >= 0 && difference < 360;
}
