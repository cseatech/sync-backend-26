const bcrypt = require("bcrypt");
const { eq } = require("drizzle-orm");
const { db } = require("../../db/index");
const { users } = require("../../db/schema");
const { signToken, verifyToken } = require("../../utils/jwt");
const { throwError } = require("../../utils/serviceError");

async function login(payload) {
  const { email, password } = payload || {};

  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !String(password || "").trim()) {
    throwError("Email and password are required", 400);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user || !user.password_hash) throwError("Invalid email or password", 401);

  //remove comment for password validation

//   const isPasswordValid = await bcrypt.compare(String(password), user.password_hash);

//   if (!isPasswordValid) {
//     const error = new Error("Invalid email or password");
//     error.statusCode = 401;
//     throw error;
//   }

  const token = signToken({
    user_id: user.user_id,
    email: user.email,
    role: "user",
  });

  return {
    token,
    user: {
    //   user_id: user.user_id,
      csea_code: user.csea_code,
      register_number: user.register_number,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      college: user.college,
      department: user.department,
      year: user.year,
      gender: user.gender,
    //   created_at: user.created_at,
    //   updated_at: user.updated_at,
    },
  };
}

async function getProfileByCseaCode(cseaCode, requester = {}) {
  const normalizedCode = String(cseaCode || "").trim();

  if (!normalizedCode) throwError("CSEA code is required", 400);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.csea_code, normalizedCode))
    .limit(1);

  if (!user) throwError("User profile not found", 404);

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

  if (Number(requester.user_id) !== Number(user.user_id)) throwError("You are not allowed to access this profile", 403);

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

async function changePassword(userId, payload) {
  const { oldPassword, newPassword } = payload || {};

  if (!userId) throwError("User id is required", 401);

  if (!String(oldPassword || "").trim() || !String(newPassword || "").trim()) {
    throwError("Old password and new password are required", 400);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.user_id, Number(userId)))
    .limit(1);

  if (!user || !user.password_hash) throwError("User not found", 404);

  const isOldPasswordValid = await bcrypt.compare(String(oldPassword), user.password_hash);

  if (!isOldPasswordValid) throwError("Old password is incorrect", 401);

  if (String(oldPassword) === String(newPassword)) {
    throwError("New password must be different from the old password", 400);
  }

  const hashedPassword = await bcrypt.hash(String(newPassword), 10);

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

async function forgetPassword(payload) {
  const { reset_token, newPassword } = payload || {};

  if (!String(reset_token || "").trim() || !String(newPassword || "").trim()) {
    throwError("Reset token and new password are required", 400);
  }

  let decoded;
  try {
    decoded = verifyToken(reset_token);
  } catch {
    throwError("Invalid or expired reset token", 401);
  }

  if (!decoded || decoded.scope !== "password_reset") {
    throwError("Invalid reset token scope", 401);
  }

  const normalizedEmail = String(decoded.email || "").trim().toLowerCase();

  if (!normalizedEmail) throwError("Reset token does not contain an email", 401);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user) throwError("User not found", 404);

  if (await bcrypt.compare(String(newPassword), user.password_hash)) {
    throwError("New password must be different from the current password", 400);
  }

  const hashedPassword = await bcrypt.hash(String(newPassword), 10);

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

module.exports = { login, getProfileByCseaCode, changePassword, forgetPassword };
