/**
 * k6 Load Test — Registration Flow (Initiate → Verify)
 *
 * Tests the /api/v1/test/register/initiate and /api/v1/test/register/verify
 * endpoints under concurrent load. Uses test routes (no rate limiter)
 * with a fixed OTP of "123456".
 *
 * Usage:
 *   1. Start the server:  npx tsx src/server.ts
 *   2. Run the test:      .\k6-bin\k6-v0.56.0-windows-amd64\k6.exe run k6-load-test.js
 *
 * Each virtual user (VU) performs ONE full registration cycle:
 *   POST /test/register/initiate  → wait → POST /test/register/verify
 *
 * The test ramps up to 120 simultaneous VUs, holds for 30s, then ramps down.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

// ── Custom Metrics ───────────────────────────────────────────
const initiateErrors = new Counter("initiate_errors");
const verifyErrors = new Counter("verify_errors");
const initiateDuration = new Trend("initiate_duration", true);
const verifyDuration = new Trend("verify_duration", true);

// ── Test Configuration ───────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";
const FIXED_OTP = "123456";

export const options = {
  // Ramp-up pattern: simulate violent traffic spike
  stages: [
    { duration: "5s", target: 200 },   // Violent spike to 200 VUs in just 5 seconds!
    { duration: "40s", target: 200 },  // Hold absolute peak for 40s
    { duration: "10s", target: 0 },    // Ramp down
  ],

  // Performance thresholds — the test FAILS if these are breached
  thresholds: {
    http_req_duration: ["p(95)<5000"],   // 95% of requests under 5s
    http_req_failed: ["rate<0.05"],      // Less than 5% errors
    initiate_errors: ["count<10"],       // Fewer than 10 initiate failures
    verify_errors: ["count<10"],         // Fewer than 10 verify failures
  },
};

// ── Setup: Clean previous test users ─────────────────────────
export function setup() {
  const cleanupRes = http.del(`${BASE_URL}/api/v1/test/cleanup`);
  console.log(`Setup cleanup: ${cleanupRes.status} — ${cleanupRes.body}`);
  return {};
}

// ── Main Test Function (runs per VU iteration) ───────────────
export default function () {
  // Each VU gets a unique email based on VU id + iteration + timestamp
  const uniqueId = `${__VU}_${__ITER}_${Date.now()}`;
  const email = `k6user${uniqueId}@loadtest.local`;

  const payload = {
    register_number: `K6${String(__VU).padStart(4, "0")}${__ITER}`,
    full_name: `K6 Test User ${__VU}`,
    email: email,
    phone: `90000${String(__VU).padStart(5, "0")}`,
    college: "K6 Load Test College",
    department: "Computer Science",
    year: ((__VU % 4) + 1),
    gender: __VU % 2 === 0 ? "Male" : "Female",
    password: "TestPass@123",
  };

  const headers = { "Content-Type": "application/json" };

  // ── Step 1: Initiate Registration ──────────────────────────
  const initiateRes = http.post(
    `${BASE_URL}/api/v1/test/register/initiate`,
    JSON.stringify(payload),
    { headers, tags: { name: "initiate" } }
  );

  initiateDuration.add(initiateRes.timings.duration);

  const initiateOk = check(initiateRes, {
    "initiate: status 200": (r) => r.status === 200,
    "initiate: success true": (r) => {
      try { return JSON.parse(r.body).success === true; }
      catch { return false; }
    },
  });

  if (!initiateOk) {
    initiateErrors.add(1);
    console.log(`❌ Initiate failed [VU${__VU}]: ${initiateRes.status} — ${initiateRes.body}`);
    return; // Skip verify if initiate failed
  }

  // Small pause between initiate and verify (simulates user reading email)
  sleep(0.5);

  // ── Step 2: Verify Registration ────────────────────────────
  const verifyPayload = {
    email: email,
    otp: FIXED_OTP,
  };

  const verifyRes = http.post(
    `${BASE_URL}/api/v1/test/register/verify`,
    JSON.stringify(verifyPayload),
    { headers, tags: { name: "verify" } }
  );

  verifyDuration.add(verifyRes.timings.duration);

  const verifyOk = check(verifyRes, {
    "verify: status 200": (r) => r.status === 200,
    "verify: success true": (r) => {
      try { return JSON.parse(r.body).success === true; }
      catch { return false; }
    },
    "verify: has cseaCode": (r) => {
      try { return JSON.parse(r.body).data.cseaCode !== undefined; }
      catch { return false; }
    },
  });

  if (!verifyOk) {
    verifyErrors.add(1);
    console.log(`❌ Verify failed [VU${__VU}]: ${verifyRes.status} — ${verifyRes.body}`);
  }

  // Pace each VU iteration
  sleep(1);
}

// ── Teardown: Clean test users ───────────────────────────────
export function teardown() {
  const cleanupRes = http.del(`${BASE_URL}/api/v1/test/cleanup`);
  console.log(`Teardown cleanup: ${cleanupRes.status} — ${cleanupRes.body}`);
}
