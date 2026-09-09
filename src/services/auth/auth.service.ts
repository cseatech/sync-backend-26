import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

import { db } from "../../db/index";
import { users } from "../../db/schema";
import { generateOTP, compareOTP } from "../../utils/otp";
import { forgotPasswordCache } from "../../cache/forgotPasswordCache";
import { addJob } from "../../workers/index";
import {
  signToken,
  verifyToken,
  UserJwtPayload,
  PasswordResetJwtPayload,
  AppJwtPayload,
} from "../../utils/jwt";
import {
  LoginInput,
  ChangePasswordInput,
  ForgetPasswordInput,
  UpdateProfileInput,
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
    .select({
      user_id: users.user_id,
      csea_code: users.csea_code,
      register_number: users.register_number,
      full_name: users.full_name,
      email: users.email,
      phone: users.phone,
      college: users.college,
      department: users.department,
      year: users.year,
      gender: users.gender,
      password_hash: users.password_hash,
    })
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
  requester: AppJwtPayload
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
      csea_code: user.csea_code,
      register_number: user.register_number,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      college: user.college,
      department: user.department,
      year: user.year,
      gender: user.gender,
    };
  }

  if (Number((requester as UserJwtPayload).user_id) !== Number(user.user_id)) {
    throwError("You are not allowed to access this profile", 403);
  }

  return {
    csea_code: user.csea_code,
    register_number: user.register_number,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    college: user.college,
    department: user.department,
    year: user.year,
    gender: user.gender,
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
 * Generate and dispatch a one-time password for forgot-password recovery.
 *
 * Stores the OTP in an LRU cache (keyed by email) and enqueues a
 * `send-otp` job via graphile-worker. The OTP is NEVER returned to
 * the frontend — no token, no hash, nothing.
 *
 * @param email - Email address of the user requesting password recovery
 */
async function requestOTP(email: string) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    throwError("Email is required", 400);
  }

  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user) {
    throwError("No account found with this email", 404);
  }

  const otp = generateOTP();
  console.log(otp)
  // Stage OTP in LRU cache — replaces old JWT-hash approach
  forgotPasswordCache.set(normalizedEmail, {
    otp,
    attempts: 0,
  });

  // Dispatch via background worker (no SMTP latency in request cycle)
  await addJob("send-otp", { email: normalizedEmail, otp, type: "forgot-password" });

  return { message: "OTP sent successfully" };
}

/**
 * Verify a submitted OTP for forgot-password and issue a short-lived reset token.
 *
 * Security:
 * - Timing-safe comparison via crypto.timingSafeEqual.
 * - 3-strike lockout: deletes cache entry after 3 failures.
 * - Replay protection: deletes cache entry on success.
 *
 * @param email - Email address associated with the OTP
 * @param otp   - One-time password submitted by the user
 */
async function verifyEnteredOTP(email: string, otp: string) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  const staged = forgotPasswordCache.get(normalizedEmail);

  if (!staged) {
    throwError("OTP expired or invalid. Please request a new OTP.", 400);
  }

  const isValid = compareOTP(String(otp), staged.otp);

  if (!isValid) {
    staged.attempts += 1;

    if (staged.attempts >= 3) {
      forgotPasswordCache.delete(normalizedEmail);
      throwError(
        "Too many failed attempts. Please request a new OTP.",
        400,
      );
    }

    forgotPasswordCache.set(normalizedEmail, staged);
    throwError(
      `Invalid OTP. ${3 - staged.attempts} attempt(s) remaining.`,
      400,
    );
  }

  // Valid — delete immediately (replay protection)
  forgotPasswordCache.delete(normalizedEmail);

  const resetTokenPayload: PasswordResetJwtPayload = {
    email: normalizedEmail,
    scope: "password_reset",
  };

  const resetToken = signToken(resetTokenPayload, "5m");

  return { resetToken };
}

/**
 * Update a user's profile.
 *
 * Updatable fields: full_name, phone, college, department, year, gender.
 * Non-updatable: email, register_number, csea_code, password_hash, user_id.
 *
 * @param userId  - User ID from the decoded JWT
 * @param payload - Partial profile fields to update
 */
async function updateProfile(
  userId: number | undefined,
  payload: UpdateProfileInput,
) {
  if (!userId) {
    throwError("Authentication required", 401);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.user_id, Number(userId)))
    .limit(1);

  if (!user) {
    throwError("User not found", 404);
  }

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };

  if (payload.full_name !== undefined) updateData.full_name = payload.full_name;
  if (payload.phone !== undefined) updateData.phone = payload.phone;
  if (payload.college !== undefined) updateData.college = payload.college;
  if (payload.department !== undefined)
    updateData.department = payload.department;
  if (payload.year !== undefined) updateData.year = payload.year;
  if (payload.gender !== undefined) updateData.gender = payload.gender;

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.user_id, Number(userId)));

  // Fetch and return updated profile (never expose user_id)
  const [updated] = await db
    .select()
    .from(users)
    .where(eq(users.user_id, Number(userId)))
    .limit(1);

  return {
    message: "Profile updated successfully",
    profile: {
      csea_code: updated.csea_code,
      register_number: updated.register_number,
      full_name: updated.full_name,
      email: updated.email,
      phone: updated.phone,
      college: updated.college,
      department: updated.department,
      year: updated.year,
      gender: updated.gender,
    },
  };
}
async function getProfileByUserId(userId: number | undefined) {
  if (!userId) {
    throwError("Authentication required", 401);
  }
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.user_id, Number(userId)))
    .limit(1);

  if (!user) {
    throwError("User not found", 404);
  }

  return {
    csea_code: user.csea_code,
    register_number: user.register_number,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    college: user.college,
    department: user.department,
    year: user.year,
    gender: user.gender,
  };
}

export default {
  login,
  getProfileByCseaCode,
  getProfileByUserId,
  changePassword,
  forgetPassword,
  requestOTP,
  verifyEnteredOTP,
  updateProfile,
};
