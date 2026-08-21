import { Request, Response, NextFunction } from "express";

import authService from "../../services/auth/auth.service";

import {
  loginSchema,
  profileByCseaCodeSchema,
  changePasswordSchema,
  forgetPasswordSchema,
} from "../../validators/auth.validator";

async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body || {};
    const parsed = loginSchema.parse(body);
    const result = await authService.login(parsed);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });

  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as Error & {
        issues?: Array<{ message?: string }>;
      };

      const message = zodError.issues?.[0]?.message || "Validation failed";

      res.status(400).json({
        success: false,
        message,
      });

      return;
    }

    if (error instanceof Error && error.statusCode) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });

      return;
    }

    next(error);
  }
}

async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = profileByCseaCodeSchema.parse(req.params || {});
    const profile = await authService.getProfileByCseaCode(
      params.csea_code,
      req.user,
    );

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as Error & {
        issues?: Array<{ message?: string }>;
      };

      const message = zodError.issues?.[0]?.message || "Validation failed";

      res.status(400).json({
        success: false,
        message,
      });

      return;
    }

    if (error instanceof Error && error.statusCode) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });

      return;
    }

    next(error);
  }
}

async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body || {};
    const parsed = changePasswordSchema.parse(body);
    const result = await authService.changePassword(req.user?.user_id, parsed);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as Error & {
        issues?: Array<{ message?: string }>;
      };

      const message = zodError.issues?.[0]?.message || "Validation failed";

      res.status(400).json({
        success: false,
        message,
      });

      return;
    }

    if (error instanceof Error && error.statusCode) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });

      return;
    }

    next(error);
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
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as Error & {
        issues?: Array<{ message?: string }>;
      };

      const message = zodError.issues?.[0]?.message || "Validation failed";

      res.status(400).json({
        success: false,
        message,
      });

      return;
    }

    if (error instanceof Error && error.statusCode) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });

      return;
    }

    next(error);
  }
}
async function getOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    const OTPToken = await authService.requestOTP(email);
    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      token: OTPToken,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as Error & {
        issues?: Array<{ message?: string }>;
      };

      const message = zodError.issues?.[0]?.message || "Validation failed";

      res.status(400).json({
        success: false,
        message,
      });

      return;
    }

    if (error instanceof Error && error.statusCode) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });

      return;
    }

    next(error);
  }
}
async function verifyOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, OTP, token } = req.body;
    const resetToken = await authService.verifyOTP(email, OTP, token);
    if (resetToken) {
      res.status(200).json({
        success: true,
        message: "OTP verified successfully",
        token: resetToken,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as Error & {
        issues?: Array<{ message?: string }>;
      };

      const message = zodError.issues?.[0]?.message || "Validation failed";

      res.status(400).json({
        success: false,
        message,
      });

      return;
    }

    if (error instanceof Error && error.statusCode) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });

      return;
    }

    next(error);
  }
}

export { login, getProfile, changePassword, forgetPassword, getOTP, verifyOTP };
