export type SyncFailureKind =
  "NETWORK" | "AUTH" | "CONFLICT" | "SERVER" | "VALIDATION" | "UNKNOWN";

export interface SyncFailure {
  kind: SyncFailureKind;

  message: string;

  status?: number;

  currentRevision?: number;
}
