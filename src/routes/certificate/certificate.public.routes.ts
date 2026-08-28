import express from "express";

import {
  listUserCertificates,
  downloadCertificate,
} from "../../controllers/certificate/certificate.public.controller";

import { protect, authorize } from "../../middleware/authMiddleware";

const router = express.Router();

/**
 * GET /api/v1/users/:csea_code/certificates
 *
 ```````* Public — no authentication required.`````````` not
 * Returns an array of certificate metadata for the given CSEA code.
 * Returns an empty array (not 404) when the user has no certificates.
 */
router.get("/users/:csea_code/certificates", protect, authorize("user"), listUserCertificates);

/**
 * GET /api/v1/certificates/download
 *
 * Public — query params: cseaCode, eventId
 * Verifies the user's winning record and streams a PDF certificate.
 * Returns 403 Forbidden when no matching record is found.
 */
router.get("/certificates/download", protect, authorize("user"),downloadCertificate);

export default router;
