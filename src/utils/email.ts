// Use require for CommonJS compatibility with ZeptoMail's dual-CJS bundle
const { SendMailClient } = require("zeptomail");

/**
 * Attachment descriptor for inline or regular email attachments.
 */
interface MailAttachment {
  filename: string;
  content: Buffer;
  cid?: string;
  contentDisposition?: "inline" | "attachment";
}

interface ZeptoMailClient {
  sendMail(payload: any): Promise<unknown>;
}

let clientInstance: ZeptoMailClient | null = null;

function getZeptoMailClient(): ZeptoMailClient {
  if (!clientInstance) {
    const url =
      process.env.ZEPTOMAIL_URL || "https://api.zeptomail.in/v1.1/email";
    const token = process.env.ZEPTOMAIL_TOKEN;
    if (!token) {
      throw new Error("Missing ZEPTOMAIL_TOKEN environment variable");
    }
    clientInstance = new SendMailClient({ url, token });
  }
  return clientInstance!;
}

/**
 * Send an email via ZeptoMail API.
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
  const senderAddress =
    process.env.ZEPTOMAIL_SENDER_ADDRESS || "noreply@cseaceg.org.in";
  const senderName = process.env.ZEPTOMAIL_SENDER_NAME || "noreply";

  // ── IMPORTANT: Bypass sending for dummy test emails ──
  if (
    to.toLowerCase().endsWith("@example.com") ||
    to.toLowerCase().endsWith("@loadtest.local")
  ) {
    // Simulate slight network delay
    await new Promise((resolve) => setTimeout(resolve, 150));
    return;
  }

  const client = getZeptoMailClient();

  const zeptoAttachments: Array<{
    name: string;
    content: string;
    mime_type?: string;
  }> = [];

  const zeptoInlineImages: Array<{
    cid: string;
    content: string;
    mime_type?: string;
  }> = [];

  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      const base64Content = att.content.toString("base64");
      const ext = att.filename.split(".").pop()?.toLowerCase();
      let mimeType = "application/octet-stream";
      if (ext === "png") mimeType = "image/png";
      else if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
      else if (ext === "pdf") mimeType = "application/pdf";

      if (att.contentDisposition === "inline" || att.cid) {
        zeptoInlineImages.push({
          cid: att.cid || att.filename,
          content: base64Content,
          mime_type: mimeType,
        });
      } else {
        zeptoAttachments.push({
          name: att.filename,
          content: base64Content,
          mime_type: mimeType,
        });
      }
    }
  }

  const payload: any = {
    from: {
      address: senderAddress,
      name: senderName,
    },
    to: [
      {
        email_address: {
          address: to,
        },
      },
    ],
    subject,
    htmlbody: html,
  };

  if (zeptoAttachments.length > 0) {
    payload.attachments = zeptoAttachments;
  }
  if (zeptoInlineImages.length > 0) {
    payload.inline_images = zeptoInlineImages;
  }

  await client.sendMail(payload);
}

export { sendMail };
export type { MailAttachment };