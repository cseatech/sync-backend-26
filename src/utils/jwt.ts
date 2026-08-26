import jwt, {
  JwtPayload as DefaultJwtPayload,
  SignOptions,
} from "jsonwebtoken";
import { throwError } from "./serviceError";

const JWT_SECRET = process.env.JWT_SECRET || "change_me_in_production";

export interface UserJwtPayload extends DefaultJwtPayload {
  user_id: number;
  email: string;
  role: "user";
}

export interface AdminJwtPayload extends DefaultJwtPayload {
  admin_id: number;
  email: string;
  role: "admin";
  privileged?: boolean;
}

export interface PasswordResetJwtPayload extends DefaultJwtPayload {
  email: string;
  scope: "password_reset";
}

export interface OTPPayload extends DefaultJwtPayload {
  email: string;
  OTPHash: string;
}

export interface CertificateAdminJwtPayload extends DefaultJwtPayload {
  role: "certificate_admin";
}

export type AppJwtPayload =
  | UserJwtPayload
  | AdminJwtPayload
  | PasswordResetJwtPayload
  | OTPPayload
  | CertificateAdminJwtPayload;

export function signToken(
  payload: AppJwtPayload,
  expiresIn: SignOptions["expiresIn"] = "7d",
): string {
  const options: SignOptions = {
    expiresIn,
  };

  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): AppJwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET);

  if (typeof decoded === "string") {
    throwError("Invalid JWT payload", 401);
  }

  return decoded as AppJwtPayload;
}

// ── Certificate Admin — uses its own isolated secret ─────────────────────────

const CERTIFICATE_JWT_SECRET =
  process.env.CERTIFICATE_ADMIN_JWT_SECRET ||
  process.env.JWT_SECRET ||
  "change_me_in_production";

export function signCertificateToken(
  payload: CertificateAdminJwtPayload,
  expiresIn: SignOptions["expiresIn"] = "3d",
): string {
  return jwt.sign(payload, CERTIFICATE_JWT_SECRET, { expiresIn });
}

export function verifyCertificateToken(token: string): CertificateAdminJwtPayload {
  const decoded = jwt.verify(token, CERTIFICATE_JWT_SECRET);

  if (typeof decoded === "string") {
    throwError("Invalid certificate admin token", 401);
  }

  const payload = decoded as CertificateAdminJwtPayload;

  if (payload.role !== "certificate_admin") {
    throwError("Token does not have certificate_admin role", 403);
  }

  return payload;
}
