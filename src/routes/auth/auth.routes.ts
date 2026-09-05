import express from "express";
import rateLimit from "express-rate-limit";

import {
  initiateRegistration,
  verifyRegistration,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgetPassword,
  getOTP,
  verifyOTP,
} from "../../controllers/auth/auth.controller";

import { protect, authorize } from "../../middleware/authMiddleware";
import { clearAuthCookie } from "../../utils/authCookie";

const router = express.Router();

// ── Rate limiter: 5 requests per 5-minute window per IP ─────
const registrationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many registration attempts. Please try again after 5 minutes.",
  },
});

// ── Registration (public, rate-limited) ──────────────────────
router.post("/register/initiate", registrationLimiter, initiateRegistration);
router.post("/register/verify", verifyRegistration);

// ── Login (public) ───────────────────────────────────────────
router.post("/auth/login", login);

router.post("/auth/logout", (req, res) => {
  clearAuthCookie(res);
  res.status(200).json({ success: true, message: "Logout successful" });
});

// ── Forgot Password OTP (public, cache-based) ────────────────
router.post("/auth/getOTP", getOTP);
router.post("/auth/verifyOTP", verifyOTP);
router.post("/auth/forgetPassword", forgetPassword);

// ── Password Change (authenticated, user only) ───────────────
router.post(
  "/auth/changePassword",
  protect,
  authorize("user"),
  changePassword,
);

// ── Profile (authenticated) ──────────────────────────────────
router.get(
  "/auth/profile/:csea_code",
  protect,
  authorize("user", "admin"),
  getProfile,
);

router.put(
  "/auth/profile",
  protect,
  authorize("user"),
  updateProfile,
);

router.get("/auth/me", protect, authorize("user"), (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

export default router;
