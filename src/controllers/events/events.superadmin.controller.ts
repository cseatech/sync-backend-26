import { Request, Response, NextFunction } from "express";

import eventsSuperadminService from "../../services/events/events.superadmin.service";

import {
  eventIdParamSchema,
  adminIdBodySchema,
} from "../../validators/events.validator";

import { handleControllerError } from "../../utils/controllerError";
import { AdminJwtPayload } from "../../utils/jwt";

/**
 * Helper to extract privileged flag safely from a mixed JWT payload.
 * Only AdminJwtPayload carries the privileged field.
 */
function getPrivileged(user: Request["user"]): boolean {
  if (!user || !("privileged" in user)) return false;
  return (user as AdminJwtPayload).privileged === true;
}

/**
 * GET /api/v1/superadmin/events/:event_id/admins
 *
 * 
 * smaapkr
 * 
 * 
 * Returns all admins assigned to a given event.
 * Superadmin only (privileged = true).
 */
async function getEventAdmins(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = eventIdParamSchema.parse(req.params || {});

    const data = await eventsSuperadminService.getEventAdmins(
      params.event_id,
      (req.user as AdminJwtPayload)?.admin_id,
      getPrivileged(req.user),
    );

    res.status(200).json({
      success: true,
      data,
    });

    return;
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

/**
 * POST /api/v1/superadmin/events/:event_id/admin
 *
 * Assigns an admin to an event.
 * Superadmin only (privileged = true).
 */
async function assignEventAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = eventIdParamSchema.parse(req.params || {});
    const body = adminIdBodySchema.parse(req.body || {});

    const data = await eventsSuperadminService.assignAdmin(
      params.event_id,
      body.admin_id,
      (req.user as AdminJwtPayload)?.admin_id,
      getPrivileged(req.user),
    );

    res.status(201).json({
      success: true,
      message: "Admin assigned to event successfully",
      data,
    });

    return;
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

/**
 * DELETE /api/v1/superadmin/events/:event_id/admin
 *
 * Removes an admin from an event.
 * Superadmin only (privileged = true).
 */
async function removeEventAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = eventIdParamSchema.parse(req.params || {});
    const body = adminIdBodySchema.parse(req.body || {});

    const data = await eventsSuperadminService.removeAdmin(
      params.event_id,
      body.admin_id,
      (req.user as AdminJwtPayload)?.admin_id,
      getPrivileged(req.user),
    );

    res.status(200).json({
      success: true,
      message: "Admin removed from event successfully",
      data,
    });

    return;
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

/**
 * GET /api/v1/superadmin/admins
 *
 * Returns all system administrators.
 * Superadmin only (privileged = true).
 */
async function getAllSystemAdmins(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await eventsSuperadminService.getAllSystemAdmins(
      (req.user as AdminJwtPayload)?.admin_id,
      getPrivileged(req.user),
    );

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });

    return;
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

/**
 * GET /api/v1/superadmin/stats
 *
 * Returns comprehensive system stats:
 * - summary totals (participations, teams, users, rounds, events, tech vs non-tech)
 * - round summary and distribution
 * - event-wise breakdown with participation, team counts, round details
 * Superadmin only (privileged = true).
 */
async function getSuperAdminStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await eventsSuperadminService.getSuperAdminStats(
      (req.user as AdminJwtPayload)?.admin_id,
      getPrivileged(req.user),
    );

    res.status(200).json({
      success: true,
      data,
    });

    return;
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

export {
  getEventAdmins,
  getAllSystemAdmins,
  assignEventAdmin,
  removeEventAdmin,
  getSuperAdminStats,
};


