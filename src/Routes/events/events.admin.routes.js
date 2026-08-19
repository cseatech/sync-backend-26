const express = require("express");
const {
  getParticipant,
  getAdminAssignedEvents,
} = require("../../controllers/events/events.admin.controller");
const { protect, authorize } = require("../../middleware/authMiddleware");

const router = express.Router();

// All routes below are admin-only
router.use(protect, authorize("admin"));

// GET /api/v1/admin/participant/:csea_code
router.get("/admin/participant/:csea_code", getParticipant);

// GET /api/v1/admin/events
router.get("/admin/events", getAdminAssignedEvents);

module.exports = router;
