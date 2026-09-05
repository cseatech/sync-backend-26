import crypto from "crypto";

/**
 * Generate a cryptographically secure 6-digit numeric OTP.
 *
 * Uses `crypto.randomInt()` which relies on the OS CSPRNG,
 * making the output unpredictable and safe for verification flows.
 */
function generateOTP(): string {
  return String(crypto.randomInt(100_000, 1_000_000));
}

/**
 * Timing-attack-safe comparison of two OTP strings.
 *
 * Uses `crypto.timingSafeEqual()` so that the comparison time is
 * constant regardless of where the first mismatch occurs — an
 * attacker cannot infer correct digits from response latency.
 *
 * Returns false immediately (without leaking timing info) when
 * the lengths differ, which can't happen with valid 6-digit OTPs.
 */
function compareOTP(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

export { generateOTP, compareOTP };
