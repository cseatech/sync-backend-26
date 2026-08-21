import jwt, {
  JwtPayload as DefaultJwtPayload,
  SignOptions,
} from "jsonwebtoken";

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

export interface OtpPayload extends DefaultJwtPayload {
  email: string;
  otpHash: string;
}

export type AppJwtPayload =
  UserJwtPayload | AdminJwtPayload | PasswordResetJwtPayload;

export function signToken(payload: AppJwtPayload): string {
  const options: SignOptions = {
    expiresIn: "7d",
  };

  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): AppJwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET);

  if (typeof decoded === "string") {
    throw new Error("Invalid JWT payload");
  }

  return decoded as AppJwtPayload;
}
