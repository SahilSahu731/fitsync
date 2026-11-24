import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { healthDays, latestWeightValues, sleepValues, type SleepInterval } from "./model";
import type { HealthAdapter, HealthMetric, HealthValue } from "./types";

// Import native modules only inside guarded calls. Existing binaries and Expo Go
// continue to run manual tracking without crashing at module evaluation time.
function healthConnect() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("react-native-health-connect") as typeof import("react-native-health-connect");
}
const permissions = ["Steps", "SleepSession", "Weight"] as const;
const buildReason =
  "Health import is not available in this version of FitSync. You can still track manually.";

const androidAdapter: HealthAdapter = {
  source: "healthconnect",
  async available() {
    try {
      const hc = healthConnect();
      const status = await hc.getSdkStatus();
      if (status === hc.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED)
        return {
          available: false,
          reason: "Install or update Health Connect, then return to FitSync.",
        };
      if (status !== hc.SdkAvailabilityStatus.SDK_AVAILABLE)
        return {
          available: false,
          reason:
            "Health Connect is unavailable on this device. Manual tracking is still available.",
        };
      return (await hc.initialize())
        ? { available: true }
        : {
            available: false,
            reason: "Health Connect could not start. Try again after opening Health Connect.",
          };
    } catch {
      return { available: false, reason: buildReason };
    }
  },
  async requestReadAccess() {
    const granted = await healthConnect().requestPermission(
      permissions.map((recordType) => ({ accessType: "read", recordType })),
    );
    if (
      !granted.some(
        (permission) =>
          permission.accessType === "read" &&
          (permissions as readonly string[]).includes(permission.recordType),
      )
    )
      throw new Error(
        "No health access was granted. You can keep tracking manually or change access in Health Connect.",
      );
  },
  async readLastWeek(now) {
    const hc = healthConnect();
    const granted = await hc.getGrantedPermissions();
    const canRead = (type: (typeof permissions)[number]) =>
      granted.some(
        (permission) => permission.accessType === "read" && permission.recordType === type,
      );
    const days = healthDays(now);
    const dates = days.map((day) => day.date);
    const values: HealthValue[] = [];
    const warnings: string[] = [];
    const read = async (metric: HealthMetric, action: () => Promise<void>) => {
      try {
        await action();
      } catch {
        warnings.push(
          `${metric === "sleep" ? "Sleep" : metric === "weight" ? "Weight" : "Steps"} could not be read. Check access in Health Connect and retry.`,
        );
      }
    };
    if (canRead("Steps"))
      await read("steps", async () => {
        for (const day of days) {
          if (day.end <= day.start) continue;
          // Health Connect aggregation applies its data-origin priorities rather
          // than summing raw phone/watch records that may describe the same steps.
          const aggregate = await hc.aggregateRecord({
            recordType: "Steps",
            timeRangeFilter: {
              operator: "between",
              startTime: day.start.toISOString(),
              endTime: day.end.toISOString(),
            },
          });
          if (Number.isFinite(aggregate.COUNT_TOTAL) && aggregate.COUNT_TOTAL > 0)
            values.push({
              metric: "steps",
              date: day.date,
              value: Math.round(aggregate.COUNT_TOTAL),
            });
        }
      });
    else warnings.push("Steps access is off.");
    const start = new Date(days[0].start);
    start.setDate(start.getDate() - 1);
    const timeRangeFilter = {
      operator: "between" as const,
      startTime: start.toISOString(),
      endTime: now.toISOString(),
    };
    if (canRead("SleepSession"))
      await read("sleep", async () => {
        const intervals: SleepInterval[] = [];
        let pageToken: string | undefined;
        do {
          const result = await hc.readRecords("SleepSession", { timeRangeFilter, pageToken });
          for (const session of result.records) {
            const wakeDate = healthDays(new Date(session.endTime)).at(-1)!.date;
            // Do not substitute time-in-bed for measured asleep time. Sessions
            // without known asleep stages remain missing rather than invented.
            for (const stage of session.stages ?? [])
              if (
                [
                  hc.SleepStageType.SLEEPING,
                  hc.SleepStageType.LIGHT,
                  hc.SleepStageType.DEEP,
                  hc.SleepStageType.REM,
                ].includes(stage.stage as 2 | 4 | 5 | 6)
              )
                intervals.push({
                  start: Date.parse(stage.startTime),
                  end: Date.parse(stage.endTime),
                  wakeDate,
                });
          }
          pageToken = result.pageToken;
        } while (pageToken);
        values.push(...sleepValues(intervals, dates));
      });
    else warnings.push("Sleep access is off.");
    if (canRead("Weight"))
      await read("weight", async () => {
        const samples: { at: number; kg: number }[] = [];
        let pageToken: string | undefined;
        do {
          const result = await hc.readRecords("Weight", { timeRangeFilter, pageToken });
          for (const record of result.records)
            samples.push({ at: Date.parse(record.time), kg: record.weight.inKilograms });
          pageToken = result.pageToken;
        } while (pageToken);
        values.push(...latestWeightValues(samples, dates));
      });
    else warnings.push("Weight access is off.");
    return { source: "healthconnect", values, warnings };
  },
  async openSettings() {
    healthConnect().openHealthConnectSettings();
  },
};

export function getHealthAdapter(): HealthAdapter {
  const adapter = androidAdapter;
  if (
    Platform.OS !== "android" ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  ) {
    return {
      ...adapter,
      available: async () => ({
        available: false,
        reason:
          Platform.OS === "web" ? "Health import is available in the Android app." : buildReason,
      }),
      requestReadAccess: async () => {
        throw new Error(buildReason);
      },
      readLastWeek: async () => {
        throw new Error(buildReason);
      },
    };
  }
  return adapter;
}
