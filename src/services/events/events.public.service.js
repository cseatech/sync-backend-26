const { eq } = require("drizzle-orm");
const { db } = require("../../db/index");
const { events, round, eventParticipation, users } = require("../../db/schema");
const { throwError } = require("../../utils/serviceError");

/**
 * Fetch all events along with their rounds.
 */
async function getAllEvents() {
  const allEvents = await db.select().from(events);

  if (!allEvents || allEvents.length === 0) {
    return [];
  }

  const allRounds = await db.select().from(round);

  const eventsWithRounds = allEvents.map((event) => ({
    ...event,
    rounds: allRounds
      .filter((r) => r.event_id === event.event_id)
      .sort((a, b) => a.round_num - b.round_num),
  }));

  return eventsWithRounds;
}

/**
 * Fetch a single event by event_id, including its rounds.
 * @param {number|string} eventId
 */
async function getEventById(eventId) {
  const parsedId = Number(eventId);

  // validated in controller itself using zod
  // if (!parsedId || isNaN(parsedId) || parsedId <= 0) {
  //   const error = new Error("A valid event ID is required");
  //   error.statusCode = 400;
  //   throw error;
  // }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.event_id, parsedId))
    .limit(1);

  if (!event) throwError("Event not found", 404);

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
 * Fetch all events a user is registered for, identified by their csea_code.
 * The requesting user's user_id is cross-checked for authorisation.
 * @param {string} cseaCode  - param from URL
 * @param {object} requester - decoded token payload (must contain user_id)
 */
async function getRegisteredEventsByParticipant(cseaCode, requester = {}) {
  const normalizedCode = String(cseaCode).trim();

  // validated in controller itself using zod
  // if (!normalizedCode) {
  //   const error = new Error("CSEA code is required");
  //   error.statusCode = 400;
  //   throw error;
  // }

  // Resolve the user_id that belongs to this csea_code
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

  if (!participant) throwError("No user found with the given CSEA code", 404);

  // Only the user themselves (or an admin) may view their registrations
  const requesterRole = String(requester.role || "").toLowerCase();

  if (
    requesterRole !== "admin" &&
    Number(requester.user_id) !== Number(participant.user_id)
  ) {
    throwError("You do not have permission to view this participant's events", 403);
  }

  // Fetch participation rows for this user
  const participationRows = await db
    .select()
    .from(eventParticipation)
    .where(eq(eventParticipation.user_id, participant.user_id));

  if (!participationRows || participationRows.length === 0) {
    return {
      participant: {
        csea_code: participant.csea_code,
        full_name: participant.full_name,
        register_number: participant.register_number,
      },
      registered_events: [],
    };
  }

  // Collect the event ids registered by this user
  const registeredEventIds = participationRows.map((p) => p.event_id);

  // Fetch all events and filter only the ones this user is registered for
  // ? change this to a where clause ?
  const allEvents = await db.select().from(events);
  const registeredEvents = allEvents.filter((e) =>
    registeredEventIds.includes(e.event_id)
  );

  // Attach participation metadata (team_no, registered_at) to each event
  const enriched = registeredEvents.map((event) => {
    const participation = participationRows.find(
      (p) => p.event_id === event.event_id
    );
    return {
      ...event,
      team_no: participation?.team_no ?? null,
      registered_at: participation?.created_at ?? null,
    };
  });

  return {
    participant: {
      csea_code: participant.csea_code,
      full_name: participant.full_name,
      register_number: users.register_number,
    },
    registered_events: enriched,
  };
}

module.exports = {
  getAllEvents,
  getEventById,
  getRegisteredEventsByParticipant,
};
