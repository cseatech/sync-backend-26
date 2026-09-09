import app from "./app";
import config from "./config/env";
import { initializeWorker, shutdownWorker } from "./workers/index";
import { pool } from "./db/index";
import type { Server } from "http";

/**
 * Bootstrap sequence:
 *
 * 1. Start graphile-worker runner (creates its infrastructure tables)
 * 2. Start Express HTTP server
 * 3. Register graceful shutdown handlers
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
    const server: Server = app.listen(config.PORT, () => {
      console.log(`🚀 Server running on http://localhost:${config.PORT}`);
    });

    // ── 3. Graceful shutdown ──
    registerShutdown(server);
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown sequence:
 *
 * 1. Stop accepting new HTTP connections
 * 2. Stop the Graphile Worker runner + release its pool
 * 3. Drain the main DB pool
 * 4. Exit cleanly
 *
 * Prevents leaked connections and dropped in-flight
 * requests during deploys, restarts, or Ctrl+C.
 */
function registerShutdown(server: Server): void {
  let shuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return; // Prevent double-shutdown
    shuttingDown = true;

    console.log(`\n🛑 ${signal} received — shutting down gracefully…`);

    // 1. Stop accepting new connections; let in-flight requests finish
    server.close(() => {
      console.log("   ✓ HTTP server closed");
    });

    // 2. Stop Graphile Worker
    try {
      await shutdownWorker();
      console.log("   ✓ Graphile Worker stopped");
    } catch (err) {
      console.error("   ✗ Error stopping Graphile Worker:", err);
    }

    // 3. Drain main DB pool
    try {
      await pool.end();
      console.log("   ✓ DB pool drained");
    } catch (err) {
      console.error("   ✗ Error draining DB pool:", err);
    }

    console.log("👋 Goodbye!");
    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer();
