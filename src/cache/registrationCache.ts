import { LRUCache } from "lru-cache";

/**
 * Staged registration data held in-memory until OTP verification.
 *
 * The entire form payload, hashed password, OTP, and attempt counter
 * are bundled together so the verify step can atomically promote the
 * data into PostgreSQL without a second round-trip to the client.
 */
interface RegistrationStagingData {
  otp: string;
  attempts: number;
  payload: {
    registerNumber: string;
    fullName: string;
    email: string;
    phone: string;
    college: string;
    department: string;
    year: number;
    gender: "Male" | "Female" | "Other";
    passwordHash: string;
  };
}

/**
 * Global LRU cache for registration staging.
 *
 * - max 5 000 entries (~2.5 MB peak)
 * - 5-minute TTL (OTP expiry window)
 * - Key: normalised email address
 */
const registrationCache = new LRUCache<string, RegistrationStagingData>({
  max: 5000,
  ttl: 300_000,
});

/**
 * In-process mutex that prevents two concurrent `/verify` requests
 * for the same email from both succeeding.
 *
 * Safe in single-process Node.js because Set operations are
 * synchronous and execute before any `await` yields control.
 */
const verificationMutex = new Set<string>();

export { registrationCache, verificationMutex };
export type { RegistrationStagingData };
