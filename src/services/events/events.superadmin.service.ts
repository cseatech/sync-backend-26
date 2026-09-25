import { eq, and, sql } from "drizzle-orm";

import { db } from "../../db/index";

import { admins, events, adminAccess } from "../../db/schema";

import { throwError, handleDbError } from "../../utils/serviceError";

/**
 * Verify the requesting admin is a superadmin (privileged = true).
 * Throws 403 if not.
 *
 * @param adminId    - Admin ID from decoded JWT
 * @param privileged - privileged flag from decoded JWT
 */
function assertSuperAdmin(
  adminId: number | undefined,
  privileged: boolean | undefined,
): asserts adminId is number {
  if (!adminId) throwError("Admin ID is required", 401);
  if (!privileged) throwError("Superadmin access required", 403);
}

/**
 * Return all admins assigned to a given event,
 * along with their access metadata.
 *
 * @param eventId    - Event ID from URL param
 * @param adminId    - Admin ID from decoded JWT
 * @param privileged - privileged flag from decoded JWT
 */
async function getEventAdmins(
  eventId: number | string,
  adminId: number | undefined,
  privileged: boolean | undefined,
) {
  assertSuperAdmin(adminId, privileged);

  const parsedId = Number(eventId);
  if (!parsedId) throwError("Event ID is required", 400);

  // Verify event exists
  const [event] = await db
    .select({ event_id: events.event_id, event_name: events.event_name })
    .from(events)
    .where(eq(events.event_id, parsedId))
    .limit(1);

  if (!event) throwError("Event not found", 404);

  // Fetch all assigned admins joined with their profile
  const rows = await db
    .select({
      admin_id: admins.admin_id,
      name: admins.name,
      email: admins.email,
      position: admins.position,
      domain: admins.domain,
      privileged: admins.privileged,
      access_granted_by: adminAccess.access_granted_by,
      access_granted_at: adminAccess.access_granted_at,
    })
    .from(adminAccess)
    .innerJoin(admins, eq(adminAccess.admin_id, admins.admin_id))
    .where(eq(adminAccess.event_id, parsedId));

  return {
    event,
    count: rows.length,
    admins: rows,
  };
}

/**
 * Assign an admin to an event.
 * Prevents duplicate assignments via the unique constraint on (admin_id, event_id).
 *
 * @param eventId       - Event ID from URL param
 * @param targetAdminId - Admin ID from request body
 * @param grantedBy     - Superadmin ID from decoded JWT
 * @param privileged    - privileged flag from decoded JWT
 */
async function assignAdmin(
  eventId: number | string,
  targetAdminId: number | string,
  grantedBy: number | undefined,
  privileged: boolean | undefined,
) {
  assertSuperAdmin(grantedBy, privileged);

  const parsedEventId = Number(eventId);
  const parsedAdminId = Number(targetAdminId);

  if (!parsedEventId) throwError("Event ID is required", 400);
  if (!parsedAdminId) throwError("Admin ID must be a positive integer", 400);

  // Verify event exists
  const [event] = await db
    .select({ event_id: events.event_id, event_name: events.event_name })
    .from(events)
    .where(eq(events.event_id, parsedEventId))
    .limit(1);

  if (!event) throwError("Event not found", 404);

  // Verify target admin exists
  const [targetAdmin] = await db
    .select({
      admin_id: admins.admin_id,
      name: admins.name,
      email: admins.email,
      position: admins.position,
    })
    .from(admins)
    .where(eq(admins.admin_id, parsedAdminId))
    .limit(1);

  if (!targetAdmin) throwError("Admin not found", 404);

  const now = new Date();

  try {
    await db.insert(adminAccess).values({
      admin_id: parsedAdminId,
      event_id: parsedEventId,
      access_granted_by: grantedBy,
      access_granted_at: now,
    });
  } catch (error) {
    handleDbError(error);
  }

  return {
    event,
    assigned_admin: targetAdmin,
    access_granted_by: grantedBy,
    access_granted_at: now,
  };
}

/**
 * Remove an admin's access from an event.
 *
 * @param eventId       - Event ID from URL param
 * @param targetAdminId - Admin ID from request body
 * @param adminId       - Superadmin ID from decoded JWT
 * @param privileged    - privileged flag from decoded JWT
 */
async function removeAdmin(
  eventId: number | string,
  targetAdminId: number | string,
  adminId: number | undefined,
  privileged: boolean | undefined,
) {
  assertSuperAdmin(adminId, privileged);

  const parsedEventId = Number(eventId);
  const parsedAdminId = Number(targetAdminId);

  if (!parsedEventId) throwError("Event ID is required", 400);
  if (!parsedAdminId) throwError("Admin ID must be a positive integer", 400);

  // Verify event exists
  const [event] = await db
    .select({ event_id: events.event_id, event_name: events.event_name })
    .from(events)
    .where(eq(events.event_id, parsedEventId))
    .limit(1);

  if (!event) throwError("Event not found", 404);

  // Verify the admin is actually assigned to this event
  const [existing] = await db
    .select()
    .from(adminAccess)
    .where(
      and(
        eq(adminAccess.admin_id, parsedAdminId),
        eq(adminAccess.event_id, parsedEventId),
      ),
    )
    .limit(1);

  if (!existing) throwError("This admin is not assigned to this event", 404);

  await db
    .delete(adminAccess)
    .where(
      and(
        eq(adminAccess.admin_id, parsedAdminId),
        eq(adminAccess.event_id, parsedEventId),
      ),
    );

  return {
    event,
    removed_admin_id: parsedAdminId,
  };
}

/**
 * Return all system administrators in the database.
 * Superadmin only (privileged = true).
 *
 * @param adminId    - Admin ID from decoded JWT
 * @param privileged - privileged flag from decoded JWT
 */
async function getAllSystemAdmins(
  adminId: number | undefined,
  privileged: boolean | undefined,
) {
  assertSuperAdmin(adminId, privileged);

  const rows = await db
    .select({
      admin_id: admins.admin_id,
      name: admins.name,
      email: admins.email,
      position: admins.position,
      domain: admins.domain,
      privileged: admins.privileged,
    })
    .from(admins);

  return rows;
}

/**
 * Return comprehensive statistics for all events:
 * - Summary: total events, total participations, total teams, total unique users, total rounds, tech vs non-tech breakdowns
 * - Event-wise stats: participation count, team count, rounds count, admin count, winner count, round details
 * - Round-wise stats: round count breakdown, distribution, venue breakdown
 *
 * Superadmin only (privileged = true).
 *
 * @param adminId    - Admin ID from decoded JWT
 * @param privileged - privileged flag from decoded JWT
 */
async function getSuperAdminStats(
  adminId: number | undefined,
  privileged: boolean | undefined,
) {
  assertSuperAdmin(adminId, privileged);

  // 1. Fetch summary metrics
  const summaryResult = await db.execute<{
    total_events: string;
    total_participations: string;
    total_unique_participants: string;
    total_users_registered: string;
    total_teams: string;
    total_rounds: string;
  }>(sql`
    SELECT 
      (SELECT COUNT(*)::int FROM events) AS total_events,
      (SELECT COUNT(*)::int FROM event_participation) AS total_participations,
      (SELECT COUNT(DISTINCT user_id)::int FROM event_participation) AS total_unique_participants,
      (SELECT COUNT(*)::int FROM users) AS total_users_registered,
      (SELECT COUNT(DISTINCT team_no)::int FROM event_participation) AS total_teams,
      (SELECT COUNT(*)::int FROM round) AS total_rounds;
  `);

  const summaryRow = summaryResult.rows[0] || {
    total_events: "0",
    total_participations: "0",
    total_unique_participants: "0",
    total_users_registered: "0",
    total_teams: "0",
    total_rounds: "0",
  };

  // 2. Fetch event-wise statistics
  const eventsResult = await db.execute<{
    event_id: string;
    event_name: string;
    event_type: string;
    description: string | null;
    max_team_size: number | null;
    prize: number | null;
    participation_count: string;
    team_count: string;
    rounds_count: string;
    admin_count: string;
    winner_count: string;
  }>(sql`
    SELECT 
      e.event_id,
      e.event_name,
      e.event_type,
      e.description,
      e.max_team_size,
      e.prize,
      COALESCE(p.participation_count, 0)::int AS participation_count,
      COALESCE(p.team_count, 0)::int AS team_count,
      COALESCE(r.rounds_count, 0)::int AS rounds_count,
      COALESCE(a.admin_count, 0)::int AS admin_count,
      COALESCE(w.winner_count, 0)::int AS winner_count
    FROM events e
    LEFT JOIN (
      SELECT event_id, COUNT(*)::int AS participation_count, COUNT(DISTINCT team_no)::int AS team_count
      FROM event_participation
      GROUP BY event_id
    ) p ON e.event_id = p.event_id
    LEFT JOIN (
      SELECT event_id, COUNT(*)::int AS rounds_count
      FROM round
      GROUP BY event_id
    ) r ON e.event_id = r.event_id
    LEFT JOIN (
      SELECT event_id, COUNT(*)::int AS admin_count
      FROM admin_access
      GROUP BY event_id
    ) a ON e.event_id = a.event_id
    LEFT JOIN (
      SELECT event_id, COUNT(*)::int AS winner_count
      FROM winners
      GROUP BY event_id
    ) w ON e.event_id = w.event_id
    ORDER BY e.event_id ASC;
  `);

  // 3. Fetch all rounds
  const roundsResult = await db.execute<{
    event_id: string;
    round_num: number;
    date: string | null;
    start_time: string | null;
    end_time: string | null;
    venue: string | null;
  }>(sql`
    SELECT event_id, round_num, date, start_time, end_time, venue
    FROM round
    ORDER BY event_id, round_num ASC;
  `);

  // Map rounds to each event
  const roundsByEvent = new Map<number, Array<{
    round_num: number;
    date: string | null;
    start_time: string | null;
    end_time: string | null;
    venue: string | null;
  }>>();

  const venueMap = new Map<string, number>();

  for (const r of roundsResult.rows) {
    const eid = Number(r.event_id);
    if (!roundsByEvent.has(eid)) {
      roundsByEvent.set(eid, []);
    }
    roundsByEvent.get(eid)!.push({
      round_num: r.round_num,
      date: r.date,
      start_time: r.start_time,
      end_time: r.end_time,
      venue: r.venue,
    });

    if (r.venue) {
      const v = r.venue.trim();
      venueMap.set(v, (venueMap.get(v) || 0) + 1);
    }
  }

  // Calculate Tech vs Non-Tech summary & rounds breakdown
  let techEventsCount = 0;
  let nonTechEventsCount = 0;
  let techParticipations = 0;
  let nonTechParticipations = 0;
  let techTeams = 0;
  let nonTechTeams = 0;

  const eventsByRoundCount: Record<string, number> = {};

  const mappedEvents = eventsResult.rows.map((row) => {
    const eid = Number(row.event_id);
    const pCount = Number(row.participation_count) || 0;
    const tCount = Number(row.team_count) || 0;
    const rCount = Number(row.rounds_count) || 0;
    const aCount = Number(row.admin_count) || 0;
    const wCount = Number(row.winner_count) || 0;

    const isTech =
      String(row.event_type || "").toLowerCase().includes("tech") &&
      !String(row.event_type || "").toLowerCase().includes("non");
    if (isTech) {
      techEventsCount++;
      techParticipations += pCount;
      techTeams += tCount;
    } else {
      nonTechEventsCount++;
      nonTechParticipations += pCount;
      nonTechTeams += tCount;
    }

    const roundKey = `${rCount} Round${rCount === 1 ? "" : "s"}`;
    eventsByRoundCount[roundKey] = (eventsByRoundCount[roundKey] || 0) + 1;

    return {
      event_id: eid,
      event_name: row.event_name,
      event_type: row.event_type,
      description: row.description,
      max_team_size: row.max_team_size,
      prize: row.prize,
      participation_count: pCount,
      team_count: tCount,
      rounds_count: rCount,
      admin_count: aCount,
      winner_count: wCount,
      rounds: roundsByEvent.get(eid) || [],
    };
  });

  const venuesList = Array.from(venueMap.entries()).map(([venue, count]) => ({
    venue,
    count,
  }));

  return {
    summary: {
      total_events: Number(summaryRow.total_events) || 0,
      total_participations: Number(summaryRow.total_participations) || 0,
      total_unique_participants: Number(summaryRow.total_unique_participants) || 0,
      total_users_registered: Number(summaryRow.total_users_registered) || 0,
      total_teams: Number(summaryRow.total_teams) || 0,
      total_rounds: Number(summaryRow.total_rounds) || 0,
      tech_events_count: techEventsCount,
      non_tech_events_count: nonTechEventsCount,
      tech_participations: techParticipations,
      non_tech_participations: nonTechParticipations,
      tech_teams: techTeams,
      non_tech_teams: nonTechTeams,
    },
    round_summary: {
      total_rounds: Number(summaryRow.total_rounds) || 0,
      events_by_round_count: eventsByRoundCount,
      venues: venuesList,
      rounds_per_event: mappedEvents.map((e) => ({
        event_id: e.event_id,
        event_name: e.event_name,
        event_type: e.event_type,
        rounds_count: e.rounds_count,
        rounds: e.rounds,
      })),
    },
    events: mappedEvents,
  };
}

export default {
  getEventAdmins,
  getAllSystemAdmins,
  assignAdmin,
  removeAdmin,
  getSuperAdminStats,
};


