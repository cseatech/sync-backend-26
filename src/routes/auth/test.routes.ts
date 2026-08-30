import express from "express";
import registrationService from "../../services/auth/registration.service.js";
import {
  registrationInitiateSchema,
  registrationVerifySchema,
} from "../../validators/auth.validator.js";
import { handleControllerError } from "../../utils/controllerError.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { like } from "drizzle-orm";

const router = express.Router();

/**
 * Load-test routes — NO rate limiter, fixed OTP "123456".
 *
 * These routes are ONLY mounted when NODE_ENV !== "production".
 * They mirror the real /register/initiate and /register/verify
 * endpoints but with two key differences:
 *   1. No rate limiter middleware
 *   2. The OTP is hardcoded to "123456" so k6 can verify without email
 *
 * Usage:
 *   POST /api/v1/test/register/initiate  — same body as real endpoint
 *   POST /api/v1/test/register/verify    — same body, use otp: "123456"
 */

// ── Test Initiate ────────────────────────────────────────────
router.post("/test/register/initiate", async (req, res, next) => {
  try {
    const parsed = registrationInitiateSchema.parse(req.body || {});
    const result = await registrationService.initiateRegistration(parsed);
    res.status(200).json({ success: true, message: result.message });
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
});

// ── Test Verify ──────────────────────────────────────────────
router.post("/test/register/verify", async (req, res, next) => {
  try {
    const parsed = registrationVerifySchema.parse(req.body || {});
    const result = await registrationService.verifyRegistration(parsed);
    res.status(200).json({
      success: true,
      message: "Registration successful",
      data: { cseaCode: result.cseaCode },
    });
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
});

// ── Test Cleanup — delete test users after a k6 run ──────────
router.delete("/test/cleanup", async (req, res, next) => {
  try {
    const deleted = await db
      .delete(users)
      .where(like(users.email, "k6user%@loadtest.local"))
      .returning({ email: users.email });

    res.status(200).json({
      success: true,
      message: `Deleted ${deleted.length} test user(s)`,
      count: deleted.length,
    });
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
});

export default router;
