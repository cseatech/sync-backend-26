import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

import { db } from "../../db/index";
import { users } from "../../db/schema";

import {
  signToken,
  verifyToken,
  UserJwtPayload,
  PasswordResetJwtPayload,
} from "../../utils/jwt";

import {
  LoginInput,
  ChangePasswordInput,
  ForgetPasswordInput,
} from "../../validators/auth.validator";

async function login(payload: LoginInput) {
  const { email, password } = payload;

  const normalizedEmail = email
    .trim()
    .toLowerCase();

  if (!normalizedEmail || !password.trim()) {
    const error = new Error(
      "Email and password are required"
    );

    error.statusCode = 400;

    throw error;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user || !user.password_hash) {
    const error = new Error(
      "Invalid email or password"
    );

    error.statusCode = 401;

    throw error;
  }

  // Remove comment for password validation
  // const isPasswordValid = await bcrypt.compare(
  //   password,
  //   user.password_hash
  // );

  // if (!isPasswordValid) {
  //   const error = new Error("Invalid email or password");
  //   error.statusCode = 401;
  //   throw error;
  // }

  const tokenPayload: UserJwtPayload = {
    user_id: user.user_id,
    email: user.email,
    role: "user",
  };

  const token = signToken(tokenPayload);

  return {
    token,

    user: {
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
    },
  };
}

async function getProfileByCseaCode(
  cseaCode: string,
  requester?: UserJwtPayload | {
    user_id?: number;
    role?: string;
  }
) {
  const normalizedCode = String(
    cseaCode || ""
  )
    .trim();

  if (!normalizedCode) {
    const error = new Error(
      "CSEA code is required"
    );

    error.statusCode = 400;

    throw error;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.csea_code, normalizedCode))
    .limit(1);

  if (!user) {
    const error = new Error(
      "User profile not found"
    );

    error.statusCode = 404;

    throw error;
  }

  if (
    String(requester?.role || "").toLowerCase() ===
    "admin"
  ) {
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

  if (
    Number(requester?.user_id) !==
    Number(user.user_id)
  ) {
    const error = new Error(
      "You are not allowed to access this profile"
    );

    error.statusCode = 403;

    throw error;
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

async function changePassword(
  userId: number | undefined,
  payload: ChangePasswordInput
) {
  const {
    oldPassword,
    newPassword,
  } = payload;

  if (!userId) {
    const error = new Error(
      "User id is required"
    );

    error.statusCode = 401;

    throw error;
  }

  if (
    !oldPassword.trim() ||
    !newPassword.trim()
  ) {
    const error = new Error(
      "Old password and new password are required"
    );

    error.statusCode = 400;

    throw error;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.user_id, Number(userId)))
    .limit(1);

  if (!user || !user.password_hash) {
    const error = new Error(
      "User not found"
    );

    error.statusCode = 404;

    throw error;
  }

  const isOldPasswordValid =
    await bcrypt.compare(
      oldPassword,
      user.password_hash
    );

  if (!isOldPasswordValid) {
    const error = new Error(
      "Old password is incorrect"
    );

    error.statusCode = 401;

    throw error;
  }

  if (oldPassword === newPassword) {
    const error = new Error(
      "New password must be different from the old password"
    );

    error.statusCode = 400;

    throw error;
  }

  const hashedPassword =
    await bcrypt.hash(newPassword, 10);

  await db
    .update(users)
    .set({
      password_hash: hashedPassword,
      updated_at: new Date(),
    })
    .where(
      eq(
        users.user_id,
        Number(userId)
      )
    );

  return {
    message: "Password changed successfully",
  };
}

async function forgetPassword(
  payload: ForgetPasswordInput
) {
  const {
    reset_token,
    newPassword,
  } = payload;

  if (
    !reset_token.trim() ||
    !newPassword.trim()
  ) {
    const error = new Error(
      "Reset token and new password are required"
    );

    error.statusCode = 400;

    throw error;
  }

  let decoded: PasswordResetJwtPayload;

  try {
    const tokenPayload =
      verifyToken(reset_token);

    if (
      tokenPayload.role ||
      tokenPayload.scope !==
        "password_reset"
    ) {
      throw new Error(
        "Invalid reset token scope"
      );
    }

    decoded =
      tokenPayload as PasswordResetJwtPayload;
  } catch (error) {
    const err = new Error(
      "Invalid or expired reset token"
    );

    err.statusCode = 401;

    throw err;
  }

  if (
    decoded.scope !== "password_reset"
  ) {
    const error = new Error(
      "Invalid reset token scope"
    );

    error.statusCode = 401;

    throw error;
  }

  const normalizedEmail = String(
    decoded.email || ""
  )
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    const error = new Error(
      "Reset token does not contain an email"
    );

    error.statusCode = 401;

    throw error;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(
      eq(users.email, normalizedEmail)
    )
    .limit(1);

  if (!user) {
    const error = new Error(
      "User not found"
    );

    error.statusCode = 404;

    throw error;
  }

  if (
    await bcrypt.compare(
      newPassword,
      user.password_hash
    )
  ) {
    const error = new Error(
      "New password must be different from the current password"
    );

    error.statusCode = 400;

    throw error;
  }

  const hashedPassword =
    await bcrypt.hash(newPassword, 10);

  await db
    .update(users)
    .set({
      password_hash: hashedPassword,
      updated_at: new Date(),
    })
    .where(
      eq(
        users.email,
        normalizedEmail
      )
    );

  return {
    message: "Password reset successful",
  };
}

export {
  login,
  getProfileByCseaCode,
  changePassword,
  forgetPassword,
};