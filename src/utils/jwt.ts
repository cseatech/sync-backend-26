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


export  type AppJwtPayload = UserJwtPayload | AdminJwtPayload | PasswordResetJwtPayload | OTPPayload;

export function signToken(payload: AppJwtPayload): string {
  const options: SignOptions = {
    expiresIn: "7d",
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
