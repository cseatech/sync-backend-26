import { Request, Response, NextFunction } from "express";

import certificateAdminService from "../../services/certificate/certificate.admin.service";

import {
  certificateLoginSchema,
  certificateInsertWinnerSchema,
} from "../../validators/certificate.validator";

import { downloadCertificateQuerySchema } from "../../validators/certificate.public.validator";

import { streamCertificate } from "../../services/certificate/pdf.service";

import { handleControllerError } from "../../utils/controllerError";
import { setCertAdminCookie, clearCertAdminCookie } from "../../utils/authCookie";

/**
 * POST /api/v1/admin/certificate/login
 *
 * Validates credentials against CERTIFICATE_ADMIN_USERNAME /
 * CERTIFICATE_ADMIN_PASSWORD env vars, sets an httpOnly cookie,
 * and returns success without exposing the raw JWT token.
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

    // Set secure httpOnly cookie
    setCertAdminCookie(res, result.token);

    res.status(200).json({
      success: true,
      message: "Certificate admin login successful",
    });
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

/**
 * POST /api/v1/admin/certificate/logout
 *
 * Clears the certificate admin httpOnly cookie.
 */
async function certificateLogout(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    clearCertAdminCookie(res);

    res.status(200).json({
      success: true,
      message: "Certificate admin logged out successfully",
    });
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

/**
 * GET /api/v1/admin/certificate/me
 *
 * Returns current authenticated certificate admin session details.
 */
async function getCertificateAdminStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.status(200).json({
      success: true,
      message: "Authenticated",
      data: {
        username: req.certificateAdmin?.username || "admin",
        role: req.certificateAdmin?.role || "certificate_admin",
      },
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

/**
 * GET /api/v1/admin/certificate/download
 *
 * Allows a certificate admin to download any winner's certificate PDF
 * without needing a user JWT. Validates csea_code + event_id query params,
 * verifies the winning record exists, then streams the generated PDF.
 */
async function adminDownloadCertificate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = downloadCertificateQuerySchema.parse({
      cseaCode: req.query.csea_code,
      eventId: req.query.event_id,
    });
    const winnerData = await certificateAdminService.getWinnerDataForCertificate(
      query.cseaCode,
      query.eventId,
    );
    await streamCertificate(res, winnerData);
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

export {
  certificateLogin,
  certificateLogout,
  getCertificateAdminStatus,
  addWinner,
  listWinners,
  adminDownloadCertificate,
};