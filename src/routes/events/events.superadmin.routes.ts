import express from "express";

import {
  getEventAdmins,
  assignEventAdmin,
  removeEventAdmin,
} from "../../controllers/events/events.superadmin.controller";

import { protect, authorize } from "../../middleware/authMiddleware";

const router = express.Router();

// Superadmin (privileged) check is enforced in the service layer.
router.use(protect, authorize("admin"));

// GET /api/v1/superadmin/events/:event_id/admins
// Returns all admins assigned to the event
router.get("/superadmin/events/:event_id/admins", getEventAdmins);

// POST /api/v1/superadmin/events/:event_id/admin
// Assigns an admin to the event; body: { admin_id }
router.post("/superadmin/events/:event_id/admin", assignEventAdmin);

// DELETE /api/v1/superadmin/events/:event_id/admin
// Removes an admin from the event; body: { admin_id }
router.delete("/superadmin/events/:event_id/admin", removeEventAdmin);

export default router;
