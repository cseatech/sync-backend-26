import { Task } from "graphile-worker";
import { sendMail } from "../../utils/email";
import {
  registrationOtpHtml,
  forgotPasswordOtpHtml,
  getCseaLogoAttachment,
} from "../../utils/email-templates";

interface SendOtpPayload {
  email: string;
  otp: string;
  /** Determines which email template to use. Defaults to "registration". */
  type?: "registration" | "forgot-password";
}

/**
 * Graphile-worker task that dispatches an OTP verification email.
 *
 * Supports two flows:
 *  - `type: "registration"` → Sync-branded registration OTP template
 *  - `type: "forgot-password"` → Password-recovery OTP template
 *
 * The OTP is rendered inside a styled HTML template; the raw
 * value never leaks into response bodies or tokens.
 */
const sendOtpTask: Task = async (payload, helpers) => {
  const { email, otp, type = "registration" } = payload as SendOtpPayload;
  helpers.logger.info(`Dispatching ${type} OTP email to ${email}`);

  const isForgotPassword = type === "forgot-password";

  const html = isForgotPassword
    ? forgotPasswordOtpHtml(otp)
    : registrationOtpHtml(otp);

  const subject = isForgotPassword
    ? "Reset Your Password — Sync '26"
    : "Verify Your Email — Sync '26";

  await sendMail(email, subject, html, [getCseaLogoAttachment()]);
  helpers.logger.info(`${type} OTP email sent to ${email}`);
};

export { sendOtpTask };
