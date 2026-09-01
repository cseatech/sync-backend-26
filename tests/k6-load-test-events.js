import http from "k6/http";
import { check } from "k6";

// ── Configuration ────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    public_events_spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2s", target: 250 },  // Instant violent spike to 250 users
        { duration: "60s", target: 250 }, // Hold absolute peak for a full minute
        { duration: "5s", target: 0 },    // Quick ramp down
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"], // Errors should be less than 1%
    http_req_duration: ["p(95)<500"], // 95% of requests under 500ms
  },
};

const BASE_URL = "http://localhost:5000/api/v1";

// ── The Load Test (Public Events Fetch) ──────────────────────────────────
export default function () {
  // Simulate a user visiting the homepage and fetching the list of all events
  const res = http.get(`${BASE_URL}/events`);

  check(res, {
    "status 200": (r) => r.status === 200,
    "success true": (r) => r.json("success") === true,
  });
}