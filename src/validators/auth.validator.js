const { z } = require("zod");

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

const adminLoginSchema = z.object({
  email: z.string().trim().email("Invalid admin email format"),
  password: z.string().min(6, "Admin password must be at least 6 characters long"),
});

module.exports = {
  loginSchema,
  adminLoginSchema,
};
