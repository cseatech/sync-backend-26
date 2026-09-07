import { Request, Response, NextFunction } from "express";

import authService from "../../services/auth/auth.service";
import registrationService from "../../services/auth/registration.service";

import {
  loginSchema,
  profileByCseaCodeSchema,
  changePasswordSchema,
  forgetPasswordSchema,
  registrationInitiateSchema,
  registrationVerifySchema,
  forgotPasswordInitiateSchema,
  forgotPasswordVerifySchema,
  updateProfileSchema,
} from "../../validators/auth.validator";

import { handleControllerError } from "../../utils/controllerError";
import { setAuthCookie } from "../../utils/authCookie";

// ── Registration ──────────────────────────────────────────────

async function initiateRegistration(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body || {};
    const parsed = registrationInitiateSchema.parse(body);
    const result = await registrationService.initiateRegistration(parsed);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

async function verifyRegistration(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body || {};
    const parsed = registrationVerifySchema.parse(body);
    const result = await registrationService.verifyRegistration(parsed);

    res.status(200).json({
      success: true,
      message: "Registration successful",
      data: {
        cseaCode: result.cseaCode,
      },
    });
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

// ── Authentication ────────────────────────────────────────────

async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body || {};
    const parsed = loginSchema.parse(body);
    const result = await authService.login(parsed);
    setAuthCookie(res, result.token);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: { user: result.user },
    });

  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

// ── Profile ───────────────────────────────────────────────────

async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = profileByCseaCodeSchema.parse(req.params || {});
    const profile = await authService.getProfileByCseaCode(
      params.csea_code,
      req.user!,
    );

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body || {};
    const parsed = updateProfileSchema.parse(body);
    const result = await authService.updateProfile(
      (req.user as { user_id?: number })?.user_id,
      parsed,
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.profile,
    });
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

// ── Password Management ──────────────────────────────────────

async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body || {};
    const parsed = changePasswordSchema.parse(body);
    const result = await authService.changePassword(
      (req.user as { user_id?: number })?.user_id,
      parsed,
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

async function forgetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body || {};
    const parsed = forgetPasswordSchema.parse(body);
    const result = await authService.forgetPassword(parsed);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}
async function getProfileByUserId(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    console.log(req.user);
    const user = await authService.getProfileByUserId(req.user?.user_id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}
// ── OTP (Forgot Password Flow — cache-based, no token exposed) ─

/**
 * Request OTP for forgot-password flow.
 *
 * SECURITY: Unlike the previous implementation, NO token or hashed
 * OTP is returned to the frontend. The OTP lives only in the
 * server-side LRU cache and the email.
 */
async function getOTP(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = forgotPasswordInitiateSchema.parse(req.body || {});
    await authService.requestOTP(parsed.email);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

/**
 * Verify OTP for forgot-password flow.
 *
 * SECURITY: No longer requires a JWT token from the frontend.
 * Verification is done entirely against the server-side LRU cache
 * using timing-safe comparison.
 */
async function verifyOTP(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = forgotPasswordVerifySchema.parse(req.body || {});
    const result = await authService.verifyEnteredOTP(
      parsed.email,
      parsed.otp,
    );

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: {
        resetToken: result.resetToken,
      },
    });
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

export {
  initiateRegistration,
  verifyRegistration,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgetPassword,
  getOTP,
  verifyOTP,
  getProfileByUserId,
};
