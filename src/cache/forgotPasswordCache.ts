import { LRUCache } from "lru-cache";

/**
 * Staged forgot-password OTP data held in-memory.
 *
 * Replaces the old JWT-token-based approach which leaked the
 * hashed OTP to the frontend (brute-forceable for 6-digit space).
 */
interface ForgotPasswordStagingData {
  otp: string;
  attempts: number;
}

/**
 * Global LRU cache for forgot-password OTP staging.
 *
 * - max 5 000 entries
 * - 10-minute TTL (OTP expiry window)
 * - Key: normalised email address
 */
const forgotPasswordCache = new LRUCache<string, ForgotPasswordStagingData>({
  max: 5000,
  ttl: 600_000,
});

export { forgotPasswordCache };
export type { ForgotPasswordStagingData };
