import { z } from "zod";

const eventIdParamSchema = z.object({
  event_id: z
    .string()
    .trim()
    .min(1, "Event ID is required")
    .refine((val: string) => /^\d+$/.test(val) && Number(val) > 0, {
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

type EventIdParam = z.infer<typeof eventIdParamSchema>;

type ParticipantCseaCodeParam = z.infer<typeof participantCseaCodeParamSchema>;

export {
  eventIdParamSchema,
  participantCseaCodeParamSchema,
  EventIdParam,
  ParticipantCseaCodeParam,
};
