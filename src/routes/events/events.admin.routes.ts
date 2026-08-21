import express from "express";

import {
  getParticipant,
  getAdminAssignedEvents,
  getEventParticipants,
  addEventParticipants,
  removeEventParticipant,
  removeEventTeam,
} from "../../controllers/events/events.admin.controller";

import { protect, authorize } from "../../middleware/authMiddleware";

const router = express.Router();

// All routes below are admin-only
router.use(protect, authorize("admin"));

// GET /api/v1/admin/participant/:csea_code
router.get("/admin/participant/:csea_code", getParticipant);

// Must be registered BEFORE /admin/events to avoid
// ":event_id" consuming the literal "participant" segment
// GET /api/v1/admin/events/:event_id/participants
router.get("/admin/events/:event_id/participants", getEventParticipants);

// POST /api/v1/admin/events/:event_id/participants
router.post("/admin/events/:event_id/participants", addEventParticipants);

// GET /api/v1/admin/events
router.get("/admin/events", getAdminAssignedEvents);

// DELETE /api/v1/admin/events/:event_id/participant
// csea_code is in the request body
router.delete("/admin/events/:event_id/participant", removeEventParticipant);

// DELETE /api/v1/admin/events/:event_id/team/:team_no
router.delete("/admin/events/:event_id/team/:team_no", removeEventTeam);

export default router;
