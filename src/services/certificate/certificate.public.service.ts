import { eq, and } from "drizzle-orm";

import { db } from "../../db/index";
import { users, events, winners, eventParticipation } from "../../db/schema";

import { throwError } from "../../utils/serviceError";

import {
  GetCertificatesByCodeParams,
  DownloadCertificateQuery,
} from "../../validators/certificate.public.validator";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Shape returned by getUserCertificates. */
interface CertificateMetadata {
  certificate_type: "Appreciation" | "Participation";
  event_id: number;
  event_name: string;
  position: number | null;
  awarded_at: Date | null;
}

/** Verified data used by the PDF service to draw the certificate. */
interface CertificateData {
  full_name: string;
  department: string;
  year: number;
  event_name: string;
  position?: number | null;
}

// ── Get Certificates by CSEA Code ─────────────────────────────────────────────

/**
 * Fetch all certificates (both Appreciation and Participation) for a user
 * identified by their CSEA code.
 *
 * @param params - Validated URL params containing csea_code
 */
async function getUserCertificates(
  params: GetCertificatesByCodeParams,
): Promise<CertificateMetadata[]> {
  // 1. Fetch winning / appreciation certificates
  const winnerRows = await db
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

  const appreciationCerts: CertificateMetadata[] = winnerRows.map((row) => ({
    certificate_type: "Appreciation" as const,
    event_id: row.event_id,
    event_name: row.event_name,
    position: row.position,
    awarded_at: row.awarded_at,
  }));

  // 2. Fetch participation certificates from event_participation
  const participationRows = await db
    .select({
      register_number: users.register_number,
      event_id: events.event_id,
      event_name: events.event_name,
      created_at: eventParticipation.created_at,
    })
    .from(eventParticipation)
    .innerJoin(users, eq(eventParticipation.user_id, users.user_id))
    .innerJoin(events, eq(eventParticipation.event_id, events.event_id))
    .where(eq(users.csea_code, params.csea_code))
    .orderBy(events.event_name);

  const participationCerts: CertificateMetadata[] = participationRows.map((row) => ({
    certificate_type: "Participation" as const,
    event_id: row.event_id,
    event_name: row.event_name,
    position: null,
    awarded_at: row.created_at,
  }));

  // Return appreciation certs first, followed by participation certs
  return [...appreciationCerts, ...participationCerts];
}

// ── Verify Winner for Appreciation PDF Download ───────────────────────────────

/**
 * Strictly verify that the given cseaCode holds a winning record for the
 * given eventId. Throws 403 Forbidden when no record exists.
 */
async function verifyAndGetWinnerData(
  query: DownloadCertificateQuery,
): Promise<CertificateData> {
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

// ── Verify Participant for Participation PDF Download ─────────────────────────

/**
 * Strictly verify that the given cseaCode participated in the given eventId.
 * Throws 403 Forbidden when no participation record exists.
 */
async function verifyAndGetParticipationData(
  query: DownloadCertificateQuery,
): Promise<CertificateData> {
  const { cseaCode, eventId } = query;

  const [row] = await db
    .select({
      full_name: users.full_name,
      department: users.department,
      year: users.year,
      event_name: events.event_name,
    })
    .from(eventParticipation)
    .innerJoin(users, eq(eventParticipation.user_id, users.user_id))
    .innerJoin(events, eq(eventParticipation.event_id, events.event_id))
    .where(
      and(
        eq(users.csea_code, cseaCode),
        eq(eventParticipation.event_id, eventId),
      ),
    )
    .limit(1);

  if (!row) {
    throwError(
      "Forbidden: no participation record found for this user and event",
      403,
    );
  }

  return {
    ...row,
    position: null,
  };
}

export {
  getUserCertificates,
  verifyAndGetWinnerData,
  verifyAndGetParticipationData,
  CertificateMetadata,
  CertificateData,
};

