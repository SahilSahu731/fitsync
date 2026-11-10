import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";
import { calendarEvent } from "./model";

export async function openTrainingCalendar(date: string, title: string, minutes?: number) {
  if (Platform.OS !== "android" && Platform.OS !== "ios") throw new Error("Open FitSync on your phone to add a device calendar event.");
  if (!requireOptionalNativeModule("ExpoCalendar")) throw new Error("Calendar export needs the new FitSync development build. Install it and reopen the app.");
  // SDK 57 explicitly supports the legacy system form bridge. The root
  // createEventInCalendarAsync export is a throwing migration warning.
  // No device calendars or existing events are read or uploaded.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Calendar = require("expo-calendar/legacy") as typeof import("expo-calendar/legacy");
  const result = await Calendar.createEventInCalendarAsync(calendarEvent(date, title, minutes));
  // Android only reports that the editor closed, even when the user cancels.
  return result.action === "saved" ? "saved" : result.action === "canceled" ? "cancelled" : "closed";
}
