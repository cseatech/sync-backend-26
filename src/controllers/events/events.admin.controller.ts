import { Request, Response, NextFunction } from "express";

import eventsAdminService from "../../services/events/events.admin.service";

import {
  participantCseaCodeParamSchema,
  eventIdParamSchema,
  addParticipantsBodySchema,
  teamNoParamSchema,
} from "../../validators/events.validator";

/**
 * GET /api/v1/admin/participant/:csea_code
 *
 * Returns full participant profile
 * for the given csea_code.
 *
 * Admin only.
 */
async function getParticipant(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = participantCseaCodeParamSchema.parse(req.params || {});
    const data = await eventsAdminService.getParticipantByCseaCode(
      params.csea_code,
    );

    res.status(200).json({
      success: true,
      data,
    });

    return;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as Error & {
        issues?: Array<{
          message?: string;
        }>;
      };

      const message = zodError.issues?.[0]?.message || "Validation failed";

      res.status(400).json({
        success: false,
        message,
      });

      return;
    }

    if (error instanceof Error && error.statusCode) {
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
 * GET /api/v1/admin/events
 *
 * Returns all events assigned to
 * the currently authenticated admin.
 */
async function getAdminAssignedEvents(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await eventsAdminService.getAssignedEvents(req.user?.admin_id);

    res.status(200).json({
      success: true,
      data,
    });

    return;
  } catch (error: unknown) {
    if (error instanceof Error && error.statusCode) {
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
 * GET /api/v1/admin/events/:event_id/participants
 *
 * Returns all participants registered for an event,
 * enriched with user details and team_no.
 *
 * Admin only.
 */
async function getEventParticipants(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = eventIdParamSchema.parse(req.params || {});
    const data = await eventsAdminService.getEventParticipants(params.event_id);

    res.status(200).json({
      success: true,
      data,
    });

    return;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as Error & {
        issues?: Array<{
          message?: string;
        }>;
      };

      const message = zodError.issues?.[0]?.message || "Validation failed";

      res.status(400).json({
        success: false,
        message,
      });

      return;
    }

    if (error instanceof Error && error.statusCode) {
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
 * POST /api/v1/admin/events/:event_id/participants
 *
 * Adds a team of participants to an event.
 * csea_codes array must be in the request body.
 * Team size is validated against the event's max_team_size.
 *
 * Admin only. admin_id is taken from the JWT.
 */
async function addEventParticipants(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = eventIdParamSchema.parse(req.params || {});
    const body = addParticipantsBodySchema.parse(req.body || {});

    const data = await eventsAdminService.addTeamParticipants(
      params.event_id,
      body.csea_codes,
      req.user?.admin_id,
    );

    res.status(201).json({
      success: true,
      message: "Participants added successfully",
      data,
    });

    return;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as Error & {
        issues?: Array<{
          message?: string;
        }>;
      };

      const message = zodError.issues?.[0]?.message || "Validation failed";

      res.status(400).json({
        success: false,
        message,
      });

      return;
    }

    if (error instanceof Error && error.statusCode) {
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
 * DELETE /api/v1/admin/events/:event_id/participant
 * 
 * Row is copied to participation_garbage before deletion.
 *
 */
async function removeEventParticipant(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = eventIdParamSchema.parse(req.params || {});
    const body = participantCseaCodeParamSchema.parse(req.body || {});

    const data = await eventsAdminService.removeParticipant(
      params.event_id,
      body.csea_code,
      req.user?.admin_id,
    );

    res.status(200).json({
      success: true,
      message: "Participant removed successfully",
      data,
    });

    return;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as Error & {
        issues?: Array<{
          message?: string;
        }>;
      };

      const message = zodError.issues?.[0]?.message || "Validation failed";

      res.status(400).json({
        success: false,
        message,
      });

      return;
    }

    if (error instanceof Error && error.statusCode) {
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
 * DELETE /api/v1/admin/events/:event_id/team/:team_no
 *
 * Removes an entire team from an event.
 * All team rows are copied to participation_garbage before deletion.
 *
 */
async function removeEventTeam(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const eventParams = eventIdParamSchema.parse(req.params || {});
    const teamParams = teamNoParamSchema.parse(req.params || {});

    const data = await eventsAdminService.removeTeam(
      eventParams.event_id,
      teamParams.team_no,
      req.user?.admin_id,
    );

    res.status(200).json({
      success: true,
      message: "Team removed successfully",
      data,
    });

    return;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as Error & {
        issues?: Array<{
          message?: string;
        }>;
      };

      const message = zodError.issues?.[0]?.message || "Validation failed";

      res.status(400).json({
        success: false,
        message,
      });

      return;
    }

    if (error instanceof Error && error.statusCode) {
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
  getParticipant,
  getAdminAssignedEvents,
  getEventParticipants,
  addEventParticipants,
  removeEventParticipant,
  removeEventTeam,
};
