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

// extracted the common cseaCode schema to reuse it in multiple places
const cseaCodeSchema = z
  .string()
  .trim()
  .min(1, "Each CSEA code must be non-empty")
  .regex(/^[A-Z]{2}\d{4}$/, {
    message: "Each CSEA code must match format AA0000",
  });

const participantCseaCodeParamSchema = z.object({
  csea_code: cseaCodeSchema,
});

// Body schema for adding participants to an event
const addParticipantsBodySchema = z.object({
  csea_codes: z
    .array(cseaCodeSchema)
    .min(1, "At least one CSEA code is required")
    .max(7, "Cannot add more than 7 participants at once"),
});

// Param schema for team_no in URL
const teamNoParamSchema = z.object({
  team_no: z
    .string()
    .trim()
    .min(1, "Team number is required")
    .refine((val: string) => /^\d+$/.test(val) && Number(val) > 0, {
      message: "Team number must be a positive integer",
    }),
});

// Body schema for superadmin routes that accept a target admin_id
const adminIdBodySchema = z.object({
  admin_id: z
    .string()
    .trim()
    .min(1, "Admin ID is required")
    .refine((val: string) => /^\d+$/.test(val) && Number(val) > 0, {
      message: "Admin ID must be a positive integer",
    }),
});

type EventIdParam = z.infer<typeof eventIdParamSchema>;

type ParticipantCseaCodeParam = z.infer<typeof participantCseaCodeParamSchema>;

type AddParticipantsBody = z.infer<typeof addParticipantsBodySchema>;

type TeamNoParam = z.infer<typeof teamNoParamSchema>;

type AdminIdBody = z.infer<typeof adminIdBodySchema>;

export {
  eventIdParamSchema,
  participantCseaCodeParamSchema,
  addParticipantsBodySchema,
  teamNoParamSchema,
  adminIdBodySchema,
  EventIdParam,
  ParticipantCseaCodeParam,
  AddParticipantsBody,
  TeamNoParam,
  AdminIdBody,
};
