import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import type { OtpPayload } from "./jwt";

const SERVER_SECRET =
  process.env.SERVER_SECRET ||
  process.env.JWT_SECRET ||
  "change_me_in_production";

const OTP_EXPIRES_IN: StringValue = (process.env.OTP_EXPIRES_IN ||
  "10m") as StringValue;

function generateOTP(): number {
  return crypto.randomInt(100000, 1000000);
}

function hashOTP(otp: number | string): string {
  return crypto
    .createHash("sha256")
    .update(`${otp}${SERVER_SECRET}`)
    .digest("hex");
}

function getOtpToken(OTP: number | string, email: string): string {
  return jwt.sign(
    {
      email,
      otpHash: hashOTP(OTP),
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
    const payload = jwt.verify(token, SERVER_SECRET) as OtpPayload;

    const expectedHash = Buffer.from(hashOTP(OTP), "utf8");

    const actualHash = Buffer.from(String(payload.otpHash || ""), "utf8");

    return (
      payload.email === email &&
      expectedHash.length === actualHash.length &&
      crypto.timingSafeEqual(expectedHash, actualHash)
    );
  } catch {
    return false;
  }
}

export { generateOTP, getOtpToken, verifyOTP };
