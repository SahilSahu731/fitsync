import type { Server } from "node:http";
import { beginDraining } from "./lifecycle.js";

export function createShutdown(
  server: Pick<Server, "close" | "closeIdleConnections" | "closeAllConnections">,
  flush: () => Promise<void>,
  exit: (code: number) => void = (code) => process.exit(code),
) {
  let stopping = false;
  let exitCode = 0;
  return (code: number) => {
    // A fatal error during a graceful stop must still produce a failed exit.
    exitCode = Math.max(exitCode, code);
    if (stopping) return;
    stopping = true;
    beginDraining();
    console.log(JSON.stringify({ level: "info", event: "server_draining", code: exitCode }));
    const deadline = setTimeout(() => {
      server.closeAllConnections();
      exit(exitCode || 1);
    }, 25_000);
    deadline.unref();
    // Stop accepting connections before reaping idle ones to avoid a keep-alive race.
    server.close(async () => {
      try {
        await flush();
      } catch {
        exitCode = 1;
      }
      clearTimeout(deadline);
      exit(exitCode);
    });
    server.closeIdleConnections();
  };
}
