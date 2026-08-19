import {
  Request,
  Response,
  NextFunction,
} from "express";

import eventsAdminService from "../../services/events/events.admin.service";

import {
  participantCseaCodeParamSchema,
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
  next: NextFunction
): Promise<void> {
  try {
    const params =
      participantCseaCodeParamSchema.parse(
        req.params || {}
      );

    const data =
      await eventsAdminService.getParticipantByCseaCode(
        params.csea_code
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
 * GET /api/v1/admin/events
 *
 * Returns all events assigned to
 * the currently authenticated admin.
 */
async function getAdminAssignedEvents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data =
      await eventsAdminService.getAssignedEvents(
        req.user?.admin_id
      );

    res.status(200).json({
      success: true,
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

export {
  getParticipant,
  getAdminAssignedEvents,
};