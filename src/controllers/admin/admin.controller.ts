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
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === "ZodError"
    ) {
      const zodError = error as Error & {
        issues?: Array<{ message?: string }>;
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
      await eventsPublicService.getRegisteredEventsByParticipant(
        params.csea_code,
        req.user
      );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === "ZodError"
    ) {
      const zodError = error as Error & {
        issues?: Array<{ message?: string }>;
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