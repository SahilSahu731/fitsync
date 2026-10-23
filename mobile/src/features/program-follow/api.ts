import { apiRequest } from "@/src/services/api";

export type Enrollment = {
  id: string; program_id: string | null; program_name: string; cover_url: string | null;
  duration_weeks: number; days_per_week: number; start_date: string; timezone: string;
  status: "active" | "switched" | "stopped" | "completed"; started_at: string; ended_at: string | null;
  reminder_enabled: boolean; reminder_hour: number; reminder_minute: number;
  weekly_plan: { day_number: number; label: string; routine_name: string | null; rest: boolean }[];
};
export type ProgramSlot = {
  id: string; templateId: string | null; routineName: string; week: number; day: number; date: string;
  status: "active" | "completed" | "overdue" | "planned"; sessionId: string | null; completedAt: string | null;
  completedSets: number; volumeKg: number; durationSeconds: number;
};
export type FollowedProgram = {
  enrollment: Enrollment; today: string; week: number; startsInDays: number;
  todayPlan: Enrollment["weekly_plan"][number] | null; nextSlot: ProgramSlot | null; slots: ProgramSlot[];
  analytics: { completed: number; planned: number; progressPercent: number; due: number; adherencePercent: number | null; completedSets: number; volumeKg: number; minutes: number;
    weeks: { week: number; planned: number; completed: number; volumeKg: number }[] };
  events: { id: string; event_type: string; created_at: string; details: { next_program_name?: string; enabled?: boolean } }[];
};
export type ProgramHistory = Pick<Enrollment, "id" | "program_name" | "cover_url" | "status" | "start_date" | "started_at" | "ended_at" | "duration_weeks">;
export type ReminderSettings = { reminderEnabled: boolean; hour: number; minute: number; timezone: string };
export const programFollowApi = {
  active: () => apiRequest<FollowedProgram | null>("/program-follow/active"),
  detail: (id: string) => apiRequest<FollowedProgram>(`/program-follow/${id}`),
  history: () => apiRequest<ProgramHistory[]>("/program-follow/history"),
  follow: (id: string, data: ReminderSettings & { startDate: string; expectedActiveId: string | null }) => apiRequest<FollowedProgram>(`/program-follow/follow/${id}`, { method: "POST", json: data }),
  stop: (id: string) => apiRequest<void>(`/program-follow/${id}/stop`, { method: "POST" }),
  reminders: (id: string, data: ReminderSettings) => apiRequest<FollowedProgram>(`/program-follow/${id}/reminders`, { method: "PATCH", json: data }),
  registerDevice: (token: string) => apiRequest<void>("/program-follow/devices", { method: "POST", json: { token } }),
  unregisterDevice: (token: string) => apiRequest<void>("/program-follow/devices", { method: "DELETE", json: { token } })
};
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
export const localTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
export const shortDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
