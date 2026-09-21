import { Request, Response, NextFunction } from "express";
import { verifyCertificateToken, CertificateAdminJwtPayload } from "../utils/jwt";

// Extend Express Request to carry the certificate admin identity
declare global {
  namespace Express {
    interface Request {
      certificateAdmin?: CertificateAdminJwtPayload;
    }
  }
}

/**
 * Middleware that protects certificate admin routes.
 *
 * Verifies the Bearer token against the CERTIFICATE_ADMIN_JWT_SECRET,
 * and ensures the decoded payload carries role === "certificate_admin".
 *
 * This is intentionally separate from the main `protect` middleware so
 * that certificate admin tokens cannot be used on regular admin routes
 * and vice-versa.
 */
function protectCertificateAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const authHeader = req.headers.authorization || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = match ? match[1].trim() : null;

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Certificate admin authentication token is required",
      });
      return;
    }

    const decoded = verifyCertificateToken(token);

    req.certificateAdmin = decoded;

    next();
  } catch (error: unknown) {
    // Surface the status code set by verifyCertificateToken → throwError
    const httpError = error as Error & { statusCode?: number };

    res.status(httpError.statusCode ?? 401).json({
      success: false,
      message: httpError.message || "Invalid or expired certificate admin token",
    });
  }
}

export { protectCertificateAdmin };
