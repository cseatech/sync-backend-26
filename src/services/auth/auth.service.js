const bcrypt = require("bcrypt");
const { eq } = require("drizzle-orm");
const { db } = require("../../db/index");
const { users } = require("../../db/schema");
const { signToken } = require("../../utils/jwt");

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

module.exports = { login };
