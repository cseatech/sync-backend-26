import app from "./app";
import config from "./config/env";
import { initializeWorker } from "./workers/index";

/**
 * Bootstrap sequence:
 *
 * 1. Start graphile-worker runner (creates its infrastructure tables)
 * 2. Start Express HTTP server
 *
 * All steps must succeed or the process exits with code 1.
 */
async function startServer(): Promise<void> {
  try {
    // ── 1. Graphile worker (Session Pooler, port 5432) ──
    // Worker needs LISTEN/NOTIFY which requires session mode.
    // Falls back to DATABASE_URL if WORKER_DATABASE_URL is not set.
    const workerUrl = config.WORKER_DATABASE_URL || config.DATABASE_URL;
    if (workerUrl) {
      await initializeWorker(workerUrl);
    } else {
      console.warn(
        "⚠️  DATABASE_URL not set — graphile-worker will not start",
      );
    }

    // ── 2. HTTP server ──
    app.listen(config.PORT, () => {
      console.log(`🚀 Server running on http://localhost:${config.PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
