import { app } from "./app.js";
import { env } from "./config/env.js";
import { reportError, flushMonitoring } from "./common/monitoring.js";

import { beginDraining } from "./common/lifecycle.js";

const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`FitSync API listening on port ${env.PORT}`);
});

let stopping = false;
function shutdown(code: number) {
  if (stopping) return;
  stopping = true;
  beginDraining();
  console.log(JSON.stringify({ level: "info", event: "server_draining", code }));
  const deadline = setTimeout(() => {
    server.closeAllConnections();
    process.exit(code || 1);
  }, 25_000);
  deadline.unref();
  server.closeIdleConnections();
  server.close(async () => {
    await flushMonitoring();
    process.exit(code);
  });
}
process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));
process.on("uncaughtException", (error) => {
  reportError(error, "uncaughtException");
  shutdown(1);
});
process.on("unhandledRejection", (error) => {
  reportError(error, "unhandledRejection");
  shutdown(1);
});
