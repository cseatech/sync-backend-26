import express from "express";

import {
  getEventAdmins,
  getAllSystemAdmins,
  assignEventAdmin,
  removeEventAdmin,
  getSuperAdminStats,
} from "../../controllers/events/events.superadmin.controller";

import { protect, authorize } from "../../middleware/authMiddleware";

const router = express.Router();

const adminAuth = [protect, authorize("admin")];

// GET /api/v1/superadmin/stats
// Returns platform & event participation, team, and round stats (Superadmin only)
router.get("/superadmin/stats", adminAuth, getSuperAdminStats);

// GET /api/v1/superadmin/admins
// Returns all system administrators
router.get("/superadmin/admins", adminAuth, getAllSystemAdmins);

// GET /api/v1/superadmin/events/:event_id/admins
// Returns all admins assigned to the event
router.get("/superadmin/events/:event_id/admins", adminAuth, getEventAdmins);

// POST /api/v1/superadmin/events/:event_id/admin
// Assigns an admin to the event; body: { admin_id }
router.post("/superadmin/events/:event_id/admin", adminAuth, assignEventAdmin);

// DELETE /api/v1/superadmin/events/:event_id/admin
// Removes an admin from the event; body: { admin_id }
router.delete("/superadmin/events/:event_id/admin", adminAuth, removeEventAdmin);

export default router;

