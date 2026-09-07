import express from "express";

import {
  adminLogin,
  adminLogout,
  getAdminById,
} from "../../controllers/admin/admin.controller";

import { protect, authorize } from "../../middleware/authMiddleware";

const router = express.Router();

router.post("/admin/login", adminLogin);
router.post("/admin/logout", adminLogout);
router.get("/admin/me", protect, authorize("admin"),getAdminById);

export default router;
