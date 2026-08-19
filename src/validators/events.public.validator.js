const { z } = require("zod");

const eventIdParamSchema = z.object({
  event_id: z
    .string()
    .trim()
    .min(1, "Event ID is required")
    .refine((val) => /^\d+$/.test(val) && Number(val) > 0, {
      message: "Event ID must be a positive integer",
    }),
});

const participantCseaCodeParamSchema = z.object({
  csea_code: z
    .string()
    .trim()
    .min(1, "CSEA code is required")
    .regex(/^[A-Z]{2}\d{4}$/, {
      message: "CSEA code format is invalid",
    }),
});

module.exports = {
  eventIdParamSchema,
  participantCseaCodeParamSchema,
};
