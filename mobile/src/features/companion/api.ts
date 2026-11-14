import { apiRequest } from "@/src/services/api";

export type Readiness = {
  sleepHours?: number;
  energy?: number;
  soreness?: { muscle: string; level: number }[];
  availableMinutes?: number;
  note?: string;
};
export type Milestone = {
  type: "strength" | "consistency" | "measurement";
  title: string;
  target: number;
  unit: string;
  exerciseId?: string;
  metric?: string;
  deadline?: string;
  baseline?: number;
  completedAt?: string;
};
export type ReminderPreferences = {
  enabled: boolean;
  time: string;
  days: number[];
  quietStart: string;
  quietEnd: string;
  snoozeMinutes: number;
  timezone: string;
};
export type Experiment = {
  title: string;
  hypothesis: string;
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  metric: "sessions" | "volume" | "strength" | "measurement";
  exerciseId?: string;
  measurement?: string;
  notes?: string;
};
export type Specialisation = {
  muscle: string;
  startsOn: string;
  weeks: 4 | 8;
  additionalSetsPerWeek: number;
  notes?: string;
};
export type RecordData = {
  readiness: Readiness;
  goal: Milestone;
  reminders: ReminderPreferences;
  experiment: Experiment;
  specialisation: Specialisation;
};
export type CompanionRecord<K extends keyof RecordData = keyof RecordData> = {
  id: string;
  kind: K;
  date: string | null;
  data: RecordData[K];
  revision: number;
  updatedAt: string;
};
export type ProgressPhoto = {
  id: string;
  date: string;
  view: "front" | "side" | "back";
  caption: string;
  url: string;
  urlExpiresAt: string;
  width: number;
  height: number;
};
export type CoachShare = {
  id: string;
  label: string;
  fields: ("workouts" | "plan")[];
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
};
export type CompanionState = {
  records: CompanionRecord[];
  photos: ProgressPhoto[];
  shares: CoachShare[];
};
export type ReplacementEvidence = { exerciseId: string; date: string; requestId: string };
export type MonthlyReport = {
  month: string;
  generatedAt: string;
  text: string;
  summary: unknown;
  workouts: unknown[];
  measurements: unknown[];
};
export const defaultReminders = (): ReminderPreferences => ({
  enabled: false,
  time: "18:00",
  days: [1, 2, 3, 4, 5],
  quietStart: "22:00",
  quietEnd: "08:00",
  snoozeMinutes: 30,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
});
export function companionForOwner(ownerId: string) {
  const request = <T>(path: string, options: Parameters<typeof apiRequest>[1] = {}) =>
    apiRequest<T>(`/companion${path}`, { ...options, expectedOwnerId: ownerId });
  return {
    state: () => request<CompanionState>("/state"),
    exerciseUsage: () => request<{ replacements: ReplacementEvidence[] }>("/exercise-usage"),
    save: <K extends keyof RecordData>(
      id: string,
      kind: K,
      data: RecordData[K],
      expectedRevision: number,
      date?: string,
    ) =>
      request<CompanionRecord<K>>(`/records/${encodeURIComponent(id)}`, {
        method: "PUT",
        json: { kind, data, expectedRevision, ...(date ? { date } : {}) },
      }),
    remove: (record: CompanionRecord) =>
      request(`/records/${encodeURIComponent(record.id)}?revision=${record.revision}`, {
        method: "DELETE",
      }),
    uploadPhoto: (form: FormData) => request<ProgressPhoto>("/photos", { method: "POST", form }),
    deletePhoto: (id: string) => request(`/photos/${encodeURIComponent(id)}`, { method: "DELETE" }),
    share: (data: { label: string; fields: ("workouts" | "plan")[]; expiresInDays: number }) =>
      request<{ token: string; share: CoachShare }>("/shares", { method: "POST", json: data }),
    revoke: (id: string) => request(`/shares/${encodeURIComponent(id)}`, { method: "DELETE" }),
    report: (month: string, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC") =>
      request<MonthlyReport>(
        `/reports?month=${encodeURIComponent(month)}&timezone=${encodeURIComponent(timezone)}`,
      ),
  };
}
