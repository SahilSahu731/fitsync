import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiSessionKey } from "@/src/services/api";
import { syncJournal, updateJournal } from "../progress/journal";
import { planHealthImport } from "./model";
import { getHealthAdapter } from "./native";
import { disabledHealthSync, type HealthSyncSettings, type HealthMetric } from "./types";

const key = (ownerId: string) => `fitsync.health-sync.v1.${ownerId}`;
const versions = new Map<string, number>();
const deletedOwners = new Set<string>();
const running = new Map<
  string,
  { operation: Promise<HealthImportResult>; callers: Set<() => boolean> }
>();
const readVersions = new Map<string, number>();
const appliedReads = new Map<string, number>();
const settingWrites = new Map<string, Promise<unknown>>();
const latestResults = new Map<string, { session: number; result: HealthImportResult }>();
function updateSettings(
  ownerId: string,
  update: (settings: HealthSyncSettings) => HealthSyncSettings,
) {
  const writing = (settingWrites.get(ownerId) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      if (deletedOwners.has(ownerId))
        throw new Error("This account’s health preferences have been removed.");
      const settings = update(await readHealthSyncSettings(ownerId));
      await AsyncStorage.setItem(key(ownerId), JSON.stringify(settings));
      return settings;
    });
  settingWrites.set(ownerId, writing);
  return writing;
}
const listeners = new Set<(ownerId: string) => void>();
export function subscribeHealthSync(listener: (ownerId: string) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function notifySettings(ownerId: string) {
  for (const listener of listeners) {
    try {
      listener(ownerId);
    } catch {
      /* A view cannot interrupt a saved preference. */
    }
  }
}
export type HealthImportResult = {
  imported: number;
  unchanged: number;
  protectedEntries: number;
  warnings: string[];
  importedAt: string;
};

export function latestHealthImportResult(ownerId: string): HealthImportResult | null {
  const saved = latestResults.get(ownerId);
  return !deletedOwners.has(ownerId) && saved?.session === apiSessionKey() ? saved.result : null;
}

export async function readHealthSyncSettings(ownerId: string): Promise<HealthSyncSettings> {
  const raw = await AsyncStorage.getItem(key(ownerId));
  if (!raw) return disabledHealthSync();
  const parsed = JSON.parse(raw);
  if (
    parsed.version !== 1 ||
    typeof parsed.enabled !== "boolean" ||
    (parsed.metrics !== undefined &&
      (!Array.isArray(parsed.metrics) ||
        !parsed.metrics.length ||
        !parsed.metrics.every((metric: string) =>
          ["steps", "sleep", "weight"].includes(metric),
        ))) ||
    (parsed.lastImportedAt !== null &&
      (typeof parsed.lastImportedAt !== "string" ||
        !Number.isFinite(Date.parse(parsed.lastImportedAt))))
  )
    throw new Error(
      "Could not read your health import preference. Your saved progress has been kept.",
    );
  return parsed;
}

export async function disconnectHealthSync(ownerId: string) {
  versions.set(ownerId, (versions.get(ownerId) ?? 0) + 1);
  await updateSettings(ownerId, (settings) => ({ ...settings, enabled: false }));
  latestResults.delete(ownerId);
  notifySettings(ownerId);
}

export function deleteHealthSyncSettings(ownerId: string): Promise<void> {
  deletedOwners.add(ownerId);
  latestResults.delete(ownerId);
  versions.set(ownerId, (versions.get(ownerId) ?? 0) + 1);
  const deleting = (settingWrites.get(ownerId) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      await AsyncStorage.removeItem(key(ownerId));
      notifySettings(ownerId);
    });
  settingWrites.set(ownerId, deleting);
  return deleting;
}

export function importHealthForUser(
  ownerId: string,
  isCurrent: () => boolean,
  requestAccess = false,
  metrics?: HealthMetric[],
): Promise<HealthImportResult> {
  const session = apiSessionKey();
  const version = versions.get(ownerId) ?? 0;
  const accountKey = JSON.stringify([session, ownerId]);
  const taskKey = JSON.stringify([session, ownerId, version, requestAccess, metrics ?? null]);
  const existing = running.get(taskKey);
  const callerResult = (operation: Promise<HealthImportResult>, callers: Set<() => boolean>) =>
    operation
      .then((result) => {
        if (!isCurrent()) throw new Error("Health import stopped because the account changed.");
        return result;
      })
      .finally(() => {
        callers.delete(isCurrent);
      });
  if (existing) {
    existing.callers.add(isCurrent);
    return callerResult(existing.operation, existing.callers);
  }
  const callers = new Set([isCurrent]);
  const current = () => [...callers].some((valid) => valid());
  const check = () => {
    if (
      deletedOwners.has(ownerId) ||
      !current() ||
      apiSessionKey() !== session ||
      (versions.get(ownerId) ?? 0) !== version
    )
      throw new Error("Health import stopped because the account or import setting changed.");
  };
  const task = (async () => {
    check();
    const adapter = getHealthAdapter();
    const availability = await adapter.available();
    if (!availability.available)
      throw new Error(availability.reason || "Health import is unavailable.");
    let settings = await readHealthSyncSettings(ownerId);
    check();
    if (requestAccess) {
      if (
        metrics &&
        (!metrics.length ||
          metrics.some((metric) => !["steps", "sleep", "weight"].includes(metric)))
      )
        throw new Error("Choose at least one supported activity to import.");
      await adapter.requestReadAccess(metrics);
      check();
      settings = await updateSettings(ownerId, (latest) => {
        check();
        const selected = latest.enabled
          ? latest.metrics && metrics
            ? [...new Set([...latest.metrics, ...metrics])]
            : undefined
          : metrics;
        return { ...latest, enabled: true, metrics: selected };
      });
      check();
    }
    if (!settings.enabled) throw new Error("Enable health import before reading device records.");
    const now = new Date();
    const readVersion = (readVersions.get(accountKey) ?? 0) + 1;
    readVersions.set(accountKey, readVersion);
    const result = await adapter.readLastWeek(now, settings.metrics);
    check();
    let counts = { imported: 0, unchanged: 0, protectedEntries: 0 };
    const saved = await updateJournal(ownerId, (journal) => {
      check();
      if (readVersion < (appliedReads.get(accountKey) ?? 0)) return journal;
      appliedReads.set(accountKey, readVersion);
      const plan = planHealthImport(journal, result.source, result.values, now);
      counts = {
        imported: plan.imported,
        unchanged: plan.unchanged,
        protectedEntries: plan.protectedEntries,
      };
      return plan.journal;
    });
    check();
    const importedAt = now.toISOString();
    await updateSettings(ownerId, (latest) => {
      check();
      return {
        ...latest,
        lastImportedAt:
          latest.lastImportedAt && Date.parse(latest.lastImportedAt) > now.getTime()
            ? latest.lastImportedAt
            : importedAt,
      };
    });
    check();
    const warnings = [...result.warnings];
    try {
      if (saved.pending.length)
        await syncJournal(
          ownerId,
          () =>
            current() && apiSessionKey() === session && (versions.get(ownerId) ?? 0) === version,
          true,
        );
    } catch {
      warnings.push("Saved on this device. Cloud sync will retry when you open Progress.");
    }
    check();
    const summary = { ...counts, warnings, importedAt };
    // Automatic imports and manual imports share permission/sync status with all
    // visible consumers. A slower older read must not replace a newer warning.
    if (readVersion === appliedReads.get(accountKey)) {
      latestResults.set(ownerId, { session, result: summary });
      notifySettings(ownerId);
    }
    return summary;
  })().finally(() => {
    if (running.get(taskKey)?.operation === task) running.delete(taskKey);
  });
  running.set(taskKey, { operation: task, callers });
  return callerResult(task, callers);
}
