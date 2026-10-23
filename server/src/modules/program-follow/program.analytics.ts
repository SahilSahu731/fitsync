export function dateInZone(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function dayDifference(from: string, to: string) { return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000); }
export function summarizeProgram(enrollment: any, rows: any[], now = new Date()) {
  const today = dateInZone(enrollment.timezone, now);
  const elapsedDays = dayDifference(enrollment.start_date, today);
  const slots = rows.map(row => {
    const session = row.workout_sessions?.find((w: any) => w.status === "completed") ?? row.workout_sessions?.find((w: any) => w.status === "active");
    const sets = session?.status === "completed" ? (session.workout_session_exercises ?? []).flatMap((e: any) => e.workout_logged_sets ?? []).filter((s: any) => s.completed_at) : [];
    return {
      id: row.id, templateId: row.template_id, routineName: row.routine_name,
      week: row.week_number, day: row.day_number, date: row.scheduled_date,
      status: session?.status ?? (row.scheduled_date < today ? "overdue" : "planned"),
      sessionId: session?.id ?? null, completedAt: session?.status === "completed" ? session.finished_at : null,
      completedSets: sets.length, volumeKg: sets.reduce((sum: number, s: any) => sum + Number(s.weight_kg ?? 0) * Number(s.reps ?? 0), 0),
      durationSeconds: session?.status === "completed" ? session.elapsed_seconds ?? 0 : 0
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
  const done = slots.filter(s => s.status === "completed");
  const due = slots.filter(s => s.date <= today);
  const week = Math.max(1, Math.min(enrollment.duration_weeks, Math.floor(elapsedDays / 7) + 1));
  return {
    enrollment, today, week, startsInDays: Math.max(0, -elapsedDays),
    todayPlan: elapsedDays < 0 ? null : enrollment.weekly_plan.find((day: any) => day.day_number === (elapsedDays % 7) + 1) ?? null,
    slots, nextSlot: slots.find(s => s.status === "active") ?? slots.find(s => s.status !== "completed") ?? null,
    analytics: {
      completed: done.length, planned: slots.length, progressPercent: slots.length ? Math.round(done.length / slots.length * 100) : 0,
      due: due.length, adherencePercent: due.length ? Math.round(due.filter(s => s.status === "completed").length / due.length * 100) : null,
      completedSets: done.reduce((sum, s) => sum + s.completedSets, 0), volumeKg: done.reduce((sum, s) => sum + s.volumeKg, 0),
      minutes: Math.round(done.reduce((sum, s) => sum + s.durationSeconds, 0) / 60),
      weeks: Array.from({ length: enrollment.duration_weeks }, (_, index) => {
        const planned = slots.filter(s => s.week === index + 1);
        return { week: index + 1, planned: planned.length, completed: planned.filter(s => s.status === "completed").length, volumeKg: planned.reduce((sum, s) => sum + s.volumeKg, 0) };
      })
    }
  };
}
