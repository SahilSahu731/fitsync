import type {
  TemplateExerciseInput,
  WorkoutTemplate,
} from "@/features/workouts/types";

export interface RoutineCreateInput {
  client_template_id: string;
  name: string;
  description: string | null;
  folder_client_id: string | null;
  is_favorite: boolean;
  position: number;
  archived: boolean;
  exercises: TemplateExerciseInput[];
}

export interface RoutineUpdateInput extends RoutineCreateInput {
  revision: number;
}

export interface FolderCreateInput {
  client_folder_id: string;
  name: string;
  position: number;
}

export interface FolderUpdateInput {
  revision: number;
  name: string;
  position: number;
  archived: boolean;
}

export type RoutineSyncStatus =
  "LOCAL_ONLY" | "DIRTY" | "SYNCING" | "SYNCED" | "CONFLICT" | "ERROR";

export interface LocalRoutineRecord {
  localId: string;
  userId: string;
  clientTemplateId: string;
  serverId: string | null;
  serverRevision: number | null;
  template: WorkoutTemplate;
  archived: boolean;
  syncStatus: RoutineSyncStatus;
  dirty: boolean;
  localVersion: number;
  lastSyncedTemplate: WorkoutTemplate | null;
  lastSyncError: string | null;
  retryCount: number;
  nextRetryAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string | null;
}

export interface LocalFolderRecord {
  localId: string;
  userId: string;
  clientFolderId: string;
  serverId: string | null;
  serverRevision: number | null;
  name: string;
  position: number;
  archived: boolean;
  syncStatus: RoutineSyncStatus;
  dirty: boolean;
  localVersion: number;
  lastSyncError: string | null;
  retryCount: number;
  nextRetryAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string | null;
}
