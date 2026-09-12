import type { MuscleRange, PersonalRecordType, ProgressRange } from "./types";

export const progressKeys = {
  all: ["progress"] as const,

  preferences: () => [...progressKeys.all, "preferences"] as const,

  overview: (range: ProgressRange) =>
    [...progressKeys.all, "overview", range] as const,

  records: (
    filters: {
      exerciseId?: string | null;

      recordType?: PersonalRecordType | null;
    } = {},
  ) => [...progressKeys.all, "records", filters] as const,

  workoutRecords: (sessionId: string) =>
    [...progressKeys.all, "workout-records", sessionId] as const,

  exercise: (exerciseId: string, range: ProgressRange) =>
    [...progressKeys.all, "exercise", exerciseId, range] as const,

  exerciseSessions: (exerciseId: string) =>
    [...progressKeys.all, "exercise-sessions", exerciseId] as const,

  muscles: (range: MuscleRange) =>
    [...progressKeys.all, "muscles", range] as const,

  calendar: (months: number) =>
    [...progressKeys.all, "calendar", months] as const,
};
