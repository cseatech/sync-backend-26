import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email format"),  
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long"),
});

const profileByCseaCodeSchema = z.object({
  csea_code: z
    .string()
    .trim()
    .min(1, "CSEA code is required"),
});

const changePasswordSchema = z.object({
  oldPassword: z
    .string()
    .min(6, "Old password must be at least 6 characters long"),

  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters long"),
});

const forgetPasswordSchema = z.object({
  reset_token: z
    .string()
    .min(1, "Reset token is required"),

  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters long"),
});

const adminLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid admin email format"),

  password: z
    .string()
    .min(6, "Admin password must be at least 6 characters long"),
});

type LoginInput = z.infer<typeof loginSchema>;

type ProfileByCseaCodeInput =
  z.infer<typeof profileByCseaCodeSchema>;

type ChangePasswordInput =
  z.infer<typeof changePasswordSchema>;

type ForgetPasswordInput =
  z.infer<typeof forgetPasswordSchema>;

type AdminLoginInput =
  z.infer<typeof adminLoginSchema>;

export {
  loginSchema,
  profileByCseaCodeSchema,
  changePasswordSchema,
  forgetPasswordSchema,
  adminLoginSchema,

  LoginInput,
  ProfileByCseaCodeInput,
  ChangePasswordInput,
  ForgetPasswordInput,
  AdminLoginInput,
};