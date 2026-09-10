import fs from "fs";
import path from "path";

/**
 * CSEA logo loaded once at module init as a PNG Buffer.
 *
 * The logo is embedded inline via Content-ID (`cid:csea-logo`) so it
 * renders visually inside the HTML email across all major clients
 * (Gmail, Outlook, Apple Mail). SVG is NOT used because most email
 * clients strip <svg> tags for security reasons.
 */
const CSEA_LOGO_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "sync-frontend-26",
  "public",
  "csea-logo.png",
);

let cseaLogoBuffer: Buffer;
try {
  cseaLogoBuffer = fs.readFileSync(CSEA_LOGO_PATH);
} catch {
  // Fallback: if logo file is missing, use an empty buffer.
  // The email will still render — the <img> tag will just show alt text.
  console.warn(`⚠️  CSEA logo not found at ${CSEA_LOGO_PATH}`);
  cseaLogoBuffer = Buffer.alloc(0);
}

/**
 * Returns the inline CID attachment descriptor for the CSEA logo.
 * Include this in the `attachments` array of every email.
 */
export function getCseaLogoAttachment() {
  return {
    filename: "csea-logo.png",
    content: cseaLogoBuffer,
    cid: "csea-logo",
    contentDisposition: "inline" as const,
  };
}

// ────────────────────────────────────────────────────────────────
// Shared design tokens — keeps all three templates visually cohesive
// ────────────────────────────────────────────────────────────────
const COLORS = {
  bgPage: "#0f1117",
  bgCard: "#181b24",
  bgCardInner: "#1e222d",
  accent: "#00d4aa",
  accentDark: "#00b894",
  accentGlow: "rgba(0,212,170,0.15)",
  textPrimary: "#e8eaed",
  textSecondary: "#9aa0b0",
  textMuted: "#5c6370",
  border: "#2a2f3a",
  borderAccent: "#00d4aa",
  white: "#ffffff",
  headerGradientStart: "#0d9373",
  headerGradientEnd: "#067a5e",
};

/**
 * Wraps email body content in the shared Sync '26 layout shell.
 * Includes: page background, card container, CSEA logo header, and footer.
 */
function wrapInLayout(headerTitle: string, headerSubtitle: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headerTitle} — Sync '26</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bgPage};font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Outer wrapper for centering -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bgPage};padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Card container -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${COLORS.bgCard};border-radius:16px;overflow:hidden;border:1px solid ${COLORS.border};">

          <!-- ═══ Header with logo ═══ -->
          <tr>
            <td style="background:linear-gradient(135deg,${COLORS.headerGradientStart},${COLORS.headerGradientEnd});padding:32px 32px 28px;text-align:center;">
              <img src="cid:csea-logo" alt="CSEA" width="72" height="72" style="display:block;margin:0 auto 16px;border-radius:14px;background:#ffffff;padding:6px;" />
              <h1 style="color:${COLORS.white};margin:0;font-size:24px;font-weight:700;letter-spacing:0.5px;">${headerTitle}</h1>
              <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;font-weight:400;">${headerSubtitle}</p>
            </td>
          </tr>

          <!-- ═══ Body ═══ -->
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- ═══ Footer ═══ -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid ${COLORS.border};text-align:center;">
              <p style="color:${COLORS.textMuted};font-size:12px;margin:0 0 4px;line-height:1.5;">
                Sync '26 — Department of Computer Science
              </p>
              <p style="color:${COLORS.textMuted};font-size:11px;margin:0;line-height:1.5;">
                25th &amp; 26th September 2026 &nbsp;·&nbsp; Digital Well-being
              </p>
            </td>
          </tr>

        </table>

        <!-- Sub-footer -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;margin-top:16px;">
          <tr>
            <td align="center">
              <p style="color:${COLORS.textMuted};font-size:11px;margin:0;">
                This is an automated email from CSEA. Please do not reply.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ────────────────────────────────────────────────────────────────
// 1. REGISTRATION OTP
// ────────────────────────────────────────────────────────────────
export function registrationOtpHtml(otp: string): string {
  const body = `
    <p style="color:${COLORS.textPrimary};font-size:15px;line-height:1.7;margin:0 0 16px;">
      Thank you for your interest in <strong>Sync '26</strong> — the intra-college symposium hosted by the Department of Computer Science! We're thrilled to have you join us.
    </p>
    <p style="color:${COLORS.textSecondary};font-size:14px;line-height:1.6;margin:0 0 24px;">
      Use the verification code below to complete your registration. This code expires in <strong style="color:${COLORS.textPrimary};">5 minutes</strong>.
    </p>

    <!-- OTP Box -->
    <div style="background:${COLORS.bgCardInner};border:2px solid ${COLORS.borderAccent};border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
      <p style="color:${COLORS.textMuted};font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">Verification Code</p>
      <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:${COLORS.accent};display:inline-block;">${otp}</span>
    </div>

    <p style="color:${COLORS.textSecondary};font-size:13px;line-height:1.6;margin:0 0 8px;">
      🎯 Sync promotes inter-department collaboration encompassing technical and non-technical events around <strong style="color:${COLORS.textPrimary};">Digital Well-being</strong>.
    </p>
    <p style="color:${COLORS.textMuted};font-size:12px;margin:0;">
      If you did not initiate this registration, you can safely ignore this email.
    </p>
  `;

  return wrapInLayout("Verify Your Email", "Sync '26 · Registration", body);
}

// ────────────────────────────────────────────────────────────────
// 2. FORGOT PASSWORD OTP
// ────────────────────────────────────────────────────────────────
export function forgotPasswordOtpHtml(otp: string): string {
  const body = `
    <p style="color:${COLORS.textPrimary};font-size:15px;line-height:1.7;margin:0 0 16px;">
      We received a request to reset the password for your <strong>Sync '26</strong> account. No worries — it happens!
    </p>
    <p style="color:${COLORS.textSecondary};font-size:14px;line-height:1.6;margin:0 0 24px;">
      Enter the code below to verify your identity. This code expires in <strong style="color:${COLORS.textPrimary};">5 minutes</strong>.
    </p>

    <!-- OTP Box -->
    <div style="background:${COLORS.bgCardInner};border:2px solid #f39c12;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
      <p style="color:${COLORS.textMuted};font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">Password Reset Code</p>
      <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#f39c12;display:inline-block;">${otp}</span>
    </div>

    <!-- Security notice -->
    <div style="background:rgba(243,156,18,0.08);border-left:3px solid #f39c12;border-radius:0 8px 8px 0;padding:14px 16px;margin:0 0 16px;">
      <p style="color:${COLORS.textSecondary};font-size:13px;line-height:1.5;margin:0;">
        🔒 <strong style="color:${COLORS.textPrimary};">Security tip:</strong> Never share this code with anyone. The Sync team will never ask you for your OTP.
      </p>
    </div>

    <p style="color:${COLORS.textMuted};font-size:12px;margin:0;">
      If you did not request a password reset, you can safely ignore this email. Your account remains secure.
    </p>
  `;

  return wrapInLayout("Reset Your Password", "Sync '26 · Account Recovery", body);
}

// ────────────────────────────────────────────────────────────────
// 3. REGISTRATION CONFIRMATION (with QR code)
// ────────────────────────────────────────────────────────────────
interface RegistrationDetails {
  fullName: string;
  cseaCode: string;
  registerNumber: string;
  college: string;
  department: string;
}

export function registrationConfirmationHtml(details: RegistrationDetails): string {
  const { fullName, cseaCode, registerNumber, college, department } = details;

  const detailRow = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 14px;color:${COLORS.textMuted};font-size:13px;border-bottom:1px solid ${COLORS.border};width:40%;">${label}</td>
      <td style="padding:10px 14px;color:${COLORS.textPrimary};font-size:13px;font-weight:500;border-bottom:1px solid ${COLORS.border};">${value}</td>
    </tr>
  `;

  const body = `
    <p style="color:${COLORS.textPrimary};font-size:16px;line-height:1.7;margin:0 0 8px;">
      Dear <strong>${fullName}</strong>,
    </p>
    <p style="color:${COLORS.textSecondary};font-size:14px;line-height:1.7;margin:0 0 24px;">
      Welcome to <strong style="color:${COLORS.accent};">Sync '26</strong>! Your registration has been confirmed. We're excited to have you be part of this celebration of technology and creativity around <strong style="color:${COLORS.textPrimary};">Digital Well-being</strong>.
    </p>

    <!-- Registration Code -->
    <div style="background:${COLORS.bgCardInner};border:2px solid ${COLORS.borderAccent};border-radius:12px;padding:22px;text-align:center;margin:0 0 24px;">
      <p style="color:${COLORS.textMuted};font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">Your Registration Code</p>
      <p style="font-size:34px;font-weight:800;color:${COLORS.accent};letter-spacing:6px;margin:0;">${cseaCode}</p>
    </div>

    <!-- QR Code -->
    <div style="text-align:center;margin:0 0 28px;">
      <div style="display:inline-block;background:${COLORS.white};border-radius:12px;padding:12px;border:1px solid ${COLORS.border};">
        <img src="cid:qrcode" alt="QR Code" width="180" height="180" style="display:block;border-radius:6px;" />
      </div>
      <p style="color:${COLORS.textMuted};font-size:12px;margin:10px 0 0;">Scan at the venue for quick check-in</p>
    </div>

    <!-- Details Table -->
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;background:${COLORS.bgCardInner};border-radius:10px;overflow:hidden;">
      ${detailRow("Name", fullName)}
      ${detailRow("Register No.", registerNumber)}
      ${detailRow("College", college)}
      ${detailRow("Department", department)}
    </table>

    <!-- Info banner -->
    <div style="background:${COLORS.accentGlow};border-left:3px solid ${COLORS.accent};border-radius:0 8px 8px 0;padding:14px 16px;margin:0 0 16px;">
      <p style="color:${COLORS.textSecondary};font-size:13px;line-height:1.6;margin:0;">
        📅 <strong style="color:${COLORS.textPrimary};">Mark your calendar!</strong> Sync '26 blossoms on <strong style="color:${COLORS.accent};">25th &amp; 26th September 2026</strong>. Encompassing multifarious events, this version has the benchmark features to enthrall the multitude.
      </p>
    </div>

    <p style="color:${COLORS.textMuted};font-size:12px;margin:0;">
      Please save your registration code and QR code — you'll need them at the venue.
    </p>
  `;

  return wrapInLayout("Registration Confirmed! 🎉", "Sync '26 · Welcome Aboard", body);
}
