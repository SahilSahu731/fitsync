import { reportError, flushMonitoring } from "../common/monitoring.js";
import { runProgramReminders } from "../modules/program-follow/program.reminder-worker.js";

try {
  console.log("Program reminders:", await runProgramReminders());
} catch (error) {
  reportError(error, "reminders");
  process.exitCode = 1;
} finally {
  await flushMonitoring();
}
