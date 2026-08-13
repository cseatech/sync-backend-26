const { z } = require("zod");

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

module.exports = {
  loginSchema,
};
