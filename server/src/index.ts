import { app } from "./app.js";
import { env } from "./config/env.js";
import { reportError, flushMonitoring } from "./common/monitoring.js";

import { createShutdown } from "./common/shutdown.js";
import { flushApiTracing } from "./middleware/request-log.js";

const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`FitSync API listening on port ${env.PORT}`);
});

const shutdown = createShutdown(server, async () => {
  await Promise.all([flushMonitoring(), flushApiTracing()]);
});
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
