import { z } from "zod";

// ── Reusable password validator ───────────────────────────────

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character",
  );

// ── Auth ──────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const profileByCseaCodeSchema = z.object({
  csea_code: z.string().trim().min(1, "CSEA code is required"),
});

const changePasswordSchema = z.object({
  oldPassword: z
    .string()
    .min(8, "Old password must be at least 8 characters"),

  newPassword: strongPassword,
});

const forgetPasswordSchema = z.object({
  reset_token: z.string().min(1, "Reset token is required"),

  newPassword: strongPassword,
});

const adminLoginSchema = z.object({
  email: z.string().trim().email("Invalid admin email format"),

  password: z
    .string()
    .min(8, "Admin password must be at least 8 characters"),
});

// ── Registration ──────────────────────────────────────────────

const registrationInitiateSchema = z.object({
  register_number: z
    .string()
    .trim()
    .min(1, "Register number is required")
    .max(30, "Register number too long"),

  full_name: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(150, "Full name too long"),

  email: z.email("Invalid email format"),

  phone: z
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number too long"),

  college: z
    .string()
    .trim()
    .min(1, "College is required")
    .max(150, "College name too long"),

  department: z
    .string()
    .trim()
    .min(1, "Department is required")
    .max(100, "Department name too long"),

  year: z
    .number({ message: "Year must be a number" })
    .int("Year must be a whole number")
    .min(1, "Year must be between 1 and 5")
    .max(5, "Year must be between 1 and 5"),

  gender: z.enum(["Male", "Female", "Other"], {
    message: "Gender must be Male, Female, or Other",
  }),

  password: strongPassword,
});

const registrationVerifySchema = z.object({
  email: z.email("Invalid email format"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

// ── Forgot Password (cache-based, replaces JWT-token approach) ─

const forgotPasswordInitiateSchema = z.object({
  email: z.email("Invalid email format"),
});

const forgotPasswordVerifySchema = z.object({
  email: z.email("Invalid email format"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

// ── Profile Update ────────────────────────────────────────────

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(1).max(150).optional(),
  phone: z.string().trim().min(10).max(15).optional(),
  college: z.string().trim().min(1).max(150).optional(),
  department: z.string().trim().min(1).max(100).optional(),
  year: z.number().int().min(1).max(5).optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
});

// ── Type exports ──────────────────────────────────────────────

type LoginInput = z.infer<typeof loginSchema>;
type ProfileByCseaCodeInput = z.infer<typeof profileByCseaCodeSchema>;
type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
type ForgetPasswordInput = z.infer<typeof forgetPasswordSchema>;
type AdminLoginInput = z.infer<typeof adminLoginSchema>;
type RegistrationInitiateInput = z.infer<typeof registrationInitiateSchema>;
type RegistrationVerifyInput = z.infer<typeof registrationVerifySchema>;
type ForgotPasswordInitiateInput = z.infer<typeof forgotPasswordInitiateSchema>;
type ForgotPasswordVerifyInput = z.infer<typeof forgotPasswordVerifySchema>;
type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export {
  loginSchema,
  profileByCseaCodeSchema,
  changePasswordSchema,
  forgetPasswordSchema,
  adminLoginSchema,
  registrationInitiateSchema,
  registrationVerifySchema,
  forgotPasswordInitiateSchema,
  forgotPasswordVerifySchema,
  updateProfileSchema,
};

export type {
  LoginInput,
  ProfileByCseaCodeInput,
  ChangePasswordInput,
  ForgetPasswordInput,
  AdminLoginInput,
  RegistrationInitiateInput,
  RegistrationVerifyInput,
  ForgotPasswordInitiateInput,
  ForgotPasswordVerifyInput,
  UpdateProfileInput,
};
