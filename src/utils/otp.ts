import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import type { OTPPayload } from "./jwt";

const SERVER_SECRET =
  process.env.SERVER_SECRET ||
  process.env.JWT_SECRET ||
  "change_me_in_production";

const OTP_EXPIRES_IN: StringValue = (process.env.OTP_EXPIRES_IN ||
  "10m") as StringValue;

function generateOTP(): number {
  return crypto.randomInt(100000, 1000000);
}

function hashOTP(OTP: number | string): string {
  return crypto
    .createHash("sha256")
    .update(`${OTP}${SERVER_SECRET}`)
    .digest("hex");
}

function getOTPToken(OTP: number | string, email: string): string {
  return jwt.sign(
    {
      email,
      OTPHash: hashOTP(OTP),
    },
    SERVER_SECRET,
    {
      expiresIn: OTP_EXPIRES_IN,
    },
  );
}

function verifyOTP(
  OTP: number | string,
  email: string,
  token: string,
): boolean {
  try {
    const payload = jwt.verify(token, SERVER_SECRET) as OTPPayload;

    const expectedHash = Buffer.from(hashOTP(OTP), "utf8");

    const actualHash = Buffer.from(String(payload.OTPHash || ""), "utf8");

    return (
      payload.email === email &&
      expectedHash.length === actualHash.length &&
      crypto.timingSafeEqual(expectedHash, actualHash)
    );
  } catch {
    return false;
  }
}

export { generateOTP, getOTPToken, verifyOTP };
