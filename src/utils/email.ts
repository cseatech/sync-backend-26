import nodemailer from "nodemailer";

/**
 * Attachment descriptor for inline or regular email attachments.
 */
interface MailAttachment {
  filename: string;
  content: Buffer;
  cid?: string;
  contentDisposition?: "inline" | "attachment";
}

// ── Brevo (Sendinblue) SMTP transporter ──────────────────────
// Using Brevo's SMTP relay for transactional emails.
// Credentials are read from .env (BREVO_SMTP_KEY, BREVO_SENDER_EMAIL).
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_LOGIN_EMAIL,
    pass: process.env.BREVO_SMTP_KEY,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

// ── Generic SMTP transporter (uncomment when switching providers) ──
// const transporter = process.env.SMTP_HOST
//   ? nodemailer.createTransport({
//       host: process.env.SMTP_HOST,
//       port: Number(process.env.SMTP_PORT) || 587,
//       secure: Number(process.env.SMTP_PORT) === 465,
//       auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASS,
//       },
//       pool: true,
//       maxConnections: 5,
//       maxMessages: 100,
//     })
//   : null;

/**
 * Send an email via Brevo SMTP relay.
 *
 * @param to          - Recipient email address
 * @param subject     - Email subject line
 * @param html        - HTML body content
 * @param attachments - Optional inline/regular attachments
 */
async function sendMail(
  to: string,
  subject: string,
  html: string,
  attachments?: MailAttachment[],
): Promise<void> {
  const senderEmail =
    process.env.BREVO_SENDER_EMAIL || "noreply@symposium.com";

  await transporter.sendMail({
    from: senderEmail,
    to,
    subject,
    html,
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      cid: a.cid,
      contentDisposition: a.contentDisposition,
    })),
  });
}

export { sendMail };
export type { MailAttachment };