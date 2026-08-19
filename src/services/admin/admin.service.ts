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

import { throwError } from "../../utils/serviceError";

async function adminLogin(
  payload: AdminLoginInput
) {
  const {
    email,
    password,
  } = payload;

  const normalizedEmail = String(
    email || ""
  )
    .trim()
    .toLowerCase();

  if (
    !normalizedEmail ||
    !String(password || "").trim()
  ) {
    throwError(
      "Email and password are required",
      400
    );
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
    throwError(
      "Invalid admin credentials",
      401
    );
  }

  // Remove comment for password validation

  // const isPasswordValid =
  //   await bcrypt.compare(
  //     String(password),
  //     admin.password_hash
  //   );

  // if (!isPasswordValid) {
  //   throwError(
  //     "Invalid admin credentials",
  //     401
  //   );
  // }

  const tokenPayload: AdminJwtPayload = {
    admin_id: admin.admin_id,
    email: admin.email,
    role: "admin",
    privileged:
      admin.privileged,
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
      privileged:
        admin.privileged,
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
    throwError(
      "Admin id is required",
      401
    );
  }

  if (
    !String(oldPassword || "").trim() ||
    !String(newPassword || "").trim()
  ) {
    throwError(
      "Old password and new password are required",
      400
    );
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
    throwError(
      "Admin not found",
      404
    );
  }

  const isOldPasswordValid =
    await bcrypt.compare(
      String(oldPassword),
      admin.password_hash
    );

  if (!isOldPasswordValid) {
    throwError(
      "Old password is incorrect",
      401
    );
  }

  if (
    String(oldPassword) ===
    String(newPassword)
  ) {
    throwError(
      "New password must be different from the old password",
      400
    );
  }

  const hashedPassword =
    await bcrypt.hash(
      String(newPassword),
      10
    );

  await db
    .update(admins)
    .set({
      password_hash:
        hashedPassword,
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

export default {
  adminLogin,
  changePassword,
};