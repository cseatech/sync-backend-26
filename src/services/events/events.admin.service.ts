import { eq, sql, inArray } from "drizzle-orm";

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
 * Fetch all events assigned to the
 * currently authenticated admin.
 *
 * @param adminId - ID from decoded JWT
 */
async function getAssignedEvents(adminId: number | undefined) {
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

  const accessRows = await db
    .select()
    .from(adminAccess)
    .where(eq(adminAccess.admin_id, Number(adminId)));

  if (!accessRows || accessRows.length === 0) {
    return {
      admin: {
        admin_id: admin.admin_id,
        name: admin.name,
      },

      assigned_events: [],
    };
  }

  const assignedEventIds = accessRows.map((row) => row.event_id);

  // Fetch all events and filter only the events assigned to this admin.
  const allEvents = await db.select().from(events);

  const assignedEvents = allEvents.filter((event) =>
    assignedEventIds.includes(event.event_id),
  );

  // Attach access metadata.
  const enriched = assignedEvents.map((event) => {
    const access = accessRows.find((row) => row.event_id === event.event_id);

    return {
      ...event,
      access_granted_at: access?.access_granted_at ?? null,
    };
  });

  return {
    admin: {
      admin_id: admin.admin_id,
      name: admin.name,
    },

    assigned_events: enriched,
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

  // Fetch participation rows for this event
  const participationRows = await db
    .select()
    .from(eventParticipation)
    .where(eq(eventParticipation.event_id, parsedId));

  if (!participationRows || participationRows.length === 0) {
    return {
      event: { event_id: event.event_id, event_name: event.event_name },
      participants: [],
    };
  }

  // Fetch user details for each participant
  const participantUserIds = participationRows.map((p) => p.user_id);


  // use inArray() where condition to filter directly without getting all users
  // apply same logic wherever applicable
  const allUsers = await db
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
    })
    .from(users);

  const participantUsers = allUsers.filter((u) =>
    participantUserIds.includes(u.user_id),
  );

  // Merge participation metadata with user details
  const enriched = participantUsers.map((user) => {
    const participation = participationRows.find(
      (p) => p.user_id === user.user_id,
    );

    return {
      ...user,
      team_no: participation?.team_no ?? null,
      registered_at: participation?.created_at ?? null,
    };
  });

  return {
    event: { event_id: event.event_id, event_name: event.event_name },
    participants: enriched,
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

  // Resolve each csea_code to a user record
  const allUsers = await db
    .select({
      user_id: users.user_id,
      csea_code: users.csea_code,
      full_name: users.full_name,
    })
    .from(users);

  const resolvedParticipants = cseaCodes.map((code) => {
    const user = allUsers.find((u) => u.csea_code === code);

    if (!user) throwError(`No user found with CSEA code: ${code}`, 404);

    return user!;
  });

  // Guard against duplicate registrations
  const existingRows = await db
    .select({ user_id: eventParticipation.user_id })
    .from(eventParticipation)
    .where(eq(eventParticipation.event_id, parsedId));

  const existingUserIds = existingRows.map((r) => r.user_id);

  for (const participant of resolvedParticipants) {
    if (existingUserIds.includes(participant.user_id)) {
      throwError(
        `Participant ${participant.csea_code} is already registered for this event`,
        409,
      );
    }
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

  // Verify the participant is actually registered for this event
  const [participation] = await db
    .select()
    .from(eventParticipation)
    .where(
      sql`${eventParticipation.event_id} = ${parsedId} AND ${eventParticipation.user_id} = ${user.user_id}`,
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
      sql`${eventParticipation.event_id} = ${parsedId} AND ${eventParticipation.user_id} = ${user.user_id}`,
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
      sql`${eventParticipation.event_id} = ${parsedEventId} AND ${eventParticipation.team_no} = ${parsedTeamNo}`,
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
      sql`${eventParticipation.event_id} = ${parsedEventId} AND ${eventParticipation.user_id} IN ${sql.raw(`(${teamUserIds.join(",")})`)}`,
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
