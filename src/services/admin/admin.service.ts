import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

import { db } from "../../db/index";
import { admins } from "../../db/schema";

import {
  signToken,
  AdminJwtPayload,
} from "../../utils/jwt";

import {
  AdminLoginInput,
  ChangePasswordInput,
} from "../../validators/auth.validator";

async function adminLogin(
  payload: AdminLoginInput
) {
  const {
    email,
    password,
  } = payload;

  const normalizedEmail = email
    .trim()
    .toLowerCase();

  if (
    !normalizedEmail ||
    !password.trim()
  ) {
    const error = new Error(
      "Email and password are required"
    );

    error.statusCode = 400;

    throw error;
  }

  const [admin] = await db
    .select()
    .from(admins)
    .where(
      eq(
        admins.email,
        normalizedEmail
      )
    )
    .limit(1);

  if (
    !admin ||
    !admin.password_hash
  ) {
    const error = new Error(
      "Invalid admin credentials"
    );

    error.statusCode = 401;

    throw error;
  }

  // Remove comment for password validation
  // const isPasswordValid = await bcrypt.compare(
  //   password,
  //   admin.password_hash
  // );

  // if (!isPasswordValid) {
  //   const error = new Error("Invalid admin credentials");
  //   error.statusCode = 401;
  //   throw error;
  // }

  const tokenPayload: AdminJwtPayload = {
    admin_id: admin.admin_id,
    email: admin.email,
    role: "admin",
    privileged: admin.privileged,
  };

  const token =
    signToken(tokenPayload);

  return {
    token,

    admin: {
      admin_id: admin.admin_id,
      name: admin.name,
      email: admin.email,
      position: admin.position,
      domain: admin.domain,
      privileged: admin.privileged,
    },
  };
}

async function changePassword(
  adminId: number | undefined,
  payload: ChangePasswordInput
) {
  const {
    oldPassword,
    newPassword,
  } = payload;

  if (!adminId) {
    const error = new Error(
      "Admin id is required"
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

  const [admin] = await db
    .select()
    .from(admins)
    .where(
      eq(
        admins.admin_id,
        Number(adminId)
      )
    )
    .limit(1);

  if (
    !admin ||
    !admin.password_hash
  ) {
    const error = new Error(
      "Admin not found"
    );

    error.statusCode = 404;

    throw error;
  }

  const isOldPasswordValid =
    await bcrypt.compare(
      oldPassword,
      admin.password_hash
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
    await bcrypt.hash(
      newPassword,
      10
    );

  await db
    .update(admins)
    .set({
      password_hash: hashedPassword,
    })
    .where(
      eq(
        admins.admin_id,
        Number(adminId)
      )
    );

  return {
    message:
      "Password changed successfully",
  };
}

export {
  adminLogin,
  changePassword,
};