import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

import { db } from "../../db/index";
import { users } from "../../db/schema";
import {generateOTP,verifyOTP,getOTPToken} from "../../utils/otp";
import {
  signToken,
  verifyToken,
  UserJwtPayload,
  PasswordResetJwtPayload,
} from "../../utils/jwt";
import {sendMail} from "../../utils/email";
import {
  LoginInput,
  ChangePasswordInput,
  ForgetPasswordInput,
} from "../../validators/auth.validator";

import { throwError } from "../../utils/serviceError";

/**
 * Authenticate a user and return an access token with profile data.
 *
 * Validates the supplied credentials against the users table,
 * then creates a JWT for authenticated user requests.
 *
 * @param payload - User email and password
 */
async function login(payload: LoginInput) {
  const { email, password } = payload;

  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail || !String(password || "").trim()) {
    throwError("Email and password are required", 400);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user || !user.password_hash) {
    throwError("Invalid email or password", 401);
  }

  const isPasswordValid = await bcrypt.compare(
    String(password),
    user.password_hash,
  );

  if (!isPasswordValid) {
    throwError("Invalid email or password", 401);
  }

  const tokenPayload: UserJwtPayload = {
    user_id: user.user_id,
    email: user.email,
    role: "user",
  };

  const token = signToken(tokenPayload);

  return {
    token,

    user: {
      csea_code: user.csea_code,
      register_number: user.register_number,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      college: user.college,
      department: user.department,
      year: user.year,
      gender: user.gender,
    },
  };
}

/**
 * Get a user's profile by CSEA code.
 *
 * Allows administrators to view any profile and users to view
 * only their own profile.
 *
 * @param cseaCode - CSEA code identifying the requested user
 * @param requester - User or admin identity from the decoded JWT
 */
async function getProfileByCseaCode(
  cseaCode: string,
  requester:
    | UserJwtPayload
    | {
        user_id?: number;
        role?: string;
      } = {},
) {
  const normalizedCode = String(cseaCode || "").trim();

  if (!normalizedCode) {
    throwError("CSEA code is required", 400);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.csea_code, normalizedCode))
    .limit(1);

  if (!user) {
    throwError("User profile not found", 404);
  }

  if (String(requester.role || "").toLowerCase() === "admin") {
    return {
      // user_id: user.user_id,
      csea_code: user.csea_code,
      register_number: user.register_number,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      college: user.college,
      department: user.department,
      year: user.year,
      gender: user.gender,

      // created_at: user.created_at,
      // updated_at: user.updated_at,
    };
  }

  if (Number(requester.user_id) !== Number(user.user_id)) {
    throwError("You are not allowed to access this profile", 403);
  }

  return {
    // user_id: user.user_id,
    csea_code: user.csea_code,
    register_number: user.register_number,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    college: user.college,
    department: user.department,
    year: user.year,
    gender: user.gender,

    // created_at: user.created_at,
    // updated_at: user.updated_at,
  };
}

/**
 * Change a user's password.
 *
 * Verifies the current password before storing the new password hash.
 *
 * @param userId - User ID from the decoded JWT
 * @param payload - Current and new password values
 */
async function changePassword(
  userId: number | undefined,
  payload: ChangePasswordInput,
) {
  const { oldPassword, newPassword } = payload;

  if (!userId) {
    throwError("User id is required", 401);
  }

  if (!String(oldPassword || "").trim() || !String(newPassword || "").trim()) {
    throwError("Old password and new password are required", 400);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.user_id, Number(userId)))
    .limit(1);

  if (!user || !user.password_hash) {
    throwError("User not found", 404);
  }

  const isOldPasswordValid = await bcrypt.compare(
    String(oldPassword),
    user.password_hash,
  );

  if (!isOldPasswordValid) {
    throwError("Old password is incorrect", 401);
  }

  if (String(oldPassword) === String(newPassword)) {
    throwError("New password must be different from the old password", 400);
  }

  const hashedPassword = await bcrypt.hash(String(newPassword), 12);

  await db
    .update(users)
    .set({
      password_hash: hashedPassword,
      updated_at: new Date(),
    })
    .where(eq(users.user_id, Number(userId)));

  return {
    message: "Password changed successfully",
  };
}

/**
 * Reset a user's password using a verified password-reset token.
 *
 * Rejects expired, invalid, or incorrectly scoped reset tokens
 * before updating the user's password hash.
 *
 * @param payload - Password-reset token and new password
 */
async function forgetPassword(payload: ForgetPasswordInput) {
  const { reset_token, newPassword } = payload;

  if (!String(reset_token || "").trim() || !String(newPassword || "").trim()) {
    throwError("Reset token and new password are required", 400);
  }

  let decoded: PasswordResetJwtPayload;

  try {
    decoded = verifyToken(reset_token) as PasswordResetJwtPayload;
  } catch {
    throwError("Invalid or expired reset token", 401);
  }

  if (!decoded || decoded.scope !== "password_reset") {
    throwError("Invalid reset token scope", 401);
  }

  const normalizedEmail = String(decoded.email || "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    throwError("Reset token does not contain an email", 401);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user) {
    throwError("User not found", 404);
  }

  if (await bcrypt.compare(String(newPassword), user.password_hash)) {
    throwError("New password must be different from the current password", 400);
  }

  const hashedPassword = await bcrypt.hash(String(newPassword), 12);

  await db
    .update(users)
    .set({
      password_hash: hashedPassword,
      updated_at: new Date(),
    })
    .where(eq(users.email, normalizedEmail));

  return {
    message: "Password reset successful",
  };
}

/**
 * Generate and email a one-time password for password recovery.
 *
 * Returns a short-lived token containing the hashed OTP for later verification.
 *
 * @param email - Email address of the user requesting password recovery
 */
async function requestOTP(email: string) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
    if (!user) {
      throwError("User not found", 404);
    }
    const OTP=generateOTP();
    const OTPToken=getOTPToken(OTP,email);
    await sendMail(email, " OTP for resetting password", `Your OTP code is: ${OTP}`);
    return OTPToken;
}

  /**
   * Verify a submitted one-time password and issue a reset token.
   *
   * The returned reset token can be used to complete the password reset flow.
   *
   * @param email - Email address associated with the OTP
   * @param OTP - One-time password submitted by the user
   * @param token - OTP verification token returned by requestOTP
   */
async function verifyEnteredOTP(email: string, OTP: number | string, token: string) {
  const isValid = verifyOTP(String(OTP), email, token);
  if (!isValid) {
    throwError("Invalid or expired OTP", 401);
  }
  const resetTokenPayload: PasswordResetJwtPayload = {
    email,
    scope: "password_reset"
  };
  const resetToken = signToken(resetTokenPayload,"5m");
  return resetToken;
}
export default {
  login,
  getProfileByCseaCode,
  changePassword,
  forgetPassword,
  requestOTP,
  verifyEnteredOTP,
};
