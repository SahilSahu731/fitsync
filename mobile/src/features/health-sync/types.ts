export type HealthSource = "healthkit" | "healthconnect";
export type HealthMetric = "steps" | "sleep" | "weight";
export type HealthValue = { metric: HealthMetric; date: string; value: number };
export type HealthReadResult = { source: HealthSource; values: HealthValue[]; warnings: string[] };
export type HealthAvailability = { available: boolean; reason?: string };
export interface HealthAdapter {
  source: HealthSource;
  available(): Promise<HealthAvailability>;
  requestReadAccess(): Promise<void>;
  readLastWeek(now: Date): Promise<HealthReadResult>;
  openSettings(): Promise<void>;
}
export type HealthSyncSettings = { version: 1; enabled: boolean; lastImportedAt: string | null };
export const disabledHealthSync = (): HealthSyncSettings => ({ version: 1, enabled: false, lastImportedAt: null });
export const sourceLabel = (source: HealthSource) => source === "healthkit" ? "Apple Health" : "Health Connect";
