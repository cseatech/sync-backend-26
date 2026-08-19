import {
  Request,
  Response,
  NextFunction,
} from "express";

import adminService from "../../services/admin/admin.service";

import {
  adminLoginSchema,
  changePasswordSchema,
} from "../../validators/auth.validator";

async function adminLogin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body || {};

    const parsed =
      adminLoginSchema.parse(body);

    const result =
      await adminService.adminLogin(parsed);

    res.status(200).json({
      success: true,
      message:
        "Admin login successful",
      data: result,
    });

    return;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === "ZodError"
    ) {
      const zodError = error as Error & {
        issues?: Array<{
          message?: string;
        }>;
      };

      const message =
        zodError.issues?.[0]?.message ||
        "Validation failed";

      res.status(400).json({
        success: false,
        message,
      });

      return;
    }

    if (
      error instanceof Error &&
      error.statusCode
    ) {
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
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body || {};

    const parsed =
      changePasswordSchema.parse(body);

    const result =
      await adminService.changePassword(
        req.user?.admin_id,
        parsed
      );

    res.status(200).json({
      success: true,
      message: result.message,
    });

    return;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === "ZodError"
    ) {
      const zodError = error as Error & {
        issues?: Array<{
          message?: string;
        }>;
      };

      const message =
        zodError.issues?.[0]?.message ||
        "Validation failed";

      res.status(400).json({
        success: false,
        message,
      });

      return;
    }

    if (
      error instanceof Error &&
      error.statusCode
    ) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });

      return;
    }

    next(error);
  }
}

export {
  adminLogin,
  changePassword,
};