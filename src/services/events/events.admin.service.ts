import { eq, sql, inArray, and } from "drizzle-orm";

import { db } from "../../db/index";

import { users, admins, events, adminAccess, eventParticipation, participationGarbage } from "../../db/schema";

import { throwError, handleDbError } from "../../utils/serviceError";

/**
 * Fetch a participant's full profile
 * by csea_code.
 *
 * @param cseaCode - CSEA code
 */
async function getParticipantByCseaCode(cseaCode: string) {
  const normalizedCode = String(cseaCode || "").trim();

  if (!normalizedCode) {
    throwError("CSEA code is required", 400);
  }

  const [participant] = await db
    .select({
      csea_code: users.csea_code,
      register_number: users.register_number,
      full_name: users.full_name,
      email: users.email,
      phone: users.phone,
      college: users.college,
      department: users.department,
      year: users.year,
      gender: users.gender,
    })
    .from(users)
    .where(eq(users.csea_code, normalizedCode))
    .limit(1);

  if (!participant) {
    throwError("No participant found with the given CSEA code", 404);
  }

  return participant;
}

/**
 * Fetch events accessible to the currently authenticated admin.
 *
 * - Superadmin (privileged = true): returns ALL events in the system.
 * - Regular admin: returns only events assigned via adminAccess.
 *
 * @param adminId    - ID from decoded JWT
 * @param privileged - privileged flag from decoded JWT
 */
async function getAssignedEvents(
  adminId: number | undefined,
  privileged: boolean | undefined,
) {
  if (!adminId) {
    throwError("Admin ID is required", 401);
  }

  const [admin] = await db
    .select({
      admin_id: admins.admin_id,
      name: admins.name,
    })
    .from(admins)
    .where(eq(admins.admin_id, Number(adminId)))
    .limit(1);

  if (!admin) {
    throwError("Admin not found", 404);
  }

  if (privileged) {
    // Superadmin — return all events without an adminAccess filter
    const allEvents = await db
      .select({
        event_id: events.event_id,
        event_name: events.event_name,
        description: events.description,
        max_team_size: events.max_team_size,
        event_type: events.event_type,
        prize: events.prize,
        contact: events.contact,
      })
      .from(events);

    return {
      admin: {
        admin_id: admin.admin_id,
        name: admin.name,
      },
      assigned_events: allEvents,
    };
  }

  // Regular admin — return only events assigned via adminAccess
  const assignedEvents = await db
    .select({
      event_id: events.event_id,
      event_name: events.event_name,
      description: events.description,
      max_team_size: events.max_team_size,
      event_type: events.event_type,
      prize: events.prize,
      contact: events.contact,
      access_granted_at: adminAccess.access_granted_at,
    })
    .from(adminAccess)
    .innerJoin(events, eq(adminAccess.event_id, events.event_id))
    .where(eq(adminAccess.admin_id, Number(adminId)));

  return {
    admin: {
      admin_id: admin.admin_id,
      name: admin.name,
    },

    assigned_events: assignedEvents,
  };
}

/**
 * List all participants registered for a given event.
 *
 * @param eventId - Event ID from URL param
 */
async function getEventParticipants(eventId: number | string) {
  const parsedId = Number(eventId);

  if (!parsedId) throwError("Event ID is required", 400);

  // Verify event exists
  const [event] = await db
    .select({
      event_id: events.event_id,
      event_name: events.event_name,
    })
    .from(events)
    .where(eq(events.event_id, parsedId))
    .limit(1);

  if (!event) throwError("Event not found", 404);

  // Joins eventParticipation → users, filtered by event_id
  const participants = await db
    .select({
      user_id: users.user_id,
      csea_code: users.csea_code,
      register_number: users.register_number,
      full_name: users.full_name,
      email: users.email,
      phone: users.phone,
      college: users.college,
      department: users.department,
      year: users.year,
      gender: users.gender,
      team_no: eventParticipation.team_no,
      registered_at: eventParticipation.created_at,
    })
    .from(eventParticipation)
    .innerJoin(users, eq(eventParticipation.user_id, users.user_id))
    .where(eq(eventParticipation.event_id, parsedId));

  return {
    event: { event_id: event.event_id, event_name: event.event_name },
    participants,
  };
}

/**
 * Add a team of participants to an event.
 *
 * @param eventId   - Event ID from URL param
 * @param cseaCodes - Array of CSEA codes from request body
 * @param adminId   - Admin ID from decoded JWT
 */
async function addTeamParticipants(
  eventId: number | string,
  cseaCodes: string[],
  adminId: number | undefined,
) {
  if (!adminId) throwError("Admin ID is required", 401);

  const parsedId = Number(eventId);

  if (!parsedId) throwError("Event ID is required", 400);

  // Verify event exists and load max_team_size
  const [event] = await db
    .select({
      event_id: events.event_id,
      event_name: events.event_name,
      max_team_size: events.max_team_size,
    })
    .from(events)
    .where(eq(events.event_id, parsedId))
    .limit(1);

  if (!event) throwError("Event not found", 404);

  // check if this logic is okay
  // Validate submitted count against max_team_size
  const maxTeamSize = event.max_team_size ?? 1;
  if (cseaCodes.length > maxTeamSize) {
    throwError(
      `Team size exceeds the maximum allowed (${maxTeamSize}) for this event`,
      400,
    );
  }

  // Resolve each csea_code to a user record in a single inArray query
  const resolvedParticipants = await db
    .select({
      user_id: users.user_id,
      csea_code: users.csea_code,
      register_number: users.register_number,
      full_name: users.full_name,
    })
    .from(users)
    .where(inArray(users.csea_code, cseaCodes));

  // Ensure every requested code was found
  for (const code of cseaCodes) {
    if (!resolvedParticipants.find((u) => u.csea_code === code)) {
      throwError(`No user found with CSEA code: ${code}`, 404);
    }
  }

  // Guard against duplicate registrations (by user_id / CSEA code)
  const existingRows = await db
    .select({ user_id: eventParticipation.user_id })
    .from(eventParticipation)
    .where(
      and(
        eq(eventParticipation.event_id, parsedId),
        inArray(eventParticipation.user_id, resolvedParticipants.map((p) => p.user_id)),
      ),
    );

  if (existingRows.length > 0) {
    const alreadyRegistered = resolvedParticipants
      .filter((p) => existingRows.find((r) => r.user_id === p.user_id))
      .map((p) => p.csea_code)
      .join(", ");
    throwError(
      `Participant(s) already registered for this event: ${alreadyRegistered}`,
      409,
    );
  }

  // Guard against duplicate roll numbers — a student with the same register_number
  // must not appear more than once in an event, even under a different CSEA code
  const registeredRolls = await db
    .select({ register_number: users.register_number })
    .from(eventParticipation)
    .innerJoin(users, eq(eventParticipation.user_id, users.user_id))
    .where(eq(eventParticipation.event_id, parsedId));

  const incomingRolls = resolvedParticipants.map((p) => p.register_number);
  const rollClashes = incomingRolls.filter((roll) =>
    registeredRolls.some((existing) => existing.register_number === roll),
  );

  if (rollClashes.length > 0) {
    throwError(
      `Student(s) with roll number(s) already registered for this event: ${rollClashes.join(", ")}`,
      409,
    );
  }

  // Obtain a new team number from the DB sequence
  const seqResult = await db.execute<{ team_no: string }>(
    sql`SELECT nextval('team_no_seq') AS team_no`,
  );

  const teamNo = Number(seqResult.rows[0].team_no);

  const now = new Date();

  // Build and insert participation rows for all team members
  const rows = resolvedParticipants.map((participant) => ({
    event_id: parsedId,
    user_id: participant.user_id,
    team_no: teamNo,
    created_by_admin_id: adminId!,
    created_at: now,
  }));

  try {
    await db.insert(eventParticipation).values(rows);
  } catch (error) {
    handleDbError(error);
  }

  return {
    event: { event_id: event.event_id, event_name: event.event_name },
    team_no: teamNo,
    added: resolvedParticipants.map((p) => ({
      csea_code: p.csea_code,
      full_name: p.full_name,
    })),
  };
}

/**
 * Remove a single participant from an event.
 *
 * Copies the row to participation_garbage,
 * then deletes it from event_participation.
 *
 * @param eventId  - Event ID from URL param
 * @param cseaCode - CSEA code from request body
 * @param adminId  - Admin ID from decoded JWT
 */
async function removeParticipant(
  eventId: number | string,
  cseaCode: string,
  adminId: number | undefined,
) {
  if (!adminId) throwError("Admin ID is required", 401);

  const parsedId = Number(eventId);

  if (!parsedId) throwError("Event ID is required", 400);

  // Verify event exists
  const [event] = await db
    .select({ event_id: events.event_id, event_name: events.event_name })
    .from(events)
    .where(eq(events.event_id, parsedId))
    .limit(1);

  if (!event) throwError("Event not found", 404);

  // Resolve csea_code to user
  const [user] = await db
    .select({ user_id: users.user_id, csea_code: users.csea_code, full_name: users.full_name })
    .from(users)
    .where(eq(users.csea_code, String(cseaCode).trim()))
    .limit(1);

  if (!user) throwError("No user found with the given CSEA code", 404);

  // Verify the participant is registered AND fetch participation row in one query
  const [participation] = await db
    .select()
    .from(eventParticipation)
    .where(
      and(
        eq(eventParticipation.event_id, parsedId),
        eq(eventParticipation.user_id, user.user_id),
      ),
    )
    .limit(1);

  if (!participation) {
    throwError("This participant is not registered for this event", 404);
  }

  const now = new Date();

  // Copy to garbage before deleting
  try {
    await db.insert(participationGarbage).values({
      event_id: participation.event_id,
      user_id: participation.user_id,
      team_no: participation.team_no,
      deleted_by_admin_id: adminId!,
      deleted_at: now,
    });
  } catch (error) {
    handleDbError(error);
  }

  // Delete from event_participation
  await db
    .delete(eventParticipation)
    .where(
      and(
        eq(eventParticipation.event_id, parsedId),
        eq(eventParticipation.user_id, user.user_id),
      ),
    );

  return {
    event: { event_id: event.event_id, event_name: event.event_name },
    removed: {
      csea_code: user.csea_code,
      full_name: user.full_name,
      team_no: participation.team_no,
    },
  };
}

/**
 * Remove an entire team from an event by team_no.
 *
 * Copies all matching rows to participation_garbage,
 * then deletes them from event_participation.
 *
 * @param eventId - Event ID from URL param
 * @param teamNo  - Team number from URL param
 * @param adminId - Admin ID from decoded JWT
 */
async function removeTeam(
  eventId: number | string,
  teamNo: number | string,
  adminId: number | undefined,
) {
  if (!adminId) throwError("Admin ID is required", 401);

  const parsedEventId = Number(eventId);
  const parsedTeamNo = Number(teamNo);

  if (!parsedEventId) throwError("Event ID is required", 400);
  if (!parsedTeamNo) throwError("Team number is required", 400);

  // Verify event exists
  const [event] = await db
    .select({ event_id: events.event_id, event_name: events.event_name })
    .from(events)
    .where(eq(events.event_id, parsedEventId))
    .limit(1);

  if (!event) throwError("Event not found", 404);

  // Fetch all participation rows for this team in this event
  const teamRows = await db
    .select()
    .from(eventParticipation)
    .where(
      and(
        eq(eventParticipation.event_id, parsedEventId),
        eq(eventParticipation.team_no, parsedTeamNo),
      ),
    );

  if (!teamRows || teamRows.length === 0) {
    throwError(`No team with team number ${parsedTeamNo} found for this event`, 404);
  }

  const now = new Date();

  // Copy all team rows to garbage
  const garbageRows = teamRows.map((row) => ({
    event_id: row.event_id,
    user_id: row.user_id,
    team_no: row.team_no,
    deleted_by_admin_id: adminId!,
    deleted_at: now,
  }));

  try {
    await db.insert(participationGarbage).values(garbageRows);
  } catch (error) {
    handleDbError(error);
  }

  // Delete all team members from event_participation
  const teamUserIds = teamRows.map((r) => r.user_id);

  await db
    .delete(eventParticipation)
    .where(
      and(
        eq(eventParticipation.event_id, parsedEventId),
        inArray(eventParticipation.user_id, teamUserIds),
      ),
    );

  // Fetch user details for the response
  const removedUsers = await db
    .select({ user_id: users.user_id, csea_code: users.csea_code, full_name: users.full_name })
    .from(users)
    .where(inArray(users.user_id, teamUserIds));

  return {
    event: { event_id: event.event_id, event_name: event.event_name },
    team_no: parsedTeamNo,
    removed: removedUsers.map((u) => ({ csea_code: u.csea_code, full_name: u.full_name })),
  };
}

export default {
  getParticipantByCseaCode,
  getAssignedEvents,
  getEventParticipants,
  addTeamParticipants,
  removeParticipant,
  removeTeam,
};
