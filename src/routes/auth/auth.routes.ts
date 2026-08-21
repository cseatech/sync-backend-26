import express from "express";

import {
  login,
  getProfile,
  changePassword,
  forgetPassword,
  getOTP,
  verifyOTP,
} from "../../controllers/auth/auth.controller";

import { protect, authorize } from "../../middleware/authMiddleware";

const router = express.Router();

router.post("/auth/login", login);

router.post("/auth/changePassword", protect, authorize("user"), changePassword);

router.post("/auth/forgetPassword", forgetPassword);

router.post("/auth/getOTP", getOTP);

router.post("/auth/verifyOTP", verifyOTP);
router.get("/auth/profile/:csea_code",protect,authorize("user", "admin"),getProfile);

router.get("/auth/me", protect, authorize("user"), (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

export default router;
