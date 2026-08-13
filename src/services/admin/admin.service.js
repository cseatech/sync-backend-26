const bcrypt = require("bcrypt");
const { eq } = require("drizzle-orm");
const { db } = require("../../db/index");
const { admins } = require("../../db/schema");
const { signToken } = require("../../utils/jwt");

async function adminLogin(payload) {
  const { email, password } = payload || {};

  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !String(password || "").trim()) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    throw error;
  }

  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.email, normalizedEmail))
    .limit(1);

  if (!admin || !admin.password_hash) {
    const error = new Error("Invalid admin credentials");
    error.statusCode = 401;
    throw error;
  }

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

  if (!adminId) {
    const error = new Error("Admin id is required");
    error.statusCode = 401;
    throw error;
  }

  if (!String(oldPassword || "").trim() || !String(newPassword || "").trim()) {
    const error = new Error("Old password and new password are required");
    error.statusCode = 400;
    throw error;
  }

  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.admin_id, Number(adminId)))
    .limit(1);

  if (!admin || !admin.password_hash) {
    const error = new Error("Admin not found");
    error.statusCode = 404;
    throw error;
  }

  const isOldPasswordValid = await bcrypt.compare(String(oldPassword), admin.password_hash);

  if (!isOldPasswordValid) {
    const error = new Error("Old password is incorrect");
    error.statusCode = 401;
    throw error;
  }

  if (String(oldPassword) === String(newPassword)) {
    const error = new Error("New password must be different from the old password");
    error.statusCode = 400;
    throw error;
  }

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
