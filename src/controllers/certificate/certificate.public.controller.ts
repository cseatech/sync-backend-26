import { Request, Response, NextFunction } from "express";

import {
  getUserCertificates,
  verifyAndGetWinnerData,
  verifyAndGetParticipationData,
} from "../../services/certificate/certificate.public.service";

import { streamCertificate } from "../../services/certificate/pdf.service";

import {
  getCertificatesByCodeParamsSchema,
  downloadCertificateQuerySchema,
} from "../../validators/certificate.public.validator";

import { handleControllerError } from "../../utils/controllerError";

/**
 * GET /api/v1/users/:csea_code/certificates
 *
 * Returns an array of certificate metadata for the given user.
 * Responds with an empty array when the user has no certificates — never 404.
 */
async function listUserCertificates(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = getCertificatesByCodeParamsSchema.parse(req.params);
    const data = await getUserCertificates(params);

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
 * GET /api/v1/certificates/download
 *
 * Verifies the caller holds a winning record (for appreciation) or participation
 * record (for participation) for the requested event, then streams a dynamically
 * generated PDF certificate to the client.
 *
 * Responds 403 when no matching record exists (prevents unauthorised generation).
 * The PDF is never written to disk — it is piped directly to res.
 */
async function downloadCertificate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = downloadCertificateQuerySchema.parse(req.query);

    const isParticipation = query.type === "participation";
    if (isParticipation) {
      // 1. Verify participation record & retrieve data needed for the PDF
      const participantData = await verifyAndGetParticipationData(query);
      // 2. Generate Participation PDF in RAM and stream directly to response
      await streamCertificate(res, participantData, "participation");
    } else {
      // 1. Verify DB winning record & retrieve data needed for the PDF
      const winnerData = await verifyAndGetWinnerData(query);
      // 2. Generate Appreciation PDF in RAM and stream directly to response
      await streamCertificate(res, winnerData, "winner");
    }
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

export { listUserCertificates, downloadCertificate };
