import express from "express";

import {
  adminLogin,
  changePassword,
} from "../../controllers/admin/admin.controller";

import { protect, authorize } from "../../middleware/authMiddleware";

const router = express.Router();

router.post("/admin/login", adminLogin);

router.post(
  "/admin/changePassword",
  protect,
  authorize("admin"),
  changePassword,
);

router.get("/admin/me", protect, authorize("admin"), (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

export default router;
