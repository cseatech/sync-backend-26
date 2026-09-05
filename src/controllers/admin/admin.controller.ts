import { Request, Response, NextFunction } from "express";

import adminService from "../../services/admin/admin.service";

import {
  adminLoginSchema,
  changePasswordSchema,
} from "../../validators/auth.validator";

import { handleControllerError } from "../../utils/controllerError";
import { clearAuthCookie, setAuthCookie } from "../../utils/authCookie";

async function adminLogin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body || {};
    const parsed = adminLoginSchema.parse(body);
    const result = await adminService.adminLogin(parsed);
    setAuthCookie(res, result.token);

    res.status(200).json({
      success: true,
      message: "Admin login successful",
      data: { user: { ...result.admin, role: "admin" } },
    });

    return;
  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

function adminLogout(req: Request, res: Response): void {
  clearAuthCookie(res);
  res.status(200).json({ success: true, message: "Admin logout successful" });
}

async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body || {};
    const parsed = changePasswordSchema.parse(body);
    const result = await adminService.changePassword(
      req.user?.admin_id,
      parsed,
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
    return;

  } catch (error: unknown) {
    handleControllerError(error, res, next);
  }
}

export { adminLogin, adminLogout, changePassword };
