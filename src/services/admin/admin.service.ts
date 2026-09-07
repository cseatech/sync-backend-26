import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

import { db } from "../../db/index";
import { admins } from "../../db/schema";

import { signToken, AdminJwtPayload } from "../../utils/jwt";

import {
  AdminLoginInput} from "../../validators/auth.validator";

import { throwError } from "../../utils/serviceError";

/**
 * Authenticate an administrator and return an access token with profile data.
 *
 * Validates the supplied credentials against the administrators table,
 * then creates a JWT for authenticated admin requests.
 *
 * @param payload - Administrator email and password
 */
async function adminLogin(payload: AdminLoginInput) {
  const { email, password } = payload;

  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail || !String(password || "").trim()) {
    throwError("Email and password are required", 400);
  }

  const [admin] = await db
    .select({
      admin_id: admins.admin_id,
      name: admins.name,
      email: admins.email,
      password_hash: admins.password_hash,
      position: admins.position,
      domain: admins.domain,
      privileged: admins.privileged,
    })
    .from(admins)
    .where(eq(admins.email, normalizedEmail))
    .limit(1);

  if (!admin || !admin.password_hash) {
    throwError("Invalid admin credentials", 401);
  }

  const isPasswordValid = await bcrypt.compare(
    String(password),
    admin.password_hash,
  );

  if (!isPasswordValid) {
    throwError("Invalid admin credentials", 401);
  }

  const tokenPayload: AdminJwtPayload = {
    admin_id: admin.admin_id,
    email: admin.email,
    role: "admin",
    privileged: admin.privileged,
  };

  const token = signToken(tokenPayload);

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

async function getAdminById(admin_id: string) {
  const [admin] = await db
    .select({
      admin_id: admins.admin_id,
      name: admins.name,
      email: admins.email,
      password_hash: admins.password_hash,
      position: admins.position,
      domain: admins.domain,
      privileged: admins.privileged,
    })
    .from(admins)
    .where(eq(admins.admin_id, Number(admin_id)))
    .limit(1);

  if (!admin) {
    throwError("Admin not found", 404);
  }

  return {
    admin_id: admin.admin_id,
    name: admin.name,
    email: admin.email,
    position: admin.position,
    domain: admin.domain,
    privileged: admin.privileged,
    role:"admin"
  };
}

export default {
  adminLogin,
  getAdminById
};
