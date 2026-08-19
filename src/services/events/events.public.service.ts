import { eq } from "drizzle-orm";

import { db } from "../../db/index";

import {
  events,
  round,
  eventParticipation,
  users,
} from "../../db/schema";

import {
  UserJwtPayload,
  AdminJwtPayload,
} from "../../utils/jwt";

type Requester =
  | UserJwtPayload
  | AdminJwtPayload
  | {
      user_id?: number;
      role?: string;
    }
  | undefined;

async function getAllEvents() {
  const allEvents =
    await db
      .select()
      .from(events);

  if (
    !allEvents ||
    allEvents.length === 0
  ) {
    return [];
  }

  const allRounds =
    await db
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

async function getEventById(
  eventId: number | string
) {
  const parsedId =
    Number(eventId);

  if (
    !parsedId ||
    Number.isNaN(parsedId) ||
    parsedId <= 0
  ) {
    const error = new Error(
      "A valid event ID is required"
    );

    error.statusCode = 400;

    throw error;
  }

  const [event] =
    await db
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
    const error = new Error(
      "Event not found"
    );

    error.statusCode = 404;

    throw error;
  }

  const eventRounds =
    await db
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

async function getRegisteredEventsByParticipant(
  cseaCode: string,
  requester?: Requester
) {
  const normalizedCode =
    String(cseaCode || "")
      .trim();

  if (!normalizedCode) {
    const error = new Error(
      "CSEA code is required"
    );

    error.statusCode = 400;

    throw error;
  }

  const [participant] =
    await db
      .select({
        user_id: users.user_id,
        csea_code: users.csea_code,
        full_name: users.full_name,
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
    const error = new Error(
      "No user found with the given CSEA code"
    );

    error.statusCode = 404;

    throw error;
  }

  const requesterRole =
    String(
      requester?.role || ""
    ).toLowerCase();

  if (
    requesterRole !== "admin" &&
    Number(requester?.user_id) !==
      Number(participant.user_id)
  ) {
    const error = new Error(
      "You do not have permission to view this participant's events"
    );

    error.statusCode = 403;

    throw error;
  }

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
      },

      registered_events: [],
    };
  }

  const registeredEventIds =
    participationRows.map(
      (p) => p.event_id
    );

  const allEvents =
    await db
      .select()
      .from(events);

  const registeredEvents =
    allEvents.filter((event) =>
      registeredEventIds.includes(
        event.event_id
      )
    );

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
    },

    registered_events:
      enriched,
  };
}

export {
  getAllEvents,
  getEventById,
  getRegisteredEventsByParticipant,
};