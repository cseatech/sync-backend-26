import { Task } from "graphile-worker";
import { sendMail } from "../../utils/email";

interface SendOtpPayload {
  email: string;
  otp: string;
}

/**
 * Graphile-worker task that dispatches an OTP verification email.
 *
 * Used by both the registration and forgot-password flows.
 * The OTP is rendered inside a styled HTML template; the raw
 * value never leaks into response bodies or tokens.
 */
const sendOtpTask: Task = async (payload, helpers) => {
  const { email, otp } = payload as SendOtpPayload;
  helpers.logger.info(`Dispatching OTP email to ${email}`);

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 0;">
      <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h2 style="color: #fff; margin: 0; font-size: 22px;">Verification Code</h2>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">
          Use the code below to complete your verification. It expires in <strong>10 minutes</strong>.
        </p>
        <div style="background: #f8fafc; border: 2px dashed #2563eb; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #1e40af;">${otp}</span>
        </div>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 20px;">
          If you did not request this code, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;

  await sendMail(email, "Your Verification Code", html);
  helpers.logger.info(`OTP email sent to ${email}`);
};

export { sendOtpTask };
