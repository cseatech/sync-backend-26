import { eq, inArray } from "drizzle-orm";

import { db } from "../../db/index";

import { events, round, eventParticipation, users } from "../../db/schema";

import { throwError } from "../../utils/serviceError";

import { AppJwtPayload } from "../../utils/jwt";

type Requester = AppJwtPayload;

/**
 * Fetch all events along with their rounds.
 */
async function getAllEvents() {
  const allEvents = await db.select().from(events);

  if (!allEvents || allEvents.length === 0) {
    return [];
  }

  // Fetch only the rounds that belong to the events we just loaded
  const eventIds = allEvents.map((e) => e.event_id);

  const allRounds = await db
    .select()
    .from(round)
    .where(inArray(round.event_id, eventIds));

  const eventsWithRounds = allEvents.map((event) => ({
    ...event,

    rounds: allRounds
      .filter((r) => r.event_id === event.event_id)
      .sort((a, b) => a.round_num - b.round_num),
  }));

  return eventsWithRounds;
}

/**
 * Fetch a single event by event_id,
 * including its rounds.
 *
 * @param eventId - Event ID
 */
async function getEventById(eventId: number | string) {
  const parsedId = Number(eventId);

  if (!parsedId) {
    throwError("Event ID is required", 400);
  }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.event_id, parsedId))
    .limit(1);

  if (!event) {
    throwError("Event not found", 404);
  }

  const eventRounds = await db
    .select()
    .from(round)
    .where(eq(round.event_id, parsedId));

  return {
    ...event,

    rounds: eventRounds.sort((a, b) => a.round_num - b.round_num),
  };
}

/**
 * Fetch all events a user is registered for,
 * identified by their csea_code.
 *
 * @param cseaCode - CSEA code from URL
 * @param requester - decoded JWT payload
 */
async function getRegisteredEventsByParticipant(
  cseaCode: string,
  requester?: Requester,
) {
  const normalizedCode = String(cseaCode).trim();

  if (!normalizedCode) {
    throwError("CSEA code is required", 400);
  }

  // Resolve the user_id that belongs to this csea_code.
  const [participant] = await db
    .select({
      user_id: users.user_id,
      csea_code: users.csea_code,
      full_name: users.full_name,
      register_number: users.register_number,
    })
    .from(users)
    .where(eq(users.csea_code, normalizedCode))
    .limit(1);

  if (!participant) {
    throwError("No user found with the given CSEA code", 404);
  }

  // Only the user themselves or an admin may view their registrations.
  const requesterRole = String(requester?.role || "").toLowerCase();

  if (
    requesterRole !== "admin" &&
    Number(requester?.user_id) !== Number(participant.user_id)
  ) {
    throwError(
      "You do not have permission to view this participant's events",
      403,
    );
  }

  // Joins eventParticipation → events, filtered by this user's user_id
  const registeredEvents = await db
    .select({
      event_id: events.event_id,
      event_name: events.event_name,
      description: events.description,
      max_team_size: events.max_team_size,
      event_type: events.event_type,
      prize: events.prize,
      contact: events.contact,
      team_no: eventParticipation.team_no,
      registered_at: eventParticipation.created_at,
    })
    .from(eventParticipation)
    .innerJoin(events, eq(eventParticipation.event_id, events.event_id))
    .where(eq(eventParticipation.user_id, participant.user_id));

  return {
    participant: {
      csea_code: participant.csea_code,
      full_name: participant.full_name,
      register_number: participant.register_number,
    },

    registered_events: registeredEvents,
  };
}

export default {
  getAllEvents,
  getEventById,
  getRegisteredEventsByParticipant,
};
