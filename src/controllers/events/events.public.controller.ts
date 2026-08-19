import {
  Request,
  Response,
  NextFunction,
} from "express";

import eventsPublicService from "../../services/events/events.public.service";



import {
  eventIdParamSchema,
  participantCseaCodeParamSchema,
} from "../../validators/events.validator";

/**
 * GET /api/v1/events
 *
 * Returns a list of all events with their rounds.
 */
async function listAllEvents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data =
      await eventsPublicService.getAllEvents();

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });

    return;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.statusCode
    ) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });

      return;
    }

    next(error);
  }
}

/**
 * GET /api/v1/events/:event_id
 *
 * Returns details of a single event
 * including its rounds.
 */
async function getEventDetails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params =
      eventIdParamSchema.parse(
        req.params || {}
      );

    const data =
      await eventsPublicService.getEventById(
        params.event_id
      );

    res.status(200).json({
      success: true,
      data,
    });

    return;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === "ZodError"
    ) {
      const zodError = error as Error & {
        issues?: Array<{
          message?: string;
        }>;
      };

      const message =
        zodError.issues?.[0]?.message ||
        "Validation failed";

      res.status(400).json({
        success: false,
        message,
      });

      return;
    }

    if (
      error instanceof Error &&
      error.statusCode
    ) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });

      return;
    }

    next(error);
  }
}

/**
 * GET /api/v1/events/participant/:csea_code
 *
 * Returns all events a user is registered for,
 * identified by csea_code.
 *
 * Requires a valid user token;
 * user_id is taken from the token.
 */
async function getParticipantEvents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params =
      participantCseaCodeParamSchema.parse(
        req.params || {}
      );

    const data =
      await eventsPublicService
        .getRegisteredEventsByParticipant(
          params.csea_code,
          req.user
        );

    res.status(200).json({
      success: true,
      data,
    });

    return;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === "ZodError"
    ) {
      const zodError = error as Error & {
        issues?: Array<{
          message?: string;
        }>;
      };

      const message =
        zodError.issues?.[0]?.message ||
        "Validation failed";

      res.status(400).json({
        success: false,
        message,
      });

      return;
    }

    if (
      error instanceof Error &&
      error.statusCode
    ) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });

      return;
    }

    next(error);
  }
}

export {
  listAllEvents,
  getEventDetails,
  getParticipantEvents,
};