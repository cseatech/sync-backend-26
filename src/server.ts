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
    // ── 1. Graphile worker ──
    if (config.DATABASE_URL) {
      await initializeWorker(config.DATABASE_URL);
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
