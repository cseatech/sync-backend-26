import express from "express";

import {
  getParticipant,
  getAdminAssignedEvents,
} from "../../controllers/events/events.admin.controller";

import {
  protect,
  authorize,
} from "../../middleware/authMiddleware";

const router = express.Router();

// All routes below are admin-only
router.use(
  protect,
  authorize("admin")
);

// GET /api/v1/admin/participant/:csea_code
router.get(
  "/admin/participant/:csea_code",
  getParticipant
);

// GET /api/v1/admin/events
router.get(
  "/admin/events",
  getAdminAssignedEvents
);

export default router;