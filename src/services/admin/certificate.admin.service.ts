import { eq } from "drizzle-orm";

import { db } from "../../db/index";
import { users, events, winners } from "../../db/schema";

import { signCertificateToken, CertificateAdminJwtPayload } from "../../utils/jwt";

import { throwError, handleDbError } from "../../utils/serviceError";

import {
  CertificateLoginInput,
  CertificateInsertWinnerInput,
} from "../../validators/certificate.validator";

// ── Login ─────────────────────────────────────────────────────────────────────

/**
 * Authenticate a certificate admin using credentials stored exclusively
 * in environment variables — no database query is made.
 *
 * Returns a signed JWT with role "certificate_admin" on success.
 *
 * @param payload - { username, password } from the request body
 */
async function login(payload: CertificateLoginInput): Promise<{ token: string }> {
  const inputUsername = payload.username.trim().toLowerCase();
  const inputPassword = payload.password.trim();

  const envAdmin = (process.env.CERT_ADMIN || "admin").trim().toLowerCase();
  const envPassword = (process.env.CERT_ADMIN_PW || "admin123").trim();

  const usernameMatch = inputUsername === envAdmin;
  const passwordMatch = inputPassword === envPassword ;

  if (!usernameMatch || !passwordMatch) {
    throwError("Invalid certificate admin credentials", 401);
  }

  const tokenPayload: CertificateAdminJwtPayload = {
    role: "certificate_admin",
  };

  const token = signCertificateToken(tokenPayload);

  return { token };
}

// ── Insert Winner ─────────────────────────────────────────────────────────────

/**
 * Insert a new winner record for the given event.
 *
 * Resolves csea_code → user_id internally, validates the event exists,
 * then performs a strict INSERT. If the (event_id, user_id) primary key
 * already exists the DB raises 23505 which handleDbError maps to 409.
 *
 * Internal user_id is never returned to the caller.
 *
 * @param payload - Validated body containing csea_code, event_id, position
 */
async function insertWinner(payload: CertificateInsertWinnerInput) {
  const { csea_code, event_id, position } = payload;

  // ── 1. Resolve csea_code → user record ──────────────────────────────────
  const [user] = await db
    .select({
      user_id: users.user_id,
      csea_code: users.csea_code,
      full_name: users.full_name,
    })
    .from(users)
    .where(eq(users.csea_code, csea_code))
    .limit(1);

  if (!user) {
    throwError(`No user found with CSEA code: ${csea_code}`, 404);
  }

  // ── 2. Verify the event exists ───────────────────────────────────────────
  const [event] = await db
    .select({
      event_id: events.event_id,
      event_name: events.event_name,
    })
    .from(events)
    .where(eq(events.event_id, event_id))
    .limit(1);

  if (!event) {
    throwError(`No event found with ID: ${event_id}`, 404);
  }

  const now = new Date();

  // ── 3. Strict INSERT — DB PK constraint prevents duplicates ─────────────
  try {
    await db.insert(winners).values({
      event_id: event!.event_id,
      user_id: user!.user_id,
      position,
      awarded_at: now,
    });
  } catch (error) {
    handleDbError(error);
  }

  // ── 4. Return public-safe payload (no internal user_id) ─────────────────
  return {
    csea_code: user!.csea_code,
    full_name: user!.full_name,
    event_id: event!.event_id,
    event_name: event!.event_name,
    position,
    awarded_at: now,
  };
}

// ── List Winners ─────────────────────────────────────────────────────────────

/**
 * Fetch all winner records joined with user and event data.
 *
 * Returns a flat, public-safe list ordered by event name then position.
 * Internal user_id is never included in the output.
 */
async function getAllWinners() {
  const rows = await db
    .select({
      event_name: events.event_name,
      csea_code: users.csea_code,
      full_name: users.full_name,
      position: winners.position,
      awarded_at: winners.awarded_at,
    })
    .from(winners)
    .innerJoin(users, eq(winners.user_id, users.user_id))
    .innerJoin(events, eq(winners.event_id, events.event_id))
    .orderBy(events.event_name, winners.position);

  return rows;
}

export default { login, insertWinner, getAllWinners };
