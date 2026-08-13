const bcrypt = require("bcrypt");
const { eq } = require("drizzle-orm");
const { db } = require("../../db/index");
const { users } = require("../../db/schema");
const { signToken, verifyToken } = require("../../utils/jwt");

async function login(payload) {
  const { email, password } = payload || {};

  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !String(password || "").trim()) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    throw error;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user || !user.password_hash) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

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

async function getProfileByCseaCode(cseaCode) {
  const normalizedCode = String(cseaCode || "").trim();

  if (!normalizedCode) {
    const error = new Error("CSEA code is required");
    error.statusCode = 400;
    throw error;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.csea_code, normalizedCode))
    .limit(1);

  if (!user) {
    const error = new Error("User profile not found");
    error.statusCode = 404;
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

async function changePassword(userId, payload) {
  const { oldPassword, newPassword } = payload || {};

  if (!userId) {
    const error = new Error("User id is required");
    error.statusCode = 401;
    throw error;
  }

  if (!String(oldPassword || "").trim() || !String(newPassword || "").trim()) {
    const error = new Error("Old password and new password are required");
    error.statusCode = 400;
    throw error;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.user_id, Number(userId)))
    .limit(1);

  if (!user || !user.password_hash) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const isOldPasswordValid = await bcrypt.compare(String(oldPassword), user.password_hash);

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
  const { reset_token, new_password } = payload || {};

  if (!String(reset_token || "").trim() || !String(new_password || "").trim()) {
    const error = new Error("Reset token and new password are required");
    error.statusCode = 400;
    throw error;
  }

  let decoded;
  try {
    decoded = verifyToken(reset_token);
  } catch (error) {
    const err = new Error("Invalid or expired reset token");
    err.statusCode = 401;
    throw err;
  }

  if (!decoded || decoded.scope !== "password_reset") {
    const error = new Error("Invalid reset token scope");
    error.statusCode = 401;
    throw error;
  }

  const normalizedEmail = String(decoded.email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    const error = new Error("Reset token does not contain an email");
    error.statusCode = 401;
    throw error;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (await bcrypt.compare(String(new_password), user.password_hash)) {
    const error = new Error("New password must be different from the current password");
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(String(new_password), 10);

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
