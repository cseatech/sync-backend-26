import { Task } from "graphile-worker";
import QRCode from "qrcode";
import { sendMail } from "../../utils/email";

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

  // Generate QR code as PNG buffer with CID attachment.
  // SVG would be lighter, but email clients (Gmail, Outlook) strip <svg>
  // tags for security. PNG + CID is the only universally supported method.
  const qrBuffer: Buffer = await QRCode.toBuffer(cseaCode, {
    width: 200,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8" /></head>
    <body style="margin: 0; padding: 20px; background: #f4f4f4; font-family: 'Segoe UI', Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px;">🎉 Registration Confirmed!</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Welcome to the symposium</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px;">
          <p style="color: #333; font-size: 16px;">Dear <strong>${fullName}</strong>,</p>
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Your registration has been confirmed. Please save your registration code and QR code — you will need them at the venue.
          </p>

          <!-- Registration Code -->
          <div style="background: #f8fafc; border: 2px dashed #2563eb; border-radius: 10px; padding: 22px; text-align: center; margin: 24px 0;">
            <p style="color: #6b7280; margin: 0 0 6px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Registration Code</p>
            <p style="font-size: 38px; font-weight: 800; color: #1e40af; letter-spacing: 6px; margin: 0;">${cseaCode}</p>
          </div>

          <!-- QR Code (CID attachment — universally supported in email clients) -->
          <div style="text-align: center; margin: 28px 0;">
            <img src="cid:qrcode" alt="QR Code" width="200" height="200" style="border-radius: 8px; border: 1px solid #e5e7eb;" />
            <p style="color: #9ca3af; font-size: 12px; margin-top: 8px;">Scan at the venue for check-in</p>
          </div>

          <!-- Details Table -->
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px;">
            <tr>
              <td style="padding: 10px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6; width: 40%;">Name</td>
              <td style="padding: 10px 12px; color: #111827; border-bottom: 1px solid #f3f4f6; font-weight: 500;">${fullName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Register No.</td>
              <td style="padding: 10px 12px; color: #111827; border-bottom: 1px solid #f3f4f6; font-weight: 500;">${registerNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">College</td>
              <td style="padding: 10px 12px; color: #111827; border-bottom: 1px solid #f3f4f6; font-weight: 500;">${college}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; color: #6b7280;">Department</td>
              <td style="padding: 10px 12px; color: #111827; font-weight: 500;">${department}</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 18px; text-align: center; border-top: 1px solid #f3f4f6;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">CSEA Symposium Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendMail(email, `Registration Confirmed — ${cseaCode}`, html, [
    {
      filename: "qrcode.png",
      content: qrBuffer,
      cid: "qrcode",
      contentDisposition: "inline",
    },
  ]);

  helpers.logger.info(`Registration ticket email sent to ${email}`);
};

export { generateTicketTask };
