import { run, makeWorkerUtils, WorkerUtils, Runner } from "graphile-worker";
import { sendOtpTask } from "./tasks/send-otp";
import { generateTicketTask } from "./tasks/generate-ticket";

let workerUtils: WorkerUtils | null = null;
let runner: Runner | null = null;

/**
 * Initialise the graphile-worker runner and utility handle.
 *
 * Creates infrastructure tables in the `graphile_worker` schema on
 * first run. Must be called once during server bootstrap.
 */
async function initializeWorker(connectionString: string): Promise<void> {
  workerUtils = await makeWorkerUtils({ connectionString });

  runner = await run({
    connectionString,
    concurrency: 5,
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
 * Gracefully stop the worker runner and release the utility pool.
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
}

export { initializeWorker, addJob, shutdownWorker };
