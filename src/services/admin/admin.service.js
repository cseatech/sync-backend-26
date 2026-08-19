const bcrypt = require("bcrypt");
const { eq } = require("drizzle-orm");
const { db } = require("../../db/index");
const { admins } = require("../../db/schema");
const { signToken } = require("../../utils/jwt");
const { throwError } = require("../../utils/serviceError");

async function adminLogin(payload) {
  const { email, password } = payload || {};

  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !String(password || "").trim()) {
    throwError("Email and password are required", 400);
  }

  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.email, normalizedEmail))
    .limit(1);

  if (!admin || !admin.password_hash) throwError("Invalid admin credentials", 401);

//   const isPasswordValid = await bcrypt.compare(String(password), admin.password_hash);

//   if (!isPasswordValid) {
//     const error = new Error("Invalid admin credentials");
//     error.statusCode = 401;
//     throw error;
//   }

  const token = signToken({
    admin_id: admin.admin_id,
    email: admin.email,
    role: "admin",
    privileged: admin.privileged,
  });

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

async function changePassword(adminId, payload) {
  const { oldPassword, newPassword } = payload || {};

  if (!adminId) throwError("Admin id is required", 401);

  if (!String(oldPassword || "").trim() || !String(newPassword || "").trim()) {
    throwError("Old password and new password are required", 400);
  }

  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.admin_id, Number(adminId)))
    .limit(1);

  if (!admin || !admin.password_hash) throwError("Admin not found", 404);

  const isOldPasswordValid = await bcrypt.compare(String(oldPassword), admin.password_hash);

  if (!isOldPasswordValid) throwError("Old password is incorrect", 401);

  if (String(oldPassword) === String(newPassword)) throwError("New password must be different from the old password", 400);

  const hashedPassword = await bcrypt.hash(String(newPassword), 10);

  await db
    .update(admins)
    .set({
      password_hash: hashedPassword,
    })
    .where(eq(admins.admin_id, Number(adminId)));

  return {
    message: "Password changed successfully",
  };
}

module.exports = { adminLogin, changePassword };
