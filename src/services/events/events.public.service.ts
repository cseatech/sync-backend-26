import { eq } from "drizzle-orm";

import { db } from "../../db/index";

import {
  events,
  round,
  eventParticipation,
  users,
} from "../../db/schema";

import { throwError } from "../../utils/serviceError";

import {
  UserJwtPayload,
  AdminJwtPayload,
} from "../../utils/jwt";

type Requester =
  | UserJwtPayload
  | AdminJwtPayload
  | undefined;

/**
 * Fetch all events along with their rounds.
 */
async function getAllEvents() {
  const allEvents = await db
    .select()
    .from(events);

  if (
    !allEvents ||
    allEvents.length === 0
  ) {
    return [];
  }

  const allRounds = await db
    .select()
    .from(round);

  const eventsWithRounds =
    allEvents.map((event) => ({
      ...event,

      rounds: allRounds
        .filter(
          (r) =>
            r.event_id ===
            event.event_id
        )
        .sort(
          (a, b) =>
            a.round_num -
            b.round_num
        ),
    }));

  return eventsWithRounds;
}

/**
 * Fetch a single event by event_id,
 * including its rounds.
 *
 * @param eventId - Event ID
 */
async function getEventById(
  eventId: number | string
) {
  const parsedId = Number(eventId);

  if (!parsedId) {
    throwError(
      "Event ID is required",
      400
    );
  }

  const [event] = await db
    .select()
    .from(events)
    .where(
      eq(
        events.event_id,
        parsedId
      )
    )
    .limit(1);

  if (!event) {
    throwError(
      "Event not found",
      404
    );
  }

  const eventRounds = await db
    .select()
    .from(round)
    .where(
      eq(
        round.event_id,
        parsedId
      )
    );

  return {
    ...event,

    rounds: eventRounds.sort(
      (a, b) =>
        a.round_num -
        b.round_num
    ),
  };
}

/**
 * Fetch all events a user is registered for,
 * identified by their csea_code.
 *
 * The requesting user's user_id is
 * cross-checked for authorization.
 *
 * @param cseaCode - CSEA code from URL
 * @param requester - decoded JWT payload
 */
async function getRegisteredEventsByParticipant(
  cseaCode: string,
  requester?: Requester
) {
  const normalizedCode =
    String(cseaCode).trim();

  if (!normalizedCode) {
    throwError(
      "CSEA code is required",
      400
    );
  }

  // Resolve the user_id that belongs
  // to this csea_code.
  const [participant] =
    await db
      .select({
        user_id: users.user_id,
        csea_code: users.csea_code,
        full_name: users.full_name,
        register_number:
          users.register_number,
      })
      .from(users)
      .where(
        eq(
          users.csea_code,
          normalizedCode
        )
      )
      .limit(1);

  if (!participant) {
    throwError(
      "No user found with the given CSEA code",
      404
    );
  }

  // Only the user themselves or an
  // admin may view their registrations.
  const requesterRole = String(
    requester?.role || ""
  ).toLowerCase();

  if (
    requesterRole !== "admin" &&
    Number(requester?.user_id) !==
      Number(participant.user_id)
  ) {
    throwError(
      "You do not have permission to view this participant's events",
      403
    );
  }

  // Fetch participation rows for
  // this user.
  const participationRows =
    await db
      .select()
      .from(eventParticipation)
      .where(
        eq(
          eventParticipation.user_id,
          participant.user_id
        )
      );

  if (
    !participationRows ||
    participationRows.length === 0
  ) {
    return {
      participant: {
        csea_code:
          participant.csea_code,

        full_name:
          participant.full_name,

        register_number:
          participant.register_number,
      },

      registered_events: [],
    };
  }

  // Collect event IDs registered
  // by this user.
  const registeredEventIds =
    participationRows.map(
      (p) => p.event_id
    );

  // Fetch all events and filter only
  // the ones this user is registered for.
  const allEvents = await db
    .select()
    .from(events);

  const registeredEvents =
    allEvents.filter((event) =>
      registeredEventIds.includes(
        event.event_id
      )
    );

  // Attach participation metadata
  // to each event.
  const enriched =
    registeredEvents.map(
      (event) => {
        const participation =
          participationRows.find(
            (p) =>
              p.event_id ===
              event.event_id
          );

        return {
          ...event,

          team_no:
            participation?.team_no ??
            null,

          registered_at:
            participation?.created_at ??
            null,
        };
      }
    );

  return {
    participant: {
      csea_code:
        participant.csea_code,

      full_name:
        participant.full_name,

      register_number:
        participant.register_number,
    },

    registered_events:
      enriched,
  };
}

export default {
  getAllEvents,
  getEventById,
  getRegisteredEventsByParticipant,
};