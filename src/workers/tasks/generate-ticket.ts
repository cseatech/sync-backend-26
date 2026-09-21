import { Task } from "graphile-worker";
import QRCode from "qrcode";
import { sendMail } from "../../utils/email";
import {
  registrationConfirmationHtml,
  getCseaLogoAttachment,
} from "../../utils/email-templates";

interface GenerateTicketPayload {
  email: string;
  cseaCode: string;
  fullName: string;
  registerNumber: string;
  college: string;
  department: string;
}

/**
 * Graphile-worker task that generates a QR-code ticket and sends
 * a registration-confirmation email.
 *
 * The QR code is rendered entirely in-memory as a PNG Buffer
 * (no filesystem writes) and attached inline via Content-ID so
 * it renders visually inside the HTML email body.
 */
const generateTicketTask: Task = async (payload, helpers) => {
  const {
    email,
    cseaCode,
    fullName,
    registerNumber,
    college,
    department,
  } = payload as GenerateTicketPayload;

  helpers.logger.info(
    `Generating registration ticket for ${email} — code ${cseaCode}`,
  );

  // NOTE: Confirmation email temporarily disabled to reduce mail costs.
  // Re-enable by removing this early return and uncommenting the block below.
  helpers.logger.info(
    `[generate-ticket] SKIPPED — confirmation email disabled for ${email} (${cseaCode})`,
  );
  return;

  /* ── RE-ENABLE BLOCK START ──
  // Generate QR code as PNG buffer with CID attachment.
  // SVG would be lighter, but email clients (Gmail, Outlook) strip <svg>
  // tags for security. PNG + CID is the only universally supported method.
  const qrBuffer: Buffer = await QRCode.toBuffer(cseaCode, {
    errorCorrectionLevel: "H",
    width: 200,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const html = registrationConfirmationHtml({
    fullName,
    cseaCode,
    registerNumber,
    college,
    department,
  });

  await sendMail(email, `Registration Confirmed — Sync '26 (${cseaCode})`, html, [
    getCseaLogoAttachment(),
    {
      filename: "qrcode.png",
      content: qrBuffer,
      cid: "qrcode",
      contentDisposition: "inline",
    },
  ]);

  helpers.logger.info(`Registration ticket email sent to ${email}`);
  ── RE-ENABLE BLOCK END ── */
};

export { generateTicketTask };
