import { runProgramReminders } from "../src/modules/program-follow/program.reminder-worker.js";
runProgramReminders().then(result => console.log("Program reminders:", result)).catch(error => {
  console.error("Program reminder worker failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
