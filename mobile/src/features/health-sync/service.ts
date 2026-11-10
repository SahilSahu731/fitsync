import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncJournal, updateJournal } from "../progress/journal";
import { planHealthImport } from "./model";
import { getHealthAdapter } from "./native";
import { disabledHealthSync, type HealthSyncSettings } from "./types";

const key = (ownerId: string) => `fitsync.health-sync.v1.${ownerId}`;
const versions = new Map<string, number>();
const running = new Map<string, Promise<HealthImportResult>>();
export type HealthImportResult = { imported: number; unchanged: number; protectedEntries: number; warnings: string[]; importedAt: string };

export async function readHealthSyncSettings(ownerId: string): Promise<HealthSyncSettings> {
  const raw = await AsyncStorage.getItem(key(ownerId));
  if (!raw) return disabledHealthSync();
  const parsed = JSON.parse(raw);
  if (parsed.version !== 1 || typeof parsed.enabled !== "boolean" || (parsed.lastImportedAt !== null && (typeof parsed.lastImportedAt !== "string" || !Number.isFinite(Date.parse(parsed.lastImportedAt))))) throw new Error("Could not read your health import preference. Your saved progress has been kept.");
  return parsed;
}

export async function disconnectHealthSync(ownerId: string) {
  versions.set(ownerId, (versions.get(ownerId) ?? 0) + 1);
  const settings = await readHealthSyncSettings(ownerId);
  await AsyncStorage.setItem(key(ownerId), JSON.stringify({ ...settings, enabled: false }));
}

export function importHealthForUser(ownerId: string, isCurrent: () => boolean, requestAccess = false): Promise<HealthImportResult> {
  if (running.has(ownerId)) return running.get(ownerId)!;
  const version = versions.get(ownerId) ?? 0;
  const check = () => { if (!isCurrent() || (versions.get(ownerId) ?? 0) !== version) throw new Error("Health import stopped because the account or import setting changed."); };
  const task = (async () => {
    check();
    const adapter = getHealthAdapter();
    const availability = await adapter.available();
    if (!availability.available) throw new Error(availability.reason || "Health import is unavailable.");
    let settings = await readHealthSyncSettings(ownerId);
    check();
    if (requestAccess) {
      await adapter.requestReadAccess(); check();
      settings = { ...settings, enabled: true };
      await AsyncStorage.setItem(key(ownerId), JSON.stringify(settings));
    }
    if (!settings.enabled) throw new Error("Enable health import before reading device records.");
    const now = new Date(); const result = await adapter.readLastWeek(now); check();
    let counts = { imported: 0, unchanged: 0, protectedEntries: 0 };
    await updateJournal(ownerId, journal => {
      check();
      const plan = planHealthImport(journal, result.source, result.values, now);
      counts = { imported: plan.imported, unchanged: plan.unchanged, protectedEntries: plan.protectedEntries };
      return plan.journal;
    });
    check();
    const importedAt = now.toISOString();
    await AsyncStorage.setItem(key(ownerId), JSON.stringify({ ...settings, lastImportedAt: importedAt }));
    const warnings = [...result.warnings];
    try { await syncJournal(ownerId, () => isCurrent() && (versions.get(ownerId) ?? 0) === version); }
    catch { warnings.push("Saved on this device. Cloud sync will retry when you open Progress."); }
    check();
    return { ...counts, warnings, importedAt };
  })().finally(() => { if (running.get(ownerId) === task) running.delete(ownerId); });
  running.set(ownerId, task);
  return task;
}
