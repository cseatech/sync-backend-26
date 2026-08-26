import { Request, Response, NextFunction } from "express";

import certificateAdminService from "../../services/admin/certificate.admin.service";

import {
  certificateLoginSchema,
  certificateInsertWinnerSchema,
} from "../../validators/certificate.validator";

import { handleControllerError } from "../../utils/controllerError";

/**
 * POST /api/v1/admin/certificate/login
 *
 * Validates credentials against CERTIFICATE_ADMIN_USERNAME /
 * CERTIFICATE_ADMIN_PASSWORD env vars and returns a signed JWT.
 * No database query is performed.
 */
async function certificateLogin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = certificateLoginSchema.parse(req.body || {});
    const result = await certificateAdminService.login(body);

    res.status(200).json({
      success: true,
      message: "Certificate admin login successful",
      token: result.token,
    });
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

/**
 * POST /api/v1/admin/certificate/winners
 *
 * Inserts a winner record. Expects { csea_code, event_id, position }.
 * The internal user_id is resolved in the service and never returned.
 */
async function addWinner(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = certificateInsertWinnerSchema.parse(req.body || {});
    const data = await certificateAdminService.insertWinner(body);

    res.status(201).json({
      success: true,
      message: "Winner recorded successfully",
      data,
    });
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

/**
 * GET /api/v1/admin/certificate/winners
 *
 * Returns a flat list of all winners with event_name, csea_code,
 * full_name, position, and awarded_at. Internal user_id is omitted.
 */
async function listWinners(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await certificateAdminService.getAllWinners();

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

export { certificateLogin, addWinner, listWinners };
