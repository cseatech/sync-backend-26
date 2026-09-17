/**
 * ════════════════════════════════════════════════════════════════
 *  PERFORMANCE TEST — Registration Pipeline via Graphile Worker
 * ════════════════════════════════════════════════════════════════
 *
 *  Tests 140 registration initiations + verifications end-to-end.
 *  Bypasses the HTTP layer (and its rate limiter) by calling the
 *  service layer directly, while still exercising the full pipeline:
 *
 *    initiateRegistration → LRU cache + send-otp worker job
 *    verifyRegistration   → DB insert  + generate-ticket worker job
 *
 *  Connection budget (Supabase free tier = 15 max):
 *    App pg Pool   → max 8 connections (Transaction Pooler, port 6543)
 *    Graphile      → ~5 connections (concurrency 3 + LISTEN + utils, Session Pooler, port 5432)
 *    Total         → ~13 connections (safely under 15)
 *
 *  ZeptoMail API for transactional email delivery.
 *  140 registrations × 2 emails each (OTP + confirmation) = 280 emails.
 *
 *  IMPORTANT: Your backend server must NOT be running simultaneously,
 *  because this script initialises its own Graphile worker instance.
 *
 *  Usage:  npx tsx perf-test-registration.ts
 * ════════════════════════════════════════════════════════════════
 */

import "dotenv/config";

import { initializeWorker, shutdownWorker } from "../src/workers/index";
import registrationService from "../src/services/auth/registration.service";
import { registrationCache } from "../src/cache/registrationCache";
import { db, pool } from "../src/db/index";
import { users } from "../src/db/schema";
import { like, inArray } from "drizzle-orm";

// ── Configuration ────────────────────────────────────────────
// STRESS TEST MODE: Fire ALL 140 registrations simultaneously.
// The pg Pool (max 8) + Graphile (~6) = 14 connections (under Supabase's 15).
// Pool queues overflow requests — no crash, just queuing.

const TOTAL_DUMMY = 113; // dummy (non-real) emails
const BATCH_SIZE = 120;  // ALL AT ONCE — true stress test
const BATCH_DELAY_MS = 0; // no delay needed with single batch

// 7 real email addresses — appended LAST so they process after dummies
const REAL_EMAILS = [
  "arshadnr1608@gmail.com",
  "lokashakthivelsp@gmail.com",
  "arshadnr2k6@gmail.com",
  "frnds2k6@gmail.com",
  "abacus2k25@gmail.com",
  "arshadnr16082k6@gmail.com",
  "nrarshad1608@gmail.com",
];

// Total = TOTAL_DUMMY + REAL_EMAILS.length = 113 + 7 = 120 (= 240 emails)

// ── Helpers ──────────────────────────────────────────────────

function makeDummyPayload(index: number, email: string) {
  return {
    register_number: `REG${String(index).padStart(4, "0")}`,
    full_name: `PerfTest User ${index}`,
    email,
    phone: `90000${String(index).padStart(5, "0")}`,
    college: "Test Engineering College",
    department: "Computer Science",
    year: ((index % 4) + 1) as 1 | 2 | 3 | 4,
    gender: (index % 2 === 0 ? "Male" : "Female") as "Male" | "Female",
    password: "TestPass@123",
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Poll the Graphile Worker jobs table until all jobs are processed or timeout.
 *
 * Completed jobs are DELETED from the table by Graphile, so remaining rows
 * are either still pending or have failed. This gives us ground truth about
 * whether emails were actually sent.
 */
async function waitForWorkerDrain(
  label: string,
  expectedJobs: number,
  timeoutMs: number,
): Promise<{ completed: number; failed: number; pending: number }> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE last_error IS NOT NULL)::int AS failed
      FROM graphile_worker._private_jobs
    `);

    const remaining = result.rows[0]?.total ?? 0;
    const failed = result.rows[0]?.failed ?? 0;
    const pending = remaining - failed;
    const completed = expectedJobs - remaining;

    // All jobs processed — success!
    if (remaining === 0) {
      process.stdout.write(
        `\r   ✅ ${label}: ${expectedJobs}/${expectedJobs} jobs processed!              \n`,
      );
      return { completed: expectedJobs, failed: 0, pending: 0 };
    }

    // Only failed jobs remain — no point waiting further
    if (pending === 0 && failed > 0) {
      process.stdout.write(
        `\r   ❌ ${label}: ${completed} done, ${failed} FAILED (no more pending)        \n`,
      );
      return { completed, failed, pending: 0 };
    }

    // Still processing — show live progress
    process.stdout.write(
      `\r   ⏳ ${label}: ${completed}/${expectedJobs} done, ${pending} pending, ${failed} failed...`,
    );

    await sleep(3000);
  }

  // Timeout reached
  const result = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE last_error IS NOT NULL)::int AS failed
    FROM graphile_worker._private_jobs
  `);

  const remaining = result.rows[0]?.total ?? 0;
  const failed = result.rows[0]?.failed ?? 0;
  const pending = remaining - failed;
  const completed = expectedJobs - remaining;

  process.stdout.write(
    `\r   ⏰ ${label}: TIMEOUT — ${completed} done, ${pending} still pending, ${failed} failed    \n`,
  );
  return { completed, failed, pending };
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const workerUrl = process.env.WORKER_DATABASE_URL || process.env.DATABASE_URL;
  if (!workerUrl) {
    console.error("❌ WORKER_DATABASE_URL / DATABASE_URL is not set in .env");
    process.exit(1);
  }

  console.log("═══════════════════════════════════════════════════════");
  console.log("  PERF TEST — 120 Registrations via Graphile Worker");
  console.log("═══════════════════════════════════════════════════════\n");

  // ── 0. Clean stale jobs from previous crashed runs ──
  console.log("🧹 Cleaning stale Graphile jobs from previous runs...");
  try {
    const { Pool: PgPool } = await import("pg");
    const cleanPool = new PgPool({ connectionString: workerUrl, max: 1, ssl: { rejectUnauthorized: false } });
    const res = await cleanPool.query(
      `DELETE FROM graphile_worker._private_jobs RETURNING id`
    );
    console.log(`   🗑️  Cleared ${res.rowCount} stale job(s)\n`);
    await cleanPool.end();
  } catch (err: any) {
    console.log(`   ⚠️  Could not clean stale jobs: ${err.message}\n`);
  }

  // ── 0b. Clean leftover test users from previous crashed runs ──
  console.log("🧹 Cleaning leftover test users from previous runs...");
  try {
    const dummyDel = await db
      .delete(users)
      .where(like(users.email, "perftest%@example.com"))
      .returning({ email: users.email });

    const realDel = await db
      .delete(users)
      .where(inArray(users.email, REAL_EMAILS.map((e) => e.trim().toLowerCase())))
      .returning({ email: users.email });

    const totalCleaned = dummyDel.length + realDel.length;
    console.log(`   🗑️  Cleared ${totalCleaned} leftover user(s)\n`);
  } catch (err: any) {
    console.log(`   ⚠️  Could not clean leftover users: ${err.message}\n`);
  }

  // ── 1. Initialise Graphile worker (Session Pooler, port 5432) ──
  console.log("⏳ Initialising Graphile worker...");
  await initializeWorker(workerUrl);
  console.log("✅ Worker ready (concurrency=3, pollInterval=1000ms)");
  console.log(`   Express pool: max 8 (Transaction Pooler 6543) | Worker: ~5 (Session Pooler 5432)\n`);

  // ── 2. Build all 140 payloads ──
  const allEmails: string[] = [];
  const otpMap = new Map<string, string>(); // email → OTP (extracted from cache)

  // Dummy emails
  for (let i = 1; i <= TOTAL_DUMMY; i++) {
    allEmails.push(`perftest${i}@example.com`);
  }
  // Real emails at the END
  allEmails.push(...REAL_EMAILS);

  console.log(`📧 Total registrations: ${allEmails.length}`);
  console.log(`   ├─ Dummy emails:     ${TOTAL_DUMMY}`);
  console.log(`   └─ Real emails:      ${REAL_EMAILS.length}`);
  console.log(`   Batch size: ${BATCH_SIZE}, Delay: ${BATCH_DELAY_MS}ms\n`);

  // ══════════════════════════════════════════════════════════
  //  PHASE 1: Initiate Registration (sends OTP emails)
  // ══════════════════════════════════════════════════════════

  console.log("────────────────────────────────────────────────────");
  console.log("  PHASE 1: Initiate Registration (OTP emails)");
  console.log("────────────────────────────────────────────────────\n");

  const phase1Start = Date.now();
  let initiateSuccess = 0;
  let initiateErrors = 0;

  const totalBatches = Math.ceil(allEmails.length / BATCH_SIZE);

  for (let batchStart = 0; batchStart < allEmails.length; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, allEmails.length);
    const batch = allEmails.slice(batchStart, batchEnd);
    const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;

    const batchStart_t = Date.now();

    const results = await Promise.allSettled(
      batch.map((email, i) => {
        const globalIndex = batchStart + i + 1;
        const payload = makeDummyPayload(globalIndex, email);
        return registrationService.initiateRegistration(payload);
      })
    );

    const batchDuration = Date.now() - batchStart_t;

    // Extract OTPs from cache immediately after initiation
    for (const email of batch) {
      const normalised = email.trim().toLowerCase();
      const staged = registrationCache.get(normalised);
      if (staged) {
        otpMap.set(normalised, staged.otp);
      }
    }

    // Count results
    let batchOk = 0;
    let batchFail = 0;
    for (const r of results) {
      if (r.status === "fulfilled") {
        initiateSuccess++;
        batchOk++;
      } else {
        initiateErrors++;
        batchFail++;
        console.error(`   ❌ ${r.reason?.message || r.reason}`);
      }
    }

    console.log(
      `   Batch ${String(batchNum).padStart(2, " ")}/${totalBatches}  ` +
      `[${batchStart + 1}–${batchEnd}]  ` +
      `✅ ${batchOk}  ❌ ${batchFail}  ` +
      `(${formatMs(batchDuration)})`
    );

    // Delay between batches (let worker/mail service breathe)
    if (batchEnd < allEmails.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const phase1Duration = Date.now() - phase1Start;

  console.log(`\n   Phase 1 Summary (service layer):`);
  console.log(`   ├─ Jobs queued:  ${initiateSuccess}`);
  console.log(`   ├─ Queue errors: ${initiateErrors}`);
  console.log(`   ├─ OTPs captured from cache: ${otpMap.size}`);
  console.log(`   └─ Total time: ${formatMs(phase1Duration)}\n`);

  // Poll the Graphile Worker jobs table for real email delivery status
  console.log("   ⏳ Waiting for Graphile worker to send OTP emails (polling every 3s, timeout 120s)...\n");
  const otpJobResult = await waitForWorkerDrain("send-otp", initiateSuccess, 120_000);
  console.log();

  // ══════════════════════════════════════════════════════════
  //  PHASE 2: Verify Registration (sends confirmation + QR)
  // ══════════════════════════════════════════════════════════

  console.log("────────────────────────────────────────────────────");
  console.log("  PHASE 2: Verify Registration (Confirmation + QR)");
  console.log("────────────────────────────────────────────────────\n");

  const phase2Start = Date.now();
  let verifySuccess = 0;
  let verifyErrors = 0;
  const cseaCodes: string[] = [];

  const verifyEmails = Array.from(otpMap.keys());
  const verifyTotalBatches = Math.ceil(verifyEmails.length / BATCH_SIZE);

  for (let batchStart = 0; batchStart < verifyEmails.length; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, verifyEmails.length);
    const batch = verifyEmails.slice(batchStart, batchEnd);
    const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;

    const batchStart_t = Date.now();

    const results = await Promise.allSettled(
      batch.map((email) => {
        const otp = otpMap.get(email)!;
        return registrationService.verifyRegistration({ email, otp });
      })
    );

    const batchDuration = Date.now() - batchStart_t;

    let batchOk = 0;
    let batchFail = 0;
    for (const r of results) {
      if (r.status === "fulfilled") {
        verifySuccess++;
        batchOk++;
        cseaCodes.push(r.value.cseaCode);
      } else {
        verifyErrors++;
        batchFail++;
        console.error(`   ❌ ${r.reason?.message || r.reason}`);
      }
    }

    console.log(
      `   Batch ${String(batchNum).padStart(2, " ")}/${verifyTotalBatches}  ` +
      `[${batchStart + 1}–${batchEnd}]  ` +
      `✅ ${batchOk}  ❌ ${batchFail}  ` +
      `(${formatMs(batchDuration)})`
    );

    // Delay between verify batches
    if (batchEnd < verifyEmails.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const phase2Duration = Date.now() - phase2Start;

  console.log(`\n   Phase 2 Summary (service layer):`);
  console.log(`   ├─ Jobs queued:  ${verifySuccess}`);
  console.log(`   ├─ Queue errors: ${verifyErrors}`);
  console.log(`   ├─ CSEA codes generated: ${cseaCodes.length}`);
  console.log(`   └─ Total time: ${formatMs(phase2Duration)}\n`);

  // Poll the Graphile Worker jobs table for real ticket email delivery status
  console.log("   ⏳ Waiting for Graphile worker to send confirmation emails (polling every 3s, timeout 180s)...\n");
  const ticketJobResult = await waitForWorkerDrain("generate-ticket", verifySuccess, 180_000);
  console.log();

  // ══════════════════════════════════════════════════════════
  //  PHASE 3: Results
  // ══════════════════════════════════════════════════════════

  console.log("════════════════════════════════════════════════════");
  console.log("  FINAL RESULTS");
  console.log("════════════════════════════════════════════════════\n");

  const totalDuration = Date.now() - phase1Start;

  console.log(`  📊 Service Layer (queuing jobs)`);
  console.log(`  ├─ Total registrations attempted: ${allEmails.length}`);
  console.log(`  ├─ Phase 1 (Initiate + OTP):      ${formatMs(phase1Duration)}`);
  console.log(`  ├─ Phase 2 (Verify + QR):          ${formatMs(phase2Duration)}`);
  console.log(`  ├─ Total elapsed:                  ${formatMs(totalDuration)}`);
  console.log(`  ├─ Initiate queued/failed:         ${initiateSuccess}/${initiateErrors}`);
  console.log(`  └─ Verify queued/failed:           ${verifySuccess}/${verifyErrors}`);
  console.log();

  console.log(`  📧 Worker Email Delivery (ground truth)`);
  console.log(`  ├─ OTP emails:`);
  console.log(`  │  ├─ Sent:    ${otpJobResult.completed}`);
  console.log(`  │  ├─ Failed:  ${otpJobResult.failed}`);
  console.log(`  │  └─ Pending: ${otpJobResult.pending}`);
  console.log(`  ├─ Ticket emails:`);
  console.log(`  │  ├─ Sent:    ${ticketJobResult.completed}`);
  console.log(`  │  ├─ Failed:  ${ticketJobResult.failed}`);
  console.log(`  │  └─ Pending: ${ticketJobResult.pending}`);
  const totalEmailsSent = otpJobResult.completed + ticketJobResult.completed;
  const totalEmailsFailed = otpJobResult.failed + ticketJobResult.failed;
  const totalEmailsPending = otpJobResult.pending + ticketJobResult.pending;
  console.log(`  └─ Total: ${totalEmailsSent} sent, ${totalEmailsFailed} failed, ${totalEmailsPending} pending`);
  console.log();

  if (totalEmailsFailed > 0 || totalEmailsPending > 0) {
    console.log(`  ⚠️  WARNING: Not all emails were delivered successfully!`);
    console.log();
  }

  console.log(`  📬 Real emails (expected delivery):`);
  for (const email of REAL_EMAILS) {
    const normalised = email.trim().toLowerCase();
    const hadOtp = otpMap.has(normalised);
    console.log(`     ${hadOtp ? "✅" : "❌"} ${email}`);
  }
  console.log();

  if (cseaCodes.length > 0) {
    console.log(`  🎟️  Sample CSEA codes (first 10):`);
    for (const code of cseaCodes.slice(0, 10)) {
      console.log(`     ${code}`);
    }
    console.log();
  }

  // ══════════════════════════════════════════════════════════
  //  PHASE 4: Cleanup — delete all test users from DB
  // ══════════════════════════════════════════════════════════

  console.log("────────────────────────────────────────────────────");
  console.log("  CLEANUP: Removing test users from database");
  console.log("────────────────────────────────────────────────────\n");

  try {
    // Delete dummy users (perftest*@example.com)
    const dummyResult = await db
      .delete(users)
      .where(like(users.email, "perftest%@example.com"))
      .returning({ email: users.email });

    console.log(`   🗑️  Deleted ${dummyResult.length} dummy user(s)`);

    // Delete real test users
    const realResult = await db
      .delete(users)
      .where(inArray(users.email, REAL_EMAILS.map((e) => e.trim().toLowerCase())))
      .returning({ email: users.email });

    console.log(`   🗑️  Deleted ${realResult.length} real test user(s)`);
    console.log();
  } catch (err: any) {
    console.error(`   ❌ Cleanup error: ${err.message}`);
  }

  // ── Shutdown ──
  console.log("⏳ Shutting down worker and database pool...");
  await shutdownWorker();
  await pool.end();
  console.log("✅ Done. All resources released.\n");
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
