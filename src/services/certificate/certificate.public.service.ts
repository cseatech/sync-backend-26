import { eq, and } from "drizzle-orm";

import { db } from "../../db/index";
import { users, events, winners } from "../../db/schema";

import { throwError } from "../../utils/serviceError";

import {
  GetCertificatesByCodeParams,
  DownloadCertificateQuery,
} from "../../validators/certificate.public.validator";
// ── Types ─────────────────────────────────────────────────────────────────────

/** Shape returned by getUserCertificates — one item per winning record. */
interface CertificateMetadata {
  certificate_type: "Winner";
  event_id: number;
  event_name: string;
  position: number;
  awarded_at: Date | null;
}

/** Verified winner data used by the PDF service to draw the certificate. */
interface VerifiedWinnerData {
  full_name: string;
  department: string;
  year: number;
  event_name: string;
  position: number;
}

// ── Get Certificates by CSEA Code ─────────────────────────────────────────────

/**
 * Fetch all winning certificates for a user identified by their CSEA code.
 *
 * Performs an INNER JOIN across winners → users → events.
 * Returns an empty array when the user has no certificates (not an error).
 *
 * @param params - Validated URL params containing csea_code
 */
async function getUserCertificates(
  params: GetCertificatesByCodeParams,
): Promise<CertificateMetadata[]> {
  const rows = await db
    .select({
      register_number: users.register_number,
      event_id: events.event_id,
      event_name: events.event_name,
      position: winners.position,
      awarded_at: winners.awarded_at,
    })
    .from(winners)
    .innerJoin(users, eq(winners.user_id, users.user_id))
    .innerJoin(events, eq(winners.event_id, events.event_id))
    .where(eq(users.csea_code, params.csea_code))
    .orderBy(events.event_name, winners.position);
  return rows.map((row) => ({
    certificate_type: "Winner" as const,
    event_id: row.event_id,
    event_name: row.event_name,
    position: row.position,
    awarded_at: row.awarded_at,
  }));
}

// ── Verify Winner for PDF Download ───────────────────────────────────────────

/**
 * Strictly verify that the given cseaCode holds a winning record for the
 * given eventId. Throws 403 Forbidden when no record exists.
 *
 * Returns the data needed by the PDF service (full_name, event_name, position).
 *
 * @param query - Validated query params containing cseaCode and eventId
 */
async function verifyAndGetWinnerData(
  query: DownloadCertificateQuery,
): Promise<VerifiedWinnerData> {
  const { cseaCode, eventId } = query;

  const [row] = await db
    .select({
      full_name: users.full_name,
      department: users.department,
      year: users.year,
      event_name: events.event_name,
      position: winners.position,
    })
    .from(winners)
    .innerJoin(users, eq(winners.user_id, users.user_id))
    .innerJoin(events, eq(winners.event_id, events.event_id))
    .where(
      and(
        eq(users.csea_code, cseaCode),
        eq(winners.event_id, eventId),
      ),
    )
    .limit(1);

  if (!row) {
    throwError(
      "Forbidden: no winning record found for this user and event",
      403,
    );
  }

  return row;
}

export {
  getUserCertificates,
  verifyAndGetWinnerData,
  CertificateMetadata,
  VerifiedWinnerData,
};
