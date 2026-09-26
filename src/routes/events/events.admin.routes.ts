import express from "express";

import {
  getParticipant,
  getAdminAssignedEvents,
  getEventParticipants,
  addEventParticipants,
  removeEventParticipant,
  removeEventTeam,
  upsertTeamMarks,
  getEventMarks,
} from "../../controllers/events/events.admin.controller";

import { protect, authorize } from "../../middleware/authMiddleware";

const router = express.Router();

const adminAuth = [protect, authorize("admin")];

// GET /api/v1/admin/participant/:csea_code
router.get("/admin/participant/:csea_code", adminAuth, getParticipant);

// Must be registered BEFORE /admin/events to avoid
// ":event_id" consuming the literal "participant" segment
// GET /api/v1/admin/events/:event_id/participants
router.get("/admin/events/:event_id/participants", adminAuth, getEventParticipants);

// POST /api/v1/admin/events/:event_id/participants
router.post("/admin/events/:event_id/participants", adminAuth, addEventParticipants);

// GET /api/v1/admin/events
router.get("/admin/events", adminAuth, getAdminAssignedEvents);

// DELETE /api/v1/admin/events/:event_id/participant
// csea_code is in the request body
router.delete("/admin/events/:event_id/participant", adminAuth, removeEventParticipant);

// DELETE /api/v1/admin/events/:event_id/team/:team_no
router.delete("/admin/events/:event_id/team/:team_no", adminAuth, removeEventTeam);

// GET /api/v1/admin/events/:event_id/marks
router.get("/admin/events/:event_id/marks", adminAuth, getEventMarks);

// PUT /api/v1/admin/events/:event_id/team/:team_no/marks
router.put("/admin/events/:event_id/team/:team_no/marks", adminAuth, upsertTeamMarks);

export default router;
