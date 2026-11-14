import { apiRequest } from "@/src/services/api";
import type { Equipment, Experience, Goal } from "@/src/context/session";
import type { WorkoutSession } from "@/src/features/workouts/api";

export type CoachingProfile = {
  goal: Goal;
  experience: Experience;
  trainingDays: number;
  minutesPerWorkout: 30 | 45 | 60;
  equipment: Equipment;
};
export type PrescriptionExercise = {
  exerciseId: string;
  name: string;
  pattern: string;
  trackingType: string;
  sets: number;
  repsMin: number | null;
  repsMax: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  restSeconds: number;
  reason: string;
};
export type Prescription = {
  minutes: number;
  equipment: Equipment;
  effort: "normal" | "easy";
  explanation: string[];
  exercises: PrescriptionExercise[];
};
export type CoachingDay = {
  id: string;
  week: number;
  day: number;
  date: string;
  name: string;
  status: "planned" | "overdue" | "active" | "completed";
  revision: number;
  workoutId: string | null;
  prescription: Prescription;
};
export type CoachingPlan = {
  id: string;
  name: string;
  goal: Goal;
  equipment: Equipment;
  trainingDays: number;
  minutesPerWorkout: number;
  startDate: string;
  timezone: string;
  explanation: string[];
  sessions: CoachingDay[];
};
export type PlanPreview = Omit<CoachingPlan, "id" | "sessions"> & {
  sessions: Omit<CoachingDay, "id" | "status" | "revision" | "workoutId">[];
};
export type CoachingState = { profile: CoachingProfile | null; plan: CoachingPlan | null };
export type WeeklyReview = {
  period: { start: string; end: string };
  headline: string;
  observations: string[];
  actions: string[];
  metrics: { workouts: number; completedSets: number; minutes: number };
  dataNotes: string[];
};
export type AdaptInput = {
  minutes?: number;
  equipment?: Equipment;
  effort?: "normal" | "easy";
  swapExerciseId?: string;
  preview?: boolean;
};
export function coachingForOwner(expectedOwnerId?: string) {
  const request = <T>(path: string, options: Parameters<typeof apiRequest>[1] = {}) =>
    apiRequest<T>(path, { ...options, expectedOwnerId });
  return {
    preview: (data: { startDate: string; timezone: string; preferences: CoachingProfile }) =>
      request<PlanPreview>("/coaching/plans/preview", { method: "POST", json: data }),
    get: () => request<CoachingState>("/coaching"),
    create: (data: {
      requestId: string;
      startDate: string;
      timezone: string;
      replacePlanId?: string;
      preferences?: CoachingProfile;
    }) => request<CoachingPlan>("/coaching/plans", { method: "POST", json: data }),
    start: (id: string, requestId: string) =>
      request<WorkoutSession>(`/coaching/sessions/${id}/start`, {
        method: "POST",
        json: { requestId },
      }),
    adapt: (day: CoachingDay, requestId: string, input: AdaptInput) =>
      request<CoachingPlan>(`/coaching/sessions/${day.id}/adapt`, {
        method: "POST",
        json: { requestId, expectedRevision: day.revision, ...input },
      }),
    progression: (day: CoachingDay, requestId: string, preview = false, incrementKg?: number) =>
      request<CoachingPlan>(`/coaching/sessions/${day.id}/progression`, {
        method: "POST",
        json: {
          requestId,
          expectedRevision: day.revision,
          preview,
          ...(incrementKg === undefined ? {} : { incrementKg }),
        },
      }),
    reschedule: (day: CoachingDay, requestId: string, date: string) =>
      request<CoachingPlan>(`/coaching/sessions/${day.id}/reschedule`, {
        method: "POST",
        json: { requestId, expectedRevision: day.revision, date },
      }),
    review: () => request<WeeklyReview>("/coaching/review"),
  };
}
export const coachingApi = coachingForOwner();
