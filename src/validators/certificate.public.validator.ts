import { z } from "zod";

/**
 * Params schema for GET /api/v1/users/:csea_code/certificates
 *
 * Ensures csea_code is present and non-empty in the URL params.
 */
const getCertificatesByCodeParamsSchema = z.object({
  csea_code: z
    .string()
    .trim()
    .min(1, "CSEA code is required")
    .regex(/^[A-Z]{2}\d{4}$/, {
      message:
        "CSEA code must match format AA0000",
    }),
});

/**
 * Query-string schema for GET /api/v1/certificates/download
 *
 * cseaCode  — identifies the user
 * eventId   — coerced from string to number (query strings are always strings)
 */
const downloadCertificateQuerySchema = z.object({
  cseaCode: z
    .string()
    .trim()
    .min(1, "CSEA code is required")
    .regex(/^[A-Z]{2}\d{4}$/, {
      message:
        "CSEA code must match format AA0000",
    }),

  eventId: z.coerce
    .number()
    .int("eventId must be an integer")
    .positive("eventId must be a positive integer"),

  type: z
    .enum(["winner", "appreciation", "participation"])
    .optional()
    .default("winner"),
});

type GetCertificatesByCodeParams = z.infer<
  typeof getCertificatesByCodeParamsSchema
>;
type DownloadCertificateQuery = z.infer<typeof downloadCertificateQuerySchema>;

export {
  getCertificatesByCodeParamsSchema,
  downloadCertificateQuerySchema,
  GetCertificatesByCodeParams,
  DownloadCertificateQuery,
};
