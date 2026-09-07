import express from "express";

import {
  adminLogin,
  adminLogout,
  changePassword,
} from "../../controllers/admin/admin.controller";

import { protect, authorize } from "../../middleware/authMiddleware";

const router = express.Router();

router.post("/admin/login", adminLogin);
router.post("/admin/logout", adminLogout);
router.get("/admin/me", protect, authorize("admin"), (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

export default router;
