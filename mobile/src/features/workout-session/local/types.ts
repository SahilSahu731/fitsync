import type { WorkoutSession } from "@/features/workouts/types";

export type LocalWorkoutStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type WorkoutSyncStatus =
  "LOCAL_ONLY" | "DIRTY" | "SYNCING" | "SYNCED" | "CONFLICT" | "ERROR";

export interface LocalWorkoutRow {
  local_id: string;

  user_id: string;

  client_workout_id: string;

  server_id: string | null;

  server_revision: number | null;

  payload_json: string;

  local_status: LocalWorkoutStatus;

  sync_status: WorkoutSyncStatus;

  dirty: number;

  local_version: number;

  last_synced_payload_json: string | null;

  last_sync_error: string | null;

  retry_count: number;

  next_retry_at: string | null;

  created_at: string;

  updated_at: string;

  last_synced_at: string | null;
}

export interface LocalWorkoutRecord {
  localId: string;

  userId: string;

  clientWorkoutId: string;

  serverId: string | null;

  serverRevision: number | null;

  workout: WorkoutSession;

  localStatus: LocalWorkoutStatus;

  syncStatus: WorkoutSyncStatus;

  dirty: boolean;

  localVersion: number;

  lastSyncedWorkout: WorkoutSession | null;

  lastSyncError: string | null;

  retryCount: number;

  nextRetryAt: string | null;

  createdAt: string;

  updatedAt: string;

  lastSyncedAt: string | null;
}

export interface NewLocalWorkout {
  localId: string;

  userId: string;

  clientWorkoutId: string;

  workout: WorkoutSession;

  createdAt: string;
}
