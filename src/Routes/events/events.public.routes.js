const express = require("express");
const {
  listAllEvents,
  getEventDetails,
  getParticipantEvents,
} = require("../../controllers/events/events.public.controller");
const { protect, authorize } = require("../../middleware/authMiddleware");

const router = express.Router();

// GET /api/v1/events — public, no auth required
router.get("/events", listAllEvents);

// GET /api/v1/events/participant/:csea_code — must come BEFORE /:event_id
// so Express doesn't treat "participant" as an event_id
router.get(
  "/events/participant/:csea_code",
  protect,
  authorize("user", "admin"),
  getParticipantEvents
);

// GET /api/v1/events/:event_id — public, no auth required
router.get("/events/:event_id", getEventDetails);

module.exports = router;
