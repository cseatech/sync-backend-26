import { z } from "zod";

/**
 * Body schema for POST /api/v1/admin/certificate/login
 */
const certificateLoginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Body schema for POST /api/v1/admin/certificate/winners
 *
 * event_id is coerced from string to number to handle URL-encoded clients.
 * position is bounded to smallint range (1–32767).
 */
const certificateInsertWinnerSchema = z.object({
  csea_code: z
    .string()
    .trim()
    .min(1, "CSEA code is required")
    .regex(/^[A-Z]{2}\d{4}$/, {
      message:
        "CSEA code must match format AA0000",
    }),

  event_id: z.coerce
    .number()
    .int("Event ID must be an integer")
    .positive("Event ID must be a positive integer"),

  position: z.coerce
    .number()
    .int("Position must be an integer")
    .positive("Position must be a positive integer")
    .max(3, "Position exceeds the maximum allowed value"),
});



type CertificateLoginInput = z.infer<typeof certificateLoginSchema>;
type CertificateInsertWinnerInput = z.infer<typeof certificateInsertWinnerSchema>;

export {
  certificateLoginSchema,
  certificateInsertWinnerSchema,
  CertificateLoginInput,
  CertificateInsertWinnerInput,
};
