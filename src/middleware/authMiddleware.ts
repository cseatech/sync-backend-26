import { Request, Response, NextFunction } from "express";
import { verifyToken,AppJwtPayload} from "../utils/jwt";


declare global {
  namespace Express {
    interface Request {
      user?: AppJwtPayload;
    }
  }
}

async function protect(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization || "";

    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });

      return;
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.role) {
      res.status(401).json({
        success: false,
        message: "Token is missing a valid role",
      });

      return;
    }

    if (decoded.role !== "user" && decoded.role !== "admin") {
      res.status(401).json({
        success: false,
        message: "Token contains an invalid role",
      });

      return;
    }

    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });

    return;
  }
}

function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });

      return;
    }

    const userRole = String(req.user.role || "").toLowerCase();

    const normalizedAllowedRoles = allowedRoles.map((role) =>
      String(role).toLowerCase(),
    );

    if (!normalizedAllowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });

      return;
    }

    next();
  };
}

export { protect, authorize };
