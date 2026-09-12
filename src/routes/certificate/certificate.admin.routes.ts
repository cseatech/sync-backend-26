import express from "express";

import { protectCertificateAdmin } from "../../middleware/certificateAuthMiddleware";

import {
  certificateLogin,
  certificateLogout,
  getCertificateAdminStatus,
  addWinner,
  listWinners,
  adminDownloadCertificate,
} from "../../controllers/certificate/certificate.admin.controller";

const router = express.Router();

/**
 * POST /api/v1/admin/certificate/login
 *
 * Public — no token required. Sets an httpOnly cookie on success.
 */
router.post("/admin/certificate/login", certificateLogin);

/**
 * POST /api/v1/admin/certificate/logout
 *
 * Clears the certificate_admin httpOnly cookie.
 */
router.post("/admin/certificate/logout", certificateLogout);

/**
 * GET /api/v1/admin/certificate/me
 *
 * Protected — checks if valid certificate_admin session exists.
 */
router.get("/admin/certificate/me", protectCertificateAdmin, getCertificateAdminStatus);

/**
 * POST /api/v1/admin/certificate/winners
 *
 * Protected — requires a valid certificate_admin JWT in the
 * Authorization header as "Bearer <token>".
 */
router.post("/admin/certificate/winners", protectCertificateAdmin, addWinner);

/**
 * GET /api/v1/admin/certificate/winners
 *
 * Protected — requires a valid certificate_admin JWT.
 * Returns all winners joined with user and event information.
 */
router.get("/admin/certificate/winners", protectCertificateAdmin, listWinners);

/**
 * GET /api/v1/admin/certificate/download
 *
 * Protected — requires a valid certificate_admin JWT.
 * Query params: csea_code, event_id
 * Streams a PDF certificate for any winner without needing a user JWT.
 */
router.get("/admin/certificate/download", protectCertificateAdmin, adminDownloadCertificate);

export default router;
