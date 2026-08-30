import { run, makeWorkerUtils, WorkerUtils, Runner } from "graphile-worker";
import { Pool as PgPool } from "pg";
import { sendOtpTask } from "./tasks/send-otp";
import { generateTicketTask } from "./tasks/generate-ticket";

let workerUtils: WorkerUtils | null = null;
let runner: Runner | null = null;
let workerPool: PgPool | null = null;

/**
 * Initialise the graphile-worker runner and utility handle.
 *
 * IMPORTANT: We create ONE shared pg Pool (max 6) and pass it to both
 * `makeWorkerUtils` and `run`. Without this, each would create its own
 * unbounded pool, easily exceeding Supabase session pooler's 15-conn limit.
 *
 * Connection budget (session pooler, port 5432):
 *   3 concurrent workers + 1 LISTEN/NOTIFY + 1 workerUtils + 1 headroom = 6
 */
async function initializeWorker(connectionString: string): Promise<void> {
  workerPool = new PgPool({
    connectionString,
    max: 6,
    ssl: { rejectUnauthorized: false },
  });

  workerUtils = await makeWorkerUtils({ pgPool: workerPool });

  runner = await run({
    pgPool: workerPool,
    concurrency: 3,
    noHandleSignals: false,
    pollInterval: 1000,
    taskList: {
      "send-otp": sendOtpTask,
      "generate-ticket": generateTicketTask,
    },
  });

  console.log("✅ Graphile worker runner started");
}

/**
 * Enqueue a strongly-typed job for background execution.
 *
 * The job is persisted to PostgreSQL (`graphile_worker.jobs`) and
 * picked up by the runner via pub/sub — no Redis required.
 */
async function addJob(
  taskName: string,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!workerUtils) {
    throw new Error(
      "Worker not initialised. Call initializeWorker() at startup.",
    );
  }
  await workerUtils.addJob(taskName, payload);
}

/**
 * Gracefully stop the worker runner and release the shared pool.
 *
 * When using `pgPool` (not `connectionString`), Graphile does NOT
 * release the pool automatically — we must do it ourselves.
 */
async function shutdownWorker(): Promise<void> {
  if (runner) {
    await runner.stop();
    runner = null;
  }
  if (workerUtils) {
    await workerUtils.release();
    workerUtils = null;
  }
  if (workerPool) {
    await workerPool.end();
    workerPool = null;
  }
}

export { initializeWorker, addJob, shutdownWorker };

